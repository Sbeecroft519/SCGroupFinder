"""
Backend tests for the new Discord features + Org tag/name update.

Covers:
  1. /api/auth/me returns discord_linked/discord_username/discord_public
  2. PUT /api/user/discord-visibility (with & without linked Discord)
  3. /api/contracts poster snapshot enrichment (discord_linked & optional discord_username)
  4. /api/contracts/{id} enrichment
  5. PUT /api/orgs/{id} name/tag length + duplicate-tag validation and happy path
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else 'https://citizen-squad.preview.emergentagent.com'
ADMIN_EMAIL = 'beecroft519@gmail.com'
ADMIN_PASSWORD = 'Nv$C0m_Adm1n_2025!'
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'navcom')


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=60)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def admin_user(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    return r.json()


# ==== 1. /auth/me returns the new discord_* fields ====
class TestAuthMeDiscordFields:
    def test_me_has_discord_fields(self, admin_user):
        assert 'discord_linked' in admin_user
        assert 'discord_username' in admin_user
        assert 'discord_public' in admin_user
        # Admin was NOT signed up via Discord
        assert admin_user['discord_linked'] is False
        assert admin_user['discord_public'] is False


# ==== 2. PUT /user/discord-visibility ====
class TestDiscordVisibility:
    def test_reject_when_no_discord_linked(self, admin_session):
        r = admin_session.put(f"{BASE_URL}/api/user/discord-visibility", json={"discord_public": True}, timeout=10)
        assert r.status_code == 400
        detail = r.json().get('detail', '')
        assert 'No Discord account linked' in detail, f"Unexpected detail: {detail}"

    def test_happy_path_toggle(self, admin_session, admin_user, mongo):
        uid = admin_user['id']
        # Seed discord fields
        mongo.users.update_one({'id': uid}, {'$set': {
            'discord_id': 'test-discord-id-xyz',
            'discord_username': 'admin#1234',
            'discord_public': False,
        }})
        try:
            # /auth/me should now show discord_linked=True
            me = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
            assert me['discord_linked'] is True
            assert me['discord_username'] == 'admin#1234'
            assert me['discord_public'] is False

            # Toggle to True
            r = admin_session.put(f"{BASE_URL}/api/user/discord-visibility", json={"discord_public": True}, timeout=10)
            assert r.status_code == 200
            assert r.json()['discord_public'] is True

            me2 = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
            assert me2['discord_public'] is True

            # Toggle back to False
            r = admin_session.put(f"{BASE_URL}/api/user/discord-visibility", json={"discord_public": False}, timeout=10)
            assert r.status_code == 200
            assert r.json()['discord_public'] is False

            me3 = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
            assert me3['discord_public'] is False
        finally:
            # cleanup
            mongo.users.update_one({'id': uid}, {'$unset': {
                'discord_id': '', 'discord_username': '', 'discord_public': '',
            }})


# ==== 3 & 4. /api/contracts enrichment (list & detail) ====
class TestContractPosterEnrichment:
    def test_contracts_list_and_detail_enrichment(self, admin_session, mongo):
        contracts = admin_session.get(f"{BASE_URL}/api/contracts", timeout=15).json()
        assert isinstance(contracts, list)
        if not contracts:
            pytest.skip("No contracts in system to test enrichment")
        target = contracts[0]
        poster_id = target.get('poster_id')
        if not poster_id:
            pytest.skip("Selected contract has no poster_id")
        contract_id = target['id']

        # Every poster should already have discord_linked as bool
        for c in contracts:
            if c.get('poster') is not None:
                assert 'discord_linked' in c['poster'], f"Contract {c['id']} poster missing discord_linked: {c.get('poster')}"
                assert isinstance(c['poster']['discord_linked'], bool)

        # Read the user's original discord state to restore later
        original = mongo.users.find_one({'id': poster_id}, {'discord_id': 1, 'discord_username': 1, 'discord_public': 1})
        try:
            # Seed poster as Discord-linked and public
            mongo.users.update_one({'id': poster_id}, {'$set': {
                'discord_id': f'test-poster-{uuid.uuid4()}',
                'discord_username': 'poster#9999',
                'discord_public': True,
            }})

            # LIST
            contracts2 = admin_session.get(f"{BASE_URL}/api/contracts", timeout=15).json()
            target2 = next((c for c in contracts2 if c['id'] == contract_id), None)
            assert target2 is not None
            poster2 = target2.get('poster') or {}
            assert poster2.get('discord_linked') is True
            assert poster2.get('discord_username') == 'poster#9999'

            # DETAIL
            det = admin_session.get(f"{BASE_URL}/api/contracts/{contract_id}", timeout=10).json()
            det_poster = det.get('poster') or {}
            assert det_poster.get('discord_linked') is True
            assert det_poster.get('discord_username') == 'poster#9999'

            # Now flip discord_public=False → username should be hidden
            mongo.users.update_one({'id': poster_id}, {'$set': {'discord_public': False}})

            det2 = admin_session.get(f"{BASE_URL}/api/contracts/{contract_id}", timeout=10).json()
            det_poster2 = det2.get('poster') or {}
            assert det_poster2.get('discord_linked') is True
            assert 'discord_username' not in det_poster2 or det_poster2.get('discord_username') is None
        finally:
            unset = {}
            setback = {}
            for k in ('discord_id', 'discord_username', 'discord_public'):
                if original and original.get(k) is not None:
                    setback[k] = original[k]
                else:
                    unset[k] = ''
            update_ops = {}
            if setback:
                update_ops['$set'] = setback
            if unset:
                update_ops['$unset'] = unset
            if update_ops:
                mongo.users.update_one({'id': poster_id}, update_ops)


# ==== 5. PUT /orgs/{id} name/tag validation & happy path ====
class TestOrgUpdate:
    @pytest.fixture(scope="class")
    def owned_org(self, admin_session, admin_user, mongo):
        # Get all orgs to find one owned by admin, or use the first one
        r = admin_session.get(f"{BASE_URL}/api/orgs", timeout=10)
        assert r.status_code == 200, f"orgs list failed: {r.status_code} {r.text}"
        data = r.json()
        orgs = data.get('orgs') if isinstance(data, dict) else data
        # Prefer admin-owned org
        target = next((o for o in orgs if o.get('owner_id') == admin_user['id']), None)
        if not target and orgs:
            # Admin can edit any org anyway
            target = orgs[0]
        if not target:
            pytest.skip("No orgs available to test")
        return target

    def test_name_too_short(self, admin_session, owned_org):
        r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={"name": "AB"}, timeout=10)
        assert r.status_code == 400
        assert 'Name must be 3' in r.json().get('detail', '')

    def test_tag_too_short(self, admin_session, owned_org):
        r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={"tag": "X"}, timeout=10)
        assert r.status_code == 400
        assert 'Tag must be 2' in r.json().get('detail', '')

    def test_tag_too_long(self, admin_session, owned_org):
        r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={"tag": "TOOLONGGGG"}, timeout=10)
        assert r.status_code == 400
        assert 'Tag must be 2' in r.json().get('detail', '')

    def test_duplicate_tag(self, admin_session, owned_org, mongo):
        # Create a second org directly in db with a distinct tag
        other_id = str(uuid.uuid4())
        other_tag = 'DUPTG1'
        mongo.organizations.insert_one({
            'id': other_id, 'name': 'Test Other Org', 'tag': other_tag,
            'description': '', 'owner_id': 'fake-owner', 'members': [], 'officers': [],
            'approval_status': 'approved', 'specialties': [], 'home_regions': [], 'service_systems': [],
            'created_at': '2025-01-01T00:00:00Z',
        })
        try:
            r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={"tag": other_tag}, timeout=10)
            assert r.status_code == 400
            assert 'Tag already taken' in r.json().get('detail', '')
        finally:
            mongo.organizations.delete_one({'id': other_id})

    def test_happy_path_update(self, admin_session, owned_org, mongo):
        original = mongo.organizations.find_one({'id': owned_org['id']}, {
            '_id': 0, 'name': 1, 'tag': 1, 'description': 1, 'discord_invite_url': 1,
        })
        new_name = f"TEST Org {int(time.time()) % 100000}"
        new_tag = 'TSTX'
        new_desc = 'TEST description updated by pytest'
        new_disc = 'https://discord.gg/testinvite'
        try:
            r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={
                "name": new_name, "tag": new_tag, "description": new_desc, "discord_invite_url": new_disc,
            }, timeout=10)
            assert r.status_code == 200, f"Update failed: {r.status_code} {r.text}"
            updated = r.json()
            assert updated['name'] == new_name
            assert updated['tag'] == new_tag
            assert updated['description'] == new_desc
            assert updated['discord_invite_url'] == new_disc

            # Verify by fetching again
            got_resp = admin_session.get(f"{BASE_URL}/api/orgs", timeout=10).json()
            got = got_resp.get('orgs') if isinstance(got_resp, dict) else got_resp
            found = next((o for o in got if o['id'] == owned_org['id']), None)
            assert found is not None
            assert found['name'] == new_name
            assert found['tag'] == new_tag
        finally:
            # restore
            if original:
                mongo.organizations.update_one({'id': owned_org['id']}, {'$set': {
                    'name': original.get('name'),
                    'tag': original.get('tag'),
                    'description': original.get('description', ''),
                    'discord_invite_url': original.get('discord_invite_url'),
                }})

    def test_specialties_still_work(self, admin_session, owned_org, mongo):
        """Regression: after file-corruption fix, other fields should still update."""
        # Grab valid specialty
        original = mongo.organizations.find_one({'id': owned_org['id']}, {'_id': 0, 'specialties': 1, 'alert_categories': 1})
        try:
            r = admin_session.put(f"{BASE_URL}/api/orgs/{owned_org['id']}", json={
                "specialties": ["Combat", "Medical / Rescue"],
                "alert_categories": ["COMBAT", "RESCUE"],
                "alert_rescue_only": True,
                "alert_min_payout": 50000,
            }, timeout=10)
            assert r.status_code == 200, f"Regression failed: {r.status_code} {r.text}"
            updated = r.json()
            # specialties should be set (values might be filtered against ALLOWED_SPECIALTIES)
            assert isinstance(updated.get('specialties'), list)
            assert updated.get('alert_rescue_only') is True
            assert updated.get('alert_min_payout') == 50000
        finally:
            if original:
                mongo.organizations.update_one({'id': owned_org['id']}, {'$set': {
                    'specialties': original.get('specialties', []),
                    'alert_categories': original.get('alert_categories', []),
                }})
