"""Regression tests for push notification APIs and delivery queue behavior."""
import base64
import asyncio
import hashlib
import os
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_DIR = Path('/app/backend')
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from push_notifications import PushNotifications


BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def _valid_subscription(endpoint: str) -> dict:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return {
        "endpoint": endpoint,
        "keys": {
            "p256dh": _b64url(public_bytes),
            "auth": _b64url(secrets.token_bytes(16)),
        },
    }


@pytest.fixture(scope="module")
def admin_token():
    last_error = None
    for _ in range(3):
        try:
            response = requests.post(
                f"{API}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=30,
            )
            if response.status_code != 200:
                pytest.skip(f"admin login failed: {response.status_code} {response.text}")
            return response.json()["token"]
        except Exception as exc:
            last_error = exc
    pytest.skip(f"admin login timed out repeatedly: {last_error}")


@pytest.fixture(scope="module")
def demo_token():
    last_error = None
    for _ in range(3):
        try:
            response = requests.post(f"{API}/auth/demo-login", timeout=30)
            assert response.status_code == 200, response.text
            return response.json()["token"]
        except Exception as exc:
            last_error = exc
    pytest.skip(f"demo login timed out repeatedly: {last_error}")


@pytest.fixture(scope="module")
def demo_user(demo_token):
    response = requests.get(f"{API}/auth/me", headers=_auth(demo_token), timeout=30)
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def admin_user(admin_token):
    response = requests.get(f"{API}/auth/me", headers=_auth(admin_token), timeout=30)
    assert response.status_code == 200
    return response.json()


@pytest.fixture
def endpoint_cleanup_tracker():
    tracked = []
    yield tracked
    for endpoint, token in tracked:
        try:
            requests.delete(
                f"{API}/push/subscriptions",
                json={"endpoint": endpoint},
                headers=_auth(token),
                timeout=10,
            )
        except Exception:
            pass


def _unique_endpoint(label: str) -> str:
    return f"https://fcm.googleapis.com/fcm/send/{label}-{uuid.uuid4().hex}"


def test_push_config_public_only(demo_token):
    response = requests.get(f"{API}/push/config", headers=_auth(demo_token), timeout=30)
    assert response.status_code == 200, response.text
    data = response.json()
    assert isinstance(data.get("public_key"), str)
    assert len(data["public_key"]) > 20
    assert "private_key" not in data


def test_subscribe_idempotent_and_auth_ownership(demo_token, admin_token, endpoint_cleanup_tracker):
    endpoint = _unique_endpoint("idem")
    endpoint_cleanup_tracker.append((endpoint, demo_token))
    payload = _valid_subscription(endpoint)
    payload["user_id"] = "spoofed-user-ignored"

    first = requests.post(f"{API}/push/subscriptions", json=payload, headers=_auth(demo_token), timeout=30)
    assert first.status_code == 200, first.text
    assert first.json().get("enabled") is True

    second = requests.post(f"{API}/push/subscriptions", json=payload, headers=_auth(demo_token), timeout=30)
    assert second.status_code == 200, second.text

    hijack = requests.post(f"{API}/push/subscriptions", json=payload, headers=_auth(admin_token), timeout=30)
    assert hijack.status_code == 409, hijack.text

    foreign_test = requests.post(f"{API}/push/test", json={"endpoint": endpoint}, headers=_auth(admin_token), timeout=30)
    assert foreign_test.status_code == 404, foreign_test.text


def test_subscription_endpoint_validation_rejects_non_vendor(demo_token):
    payload = _valid_subscription(f"https://example.com/push/{uuid.uuid4().hex}")
    response = requests.post(f"{API}/push/subscriptions", json=payload, headers=_auth(demo_token), timeout=30)
    assert response.status_code == 400, response.text
    assert "Invalid or unsupported push endpoint" in response.text


def test_device_cap_limit_10(demo_token, endpoint_cleanup_tracker):
    endpoints = [_unique_endpoint(f"cap{i}") for i in range(11)]
    for endpoint in endpoints[:10]:
        endpoint_cleanup_tracker.append((endpoint, demo_token))
        res = requests.post(
            f"{API}/push/subscriptions",
            json=_valid_subscription(endpoint),
            headers=_auth(demo_token),
            timeout=30,
        )
        assert res.status_code == 200, res.text

    overflow = requests.post(
        f"{API}/push/subscriptions",
        json=_valid_subscription(endpoints[10]),
        headers=_auth(demo_token),
        timeout=30,
    )
    assert overflow.status_code == 409, overflow.text
    assert "Device limit reached" in overflow.text


def test_push_test_rate_limit(demo_token, endpoint_cleanup_tracker):
    endpoint = _unique_endpoint("ratelimit")
    endpoint_cleanup_tracker.append((endpoint, demo_token))
    sub = requests.post(
        f"{API}/push/subscriptions",
        json=_valid_subscription(endpoint),
        headers=_auth(demo_token),
        timeout=30,
    )
    assert sub.status_code == 200, sub.text

    first = requests.post(f"{API}/push/test", json={"endpoint": endpoint}, headers=_auth(demo_token), timeout=30)
    assert first.status_code == 202, first.text

    second = requests.post(f"{API}/push/test", json={"endpoint": endpoint}, headers=_auth(demo_token), timeout=30)
    assert second.status_code == 429, second.text


