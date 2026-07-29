"""Tests for POST /api/contracts/{id}/complete after accepted_by None fix."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://org-manager-lite.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/demo-login", timeout=30)
    assert r.status_code == 200, f"demo-login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_user(demo_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo_token}"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_contract(token, **overrides):
    payload = {
        "title": "TEST_complete_contract",
        "description": "auto test",
        "category": "OTHER",
        "payment_amount": 1000,
        "duration_minutes": 60,
        "meeting_visibility": "public",
        "meeting_system": "Stanton",
        "meeting_major_location": "Port Olisar",
    }
    payload.update(overrides)
    r = requests.post(f"{API}/contracts", json=payload, headers=_auth(token), timeout=30)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    return r.json()


# --- Complete endpoint tests ---

def test_complete_multi_join_lfg_as_poster(demo_token):
    """MULTI-JOIN LFG contract (join_mode=multi, no accepted_by) — poster completes."""
    contract = _create_contract(demo_token, title="TEST_multi_join_lfg", join_mode="multi", max_participants=4)
    cid = contract["id"]
    r = requests.post(f"{API}/contracts/{cid}/complete", headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    assert r.json().get("message") == "Contract marked complete"


def test_complete_multi_crew_with_manifest_as_poster(demo_token):
    """MULTI-CREW contract with manifest but no top-level accepted_by."""
    contract = _create_contract(
        demo_token,
        title="TEST_multi_crew_manifest",
        is_multi_crew=True,
        manifest=[
            {"role": "Pilot", "count": 1, "payout": 500},
            {"role": "Gunner", "count": 2, "payout": 300},
        ],
    )
    cid = contract["id"]
    r = requests.post(f"{API}/contracts/{cid}/complete", headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    assert r.json().get("message") == "Contract marked complete"


def test_complete_single_bid_unaccepted_as_poster(demo_token):
    """SINGLE-BID contract with accepted_by=None — poster still completes."""
    contract = _create_contract(demo_token, title="TEST_single_unaccepted", join_mode="single")
    cid = contract["id"]
    r = requests.post(f"{API}/contracts/{cid}/complete", headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
    assert r.json().get("message") == "Contract marked complete"


def test_complete_unauthenticated_returns_401(demo_token):
    """No auth header -> 401."""
    contract = _create_contract(demo_token, title="TEST_no_auth")
    cid = contract["id"]
    r = requests.post(f"{API}/contracts/{cid}/complete", timeout=30)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text}"


def test_complete_unrelated_user_returns_403(demo_token, admin_token, demo_user):
    """Admin user is not poster/merc -> 403."""
    contract = _create_contract(demo_token, title="TEST_unrelated_user")
    cid = contract["id"]
    # verify admin != demo user
    r_me = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30)
    assert r_me.status_code == 200
    admin_id = r_me.json().get("id")
    if admin_id == demo_user.get("id"):
        pytest.skip("admin and demo user are the same account")
    r = requests.post(f"{API}/contracts/{cid}/complete", headers=_auth(admin_token), timeout=30)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
