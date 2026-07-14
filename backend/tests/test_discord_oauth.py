"""Discord OAuth endpoint tests.

Verifies:
- /api/auth/discord/login redirects to Discord's authorize URL with correct params.
- /api/auth/discord/callback with missing code redirects to /login?discord_error=missing_code.
- /api/auth/discord/complete rejects bogus and wrong-scope tokens.
"""
import os
import datetime
from urllib.parse import urlparse, parse_qs

import jwt
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://group-finder-board.preview.emergentagent.com").rstrip("/")
JWT_SECRET = "navcom-dev-secret-key-2025"
JWT_ALG = "HS256"

EXPECTED_CLIENT_ID = "1526294227099713556"
EXPECTED_REDIRECT_URI = "https://group-finder-board.preview.emergentagent.com/api/auth/discord/callback"


# --- Discord login redirect ---
class TestDiscordLoginRedirect:
    def test_login_returns_redirect_to_discord(self):
        resp = requests.get(f"{BASE_URL}/api/auth/discord/login", allow_redirects=False, timeout=15)
        assert resp.status_code in (302, 307), f"Expected redirect, got {resp.status_code} - {resp.text[:200]}"

        location = resp.headers.get("location") or resp.headers.get("Location")
        assert location, "Missing Location header"
        assert location.startswith("https://discord.com/api/oauth2/authorize"), f"Unexpected location: {location}"

        parsed = urlparse(location)
        qs = parse_qs(parsed.query)
        assert qs.get("client_id", [""])[0] == EXPECTED_CLIENT_ID
        assert qs.get("redirect_uri", [""])[0] == EXPECTED_REDIRECT_URI
        assert qs.get("response_type", [""])[0] == "code"
        assert qs.get("scope", [""])[0] == "identify email"


# --- Discord callback missing code ---
class TestDiscordCallbackMissingCode:
    def test_callback_no_code_redirects_with_error(self):
        resp = requests.get(f"{BASE_URL}/api/auth/discord/callback", allow_redirects=False, timeout=15)
        assert resp.status_code in (302, 307), f"Expected redirect, got {resp.status_code}"

        location = resp.headers.get("location") or resp.headers.get("Location")
        assert location, "Missing Location header"
        parsed = urlparse(location)
        assert parsed.path == "/login", f"Should redirect to /login, got {parsed.path}"
        qs = parse_qs(parsed.query)
        assert qs.get("discord_error", [""])[0] == "missing_code"

    def test_callback_error_param_propagated(self):
        resp = requests.get(
            f"{BASE_URL}/api/auth/discord/callback?error=access_denied",
            allow_redirects=False,
            timeout=15,
        )
        assert resp.status_code in (302, 307)
        location = resp.headers.get("location") or resp.headers.get("Location")
        parsed = urlparse(location)
        qs = parse_qs(parsed.query)
        assert qs.get("discord_error", [""])[0] == "access_denied"


# --- Discord complete: invalid tokens ---
class TestDiscordCompleteTokenValidation:
    def test_bogus_pending_token_rejected(self):
        resp = requests.post(
            f"{BASE_URL}/api/auth/discord/complete",
            json={
                "pending_token": "not.a.jwt",
                "rsi_handle": "TestPilot",
                "verification_code": "NAV-123",
            },
            timeout=15,
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        detail = resp.json().get("detail", "")
        assert "Invalid or expired" in detail, f"Unexpected detail: {detail}"

    def test_wrong_scope_token_rejected(self):
        """A JWT signed with the correct secret but with scope != 'discord_pending' must be rejected."""
        payload = {
            "user_id": "test-uid",
            "scope": "auth",  # NOT discord_pending
            "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=30),
        }
        wrong_scope_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

        resp = requests.post(
            f"{BASE_URL}/api/auth/discord/complete",
            json={
                "pending_token": wrong_scope_token,
                "rsi_handle": "TestPilot",
                "verification_code": "NAV-123",
            },
            timeout=15,
        )
        assert resp.status_code == 401, f"Expected 401 for wrong-scope, got {resp.status_code}: {resp.text}"
        detail = resp.json().get("detail", "")
        assert "Invalid or expired" in detail

    def test_expired_pending_token_rejected(self):
        payload = {
            "user_id": "test-uid",
            "scope": "discord_pending",
            "exp": datetime.datetime.utcnow() - datetime.timedelta(minutes=5),
        }
        expired_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
        resp = requests.post(
            f"{BASE_URL}/api/auth/discord/complete",
            json={
                "pending_token": expired_token,
                "rsi_handle": "TestPilot",
                "verification_code": "NAV-123",
            },
            timeout=15,
        )
        assert resp.status_code == 401
