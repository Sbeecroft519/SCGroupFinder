# Star Citizen Group Finder (formerly NavCom Connect) - PRD

## Product Positioning (Feb 28, 2026)
**Name:** Star Citizen Group Finder / SC Group Finder
**Tagline:** Player Contract Board
**Purpose:** Player-to-player mission, contract, and LFG board for Star Citizen. Post jobs, review applicants, build two-way reputation — no more Global chat roulette.

## Original Problem Statement (historical)
Previously branded "NavCom Connect / Mission Advisor." Rebranded and repositioned around Job Board as the primary product on Feb 28, 2026 while preserving all existing feature code.

## Tech Stack
- **Frontend**: React.js with Tailwind CSS, Recharts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: Socket.IO + SSE; durable organization inbox + Web Push
- **Payments**: Stripe

## What's Been Implemented (Feb 14, 2026)

### Discord OAuth Login/Signup - COMPLETE
- [x] `GET /api/auth/discord/login` — redirects to Discord OAuth (scopes: `identify email`)
- [x] `GET /api/auth/discord/callback` — exchanges code, upserts user by discord_id or email, routes to frontend
- [x] `POST /api/auth/discord/complete` — Discord users must supply RSI handle + verification code before receiving a JWT (RSI verification is NOT bypassed)
- [x] Short-lived signed pending token (`scope=discord_pending`, 30 min) prevents cross-user hijack
- [x] "Continue with Discord" button on `/login` and "Sign up with Discord" on `/register`
- [x] Env vars: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` in `backend/.env`
- [x] **Production deploy TODO**: user must add production callback URL (`https://<prod-domain>/api/auth/discord/callback`) in Discord Developer Portal → OAuth2 → Redirects


## What's Been Implemented (Jan 29, 2026)

### Core Features - COMPLETE
- [x] MobiGlass UI theme (renamed from NavCom theme)
- [x] JWT authentication with RSI Handle verification
- [x] RSI profile avatar scraping (verified with handle "Mowri")
- [x] 6-slide onboarding carousel (rebranded for SC Group Finder; final slide = Set Your Server Region)
- [x] Session-based Server Region (backend field `shard` kept for compatibility)
- [x] Protected routes (all require login)
- [x] **Mobile Bottom Navigation** - Fixed nav bar at bottom (<768px) with Jobs, Signals, Lounge, Intel, Roadmap (Directory removed Feb 28, 2026)
- [x] **Avatar Preset System** - 10 role-based SVG icons selectable in Settings (replaces complex file uploads)
- [x] **Community Badge** - "Made by the Community" badge on Login, Register, and Settings pages

### INTEL Module - COMPLETE
- [x] Mission recommendations (Cargo, Mining, Chill, Combat, Salvage, FPS)
- [x] Live UEX Corp API for commodity prices
- [x] Ship selector (29 ships)
- [x] **System filtering** - Routes filtered by selected system (Stanton/Pyro/Nyx)
- [x] **System displayed in results** - "📍 System Name: Location"
- [x] **Pyro risk adjustment** - LOW risk auto-elevated to MEDIUM in Pyro (full PvP)
- [x] **System-specific warnings** - Pyro activities include PvP warnings
- [x] "Thinking/Scanning" animation
- [x] **Signals Integration** - Real-time risk adjustment based on player reports (Feb 17, 2026)
  - Queries last 24h of piracy/PvP/crash reports from Signals database
  - 3+ piracy reports = HIGH PIRACY ALERT, elevates risk by 2 levels
  - 1-2 piracy reports = warning, elevates risk by 1 level
  - Intel summary shows warnings and dangerous locations in mission modal
- [x] **UEXcorp POI Integration** - Real game location data (Feb 17, 2026)
  - GET /api/locations returns 168+ cached POI locations
  - GET /api/locations/categorized groups by type (outposts, mining, trading, etc)
  - 24-hour cache, only live game locations (is_available_live=1)
- [x] **Real Locations in Mission Advisor** - Replaced hardcoded arrays (Feb 17, 2026)
  - FPS: Uses real UEXcorp bunker/outpost locations (e.g., "MT DataCenter 8FK-Q2X-K")
  - Combat: Uses real UEXcorp outpost locations (e.g., "HDSF Ishmael")
  - Salvage: Uses real UEXcorp outpost locations (e.g., "Utopia")
  - Chill: Curated scenic locations with proper context format
  - Clean display: Name bold (white 16px), context small (gray 12px)

### SIGNALS Module - COMPLETE
- [x] RSI server status (RSS feed) - Color-coded Green/Yellow/Red
- [x] Crowdsourced incident reporting
- [x] Dynamic reliability (REAL DATA, no random)
- [x] Trend charts (Timeline, Breakdown, Locations)
- [x] Location picker, shard input