def test_inbox_isolation_and_mark_read(demo_token, admin_token):
    tag = f"P{uuid.uuid4().hex[:5].upper()}"
    created = requests.post(
        f"{API}/orgs/register",
        json={"name": f"TEST_PUSH_{tag}", "tag": tag, "description": "push inbox test"},
        headers=_auth(demo_token),
        timeout=30,
    )
    assert created.status_code == 200, created.text
    org_id = created.json()["id"]

    try:
        approved = requests.post(f"{API}/admin/orgs/{org_id}/approve", headers=_auth(admin_token), timeout=30)
        assert approved.status_code == 200, approved.text

        inbox_demo = requests.get(f"{API}/push/inbox", headers=_auth(demo_token), timeout=30)
        assert inbox_demo.status_code == 200
        events = inbox_demo.json()
        target = next((e for e in events if e.get("org_id") == org_id and e.get("type") == "org_approved"), None)
        assert target is not None
        assert target["read"] is False

        inbox_admin = requests.get(f"{API}/push/inbox", headers=_auth(admin_token), timeout=30)
        assert inbox_admin.status_code == 200
        assert not any(
            e.get("org_id") == org_id and e.get("type") == "org_approved"
            for e in inbox_admin.json()
        )

        mark_one = requests.put(f"{API}/push/inbox/{target['id']}/read", headers=_auth(demo_token), timeout=30)
        assert mark_one.status_code == 200

        refreshed = requests.get(f"{API}/push/inbox", headers=_auth(demo_token), timeout=30).json()
        refreshed_target = next((e for e in refreshed if e.get("id") == target["id"]), None)
        assert refreshed_target is not None and refreshed_target["read"] is True
    finally:
        requests.delete(f"{API}/admin/orgs/{org_id}", headers=_auth(admin_token), timeout=20)


def _db_client():
    return AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]


def test_queue_410_cleanup(monkeypatch):
    async def _run():
        db = _db_client()
        service = PushNotifications(db)
        await service.initialize()
        endpoint = _unique_endpoint("gone")
        user_id = f"u-{uuid.uuid4().hex[:8]}"
        await db.push_subscriptions.insert_one({
            "endpoint": endpoint,
            "user_id": user_id,
            "keys": _valid_subscription(endpoint)["keys"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        })
        event = {
            "id": f"evt-{uuid.uuid4().hex[:8]}",
            "type": "org_approved",
            "title": "approved",
            "message": "ok",
            "link": "/orgs",
            "target_user_id": user_id,
            "attempts": 0,
            "delivered": [],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        }
        await db.push_events.insert_one(event)

        class _Resp:
            status_code = 410

        async def _ok(_):
            return None

        monkeypatch.setattr('push_notifications.validate_endpoint', _ok)
        monkeypatch.setattr(service, '_send', lambda *_args, **_kwargs: _Resp())

        await service.deliver(event)
        removed = await db.push_subscriptions.find_one({"endpoint": endpoint})
        assert removed is None

    asyncio.run(_run())


def test_queue_retry_and_per_device_dedupe(monkeypatch):
    async def _run():
        db = _db_client()
        service = PushNotifications(db)
        await service.initialize()
        endpoint = _unique_endpoint("dedupe")
        user_id = f"u-{uuid.uuid4().hex[:8]}"
        await db.push_subscriptions.insert_one({
            "endpoint": endpoint,
            "user_id": user_id,
            "keys": _valid_subscription(endpoint)["keys"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        })
        event_id = f"evt-{uuid.uuid4().hex[:8]}"
        event = {
            "id": event_id,
            "type": "org_approved",
            "title": "approved",
            "message": "ok",
            "link": "/orgs",
            "target_user_id": user_id,
            "attempts": 0,
            "delivered": [],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        }
        await db.push_events.insert_one(event)

        calls = {"count": 0}

        async def _ok(_):
            return None

        class _Resp:
            status_code = 201

        def _send(*_args, **_kwargs):
            calls["count"] += 1
            return _Resp()

        monkeypatch.setattr('push_notifications.validate_endpoint', _ok)
        monkeypatch.setattr(service, '_send', _send)

        await service.deliver(event)
        latest = await db.push_events.find_one({"id": event_id}, {"_id": 0})
        assert latest["state"] == "sent"
        assert calls["count"] == 1

        digest = hashlib.sha256(endpoint.encode()).hexdigest()
        latest["delivered"] = [digest]
        await service.deliver(latest)
        assert calls["count"] == 1

    asyncio.run(_run())


def test_queue_marks_pending_on_transient_failure(monkeypatch):
    async def _run():
        db = _db_client()
        service = PushNotifications(db)
        await service.initialize()
        endpoint = _unique_endpoint("retry")
        user_id = f"u-{uuid.uuid4().hex[:8]}"
        await db.push_subscriptions.insert_one({
            "endpoint": endpoint,
            "user_id": user_id,
            "keys": _valid_subscription(endpoint)["keys"],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        })
        event_id = f"evt-{uuid.uuid4().hex[:8]}"
        event = {
            "id": event_id,
            "type": "org_approved",
            "title": "approved",
            "message": "ok",
            "link": "/orgs",
            "target_user_id": user_id,
            "attempts": 0,
            "delivered": [],
            "expires_at": datetime.now(timezone.utc) + timedelta(days=5),
        }
        await db.push_events.insert_one(event)

        async def _ok(_):
            return None

        def _raise(*_args, **_kwargs):
            raise RuntimeError("provider down")

        monkeypatch.setattr('push_notifications.validate_endpoint', _ok)
        monkeypatch.setattr(service, '_send', _raise)

        await service.deliver(event)
        updated = await db.push_events.find_one({"id": event_id}, {"_id": 0})
        assert updated["state"] == "pending"
        assert updated["attempts"] == 1

    asyncio.run(_run())
