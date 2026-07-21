# Star Citizen Group Finder

A player-to-player job board and group-finder for Star Citizen. Post and join LFG groups, paid contracts, and medical rescues — with real-time notifications, org dispatch to Discord, and RSI-verified player identity.

**Live**: https://scgroupfinder.com

---

## What it is

Star Citizen Group Finder ("SCGF") is a companion web app that helps Star Citizen players:

- **Post and find jobs** — LFG events, paid contracts (Combat / Medical / Logistics / Industrial / Other), and medical rescues with private location data.
- **Multi-join events** — Multiple crew members can join the same LFG post / future-time event; single-contractor jobs still use the classic bid → accept flow.
- **Multi-crew manifests** — Contract posters can define crew slots (pilot, gunner, medic, etc.) and hire per-slot.
- **Real-time alerts** — SSE push for new contracts, bids, bid acceptances, org invites, and player-reported intel (pirates, PvP, lag, server issues).
- **Public Org profiles** — Admin-invited organizations with an editable public listing (name, tag, description, Discord invite link) and a private Discord Webhook dispatch pipeline that filters contracts by region / category / payout.
- **RSI-verified identity** — Every account is bound to a real RSI handle via the public RSI profile page (biography token verification). Discord OAuth is available but never bypasses RSI verification.

---

## Tech stack

| Layer      | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| Frontend   | React 18 + CRA, Shadcn/UI, Lucide icons, Sonner toasts                 |
| Backend    | FastAPI (async), Motor (MongoDB), httpx, python-jose (JWT), bcrypt     |
| Realtime   | Server-Sent Events (`/api/notifications/stream`)                       |
| Auth       | Email + password (bcrypt) OR Discord OAuth2 (both → RSI verify)        |
| Storage    | MongoDB                                                                 |
| Hosting    | Emergent (Kubernetes) — preview + production, custom domain            |

---

## Repo layout

```
/app
├── backend/
│   ├── server.py              # FastAPI app (large — see Roadmap for split)
│   ├── ships.py               # Static ship data
│   └── requirements.txt
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── Contracts.jsx           # Job Board
│       │   ├── ContractDetails.jsx
│       │   ├── Organizations.jsx       # Public + MyOrg management
│       │   ├── Login.jsx / Register.jsx
│       │   ├── Settings.jsx / Profile.jsx / Admin.jsx
│       │   ├── Signals.jsx / Intel.jsx / Roadmap.jsx
│       │   └── ...
│       ├── components/
│       │   ├── Header.jsx / MobileNav.jsx / NotificationBell.jsx
│       │   ├── AlertTicker.jsx / DiscordBadge.jsx / ...
│       ├── hooks/
│       │   ├── useSSENotifications.js
│       │   ├── useContractPolling.js
│       │   └── useNotifications.js
│       └── utils/
└── memory/
    ├── PRD.md                 # Product requirements + changelog
    └── test_credentials.md
```

---

## Core features

### 1. Job Board (`/contracts`)
- Post types: **LFG**, **Paid Job**, **Medical Rescue**, plus category (Combat / Medical / Logistics / Industrial / Other).
- Timing: **Looking Now** (`duration_minutes`) or **Future Time** (`scheduled_start_at`, 4h active window).
- Join modes: **single** (bid → accept) or **multi** (accept multiple joiners up to `max_participants`).
- Multi-crew manifest: define crew slots, hire per slot.
- Private rescue fields (`rescue_exact_location`, `rescue_body_location`, `rescue_private_notes`) are stripped from all public payloads and Discord dispatches.

### 2. Organizations (`/orgs`) — admin-invitation only
- Admin invites a user as owner (`POST /api/orgs`); the new owner gets a **persistent Org Invite** in the bell + a toast (auto-accepts when they open `/orgs`).
- Owner / officers can edit **name / tag / description / RSI org URL / Discord invite URL / logo / banner / specialties / home regions / service systems**.
- Owner sets a **Discord Webhook URL** (private) and creates **alert routes** — per-route filters on category, region, system, timing, rescue-only, and minimum payout. When a contract is created, the backend fans out to every matching route, stripping private rescue fields.
- Admin can **approve / reject / reassign / delete** any org from the Admin panel.

### 3. Auth
- **RSI verification is mandatory.** Both email/password registration and Discord OAuth funnel into an RSI-handle verification step (token pasted into the RSI public bio).
- Discord OAuth uses `identify + email` scopes; the `DISCORD_REDIRECT_URI` env var drives the callback origin.
- User can toggle **Discord username public visibility** in Settings; when public, a Discord badge is shown next to their handle on the Job Board and Contract Details.

### 4. Real-time notifications
- SSE endpoint: `GET /api/notifications/stream` (per-user targeting via `target_user_id`).
- Types: `new_contract`, `new_bid`, `bid_accepted`, `intel_alert`, `org_invite`.
- Client-side filters honour user notification settings (contract categories, threat alerts, etc.).
- Persistent org invites are also seeded from `GET /api/user/org-invites` on client mount, so they survive refresh / offline.