### CONTRACTS Module - COMPLETE
- [x] Job board CRUD
- [x] Structured contract creation (no free-text, anti-toxicity)
- [x] Bidding/handshake workflow (apply -> accept -> in_progress)
- [x] Double-handshake completion (both parties confirm)
- [x] **Auto-expiry** - OPEN contracts >1 hour hidden from feed
- [x] **Completed hidden** - COMPLETED contracts excluded from main feed
- [x] **Contract polling** - 15-second polling with toast notifications (toggleable)
- [x] Bilateral 5-star ratings
- [x] Contract expiration (30 min)
- [x] Concurrency limits (1 active contract per user)
- [x] **Multi-Crew Manifest System** (Feb 4, 2026)
  - [x] Multi-crew toggle in contract creation modal
  - [x] Manifest Builder UI with role selection and quick-fill
  - [x] Individual slot payout configuration
  - [x] Contract details page (/contracts/:id) with crew roster
  - [x] Bidding on specific crew slots
  - [x] Accept/withdraw bid functionality
  - [x] Deploy team when crew is ready (partial fill supported)
  - [x] 'mustering' status for multi-crew contracts in progress
- [x] **Contract Duration/Expiry System** (Feb 4, 2026)
  - [x] LISTING DURATION dropdown: Distress (30m), Standard (1h), Operation (4h), Scheduled (24h)
  - [x] Dynamic expires_at timestamp calculated on creation
  - [x] Time remaining display on contract cards (⏱️ Xh Xm)
  - [x] Distress contracts show 🚨 red styling
  - [x] Near-expiry (<10 min) shows amber/orange styling
  - [x] Backend filters expired contracts from active listings
- [x] **Unified Category System** (Feb 5, 2026)
  - [x] Consolidated `type` and `category` into single `category` field
  - [x] New categories with icons: ⚔️ Combat, 🏥 Medical, 📦 Logistics, ⛏️ Industrial, 📋 Other
  - [x] Simplified contract creation form with title + description
  - [x] Filter tabs updated to use categories
  - [x] Contract cards display category with icon

### ROADMAP Module - COMPLETE
- [x] Crowdfunding goals
- [x] Stripe integration (test key)
- [x] **Stripe Checkout** - Creates checkout session, redirects to Stripe, handles success/cancel
- [x] Progress tracking

### PILOT'S LOUNGE Module - COMPLETE (April 7, 2026)
- [x] Casual LFG system (distinct from formal Job Board)
- [x] Activity-based tags: Mining, Combat, Trade, Exploration, Crew Up, Vibing, PvP, Org
- [x] Broadcast creation modal with title, description, availability, group size, region
- [x] 1-post-per-user limit enforced
- [x] Auto-expiration based on availability window (max 4 hours)
- [x] "Hail Pilot" response system with count tracking
- [x] Cannot hail own broadcast
- [x] Owner can close broadcast
- [x] Filtering: Activity tags, Available Now toggle, Region dropdown
- [x] Sorting: Newest, Expiring Soon, Most Responses
- [x] Search by title/description
- [x] "YOUR BROADCAST IS LIVE" banner for active broadcast
- [x] All comprehensive data-testid attributes for testing
- [x] **Quick Match Feature**:
  - [x] Ship-to-activity mapping for all 29 ships
  - [x] Multi-select activity preferences
  - [x] Region preference filter
  - [x] Match scoring algorithm (activity +10, region +3, available now +2)
  - [x] Excludes own broadcasts, deprioritizes already-hailed
  - [x] Preferences persist to user profile
  - [x] Collapsible Quick Match panel with results display

### ADMIN Panel - COMPLETE
- [x] Goals CRUD
- [x] Users/Contributions lists
- [x] Reset Reports with timestamp tracking
- [x] Admin login working (beecroft519@gmail.com)

### Settings - COMPLETE
- [x] Ticker toggles
- [x] WebSocket notifications
- [x] Sound toggle
- [x] Contract type filters
- [x] **Avatar Section** - 8 preset role-based avatars (Pilot, Rescue, Pirate, Hauler, Miner, Bounty Hunter, Engineer, Explorer)
- [x] **Community Badge** in About section
- [x] **Supporter Code Redemption** (Feb 5, 2026) - Input in About tab to redeem NAV-BRONZE/SILVER/GOLD-TEST codes

### Alert Tickers - COMPLETE
- [x] Three tickers (Threats, Stability, Issues)
- [x] Color-coded (red threats, yellow stability, orange issues)
- [x] Shard filtering
- [x] "ALL CLEAR" when empty
- [x] Only visible when logged in

### Profile Page - COMPLETE
- [x] Pilot License card style
- [x] RSI avatar from scraping
- [x] Rank, reputation, contracts stats
- [x] Verification status
- [x] Earned badges
- [x] **Mission History Module** (Feb 4, 2026)
  - [x] Stats bar: Completed, Success Rate, Total Earned
  - [x] 3 expandable dropdowns: Missions by Type, Earnings Breakdown, Recent Missions
  - [x] Empty state for new users
  - [x] Mission history saved on contract completion
  - [x] Rating updates saved to mission history
  - [x] View other users' profiles via /profile/:userId
  - [x] "View Profile" button in bid review modal
- [x] **Rank & Badge System** (Feb 4, 2026)
  - [x] User rank displayed (CIVILIAN, FREELANCER, etc.) based on completed contracts
  - [x] Badge Rack component showing supporter badges and gameplay badges
  - [x] Premium animated supporter badges (Bronze 🪙, Silver 🛡️, Gold 🏆 with pulse animation)

