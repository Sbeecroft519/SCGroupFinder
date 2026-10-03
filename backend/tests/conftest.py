"""Shared pytest setup for backend API tests."""
import os
from pathlib import Path


def _load_public_base_url_from_frontend_env() -> str | None:
    frontend_env = Path('/app/frontend/.env')
    if not frontend_env.exists():
        return None
    for line in frontend_env.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        if key.strip() == 'REACT_APP_BACKEND_URL':
            return value.strip().strip('"').strip("'")
    return None


def _load_backend_env_key(key: str) -> str | None:
    backend_env = Path('/app/backend/.env')
    if not backend_env.exists():
        return None
    for line in backend_env.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        env_key, value = line.split('=', 1)
        if env_key.strip() == key:
            return value.strip().strip('"').strip("'")
    return None


# Ensure external preview base URL is available for all tests that read this env var at import time.
if not os.environ.get('REACT_APP_BACKEND_URL'):
    discovered = _load_public_base_url_from_frontend_env()
    if discovered:
        os.environ['REACT_APP_BACKEND_URL'] = discovered

for required_key in (
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'MONGO_URL',
    'DB_NAME',
    'VAPID_PRIVATE_KEY',
    'VAPID_PUBLIC_KEY',
    'VAPID_SUBJECT',
    'PUSH_ENDPOINT_SUFFIXES',
):
    if not os.environ.get(required_key):
        discovered = _load_backend_env_key(required_key)
        if discovered:
            os.environ[required_key] = discovered