### 5. Signals (`/signals`)
- Player-reported intel: pirates, PvP, lag, mission bugs, cargo bugs.
- Shard-aware; feeds `AlertTicker` and the Intel risk model.

### 6. Reputation
- Rank progression from contract counts (CIVILIAN → LEGEND).
- Two-way 1–5-star ratings on completed contracts.
- Supporter badges assignable by admin.

### 7. Admin panel (`/admin`)
- Users: view / export / assign badges / password reset.
- Orgs: invite owner, approve / reject / **reassign** / **delete** any org.
- Roadmap CRUD.
- Demo mode + maintenance tools (future-post expiry repair, etc.).

---

## Key API endpoints

Auth:
- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/demo-login` · `GET /api/auth/me`
- `GET /api/auth/discord/login` · `GET /api/auth/discord/callback` · `POST /api/auth/discord/complete`

Contracts:
- `GET /api/contracts` · `GET /api/contracts/{id}` · `POST /api/contracts`
- `POST /api/contracts/{id}/bid` · `POST /api/contracts/{id}/accept-bid/{bidId}`
- `POST /api/contracts/{id}/join` (multi-join)

Orgs:
- `GET /api/orgs` · `GET /api/orgs/{id}` · `PUT /api/orgs/{id}`
- `POST /api/orgs/{id}/join` · `POST /api/orgs/{id}/leave`
- `POST /api/orgs/{id}/discord-webhook` · `POST /api/orgs/{id}/test-discord`
- `GET/POST/PUT/DELETE /api/orgs/{id}/routes[/…]`
- `GET /api/user/my-org` · `GET /api/user/org-invites` · `POST /api/user/org-invites/{org_id}/accept`

Admin-only:
- `POST /api/orgs` (invite owner) · `GET /api/admin/orgs`
- `POST /api/admin/orgs/{id}/approve` · `POST /api/admin/orgs/{id}/reject`
- `POST /api/admin/orgs/{id}/reassign` · `DELETE /api/admin/orgs/{id}`

Realtime + user:
- `GET /api/notifications/stream` (SSE)
- `GET/PUT /api/user/notification-settings` · `PUT /api/user/discord-visibility`

Signals / Intel:
- `POST /api/signals/report` · `GET /api/signals/alerts` · `GET /api/signals/reports`

---

## Data model (high-level)

- **users** — `{id, rsi_handle, email, password_hash, is_verified, discord_id, discord_username, discord_public, contact_opt_in, theme_id, is_admin, supporter_tier, …}`
- **organizations** — `{id, name, tag, description, owner_id, owner_handle, officers, members, discord_webhook_url, discord_invite_url, alert_routes[], approval_status, owner_pending, …}`
- **contracts** — `{id, poster_id, category, timing_type, scheduled_start_at, join_mode, max_participants, accepted_participants, is_multi_crew, manifest, rescue_*, expires_at, status, …}`
- **contract_bids**, **contract_ratings**, **reports**, **notification_settings**, **roadmap**

---

## Environment variables

Backend (`/app/backend/.env`):
```
MONGO_URL=…
DB_NAME=…
JWT_SECRET=…
DISCORD_CLIENT_ID=…
DISCORD_CLIENT_SECRET=…
DISCORD_REDIRECT_URI=https://scgroupfinder.com/api/auth/discord/callback
```

Frontend (`/app/frontend/.env`):
```
REACT_APP_BACKEND_URL=<preview or production origin>
```

Every backend route is prefixed with `/api` so ingress routes correctly.

---

## Deployment

- **Preview (dev)**: Emergent-hosted, hot-reload via supervisor.
- **Production**: Deployed to Emergent, custom domain **scgroupfinder.com** (Discord OAuth redirect URI registered against the same domain).
- Redeploy from Emergent to sync changes from preview → production.

---

## Roadmap

**P1**
- Refactor `server.py` (~4700 lines) into route modules (`routes/auth.py`, `routes/contracts.py`, `routes/orgs.py`, `routes/discord.py`).
- Refactor `Contracts.jsx` (~2400 lines) into smaller components (`CreatePostModal`, `ContractCard`, filter drawer).

**P2**
- Mobile responsive polish across all pages.
- Advanced org dispatch (role mentions, per-route custom messages).
- Audit log for admin actions (reassign / delete / approve).

**P3**
- Service worker push notifications.

---

## Notes for contributors

1. **All API routes must be prefixed with `/api`** (K8s ingress rule).
2. Frontend must use `process.env.REACT_APP_BACKEND_URL` — never a hard-coded origin.
3. MongoDB documents must strip `_id` (`{'_id': 0}` projection) before returning JSON.
4. SSE notifications broadcast via an in-memory queue — they are per-connection, not persisted. Persistent flows (like org invites) additionally seed from REST on mount.
5. Discord OAuth **must not** bypass RSI verification — this is a design guarantee against bots/griefers.
6. RSI verification is done by matching a per-user token pasted into the public RSI bio.