## Real-Time Notifications - COMPLETE (Feb 17, 2026)
- [x] **Server-Sent Events (SSE) Notification System**
  - [x] Backend SSE endpoint `/api/notifications/stream` with keepalive pings
  - [x] Broadcast notifications for: new_contract, new_bid, bid_accepted, intel_alert
  - [x] Frontend `useSSENotifications` hook manages SSE connection and state
  - [x] `NotificationBell` component in header with unread count badge
  - [x] Sound alerts (UI_1.mp3 for notifications, UI_2.mp3 for alerts)
  - [x] Sound toggle in Settings > Alert Tickers
  - [x] Targeted notifications (new_bid to poster, bid_accepted to bidder)
- [x] **Granular Contract Notifications**
  - [x] Filter notifications by contract type (escort, rescue, transport, mining, combat)
  - [x] Settings > Push Notifications > Contract Notifications section with toggle buttons
  - [x] Backend includes `category` field in new_contract notifications
  - [x] Frontend filters based on user's `contract_types` preference
  - [x] Category mapping: Combat→combat, Medical→rescue, Logistics→transport, Industrial→mining, Other→escort

## Backlog

### P1 - High Priority
- [ ] ~~User profile image upload~~ → Replaced with Avatar Preset system
- [ ] Real Stripe payment flow (needs production keys)

### P2 - Medium Priority
- [x] Refactor Contracts.jsx into smaller components — completed September 16, 2026 (119-line page + focused hooks/components)
- [ ] Refactor server.py into route modules (~4600 lines)
- [ ] Extract clipboard utility to shared function
- [ ] Org/group support — Discord webhook dispatch (gated behind ENABLE_ORG_TOOLS)
- [x] Org Invite Notification (toast + bell) — done Feb 2026
- [x] Persistent Org Invite (survives refresh; auto-accepted on /orgs visit) — done Feb 2026
- [x] Admin org reassign + delete — done Feb 2026
- [x] Discord webhook message tracking + auto-delete on contract expiry/cancel/complete (new collection `discord_contract_messages`, server-side `contract_expiry_loop` every 60s, `wait=true` on POST, retries via `retry_required`) — done Feb 2026

### P3 - Low Priority
- [x] Mobile responsive improvements — board, org forms/routes, settings, navigation, notifications and landing header (September 16, 2026)
- [x] Service worker push notifications — implemented September 16, 2026; real-device closed-tab delivery verification remains
- [ ] Advanced Org dispatch (filters, role mentions)

### Cancelled
- ~~Fleet Manager~~ (cancelled by user request)

## Bug Fix (Feb 28, 2026)
**Future Time post expiration anchored to scheduled_start_at**
- Issue: Future Time posts were expiring 1 hour after creation because the frontend sent `duration_minutes: 60` as a placeholder and the backend used it for `expires_at`.
- Fix: In `POST /api/contracts`, when `timing_type == 'future'`, compute `expires_at = scheduled_start_at + FUTURE_POST_ACTIVE_WINDOW_HOURS` (4h). Reject future posts missing or with invalid `scheduled_start_at` (HTTP 400).
- "Looking Now" non-medical posts continue to use `duration_minutes`. Medical bleed-out logic untouched.
- Verified via curl: future post `expires_at - scheduled_start_at = 4:00:00`, now post unchanged at 60 min, validation errors return 400.

## Admin Recovery Tool (Feb 28, 2026)
**`POST /api/admin/contracts/repair-future-expiry`** — one-shot recovery for posts bitten by the legacy expiry bug above.
- Admin-only (401 anon, 403 non-admin).
- Repairs only contracts where `timing_type == 'future'`, `scheduled_start_at` exists, `expires_at < scheduled_start_at`, status ∈ {open, expired}, and `cancelled_at` is not set.
- Sets `expires_at = scheduled_start_at + 4h`. Promotes `expired` → `open` (system-expired only).
- Never touches `cancelled` or `completed` contracts (filtered at query level).
- Returns `{repaired, restored_to_open, candidates_scanned, skipped, repaired_ids, window_hours}`.
- Verified across 5 fixture scenarios + 2 real bug-affected posts.
- UI: "🛠 REPAIR FUTURE POSTS" button in Admin → MAINTENANCE panel (testid `repair-future-btn`).

## Bug Fix (Feb 28, 2026) — Posters were blocked from applying to other jobs
- Issue: `GET /api/user/active-contract` and the concurrency check in `POST /api/contracts/{id}/bid` both treated *posting* an open/in-progress contract as having an "active" contract. Result: any user who posted a job (including Future Time and LFG) could not apply, bid, or join anyone else's job.
- Fix: Both endpoints now consider a user "actively assigned" only when:
  - `accepted_by.id == user.id` AND status ∈ `{in_progress, pending_completion, active}` (single-contractor jobs); or
  - the user is filled into a multi-crew slot (`manifest.$elemMatch: {applicant_id, status: 'FILLED'}`) on a non-finalised contract.
