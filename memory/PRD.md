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

## What's Been Implemented (Jan 28, 2026)

### Core Features - COMPLETE
- [x] MobiGlass UI theme
- [x] JWT authentication with RSI Handle verification
- [x] RSI profile avatar scraping (verified with handle "Mowri")
- [x] 5-slide onboarding carousel
- [x] Session-based shard management
- [x] Protected routes (all require login)

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
- [x] RSI server status (RSS feed)
- [x] Crowdsourced incident reporting
- [x] Dynamic reliability (REAL DATA, no random)
- [x] Trend charts (Timeline, Breakdown, Locations)
- [x] Location picker, shard input

### CONTRACTS Module - COMPLETE
- [x] Job board CRUD
- [x] Structured contract creation (no free-text, anti-toxicity)
- [x] Bidding/handshake workflow (apply -> accept -> in_progress)
- [x] Double-handshake completion (both parties confirm)
- [x] Bilateral 5-star ratings
- [x] Contract expiration (30 min)
- [x] Concurrency limits (1 active contract per user)

### ROADMAP Module - COMPLETE
- [x] Crowdfunding goals
- [x] Stripe integration (test key)
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
- [ ] User profile image upload (512x512) with AI moderation as fallback to RSI scraping
- [ ] Complete Stripe payment flow for Roadmap contributions
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

## Bug Fixes Applied This Session (Jan 28, 2026)
1. **Admin endpoints registration bug**: `/admin/reset-reports` and `/admin/last-reset` were defined after `app.include_router()` causing 404s. Moved endpoints before router inclusion.
2. **RSI avatar not displaying**: Updated admin user's avatar_url in database. Verified scraping works with "Mowri" handle.

## Admin Credentials
- Email: beecroft519@gmail.com
- Password: Nv$C0m_Adm1n_2025!
- RSI Handle: Mowri (verified with avatar)
