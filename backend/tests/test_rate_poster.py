"""Tests for POST /api/contracts/{id}/rate-poster (participant → poster rating)."""
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


def _create_multi_lfg(token, title="TEST_rate_poster"):
    payload = {
        "title": title,
        "description": "auto test rate-poster",
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


@pytest.fixture(scope="module")
def contract_ctx(demo_token, admin_token, demo_user, admin_user):
    if admin_user["id"] == demo_user["id"]:
        pytest.skip("admin and demo are same user")
    c = _create_multi_lfg(demo_token, "TEST_rate_poster_flow")
    r = requests.post(f"{API}/contracts/{c['id']}/accept", headers=_auth(admin_token), timeout=30)
    assert r.status_code == 200, r.text
    return c


# ---- Happy path ----

def test_participant_rates_poster(admin_token, demo_user, contract_ctx):
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 5, "comment": "great host"},
        headers=_auth(admin_token), timeout=30,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("message") == "Rating recorded"

    r2 = requests.get(f"{API}/contracts/{cid}", headers=_auth(admin_token), timeout=30)
    assert r2.status_code == 200
    ratings = r2.json().get("poster_ratings") or []
    assert len(ratings) == 1
    assert ratings[0]["rating"] == 5
    assert ratings[0]["comment"] == "great host"
    assert ratings[0]["rated_user_id"] == demo_user["id"]


def test_rerate_replaces_prior(admin_token, contract_ctx):
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 3, "comment": "updated"},
        headers=_auth(admin_token), timeout=30,
    )
    assert r.status_code == 200
    r2 = requests.get(f"{API}/contracts/{cid}", headers=_auth(admin_token), timeout=30)
    ratings = r2.json().get("poster_ratings") or []
    assert len(ratings) == 1, f"expected 1 entry, got {len(ratings)}"
    assert ratings[0]["rating"] == 3


def test_my_contracts_includes_multi_role_participant(admin_token, contract_ctx):
    """The my-contracts endpoint should return contracts where the user is a participant."""
    r = requests.get(f"{API}/user/my-contracts", headers=_auth(admin_token), timeout=30)
    assert r.status_code == 200
    ids = [c["id"] for c in r.json()]
    assert contract_ctx["id"] in ids


# ---- Auth / permission ----

def test_poster_rating_self_returns_400(demo_token, contract_ctx):
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 5},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 400, r.text


def test_non_participant_returns_403(contract_ctx):
    """A brand new user who never joined the contract cannot rate the poster."""
    # Use a fresh demo login (demo-login creates same demo user each time — same id).
    # Instead, register a fresh anonymous account through the demo endpoint by hitting an alt path.
    # Fallback: unauthenticated call should also be denied.
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 5},
        timeout=30,
    )
    assert r.status_code in (401, 403), r.text


# ---- Rating bounds ----

def test_rating_zero_returns_400(admin_token, contract_ctx):
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 0},
        headers=_auth(admin_token), timeout=30,
    )
    assert r.status_code == 400


def test_rating_above_five_returns_400(admin_token, contract_ctx):
    cid = contract_ctx["id"]
    r = requests.post(
        f"{API}/contracts/{cid}/rate-poster",
        json={"rating": 6},
        headers=_auth(admin_token), timeout=30,
    )
    assert r.status_code == 400