- The poster branch is removed entirely. Self-apply, duplicate-apply, and own-contract checks remain in place.
- Verified end-to-end with 15 scenarios covering: poster→other's contract (was the bug), self-apply, duplicate-apply, Future Time post + apply elsewhere, accept→active blocking, multi-crew slot bid + accept → active flag works.

## Feature (Feb 28, 2026) — Multi-join Future Time / LFG events
- Issue: Future Time and LFG posts were single-slot — when the host accepted one applicant, status flipped to `in_progress` and others were locked out. Hosts wanted multiple people to be able to join a single event.
- Schema (additive, backward compatible):
  - `join_mode: 'single' | 'multi'` (defaults: LFG / Future Time → `multi`; everything else → `single`)
  - `max_participants: int` (2..50, default 8 for `multi`)
  - `accepted_participants: list[participant_summary]`
- Backend behaviour:
  - For `multi`: accepting a user appends to `accepted_participants`, **keeps `status='open'`**, does not auto-decline other bids; group becomes full only when count reaches `max_participants`.
  - For `single`: existing behaviour unchanged (status flips to `active` / `in_progress`, other bids declined).
  - `/contracts/{id}/bid` enforces concurrency only for `single` jobs — multi-join events are friction-free RSVPs.
- Frontend:
  - Create modal has new **CREW / GROUP SIZE** section (Single Person / Multiple People + Max Participants 2..50). Defaults to Multiple for LFG and Future Time posts.
  - Job Board cards show a `👥 N/M` capacity badge for multi-join events; status badge suppressed for multi.
  - Contract details: new **MultiJoinRoster** card (count chip `2/8 · 6 spots left`, per-pilot row with reputation, `YOU` badge for self, `📋 COPY ALL HANDLES` button).
- Admin: `POST /api/admin/contracts/repair-multi-join-events` + Admin UI button `👥 REPAIR MULTI-JOIN EVENTS`.
- Mission timer fix: `getTimeRemaining` in `Contracts.jsx` now anchors Future Time posts to `scheduled_start_at` (showing `Starts in 2d 3h` / `Live · 3h 24m left`), with day rollover so we never print >24h again.
- Test coverage: 30 backend scenarios + 9 repair scenarios + 15 poster-bug regression scenarios all passing.

## Feature (June 2, 2026) — Organizations Discord Dispatch (LIVE)
- `ENABLE_ORG_TOOLS` flipped to `true` in `/app/backend/.env`. Existing dispatch infrastructure (`dispatch_org_discord_alerts`, `_build_discord_message`, `_org_matches_contract`, webhook validation) is now live.
- **Admin-invitation only**: `POST /orgs` is now `require_admin` and takes an `owner_email` / `owner_handle` / `owner_id` to assign the target user as the org's `owner_id`. Admin-created orgs go through the existing approval queue (status starts as `pending`).
- New `GET /user/my-org` endpoint returns the org owned/officered by the current user, including private fields (webhook URL connection status, alert filters) for management.
- Frontend `/orgs` page rewritten with full org management UI (profile, webhook, alert filters).
- Admin → Org Approvals: new **INVITE USER AS ORG OWNER** form (testid `invite-org-owner-form`).

## Feature (June 2, 2026) — Per-category Alert Routes
- Issue: every org had a single Discord webhook so all alerts landed in one channel.
- Schema (additive): each org now has `alert_routes: List[{id, webhook_url, label, categories, rescue_only, enabled, created_at}]`.
- Backend selection (`_select_alert_routes` in `server.py`):
  - First specific category match wins (priority by array order).
  - If only catch-all routes (no `categories`) match, all of them fire.
  - `rescue_only` routes require `category == MEDICAL`.
  - Legacy single `discord_webhook_url` still works as a back-compat fallback when `alert_routes` is empty.
- Endpoints: `GET/POST /orgs/{id}/routes`, `PUT/DELETE /orgs/{id}/routes/{route_id}`, `POST /orgs/{id}/routes/{route_id}/test`. All gated to owner / officer / admin.
- Validation: Discord webhook URL format, allowlisted categories (`MEDICAL, COMBAT, CARGO, MINING, SALVAGE, ESCORT, LFG, OTHER`).
- Privacy: public org payload now exposes `alert_routes_count` and `discord_connected` only — never `webhook_url` or the routes array.
- Frontend (`Organizations.jsx`):
  - New **DISPATCH ROUTES** panel inside `MyOrgPanel` with inline add/edit/test/delete per route.
  - Webhook URLs masked with `•••` in the listing.
  - Pills surface CATEGORIES / RESCUE-ONLY / DISABLED state at a glance.
  - Helper footer documents selection rules.
- Verified with 23/23 backend scenarios (RBAC, validation, selection priority, rescue_only gate, catch-all behaviour, public payload privacy, legacy back-compat) and a live screenshot confirming the panel renders 3 seeded routes correctly.

## UI/Navigation Updates (April 7, 2026)
1. **Header Reorganization**: Moved Intel, Directory, Roadmap under "OTHER TOOLS" dropdown
2. **Renamed Tab**: "LOUNGE" → "LOUNGE (LFG)" for clarity
3. **Removed Quick Match**: Simplified Pilot's Lounge by removing Quick Match panel
4. **Title Consistency**: All page titles now use consistent styling (page-label, page-title, page-subtitle classes)

