"""Tests for POST /api/orgs/register — self-serve org registration."""
import os
import uuid
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


def _unique_tag():
    return "T" + uuid.uuid4().hex[:5].upper()


def _cleanup(admin_token, org_id):
    try:
        requests.delete(f"{API}/admin/orgs/{org_id}", headers=_auth(admin_token), timeout=15)
    except Exception:
        pass


# ---- Happy path ----

def test_register_creates_pending_org(demo_token, demo_user, admin_token):
    tag = _unique_tag()
    payload = {
        "name": "Test Self-Reg Org",
        "tag": tag,
        "description": "Applied via self-signup",
        "rsi_org_url": "https://robertsspaceindustries.com/orgs/TESTX",
        "discord_invite_url": "https://discord.gg/testx",
        "specialties": ["Medical / Rescue", "Cargo"],
        "home_regions": ["USA", "Europe"],
        "service_systems": ["Stanton"],
    }
    r = requests.post(f"{API}/orgs/register", json=payload, headers=_auth(demo_token), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tag"] == tag
    assert body["owner_id"] == demo_user["id"]

    # Confirm my-org returns it with pending status
    mo = requests.get(f"{API}/user/my-org", headers=_auth(demo_token), timeout=15)
    assert mo.status_code == 200
    org = mo.json().get("org")
    assert org is not None
    assert org["approval_status"] == "pending"
    assert org.get("self_registered") is True
    assert org.get("owner_pending") is False  # self-registered → no invite step

    # Not visible on the public list until approved
    pub = requests.get(f"{API}/orgs", timeout=15)
    assert pub.status_code == 200
    ids = [o["id"] for o in (pub.json().get("orgs") or [])]
    assert body["id"] not in ids

    _cleanup(admin_token, body["id"])


def test_admin_approval_makes_public(demo_token, admin_token):
    tag = _unique_tag()
    r = requests.post(
        f"{API}/orgs/register",
        json={"name": "Approve Me Org", "tag": tag, "description": "x"},
        headers=_auth(demo_token), timeout=30,
    )
    assert r.status_code == 200, r.text
    org_id = r.json()["id"]

    # Approve
    a = requests.post(f"{API}/admin/orgs/{org_id}/approve", headers=_auth(admin_token), timeout=15)
    assert a.status_code == 200, a.text

    # Now visible on public list
    pub = requests.get(f"{API}/orgs", timeout=15)
    ids = [o["id"] for o in (pub.json().get("orgs") or [])]
    assert org_id in ids

    _cleanup(admin_token, org_id)


# ---- Duplicate + validation ----

def test_second_registration_by_same_owner_blocked(demo_token, admin_token):
    tag1 = _unique_tag()
    r1 = requests.post(
        f"{API}/orgs/register",
        json={"name": "First Org", "tag": tag1},
        headers=_auth(demo_token), timeout=30,
    )
    assert r1.status_code == 200

    tag2 = _unique_tag()
    r2 = requests.post(
        f"{API}/orgs/register",
        json={"name": "Second Org", "tag": tag2},
        headers=_auth(demo_token), timeout=30,
    )
    assert r2.status_code == 400
    assert "already own" in (r2.json().get("detail") or "").lower()

    _cleanup(admin_token, r1.json()["id"])


def test_duplicate_tag_blocked(demo_token, admin_token):
    tag = _unique_tag()
    r1 = requests.post(f"{API}/orgs/register",
                       json={"name": "Tag Owner", "tag": tag},
                       headers=_auth(demo_token), timeout=30)
    assert r1.status_code == 200

    # Register with same tag from a different user (admin also can't reuse tag)
    r2 = requests.post(f"{API}/orgs/register",
                       json={"name": "Copycat", "tag": tag},
                       headers=_auth(admin_token), timeout=30)
    assert r2.status_code == 400
    assert "tag" in (r2.json().get("detail") or "").lower()

    _cleanup(admin_token, r1.json()["id"])


def test_missing_fields_return_400(demo_token):
    # name too short
    r = requests.post(f"{API}/orgs/register",
                      json={"name": "Ab", "tag": _unique_tag()},
                      headers=_auth(demo_token), timeout=30)
    assert r.status_code == 400

    # tag too short
    r = requests.post(f"{API}/orgs/register",
                      json={"name": "Fine Name", "tag": "A"},
                      headers=_auth(demo_token), timeout=30)
    assert r.status_code == 400


def test_unauthenticated_blocked():
    r = requests.post(f"{API}/orgs/register",
                      json={"name": "No Auth", "tag": _unique_tag()},
                      timeout=30)
    assert r.status_code in (401, 403)
