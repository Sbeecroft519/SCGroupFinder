# Iteration 23 follow-up — September 16, 2026

## Fixed and reverified
- New push endpoints had reused an optional auth dependency. Added module-local required-user dependency, without altering existing JWT/auth flows. External curl: config/inbox with absent or invalid token all return **401**, not 500.
- LFG→Paid now preserves entered payout (110000 verified in browser); LFG API payload remains zero/no payout.
- Tickers no longer use an off-canvas duplicated marquee; rotate alerts in a constrained wrapping area. Desktop/mobile populated org-route stress checks return `OVERFLOW []`.
- Landing header now wraps at narrow widths, with constrained actions; removed off-canvas decorative glows.
- Backend regression rerun: **30 passed**, zero skipped. XML: `pytest/iteration23_retest.xml`. An earlier rerun was blocked by leftover TESTU7438 org fixture; used for stress check and then deleted before successful rerun.
- VAPID private key parsing, worker JS syntax, manifest/icon presence verified. Build passes with existing hook-dependency warnings.
- Actual root-scope worker registration passed. Handler test used **MOCKED showNotification** only in test browser: correct title/url, one notification for correct owner, none after owner cleared. Runtime remains real Web Push.

## Not a passed live-delivery test
- Test browser forces `Notification.permission=denied`; actual subscription/provider/native closed-tab delivery could not be verified. See `memory/WEB_PUSH.md` for device acceptance procedure.

## Scope clarification on original report
- SHA-256 password storage, lack of login lockout, bearer-only sessions, and admin password seed reconciliation are pre-existing architecture/hardening findings, not refactor regressions. User approved UI/refactor/Web Push work, not an authentication migration; track separate follow-up rather than silently changing login/session/password behavior.
- Large server.py and Settings.jsx remain backlog. Requested Contracts.jsx and Organizations.jsx are now thin pages with focused components.