## New Features Implemented (April 7, 2026)
1. **Pilot's Lounge (LFG Feature)**: Casual grouping system distinct from Job Board
   - Activity-based tags: Mining Op, Combat Patrol, Trade Run, Exploration, Crew Up, Just Vibing, PvP/Arena, Org Op
   - 1 active broadcast per user limit
   - Auto-expiration (max 4 hours based on availability window)
   - "Hail Pilot" response system (cannot hail own broadcast)
   - Filters: Activity tags, Available Now, Region (US/EU/AUS), Sort (Newest/Expiring/Popular)
   - Search broadcasts by title/description
   - Backend: GET/POST /api/lounge/broadcasts, POST /api/lounge/broadcasts/{id}/hail, POST /api/lounge/broadcasts/{id}/close
   - Frontend: /lounge route with comprehensive data-testid attributes
   - All tests passed (15/15 backend, 100% frontend verified)

2. **Quick Match Feature**: AI-powered broadcast matching based on ship and preferences
   - Ship-to-activity mapping for all 29 ships (e.g., Prospector→mining, Cutlass Black→combat/trade/crew)
   - Multi-select activity preferences (Mining, Combat, Trade, Exploration, Crew, Vibing, PvP, Org)
   - Region preference filter
   - Match scoring algorithm: activity match (+10), region match (+3), available now (+2), low responses (+1)
   - Excludes user's own broadcasts, deprioritizes already-hailed broadcasts
   - Preferences persist to user profile
   - Backend: POST /api/lounge/quick-match, PUT/GET /api/user/lounge-preferences
   - Frontend: Collapsible Quick Match panel with ship dropdown, activity toggles, results display
   - All tests passed (20/20 backend, 100% frontend verified)

## Bug Fixes Applied This Session (Feb 17, 2026)
1. **Multi-crew contracts not completing (BUG FIX 1)**: The `mark-complete` endpoint only accepted `in_progress` status, but contracts accepted via the `/accept` endpoint are set to `active`. Fixed to accept both statuses.
2. **Mercenary profile link shows wrong profile (BUG FIX 2)**: In the bids modal, the "View Profile" button used `bid.bidder?.id` which doesn't exist. Fixed to use `bid.bidder_id` instead.
3. **Recent Missions not populating (BUG FIX 3)**: The mission history endpoint and component were working correctly. Issue was simply that no completed contracts existed yet. Verified working with empty state display.
4. **Contract descriptions not showing (BUG FIX 4)**: Descriptions were being saved to database but not displayed on contract cards. Added description rendering after contract title in the feed view.
5. **Basic text moderation (BUG FIX 5)**: Added `moderate_text()` function in backend with ~25 blocked words. Profanity is replaced with asterisks (`****`) when contracts are created.

## New Features Implemented (Feb 17, 2026)
1. **Admin Roadmap Management**: Updated Admin page with Users/Roadmap tabs. Roadmap items can be added/edited/deleted with STABLE/IN_PROGRESS/PLANNED/BACKLOG statuses. No more crowdfunding/dollar amounts.
2. **Player-to-Player Profile Lookup**: New `/search` page accessible from user dropdown menu. Search by RSI handle with partial/case-insensitive matching. Results show handle, rank, and reputation with links to profiles.
3. **Settings About Update**: About section in Settings now matches the public AboutModal content with mission statement and features list.
4. **Privacy Policy & Terms of Service**: New `/privacy` and `/terms` pages created. Links added to global footer.
5. **Removed test user profiles**: Cleaned up 4 test user accounts from database, keeping only real user (Mowri).
6. **Real-Time SSE Notifications**: Implemented Server-Sent Events for live notifications. Backend broadcasts events on new contracts, bids, bid acceptance, and intel alerts. Frontend NotificationBell component displays notifications with sound alerts.
7. **Granular Contract Notifications**: Users can filter which contract types trigger notifications. Settings > Push Notifications has toggle buttons for: Escort, Rescue/Medical, Transport, Mining Support, Combat/Security.
8. **Pyro & Nyx Location Fallbacks**: UEXcorp API only returns Stanton POIs. Added fallback locations for Pyro (10 locations) and Nyx (6 locations) so all three systems have selectable locations in the Signals report form.
9. **Alert Description Field**: Added optional description textarea (max 150 chars) to alert submission form with profanity filter. Description displayed in alert ticker feed.
10. **Theme System Implementation**: Unlocked all 4 themes (MobiGlass, Scavenger, Luxury, MilSpec). Each theme has unique color schemes defined in CSS variables. Theme selection persists to database and applies via data-theme attribute on document root.

## Bug Fixes Applied Previous Session (Feb 5, 2026)
1. **Missing redemption code UI**: The redemption code input/button was missing from the Settings page. Added the UI to the "About" section with proper styling.

## Bug Fixes Applied Previous Session (Feb 4, 2026)
1. **Multi-Crew contracts not appearing in feed**: Fixed query in `get_contracts` to include 'mustering' status for multi-crew contracts (testing agent fix).

