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

### ROADMAP Module - COMPLETE
- [x] Crowdfunding goals
- [x] Stripe integration (test key)
- [x] **Stripe Checkout** - Creates checkout session, redirects to Stripe, handles success/cancel
- [x] Progress tracking

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
- [x] **Avatar Section** - 10 preset role-based avatars (Helmet, Medic, Skull, Cargo, Target, Pilot, Miner, Commander, Explorer, Engineer)
- [x] **Community Badge** in About section

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

## Backlog

### P1 - High Priority
- [ ] ~~User profile image upload~~ → Replaced with Avatar Preset system
- [ ] Real Stripe payment flow (needs production keys)
- [ ] WebSocket real-time contract notifications (foundation laid)

### P2 - Medium Priority
- [ ] Granular push notifications (e.g., Medic only gets "Rescue" alerts)
- [ ] Refactor Contracts.jsx into smaller components
- [ ] Extract clipboard utility to shared function
- [ ] Implement locked themes (Scavenger, Luxury, MilSpec)
- [ ] Org/group support
- [ ] Fleet manager

### P3 - Low Priority
- [ ] Mobile responsive improvements
- [ ] Service worker push notifications

## Bug Fixes Applied This Session (Feb 4, 2026)
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
