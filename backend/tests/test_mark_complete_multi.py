"""Tests for POST /api/contracts/{id}/mark-complete-multi (iteration_20 fix).

Covers:
- 200 completes multi-join contract as poster; server-side status becomes 'completed'
- 400 on single-slot contract
- 403 for non-poster
- 200 idempotent second call ('Contract already finalised')
- contracts_completed increments for poster + distinct participants
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{API}/auth/demo-login", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_user(demo_token):
    r = requests.get(f"{API}/auth/me", headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_user(admin_token):
    r = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30)
    assert r.status_code == 200
    return r.json()


def _create_multi_lfg(token, title="TEST_iter20_MC_multi"):
    payload = {
        "title": title, "description": "iter20 mc-multi",
        "category": "OTHER", "payment_amount": 500,
        "duration_minutes": 60, "meeting_visibility": "public",
        "meeting_system": "Stanton", "meeting_major_location": "Port Olisar",
        "join_mode": "multi", "max_participants": 4,
    }
    r = requests.post(f"{API}/contracts", json=payload, headers=_auth(token), timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def _create_single(token, title="TEST_iter20_MC_single"):
    payload = {
        "title": title, "description": "iter20 mc-single",
        "category": "OTHER", "payment_amount": 500,
        "duration_minutes": 60, "meeting_visibility": "public",
        "meeting_system": "Stanton", "meeting_major_location": "Port Olisar",
        # default: single-slot (no join_mode / no is_multi_crew)
    }
    r = requests.post(f"{API}/contracts", json=payload, headers=_auth(token), timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---- Happy path: multi-join completes ----

def test_mark_complete_multi_success(demo_token, admin_token, demo_user, admin_user):
    if admin_user["id"] == demo_user["id"]:
        pytest.skip("admin=demo")
    c = _create_multi_lfg(demo_token, "TEST_iter20_MC_success")
    acc = requests.post(f"{API}/contracts/{c['id']}/accept", headers=_auth(admin_token), timeout=30)
    assert acc.status_code == 200, acc.text

    # baseline poster completions
    me_before = requests.get(f"{API}/auth/me", headers=_auth(demo_token), timeout=30).json()
    poster_before = me_before.get("contracts_completed", 0) or 0
    admin_before = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30).json().get("contracts_completed", 0) or 0

    r = requests.post(f"{API}/contracts/{c['id']}/mark-complete-multi",
                      headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "completed"

    # verify server-side
    r2 = requests.get(f"{API}/contracts/{c['id']}", headers=_auth(demo_token), timeout=30)
    assert r2.status_code == 200
    assert r2.json().get("status") == "completed"

    # increments
    me_after = requests.get(f"{API}/auth/me", headers=_auth(demo_token), timeout=30).json()
    admin_after = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30).json()
    assert (me_after.get("contracts_completed", 0) or 0) == poster_before + 1
    assert (admin_after.get("contracts_completed", 0) or 0) == admin_before + 1


# ---- Idempotency: second call returns 200 with 'already finalised' ----

def test_mark_complete_multi_idempotent(demo_token, admin_token, demo_user, admin_user):
    if admin_user["id"] == demo_user["id"]:
        pytest.skip("admin=demo")
    c = _create_multi_lfg(demo_token, "TEST_iter20_MC_idem")
    requests.post(f"{API}/contracts/{c['id']}/accept", headers=_auth(admin_token), timeout=30)
    r1 = requests.post(f"{API}/contracts/{c['id']}/mark-complete-multi",
                       headers=_auth(demo_token), timeout=30)
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/contracts/{c['id']}/mark-complete-multi",
                       headers=_auth(demo_token), timeout=30)
    assert r2.status_code == 200, r2.text
    assert "already" in (r2.json().get("message") or "").lower()
    assert r2.json().get("status") == "completed"


# ---- 400 on single-slot ----

def test_mark_complete_multi_rejects_single(demo_token):
    c = _create_single(demo_token, "TEST_iter20_MC_single_reject")
    r = requests.post(f"{API}/contracts/{c['id']}/mark-complete-multi",
                      headers=_auth(demo_token), timeout=30)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


# ---- 403 for non-poster ----

def test_mark_complete_multi_forbidden_for_non_poster(demo_token, admin_token, demo_user, admin_user):
    if admin_user["id"] == demo_user["id"]:
        pytest.skip("admin=demo")
    c = _create_multi_lfg(demo_token, "TEST_iter20_MC_403")
    requests.post(f"{API}/contracts/{c['id']}/accept", headers=_auth(admin_token), timeout=30)
    r = requests.post(f"{API}/contracts/{c['id']}/mark-complete-multi",
                      headers=_auth(admin_token), timeout=30)
    assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