## Bug Fixes Applied Previous Session (Jan 29, 2026)
1. **myShard state fix verified**: The `myShard is not defined` runtime error on Contracts page was previously fixed (state variable present at line 97). Verified working.
2. **Onboarding disclaimer slide completed**: Added JSX to render the "Made by the Community" badge on the new "About NavCom" slide.

## Bug Fixes Applied Previous Session (Jan 28, 2026)
1. **Admin endpoints registration bug**: `/admin/reset-reports` and `/admin/last-reset` were defined after `app.include_router()` causing 404s. Moved endpoints before router inclusion.
2. **RSI avatar not displaying**: Updated admin user's avatar_url in database. Verified scraping works with "Mowri" handle.

## Rebrand & Reposition (Feb 28, 2026)
**Scope:** Smallest-safe changes to reposition from "NavCom Connect / Mission Advisor" to "Star Citizen Group Finder" without changing frameworks, dependencies, or backend schema.

### Product Branding
- App name → "SC GROUP FINDER" (header), "STAR CITIZEN GROUP FINDER" (landing hero).
- Subtitle → "PLAYER CONTRACT BOARD".
- Updated: `public/index.html`, `Header.jsx`, `Footer.jsx`, `AboutModal.jsx`, `OnboardingCarousel.jsx`, `LandingPage.jsx`, `Login.jsx`, `Register.jsx`, `Settings.jsx`, `Roadmap.jsx`, `PrivacyPolicy.jsx`, `TermsOfService.jsx`.
- Home redirect for logged-in users changed from `/intel` → `/contracts` (Job Board is the primary product).

### Navigation
- Desktop top nav: **Job Board / Signals / Lounge (LFG) / Other Tools** (Intel + Roadmap).
- Mobile bottom nav: **Jobs / Signals / Lounge / Intel / Roadmap**.
- **Directory removed from all nav** (desktop + mobile). `/directory` route left intact so existing component doesn't break.

### Server Region (replaces Shard)
- UI replaces shard number input with Server Region dropdown: **USA, Europe, Australia, Asia** (or Global via "Skip").
- **Backend compatibility:** The existing `shard` field name is retained in DB/API/socket-room names. Region values are strings written to that field. Filter/notification logic unchanged.
- "Set Your Shard" prompt → "Set Your Server Region" (App.js modal).
- Onboarding final slide: "Set Your Server Region" (no more tilde/r_displayinfo instructions).
- Header shows "REGION" label + value (e.g. `USA`).
- Alert ticker shows region name uppercase (`USA`, `EUROPE`) or `YOUR REGION` / `GLOBAL` badge instead of `Shard 360`.
- No user-facing text says "shard".

### Job Board (Contracts) Text Refinements
- Page label `// NAVCOM_CONNECT` → `// GROUP_FINDER`.
- Subtitle → "Post jobs, apply to missions, crew up — choose teammates by reputation."
- `POST BEACON` → `POST JOB / GROUP`; `// NEW_BEACON` → `// POST_JOB`; `Create Contract` → `Post Job / Group`.
- `CONTRACT CATEGORY` → `POST TYPE`; `CONTRACT TITLE` → `POST TITLE`.
- `Manage Bids` → `Manage Applicants`; `Bid Sent` → `Application Sent`; `Apply for Contract` → `Apply to Join`.
- `Rate Mercenary` / `Rate Client` → `Rate Player` / `Rate Poster`.
- Role labels `Merc:` / `Client:` → `Player:` / `Poster:`.
- `Mercenary Profile` modal → `Applicant Profile`.
- `MY SHARD` filter → `MY REGION` dropdown (USA/Europe/Australia/Asia/All).
- Empty states: "No Active Beacons" → "No Active Jobs"; "No Contracts Yet" → "No Jobs Yet".

### Preserved (no changes)
- `/api/contracts/*` endpoints, multi-crew manifest, two-way reviews, reputation, citizen cards, player search, admin, profiles, signals reports, ticker alerts, system status, SSE notifications, Pilot's Lounge (LFG), authentication, themes.

### Test Coverage
- iteration_12.json: 100% pass on both backend (3/3) and frontend (26/26) rebrand checks.

## Feature (Feb, 2026) — Two-Way Rating for Multi-Role Contracts
- Added `POST /api/contracts/{id}/rate-poster` — participants of multi-join/multi-crew contracts can now rate the poster (mirror of `rate-participant`). One rating per (contract, reviewer), upsert semantics.
- Extended `/api/user/my-contracts` to include contracts where the caller is in `accepted_participants` or `manifest[].accepted_by` (previously missed for multi-role participants).
- `update_user_reputation` now aggregates `poster_ratings` targeting the user.
- Frontend `Contracts.jsx`: participants see a "Rate Poster" button in both the PENDING_RATINGS section and completed contract cards for multi-role jobs. Reuses the existing review modal.
- Test file: `/app/backend/tests/test_rate_poster.py` (7 tests, all passing). Existing `test_rate_participant.py` also passes (regression clean).

