# NavCom - Mission Advisor PRD

## Original Problem Statement
Build "NavCom" - a tactical companion web-app for Star Citizen players with:
- MobiGlass UI theme (dark navy #020b14, cyan #00f0ff)
- INTEL module (Mission Advisor)
- SIGNALS module (Server Health & Reports)
- CONTRACTS module (Mercenary Beacons / Uber for mercs)
- ROADMAP module (Supply Drop crowdfunding)
- RSI Handle verification for authentication

## Tech Stack
- **Frontend**: React.js with Tailwind CSS, Recharts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Payments**: Stripe

## What's Been Implemented (Jan 29, 2026)

### Core Features - COMPLETE
- [x] MobiGlass UI theme
- [x] JWT authentication with RSI Handle verification
- [x] RSI profile avatar scraping (verified with handle "Mowri")
- [x] 6-slide onboarding carousel (including new disclaimer slide)
- [x] Session-based shard management
- [x] Protected routes (all require login)
- [x] **Mobile Bottom Navigation** - Fixed nav bar at bottom (<768px) with Intel, Signals, Contracts, Roadmap, Profile
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
- [ ] Refactor Contracts.jsx into smaller components
- [ ] Extract clipboard utility to shared function
- [ ] Org/group support
- [ ] Fleet manager

### P3 - Low Priority
- [ ] Mobile responsive improvements
- [ ] Service worker push notifications

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

## Admin Credentials
- Email: beecroft519@gmail.com
- Password: Nv$C0m_Adm1n_2025!
- RSI Handle: Mowri (verified with avatar)
