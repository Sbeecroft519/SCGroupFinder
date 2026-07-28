"""Tests for POST /api/contracts/{id}/rate-participant (multi-role poster rating)."""
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


def _create_multi_lfg(token, title="TEST_rate_multi"):
    payload = {
        "title": title,
        "description": "auto test rate",
        "category": "OTHER",
        "payment_amount": 1000,
        "duration_minutes": 60,
        "meeting_visibility": "public",
        "meeting_system": "Stanton",
        "meeting_major_location": "Port Olisar",
        "join_mode": "multi",
        "max_participants": 4,
    }
    r = requests.post(f"{API}/contracts", json=payload, headers=_auth(token), timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def _accept(token, cid):
    r = requests.post(f"{API}/contracts/{cid}/accept", headers=_auth(token), timeout=30)
    return r


@pytest.fixture(scope="module")
def contract_with_admin_participant(demo_token, admin_token, demo_user, admin_user):
    if admin_user["id"] == demo_user["id"]:
        pytest.skip("admin and demo are same user")
    c = _create_multi_lfg(demo_token, "TEST_rate_participant_flow")
    r = _accept(admin_token, c["id"])
    assert r.status_code == 200, f"accept failed: {r.status_code} {r.text}"
    return c


# ---- Happy path ----

def test_rate_participant_success(demo_token, admin_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": admin_user["id"], "rating": 4, "comment": "solid crew"},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("message") == "Rating recorded"
    assert body.get("rated_user_id") == admin_user["id"]

    # Fetch contract, assert participant_ratings has the entry with rated_handle populated
    r2 = requests.get(f"{API}/contracts/{cid}", headers=_auth(demo_token), timeout=30)
    assert r2.status_code == 200
    ratings = r2.json().get("participant_ratings") or []
    mine = [pr for pr in ratings if pr.get("rated_user_id") == admin_user["id"]]
    assert len(mine) == 1
    assert mine[0]["rating"] == 4
    assert mine[0]["comment"] == "solid crew"
    assert mine[0].get("rated_handle")  # populated


def test_rerate_replaces_prior_entry(demo_token, admin_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": admin_user["id"], "rating": 2, "comment": "updated"},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 200
    r2 = requests.get(f"{API}/contracts/{cid}", headers=_auth(demo_token), timeout=30)
    ratings = r2.json().get("participant_ratings") or []
    mine = [pr for pr in ratings if pr.get("rated_user_id") == admin_user["id"]]
    assert len(mine) == 1, f"expected 1 entry, got {len(mine)}: {mine}"
    assert mine[0]["rating"] == 2
    assert mine[0]["comment"] == "updated"


def test_reputation_updated_on_rated_user(demo_token, admin_token, admin_user, contract_with_admin_participant):
    # After ratings above (rating=2 was last), admin's reputation should be set.
    r = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30)
    assert r.status_code == 200
    rep = r.json().get("reputation")
    assert rep is not None
    assert isinstance(rep, (int, float))
    # Value should be > 0 (a rating exists)
    assert rep > 0


# ---- Auth / permission ----

def test_non_poster_returns_403(admin_token, demo_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": demo_user["id"], "rating": 5},
        headers=_auth(admin_token), timeout=30,
    )
    assert r.status_code == 403, r.text


def test_poster_rating_self_returns_400(demo_token, demo_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": demo_user["id"], "rating": 5},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 400, r.text


def test_rating_non_participant_returns_400(demo_token, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": "not-a-real-user-id", "rating": 5},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 400, r.text


# ---- Rating bounds ----

def test_rating_zero_returns_400(demo_token, admin_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": admin_user["id"], "rating": 0},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 400, r.text


def test_rating_above_five_returns_400(demo_token, admin_user, contract_with_admin_participant):
    cid = contract_with_admin_participant["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-participant",
        json={"participant_user_id": admin_user["id"], "rating": 6},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 400, r.text