## Previously Completed — Organization Self-Registration (handoff documentation repaired September 16, 2026)
- `POST /api/orgs/register`: RSI-verified leaders submit an organization for admin approval. Validates name (3–64), tag (2–8), unique tag and one owned organization per user.
- `/orgs` has registration CTA/modal, inline validation, success and pending-review states. Pending owners can edit profiles/connect Discord; dispatch/public listing requires approval.
- Admin application notification uses SSE; existing admin approval/rejection endpoints are reused. Verified in iteration_22 (6 backend tests and frontend flow).
- Previous rating work also added `rating_received` SSE reputation toasts and removed duplicate poster cancel buttons (iteration_21).

## September 16, 2026 — Refactoring, Mobile Polish and Background Notifications
### User-approved scope
- P1: Split Contracts.jsx and Organizations.jsx; P2: mobile responsive polish; P3: service-worker push notifications so organization application/approval alerts survive closed tabs.
- Preserve established MobiGlass styling, existing workflows and APIs. User requested minimal rereading/credit usage; no backend monolith refactor or auth migration in this batch.

### Implemented
- Contracts.jsx: **2,583 → 119 lines**, with named components under `frontend/src/components/contracts/` (cards/actions, applicants/handshake/ratings modals, create fields, manifest) and `useContractBoard`, `useCreateContract`, `useContractRatings`. Pure helpers and CSS extracted. Removed unused handlers; existing controls retained with scoped test IDs.
- Organizations.jsx: **980 → 288 lines**, with components under `frontend/src/components/organizations/` (registration, owner panel/profile/dispatch, alert routes, public cards, shared constants/toggles).
- Mobile: responsive form grids, wrapping long names/URLs/statuses/actions, safe-area-aware bottom navigation and modals, 44px touch controls, bounded notification dropdown, Orgs navigation. Tickers now rotate one alert at a time instead of overflowing duplicated marquee content. Landing header wraps; overflowing decorative glow elements removed.
- Incidental flow fixes: Paid Jobs filter no longer returns an empty feed; LFG↔Paid preserves payout draft and restores payment control; medical category exits multi-crew; implicit multi-join honors edited capacity; pending-card selectors no longer duplicate history-card selectors.
- Real Web Push implementation: `backend/push_notifications.py`, `frontend/public/push-sw.js`, `utils/webPush.js`, `PushNotificationSettings.jsx`, manifest and install icons. Opt-in in **Settings → Push Notifications**; no automatic browser prompt on login.
- Persisted application/invitation/approval/rejection events, owner decision SSE toast, restored unread bell inbox and read/clear state. Organization page refreshes approval status on focus and decision event.
- Queue uses Mongo leases, bounded retries, per-device success dedupe, 404/410 subscription cleanup, 90-day device TTL and 30-day inbox TTL. Private push keys remain backend-only. HTTPS provider allowlist/public DNS checks, valid encryption keys, no redirects, endpoint ownership, 10-device cap and test-send rate limit.
- Logout pauses delivery in worker state and removes only the current browser subscription; worker checks recipient identity to protect shared devices. Existing authentication scheme is intentionally unchanged.

### Added APIs / data
- `/api/push/config`, `POST/DELETE /api/push/subscriptions`, `POST /api/push/test`, `GET /api/push/inbox`, `PUT /api/push/inbox/{id|all}/read`.
- New collections: `push_subscriptions`, `push_events`. Every push API requires an authenticated user (missing/invalid tokens return 401).
- Env: `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`, `PUSH_ENDPOINT_SUFFIXES`; configured with idempotent `backend/configure_web_push.py`. Keep the same key pair to preserve existing subscriptions. No third-party account needed. See `memory/WEB_PUSH.md`.

### Verification and limits
- Build passes (remaining pre-existing hook dependency warnings noted in build log). Backend regression **30/30 passed** after fixes: `test_org_register.py`, `test_rate_poster.py`, `test_rate_participant.py`, `test_push_notifications_regression.py`; retest XML at `test_reports/pytest/iteration23_retest.xml`.
- `iteration_23.json` is the original report; `iteration_23_followup.md` records main-agent fixes/rechecks. Testing agent changed only tests/report; broad retry-to-skip modification to org registration tests was removed so failures remain visible.
- Desktop 1920×800 and mobile 390×844: scheduled form and populated org dispatch with 64-character unbreakable name, long description/route URL and all route categories verified. Final stress checks returned **no horizontal overflow**. Mobile payout preservation verified.
- Service worker actually registers at root scope. Push payload/target URL and logged-out recipient guard verified with **MOCKED notification display in a browser test**; queue tests use **MOCKED provider responses**. Application runtime is not mocked.
- **Live browser-provider/OS delivery with tab closed remains unverified**: test-browser notification permission is denied even after a grant attempt. Do not claim end-to-end closed-tab delivery passed. Owner inbox/SSE and real encrypted push implementation are present.
- Cleaned temporary stress org and mock-provider fixture devices/events. Existing test-rate fixture records from historical suites remain; no real org/account data changed.

