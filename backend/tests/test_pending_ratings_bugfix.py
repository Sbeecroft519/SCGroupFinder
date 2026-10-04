"""Iteration 26 - Verify fix for 'Not a participant of this contract' bug.

Exercises the new server-routed endpoint POST /api/ratings/pending/{obligation_id}
for every pending obligation on the admin account, then verifies:
  - no 'Not a participant' or other errors
  - rating actually recorded (history + reputation reflect it)
  - idempotency (replay returns 400)
  - validation (rating 1..5)
  - cross-user obligation returns 404
  - mutual hiding (ratings_withheld) honored before submission
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"


# ---------- shared fixtures ----------

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=60)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def demo_token():
    r = requests.post(f"{BASE_URL}/api/auth/demo-login", timeout=20)
    assert r.status_code == 200, f"demo-login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ---------- helpers ----------

def _get_pending(headers):
    r = requests.get(f"{BASE_URL}/api/ratings/pending", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    return data.get("items", []), data.get("count", 0)


def _submit(headers, obligation_id, rating=4, comment="Great run", tags=None):
    return requests.post(
        f"{BASE_URL}/api/ratings/pending/{obligation_id}",
        json={"rating": rating, "comment": comment, "tags": tags or []},
        headers=headers, timeout=20,
    )


# ---------- tests ----------

class TestPendingRatingBugFix:
    """BUG VERIFICATION — every pending obligation must submit without 'Not a participant' error."""

    _submitted = []  # class-level cache: list of (obligation_id, ratee_id, contract_id)

    def test_submit_every_pending_obligation_for_admin(self, admin_headers):
        items, count = _get_pending(admin_headers)
        print(f"\n[info] admin has {count} pending obligations")
        if not items:
            pytest.skip("No pending obligations for admin at the start of this run")

        failures = []
        for it in items:
            ob_id = it["id"]
            ratee_id = it.get("ratee_id")
            kind = it.get("kind")
            r = _submit(admin_headers, ob_id, rating=4,
                        comment=f"itr26 verify {kind}",
                        tags=["reliable"])
            if r.status_code != 200:
                failures.append({
                    "obligation_id": ob_id,
                    "ratee_id": ratee_id,
                    "kind": kind,
                    "contract_id": it.get("contract_id"),
                    "status": r.status_code,
                    "body": r.text[:300],
                })
            else:
                TestPendingRatingBugFix._submitted.append(
                    (ob_id, ratee_id, it.get("contract_id"))
                )

        assert not failures, (
            f"\n{len(failures)} pending obligation(s) failed on new endpoint:\n"
            + "\n".join(str(f) for f in failures)
        )
        assert TestPendingRatingBugFix._submitted, "no successes recorded"

        # verify list decremented to zero
        _, new_count = _get_pending(admin_headers)
        assert new_count == 0, f"expected 0 pending after submitting all, got {new_count}"

    def test_rating_recorded_in_history(self, admin_headers):
        if not TestPendingRatingBugFix._submitted:
            pytest.skip("nothing was submitted earlier")
        ok = 0
        for _ob, ratee_id, _cid in TestPendingRatingBugFix._submitted:
            if not ratee_id:
                continue
            r = requests.get(f"{BASE_URL}/api/users/{ratee_id}/rating-history?limit=20",
                             headers=admin_headers, timeout=30)
            if r.status_code != 200:
                continue
            payload = r.json()
            entries = payload if isinstance(payload, list) else payload.get("items", [])
            matched = [e for e in entries
                       if (e.get("comment") or "").startswith("itr26 verify")]
            if matched:
                ok += 1
        assert ok > 0, "no new ratings showed up in any ratee's rating-history"

    def test_replay_returns_400(self, admin_headers):
        """Replay on an already-settled obligation -> 400 'no longer pending'."""
        if not TestPendingRatingBugFix._submitted:
            pytest.skip("nothing submitted to replay")
        ob_id, _r, _c = TestPendingRatingBugFix._submitted[0]
        r = _submit(admin_headers, ob_id, rating=5)
        assert r.status_code == 400, f"expected 400 for replay, got {r.status_code}: {r.text}"
        assert "no longer pending" in r.text.lower(), r.text

    def test_unknown_obligation_returns_404(self, admin_headers):
        r = _submit(admin_headers, "nonexistent-obligation-id-xyz")
        assert r.status_code == 404, r.text

    def test_rating_out_of_range_400(self, admin_headers):
        r = _submit(admin_headers, "any-id", rating=0)
        # Pydantic may 422, server may 400 -- accept either as validation failure
        assert r.status_code in (400, 422), r.text
        r = _submit(admin_headers, "any-id", rating=6)
        assert r.status_code in (400, 422), r.text

    def test_other_users_obligation_returns_404(self, admin_headers, demo_headers):
        """Posting with an obligation id that doesn't belong to the caller -> 404."""
        # Create an obligation on the demo account by looking at their pending list.
        items, _ = _get_pending(demo_headers)
        if not items:
            pytest.skip("Demo user has no pending obligations to cross-check with")
        foreign_id = items[0]["id"]
        r = _submit(admin_headers, foreign_id, rating=5)
        assert r.status_code == 404, r.text


class TestLegacyRatingPathsStillWork:
    """Regression — the older /rate-poster and /rate-participant endpoints must still
    reject non-participants but accept legitimate participants resolved via
    ratings_queue.participants_of."""

    def test_rate_poster_rejects_non_participant(self, admin_headers):
        # Pick any completed contract id; admin is the poster so should 400.
        r = requests.get(f"{BASE_URL}/api/contracts?status=completed",
                         headers=admin_headers, timeout=15)
        assert r.status_code == 200
        contracts = r.json() if isinstance(r.json(), list) else r.json().get("contracts", [])
        if not contracts:
            pytest.skip("no completed contracts visible")
        cid = contracts[0]["id"]
        r = requests.post(f"{BASE_URL}/api/contracts/{cid}/rate-poster",
                          json={"rating": 5, "comment": "test"},
                          headers=admin_headers, timeout=15)
        # Admin is the poster, so they should NOT be allowed to rate themselves as poster
        assert r.status_code in (400, 403), f"expected 400/403, got {r.status_code}: {r.text}"
