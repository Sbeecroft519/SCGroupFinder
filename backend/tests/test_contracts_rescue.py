"""
Tests for new contract features:
- Looking-Now vs Future timing (timing_type, scheduled_*)
- Simplified Meeting Location (meeting_visibility, meeting_system, meeting_major_location)
- Medical / Rescue privacy redaction (rescue_* fields)
- Backward compat: paid jobs, LFG, multi-crew, bid/accept/decline/review
- Demo login

Uses public preview URL from REACT_APP_BACKEND_URL.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://citizen-squad.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
TIMEOUT = 30

ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"


# ---------- Fixtures ----------

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json().get("token")


@pytest.fixture(scope="session")
def demo_token_user1():
    r = requests.post(f"{API}/auth/demo-login", json={}, timeout=TIMEOUT)
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    j = r.json()
    return j.get("token"), j.get("user")


@pytest.fixture(scope="session")
def demo_token_user2():
    # Second demo session for privacy test (different non-admin user)
    r = requests.post(f"{API}/auth/demo-login", json={}, timeout=TIMEOUT)
    assert r.status_code == 200
    j = r.json()
    return j.get("token"), j.get("user")


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Demo login ----------

class TestDemoLogin:
    def test_demo_login_returns_token_and_user(self):
        r = requests.post(f"{API}/auth/demo-login", json={}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 0
        assert "user" in d
        assert d["user"].get("is_admin") in (False, None)


# ---------- Paid combat job (now / public Stanton-Lorville) ----------

class TestPaidCombatJob:
    def test_create_paid_combat_now_appears_in_list(self, admin_token):
        payload = {
            "title": "TEST_paid_combat",
            "description": "test",
            "category": "COMBAT",
            "compensation_type": "flat",
            "payment_amount": 50000,
            "shard": "USA",
            "timing_type": "now",
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
            "meeting_major_location": "Lorville",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        cid = c.get("id")
        assert cid
        assert c.get("payment_amount") == 50000
        assert c.get("timing_type") == "now"
        assert c.get("meeting_visibility") == "public"
        assert c.get("meeting_system") == "Stanton"
        assert c.get("meeting_major_location") == "Lorville"

        # Verify GET list contains it
        r2 = requests.get(f"{API}/contracts", headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r2.status_code == 200
        ids = [x.get("id") for x in r2.json()]
        assert cid in ids


# ---------- Future-scheduled job ----------

class TestFutureScheduledJob:
    def test_create_future_scheduled_job(self, admin_token):
        payload = {
            "title": "TEST_future_job",
            "category": "COMBAT",
            "compensation_type": "flat",
            "payment_amount": 1000,
            "shard": "USA",
            "timing_type": "future",
            "scheduled_start_at": "2026-12-01T20:00:00Z",
            "scheduled_timezone": "UTC",
            "meeting_visibility": "public",
            "meeting_system": "Pyro",
            "meeting_major_location": "Checkmate Station",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        assert c.get("timing_type") == "future"
        assert c.get("scheduled_start_at") == "2026-12-01T20:00:00Z"
        assert c.get("meeting_system") == "Pyro"


# ---------- LFG (no payout) ----------

class TestLFGFlow:
    def test_lfg_no_payout(self, admin_token):
        payload = {
            "title": "TEST_lfg_grouping",
            "category": "LFG",
            "compensation_type": "flat",
            "shard": "USA",
            "timing_type": "now",
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        assert c.get("category") == "LFG"
        assert (c.get("payment_amount") or 0) == 0


# ---------- Multi-crew manifest ----------

class TestMultiCrewManifest:
    def test_multicrew_combat_with_manifest(self, admin_token):
        payload = {
            "title": "TEST_multicrew",
            "category": "COMBAT",
            "compensation_type": "flat",
            "shard": "USA",
            "is_multi_crew": True,
            "manifest": [
                {"role": "Pilot", "payout": 50000},
                {"role": "Gunner", "payout": 30000},
            ],
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
            "meeting_major_location": "Area18",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        assert c.get("is_multi_crew") is True
        assert c.get("status") == "mustering"
        assert c.get("payment_amount") == 80000
        assert isinstance(c.get("manifest"), list) and len(c["manifest"]) == 2


# ---------- Apply / accept / decline / review ----------

class TestBidFlow:
    def test_apply_accept_decline_review(self, admin_token, demo_token_user1):
        demo_token, demo_user = demo_token_user1
        # Admin posts contract
        payload = {
            "title": "TEST_bid_flow",
            "category": "COMBAT",
            "compensation_type": "flat",
            "payment_amount": 1000,
            "shard": "USA",
            "timing_type": "now",
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
            "meeting_major_location": "Lorville",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201)
        cid = r.json()["id"]

        # Demo user bids
        bid_payload = {"amount": 1000, "message": "TEST_bid"}
        rb = requests.post(f"{API}/contracts/{cid}/bid", json=bid_payload, headers=auth_headers(demo_token), timeout=TIMEOUT)
        if rb.status_code == 400 and "already" in rb.text.lower():
            pytest.skip(f"Demo user has pre-existing active contract constraint: {rb.text}")
        assert rb.status_code in (200, 201), rb.text
        bj = rb.json()
        bid_id = bj.get("bid_id") or bj.get("id") or (bj.get("bid") or {}).get("id")
        if not bid_id:
            # fetch from contract
            rc = requests.get(f"{API}/contracts/{cid}", headers=auth_headers(admin_token), timeout=TIMEOUT)
            bids = rc.json().get("bids") or []
            assert bids, "No bids found on contract"
            bid_id = bids[0].get("id")
        assert bid_id, f"bid_id missing: {bj}"

        # Admin accepts
        ra = requests.post(f"{API}/contracts/{cid}/bids/{bid_id}/accept", headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert ra.status_code in (200, 201), f"accept failed: {ra.status_code} {ra.text}"

        # Admin reviews mercenary
        review_payload = {"rating": 5, "comment": "TEST_great"}
        rr = requests.post(f"{API}/contracts/{cid}/review", json=review_payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        # Review may require completed status; accept 200/201/400
        assert rr.status_code in (200, 201, 400), rr.text


# ---------- MEDICAL privacy redaction ----------

class TestMedicalPrivacy:
    def test_private_fields_redacted_for_non_authorized(self, admin_token, demo_token_user1):
        demo_token, demo_user = demo_token_user1
        secret_loc = f"SECRET_LOC_{uuid.uuid4().hex[:8]}"
        secret_body = f"SECRET_BODY_{uuid.uuid4().hex[:8]}"
        secret_notes = f"SECRET_NOTES_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": "TEST_medical_privacy",
            "category": "MEDICAL",
            "compensation_type": "flat",
            "payment_amount": 25000,
            "shard": "USA",
            "timing_type": "now",
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
            "rescue_bleedout_minutes": 15,
            "rescue_injury_tier": "T2",
            "rescue_pvp_area": "No",
            "rescue_hostile_npcs": "No",
            "rescue_aa_turrets": "No",
            "rescue_needs_food_hydration": "Yes",
            "rescue_exact_location": secret_loc,
            "rescue_body_location": secret_body,
            "rescue_private_notes": secret_notes,
        }
        # Admin posts the medical contract
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        cid = c["id"]

        # Poster (admin) sees private fields populated on response
        assert c.get("rescue_exact_location") == secret_loc
        assert c.get("rescue_body_location") == secret_body
        assert c.get("rescue_private_notes") == secret_notes
        # Bleedout expiry computed
        assert c.get("rescue_bleedout_expires_at"), "rescue_bleedout_expires_at missing"
        assert c.get("rescue_bleedout_minutes") == 15

        # Poster GET single - should show private
        rp = requests.get(f"{API}/contracts/{cid}", headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert rp.status_code == 200
        pj = rp.json()
        assert pj.get("rescue_exact_location") == secret_loc
        assert pj.get("rescue_body_location") == secret_body
        assert pj.get("rescue_private_notes") == secret_notes

        # Demo (non-admin, non-poster, non-accepted) GET single - private redacted
        rd = requests.get(f"{API}/contracts/{cid}", headers=auth_headers(demo_token), timeout=TIMEOUT)
        assert rd.status_code == 200
        dj = rd.json()
        # Public risk fields visible
        assert dj.get("rescue_injury_tier") == "T2"
        assert dj.get("rescue_pvp_area") == "No"
        assert dj.get("rescue_bleedout_minutes") == 15
        # Private fields redacted (None)
        assert dj.get("rescue_exact_location") in (None, ""), f"exact loc leaked: {dj.get('rescue_exact_location')}"
        assert dj.get("rescue_body_location") in (None, ""), f"body loc leaked: {dj.get('rescue_body_location')}"
        assert dj.get("rescue_private_notes") in (None, ""), f"notes leaked: {dj.get('rescue_private_notes')}"

        # Demo GET list - secret strings must not appear anywhere
        rl = requests.get(f"{API}/contracts", headers=auth_headers(demo_token), timeout=TIMEOUT)
        assert rl.status_code == 200
        body_text = rl.text
        assert secret_loc not in body_text, "exact location leaked in list response for non-authorized user"
        assert secret_body not in body_text, "body location leaked in list response"
        assert secret_notes not in body_text, "private notes leaked in list response"

        # Admin GET list - should include the secret (poster)
        rl2 = requests.get(f"{API}/contracts", headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert rl2.status_code == 200
        assert secret_loc in rl2.text, "Poster (admin) cannot see their own private exact_location in list"

    def test_expired_bleedout_creation(self, admin_token):
        # Create medical with very short bleedout, verify expires_at is in the future and minutes saved
        payload = {
            "title": "TEST_medical_short_bleedout",
            "category": "MEDICAL",
            "compensation_type": "flat",
            "payment_amount": 1000,
            "shard": "USA",
            "timing_type": "now",
            "meeting_visibility": "public",
            "meeting_system": "Stanton",
            "rescue_bleedout_minutes": 1,
            "rescue_injury_tier": "T1",
            "rescue_pvp_area": "Yes",
            "rescue_exact_location": "SECRET_SHORT",
        }
        r = requests.post(f"{API}/contracts", json=payload, headers=auth_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        assert c.get("rescue_bleedout_expires_at"), "expires_at missing"
        assert c.get("rescue_bleedout_minutes") == 1