### Prioritized remaining work
- **P0 / user verification:** enable notifications in a normal supported browser; send test, close tab, approve/reject a test org from another account; verify OS notification and click-through. iOS requires 16.4+ Home Screen app. Browser/system permission and background-delivery policies apply.
- **P1:** Refactor server.py into route modules. Separate auth-hardening work: testing agent flagged pre-existing unsalted SHA-256/no brute-force lockout; this is not a regression introduced here. Its cookie and admin-password-reconciliation recommendations are outside the approved refactor scope; no auth format/credentials were silently migrated.
- **P2:** Split remaining large Settings.jsx; expand real-device responsive coverage and Safari/Firefox push tests; advanced org dispatch filters/role mentions.
- Suggested enhancement: opt-in scheduled-event reminder notifications.



---

## Iteration 24 — Org Affiliation, Ratings Reliability, Region Memory, Multicrew Polish (Oct 3, 2026)

### Implemented
1. **Self-service org affiliation**
   - `PUT/GET /api/user/org-affiliation`, `GET /api/orgs/approved-options`. Only `approval_status=approved` orgs selectable; one org per player; clearable.
   - `org_affiliation` returned on `/auth/me`, login, discord-complete, demo-login and `/users/{id}/profile`.
   - `GET /api/orgs` returns `displayed_member_count` (live count of players displaying the org); `GET /api/orgs/{id}` returns `displayed_members`.
   - Backend enrichment (`/app/backend/affiliation.py`) stamps `org_tag`/`org_id` onto posters, accepted_by, accepted_participants, manifest seats, seat bids and contract bids.
   - Frontend: `components/OrgTag.jsx` quiet badge, shown on job cards, crew manifests, applicant lists, profile. New public org profile page `/orgs/:orgId` (`pages/OrgProfile.jsx`); org tiles are now links.
   - Settable from BOTH Settings ("Affiliation & Region" section) and Profile (`components/settings/AffiliationRegion.jsx`).

2. **Durable pending ratings** (`/app/backend/ratings_queue.py`, collection `rating_obligations`)
   - One obligation per direction on completion (`/complete`, `/mark-complete`, `/mark-complete-multi`), idempotent.
   - `GET /api/ratings/pending`; settled automatically by `/review`, `/rate-poster`, `/rate-participant`.
   - 14-day window, then `status=expired` ("not rated"); lazy expiry on read + hourly loop.
   - Mutual hiding: while a viewer still owes a rating, the counterpart's rating is blanked on `GET /api/contracts/{id}` and `/api/user/my-contracts` with `ratings_withheld: true`.
   - Legacy completed jobs backfilled on startup with the window starting then (18 obligations on first run).
   - UI: `/ratings` page (`pages/PendingRatings.jsx`), top-nav RATINGS item with count badge + mobile bottom-nav slot, `hooks/usePendingRatings.js`.

3. **Region asked once**
   - `PUT /api/user/region`, `region` on the user doc and in `/auth/me`. Guests remembered in `localStorage.navcom_region`.
   - App.js `applyRegion`/`setShard` persist to the account; the prompt only fires when no region has ever been chosen. "Skip (Global)" counts as a choice. Editable in Settings.

4. **Multicrew posting stepper**
   - `components/contracts/MultiCrewStepper.jsx`: basics -> crew roles & seats -> pay split -> review & post, with back navigation that preserves input.
   - Crew roles are free-text names with a seat count; `crew_roles` persisted on the contract; manifest derived as roles x count with `payout = floor(total / seats)`.
   - Job cards show `x/y SEATS FILLED - OPEN: <roles>` (`getCrewSeatSummary`).
   - Solo <-> multicrew toggle no longer resets the form.

5. **Alert cue de-spam** (follow-up request)
   - `utils/sounds.js` `claimBurstCue()`: broadcast cues (job categories, threat, issue, stability) play at most once per 5s burst; personal cues (bid, bid accepted, login) are never gated. Socket.IO alert beep in `hooks/useNotifications.js` shares the same gate.
   - Verified e2e: 4 jobs posted simultaneously -> 1 audio play; a 6th event after the window -> plays again.

### Testing
- `/app/test_reports/iteration_24.json`: 11/11 new backend tests pass (`/app/backend/tests/test_iteration24_features.py`), all frontend testids verified. No critical or UI bugs.
- Pre-existing unrelated pytest failures remain: `tests/test_multicrew_manifest.py`, `tests/test_bug_fixes.py`, `tests/test_discord_oauth.py`, `tests/test_new_features.py::TestAdminLogin` (hardcoded fixture credentials).

### Notes / backlog
- Admin account state after tests: `region=Global`, `org_affiliation=MTO` (changeable in Settings).
- P2 (optional, from review): `/api/ratings/pending` returns empty 200 for unauth instead of 401; backend could derive the manifest from `crew_roles` + total pay for API consumers.
- Phase 2 (deferred): org leaders verify/reject displayed affiliations; per-role rating tags and written feedback on public profiles; saved crew templates.
- Phase 3 (deferred): org-vs-org reputation/leaderboards; recurring scheduled multicrew ops; push reminders for pending ratings.
- Still open from earlier: refactor `server.py` (>5400 lines) into route modules; migrate auth hashing to bcrypt with lockout; seed-admin password update-on-change.
