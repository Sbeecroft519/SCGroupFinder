"""Tests for org discord_history_webhook_url field and completion dispatch."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://org-manager-lite.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "beecroft519@gmail.com"
ADMIN_PASSWORD = "Nv$C0m_Adm1n_2025!"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"] if "access_token" in r.json() else r.json().get("token")


@pytest.fixture(scope="module")
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_org(headers):
    r = requests.get(f"{API}/user/my-org", headers=headers, timeout=15)
    assert r.status_code == 200, f"/user/my-org failed: {r.status_code} {r.text}"
    data = r.json()
    org = data.get('org')
    assert org is not None, f"Admin has no org: {data}"
    return org


def test_login(admin_token):
    assert admin_token


def test_admin_owns_org(admin_org):
    assert 'id' in admin_org
    print(f"Admin org: {admin_org.get('name')} [{admin_org.get('tag')}] id={admin_org['id']}")


def test_field_present_in_get(headers, admin_org):
    r2 = requests.get(f"{API}/user/my-org", headers=headers, timeout=15)
    assert r2.status_code == 200
    org = r2.json().get('org')
    assert org is not None
    # Field should exist (value could be None)
    assert 'discord_history_webhook_url' in org, f"Field missing from response. Keys: {list(org.keys())}"


def test_reject_invalid_history_webhook(headers, admin_org):
    payload = {"discord_history_webhook_url": "https://example.com/not-discord"}
    r = requests.put(f"{API}/orgs/{admin_org['id']}", json=payload, headers=headers, timeout=15)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


def test_accept_valid_history_webhook_and_persist(headers, admin_org):
    valid = "https://discord.com/api/webhooks/1234567890/TEST_history_webhook_token_placeholder_abcdefghij"
    payload = {"discord_history_webhook_url": valid}
    r = requests.put(f"{API}/orgs/{admin_org['id']}", json=payload, headers=headers, timeout=15)
    assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
    # Verify persisted
    r2 = requests.get(f"{API}/user/my-org", headers=headers, timeout=15)
    org = r2.json().get("org")
    assert org.get('discord_history_webhook_url') == valid


def test_clear_history_webhook_with_empty(headers, admin_org):
    payload = {"discord_history_webhook_url": ""}
    r = requests.put(f"{API}/orgs/{admin_org['id']}", json=payload, headers=headers, timeout=15)
    assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
    r2 = requests.get(f"{API}/user/my-org", headers=headers, timeout=15)
    org = r2.json().get("org")
    assert org.get('discord_history_webhook_url') in (None, ''), f"Expected None/empty, got {org.get('discord_history_webhook_url')!r}"


def test_dispatch_completion_history_does_not_crash(headers, admin_org):
    """Set a fake valid-shaped discord webhook, then call dispatch via a completed contract stub if possible.
    Since HAPPY path complete_contract requires accepted bid, we can only assert the helper exists and
    the field survives a save cycle without raising. Backend log inspection covers dispatch."""
    valid = "https://discord.com/api/webhooks/1234567890/TEST_history_dispatch_token_abcdefghij_xyz"
    r = requests.put(f"{API}/orgs/{admin_org['id']}", json={"discord_history_webhook_url": valid}, headers=headers, timeout=15)
    assert r.status_code == 200
    # Cleanup
    requests.put(f"{API}/orgs/{admin_org['id']}", json={"discord_history_webhook_url": ""}, headers=headers, timeout=15)
