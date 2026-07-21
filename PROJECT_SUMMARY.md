# Star Citizen Group Finder — Project Summary

## What it is
**Star Citizen Group Finder** (SCGF) is a player-to-player job board and group-finder for the Star Citizen community, hosted at **https://scgroupfinder.com**. Players post and join LFG groups, paid contracts, and medical rescues, with real-time notifications, Discord webhook dispatch per organization, and mandatory RSI-handle verification.

## Tech Stack
- **Frontend**: React 18 (CRA), Shadcn/UI, Lucide, Sonner
- **Backend**: FastAPI (async), Motor (MongoDB), httpx, python-jose (JWT), bcrypt
- **Database**: MongoDB
- **Realtime**: Server-Sent Events (`/api/notifications/stream`)
- **Auth**: Email + password OR Discord OAuth2 — both routed through RSI verification
- **Hosting**: Emergent (Kubernetes) — preview + production with custom domain

## Architecture
```
/app
├── backend/
│   ├── server.py        # FastAPI app (~4700 lines — planned split)
│   ├── ships.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/       # Contracts (Job Board), Organizations, ContractDetails,
│       │                # Login, Register, Admin, Settings, Profile,
│       │                # Signals, Intel, Roadmap, CitizenDirectory, ...
│       ├── components/  # Header, MobileNav, NotificationBell, AlertTicker,
│       │                # DiscordBadge, QuickActionsFAB, Footer, ...
│       ├── hooks/       # useSSENotifications, useContractPolling, useNotifications
│       └── utils/       # sounds, formatting, etc.
└── memory/              # PRD, changelog, test credentials
```

## Core Features

### 1. Job Board (Contracts)
- Types: **LFG**, **Paid Job**, **Medical Rescue**
- Categories: Combat / Medical / Logistics / Industrial / Other
- Timing: **Looking Now** (`duration_minutes`) or **Future Time** (`scheduled_start_at`, 4h active window)
- Join modes: **single** (bid → accept) or **multi** (up to `max_participants`)
- Multi-crew manifest support (per-slot hiring)
- Private rescue fields stripped from all public payloads and Discord dispatches

### 2. Organizations (admin-invitation only)
- Admin invites owner → **persistent bell + toast org invite** for the invited user; auto-accepts when they open `/orgs`
- Owner / officers edit **name, tag, description, RSI URL, Discord invite URL, logo, banner, specialties, home regions, service systems**
- Private **Discord Webhook URL** + per-route dispatch filters (category, region, system, timing, rescue-only, min payout)
- Admin can **approve / reject / reassign / delete** any org

### 3. Auth (RSI-verified, non-negotiable)
- Register with email + password OR sign in via Discord OAuth2 (`identify + email`)
- Both flows funnel into RSI-handle verification (biography token match on the public RSI profile)
- Users can toggle **Discord username visibility** in Settings; when public, a Discord badge shows next to their handle on the Job Board and Contract Details

### 4. Real-time Notifications (SSE)
- Types: `new_contract`, `new_bid`, `bid_accepted`, `intel_alert`, `org_invite`
- Per-user targeting via `target_user_id`
- Client honours user notification settings (categories, threat alerts, etc.)
- Persistent org invites seeded from `GET /api/user/org-invites` on mount so they survive refresh / offline

### 5. Signals (player intel)
- Player-reported pirates, PvP, lag, mission/cargo bugs
- Feeds `AlertTicker` and the Intel risk model
- Shard-aware

### 6. Reputation
- Rank: CIVILIAN → FREELANCER → ASSOCIATE → OPERATIVE → VETERAN → ELITE → LEGEND (contract counts)
- Two-way 1–5-star ratings on completed contracts
- Supporter badges (admin-assignable)

### 7. Theme system
- Multiple themes via CSS variables + `[data-theme]` on `<html>`; persisted on the user record

### 8. Admin panel
- Users: list / export CSV / assign badges / reset password
- Orgs: invite owner, approve / reject / reassign / delete
- Roadmap CRUD
- Demo mode + maintenance tooling (future-post expiry repair, etc.)

## Key Database Collections
- `users` — accounts, verification, Discord link, visibility, theme, admin flag
- `organizations` — name / tag / description, owner, officers, members, webhook, alert routes, approval status, `owner_pending` invite flag
- `contracts` — timing/join mode, participants, manifest, rescue-private fields, status
- `contract_bids`, `contract_ratings`
- `reports` (signals) · `notification_settings` · `roadmap`

## API Highlights
```
POST /api/auth/register  |  /login  |  /demo-login  |  GET /api/auth/me
GET  /api/auth/discord/login  |  /callback  |  POST /api/auth/discord/complete

GET  /api/contracts        POST /api/contracts
POST /api/contracts/{id}/bid           /accept-bid/{bidId}          /join

GET  /api/orgs             PUT  /api/orgs/{id}
POST /api/orgs/{id}/discord-webhook    /test-discord
CRUD /api/orgs/{id}/routes[/…]

GET  /api/user/my-org             GET  /api/user/org-invites
POST /api/user/org-invites/{org_id}/accept
PUT  /api/user/discord-visibility

Admin: POST /api/orgs (invite)  |  GET /api/admin/orgs
       POST /api/admin/orgs/{id}/{approve|reject|reassign}
       DELETE /api/admin/orgs/{id}

GET  /api/notifications/stream (SSE)
POST /api/signals/report        GET /api/signals/alerts
```

## External Integrations
- **Discord OAuth2** — login/signup (never bypasses RSI verification)
- **Discord Webhooks** — per-org dispatch with route filtering
- **RSI public profile** — token-in-bio verification
- **UEXcorp API** — Star Citizen location data (cached 24h) + hardcoded fallbacks for Pyro / Nyx

## User Flow
1. Landing page → LOGIN / REGISTER / Discord Sign-in
2. Register (or Discord OAuth) → **mandatory RSI handle verification**
3. Onboarding carousel + shard prompt
4. Job Board (contracts), Orgs, Signals, Directory, Profile, Settings
5. Admin-invited users become Org owners → persistent bell/toast invite → open `/orgs` to configure

## Design Philosophy
- MobiGlass-inspired aesthetic (dark backgrounds, cyan/orange accents)
- Monospace fonts for data, display fonts for headers
- Glow / grain / subtle animations
- Mobile bottom-nav + FAB

## Backlog
- **P1** Refactor `server.py` and `Contracts.jsx` into modular files
- **P2** Mobile responsive polish, advanced org dispatch (role mentions), audit log for admin org actions
- **P3** Service worker push notifications

## Critical Notes for Developers
1. All API routes prefixed with `/api` (K8s ingress rule).
2. Frontend uses `REACT_APP_BACKEND_URL` from `.env`.
3. MongoDB `_id` must be excluded from every response (`{'_id': 0}`).
4. SSE queue is in-memory; persistent notifications (e.g. org invites) also seed from REST on mount.
5. **Discord OAuth must not bypass RSI verification.**
6. `DISCORD_REDIRECT_URI` must match a URI registered in the Discord Developer Portal (currently `https://scgroupfinder.com/api/auth/discord/callback`).
