# Web Push operations / verification

## Configuration
- Backend uses pywebpush. Four required `.env` variables: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` (HTTPS origin or mailto contact), `PUSH_ENDPOINT_SUFFIXES`.
- `python backend/configure_web_push.py` generates missing keys once and preserves existing keys; never regenerate keys for existing subscribers. No credentials are printed. Service restart is needed after env changes.
- Public key is fetched from authenticated `/api/push/config`; private key never enters frontend code.
- Worker is push-only: no fetch handler, API caching, or stale application-shell caching.

## User check still required
1. Open the app directly in a supported HTTPS browser tab; log in as an organization owner.
2. Settings → Push Notifications → Enable on this device. Grant browser permission, then Send test.
3. Close the tab. From another admin session, approve/reject the owner's test organization (or register an org to alert an opted-in admin).
4. Confirm native notification arrives, and clicking it opens `/orgs` for owner decisions or `/admin` for new applications. Existing login protection still applies.
5. Disable on this device or log out; another opted-in device must remain subscribed. Shared-device/account switching must not expose previous-user notifications.
- iPhone/iPad requires iOS/iPadOS 16.4+, Home Screen installation and permission granted from user interaction. OS/browser background settings can prevent delivery; this cannot be overridden by application code.
- Headless test environment currently forces permission denied. Worker registration/handler/recipient guard and backend tests passed, but genuine closed-tab provider delivery must be checked above.

## Persistence
- `push_subscriptions`: authenticated user/device endpoint, encryption keys, 90-day expiry renewed on app visits.
- `push_events`: org event/inbox payload, per-device delivered hashes, leased retry status; 30-day retention, maximum six attempts.
- Inspect `state=failed` for exhausted delivery retries. Logs omit endpoint/key values. Gone endpoints (404/410) are removed.
- Inbox read/clear persists across app reloads independently of native push permission.