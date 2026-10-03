# Authentication regression scope
Existing JWT/login/password logic is unchanged. Only browser notification permission prompts and current-device logout cleanup changed.
- Read memory/test_credentials.md; log in through the existing /api/auth/login endpoint; /api/auth/me uses the returned Bearer token.
- Enabling push requires an explicit Settings button click, never login or initial page load.
- Logout must pause the service worker, unsubscribe only this browser and clear its local token. Other devices remain subscribed.
- Test account switching and offline logout privacy; push payload recipient must match the persisted worker owner.
- Do not migrate existing token/cookie/password formats or alter account credentials during this regression.