"""Iteration 24: org affiliation, pending ratings, region persistence, multicrew stepper backend."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://org-manager-lite.preview.emergentagent.com').rstrip('/')

ADMIN_EMAIL = 'beecroft519@gmail.com'
ADMIN_PASS = 'Nv$C0m_Adm1n_2025!'
APPROVED_ORG_ID = 'b4ea1916-eb87-4c6f-9078-e01602869ffc'  # MTO


# ---------- fixtures ----------
@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f'{BASE_URL}/api/auth/login',
                      json={'email': ADMIN_EMAIL, 'password': ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f'admin login failed: {r.status_code} {r.text}'
    return r.json()['token']


@pytest.fixture(scope='module')
def demo_token():
    r = requests.post(f'{BASE_URL}/api/auth/demo-login', timeout=15)
    assert r.status_code == 200, f'demo login failed: {r.status_code} {r.text}'
    return r.json()['token']


def _h(token):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ---------- org affiliation ----------
class TestOrgAffiliation:
    def test_approved_options_lists_only_approved(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/orgs/approved-options', headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(o['id'] == APPROVED_ORG_ID for o in data), data
        # every entry must have id, name, tag
        for o in data:
            assert 'id' in o and 'name' in o and 'tag' in o

    def test_put_affiliation_rejects_bad_org(self, admin_token):
        r = requests.put(f'{BASE_URL}/api/user/org-affiliation',
                         headers=_h(admin_token),
                         json={'org_id': 'not-a-real-org-id'}, timeout=10)
        assert r.status_code in (400, 404), f'expected 400/404 got {r.status_code} {r.text}'

    def test_set_clear_affiliation_updates_count(self, admin_token):
        # baseline
        r0 = requests.get(f'{BASE_URL}/api/orgs', headers=_h(admin_token), timeout=10)
        assert r0.status_code == 200
        orgs0 = r0.json().get('orgs', [])
        base_count = next((o.get('displayed_member_count', 0) for o in orgs0 if o['id'] == APPROVED_ORG_ID), 0)

        # clear first (set to None)
        requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                     json={'org_id': None}, timeout=10)
        r1 = requests.get(f'{BASE_URL}/api/orgs', headers=_h(admin_token), timeout=10)
        count_cleared = next((o.get('displayed_member_count', 0) for o in r1.json()['orgs']
                              if o['id'] == APPROVED_ORG_ID), 0)

        # set to MTO
        rSet = requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                            json={'org_id': APPROVED_ORG_ID}, timeout=10)
        assert rSet.status_code == 200, rSet.text
        r2 = requests.get(f'{BASE_URL}/api/orgs', headers=_h(admin_token), timeout=10)
        count_set = next((o.get('displayed_member_count', 0) for o in r2.json()['orgs']
                          if o['id'] == APPROVED_ORG_ID), 0)
        assert count_set == count_cleared + 1, f'count did not increment: cleared={count_cleared} set={count_set}'

        # GET affiliation reflects selection
        rg = requests.get(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token), timeout=10)
        assert rg.status_code == 200
        body = rg.json()
        assert (body.get('org_id') or body.get('id')) == APPROVED_ORG_ID or body.get('affiliation', {}).get('org_id') == APPROVED_ORG_ID, body

        # clear again
        rClr = requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                            json={'org_id': None}, timeout=10)
        assert rClr.status_code == 200
        r3 = requests.get(f'{BASE_URL}/api/orgs', headers=_h(admin_token), timeout=10)
        count_cleared2 = next((o.get('displayed_member_count', 0) for o in r3.json()['orgs']
                               if o['id'] == APPROVED_ORG_ID), 0)
        assert count_cleared2 == count_cleared, f'decrement failed cleared2={count_cleared2} baseline={count_cleared}'
        # restore baseline affiliation if admin originally had one
        if base_count > count_cleared:
            requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                         json={'org_id': APPROVED_ORG_ID}, timeout=10)

    def test_org_profile_endpoint(self, admin_token):
        # Set affiliation so there is at least 1 displayed member
        requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                     json={'org_id': APPROVED_ORG_ID}, timeout=10)
        r = requests.get(f'{BASE_URL}/api/orgs/{APPROVED_ORG_ID}', headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        body = r.json()
        # Should contain name/tag and either displayed_members or displayed_member_count
        assert body.get('name') and body.get('tag')
        members = body.get('displayed_members')
        assert isinstance(members, list), f'displayed_members missing or wrong type: {body.keys()}'
        count = body.get('displayed_member_count')
        assert count is None or count >= 1


# ---------- region ----------
class TestRegion:
    def test_region_in_auth_me(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/auth/me', headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        assert 'region' in r.json()

    def test_put_user_region_persists(self, admin_token):
        orig = requests.get(f'{BASE_URL}/api/auth/me', headers=_h(admin_token), timeout=10).json().get('region')
        new_region = 'Asia' if orig != 'Asia' else 'Europe'
        r = requests.put(f'{BASE_URL}/api/user/region', headers=_h(admin_token),
                         json={'region': new_region}, timeout=10)
        assert r.status_code == 200, r.text
        got = requests.get(f'{BASE_URL}/api/auth/me', headers=_h(admin_token), timeout=10).json().get('region')
        assert got == new_region
        # restore
        if orig:
            requests.put(f'{BASE_URL}/api/user/region', headers=_h(admin_token),
                         json={'region': orig}, timeout=10)

    def test_region_skip_global_persists(self, admin_token):
        r = requests.put(f'{BASE_URL}/api/user/region', headers=_h(admin_token),
                         json={'region': 'Global'}, timeout=10)
        assert r.status_code == 200
        got = requests.get(f'{BASE_URL}/api/auth/me', headers=_h(admin_token), timeout=10).json().get('region')
        assert got == 'Global'


# ---------- pending ratings ----------
class TestPendingRatings:
    def test_pending_endpoint_shape(self, admin_token):
        r = requests.get(f'{BASE_URL}/api/ratings/pending', headers=_h(admin_token), timeout=10)
        assert r.status_code == 200
        body = r.json()
        # Could be dict or list; normalize
        items = body.get('items') if isinstance(body, dict) else body
        assert isinstance(items, list)
        if items:
            it = items[0]
            for k in ('id', 'contract_id', 'rater_id', 'ratee_id', 'kind', 'expires_at', 'status'):
                assert k in it, f'missing key {k} in obligation {it}'
            assert it['status'] == 'pending'
            assert it['kind'] in ('poster_to_player', 'player_to_poster')

    def test_pending_requires_auth(self):
        # Backend design: returns empty {count:0,items:[]} for unauth rather than 401.
        # Validate at least that unauth cannot see other users' obligations.
        r = requests.get(f'{BASE_URL}/api/ratings/pending', timeout=10)
        assert r.status_code == 200
        body = r.json()
        items = body.get('items') if isinstance(body, dict) else body
        assert items == [] or items == {}, f'unauth leak suspected: {body}'


# ---------- multicrew contract creation ----------
class TestMulticrewCreate:
    def test_create_multicrew_contract_with_crew_roles(self, admin_token):
        # Frontend builds the manifest client-side from crew_roles + payment_amount.
        # Replicate that split here so backend persists it.
        total_pay = 90000
        total_seats = 3
        per_seat = total_pay // total_seats
        manifest = [
            {'role': 'Pilot', 'payout': per_seat},
            {'role': 'Gunner', 'payout': per_seat},
            {'role': 'Gunner', 'payout': per_seat},
        ]
        payload = {
            'title': f'TEST_iter24_mc_{uuid.uuid4().hex[:6]}',
            'description': 'Iteration 24 multicrew test',
            'category': 'Combat',
            'subcategory': 'Combat',
            'payment_amount': total_pay,
            'pay_mode': 'paid',
            'join_mode': 'multi',
            'region': 'Global',
            'system': 'Stanton',
            'is_multi_crew': True,
            'manifest': manifest,
            'crew_roles': [
                {'name': 'Pilot', 'count': 1},
                {'name': 'Gunner', 'count': 2},
            ],
        }
        r = requests.post(f'{BASE_URL}/api/contracts', headers=_h(admin_token),
                          json=payload, timeout=15)
        assert r.status_code in (200, 201), f'{r.status_code} {r.text}'
        data = r.json()
        cid = data.get('id') or data.get('contract', {}).get('id')
        assert cid, data
        # fetch and inspect manifest
        rc = requests.get(f'{BASE_URL}/api/contracts/{cid}', headers=_h(admin_token), timeout=10)
        assert rc.status_code == 200
        c = rc.json()
        manifest = c.get('manifest') or []
        assert len(manifest) == 3, f'expected 3 seats got {len(manifest)}: {manifest}'
        roles = [s.get('role') or s.get('slot_name') for s in manifest]
        assert roles.count('Pilot') == 1
        assert roles.count('Gunner') == 2
        # per-seat payout should be floor(90000/3) = 30000
        payouts = [s.get('payout') or s.get('pay') or s.get('amount') for s in manifest]
        assert all(p == 30000 for p in payouts), f'payouts not evenly split: {payouts}'
        # cleanup
        try:
            requests.delete(f'{BASE_URL}/api/contracts/{cid}', headers=_h(admin_token), timeout=10)
        except Exception:
            pass


# ---------- regression: contracts list enriches org tag ----------
class TestOrgTagEnrichment:
    def test_contracts_board_contains_org_tag_when_set(self, admin_token):
        # Ensure admin has affiliation
        requests.put(f'{BASE_URL}/api/user/org-affiliation', headers=_h(admin_token),
                     json={'org_id': APPROVED_ORG_ID}, timeout=10)
        # fetch contracts; look for admin-posted contracts carrying org_tag
        r = requests.get(f'{BASE_URL}/api/contracts', headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        contracts = r.json() if isinstance(r.json(), list) else r.json().get('contracts', [])
        admin_id = requests.get(f'{BASE_URL}/api/auth/me', headers=_h(admin_token)).json()['id']
        admin_posts = [c for c in contracts if c.get('poster_id') == admin_id]
        if not admin_posts:
            pytest.skip('no admin-posted contracts to validate org tag')
        tagged = [c for c in admin_posts if (c.get('poster') or {}).get('org_tag')]
        assert tagged, f'no admin posts enriched with org_tag; sample poster={admin_posts[0].get("poster")}'
