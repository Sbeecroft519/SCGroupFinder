# NavCom - Mission Advisor PRD

## Original Problem Statement
Build "NavCom" - a tactical companion web-app for Star Citizen players with:
- MobiGlass UI theme (dark navy #020b14, cyan #00f0ff)
- INTEL module (Mission Advisor)
- SIGNALS module (Server Health & Reports)
- CONTRACTS module (Mercenary Beacons / Uber for mercs)
- ROADMAP module (Supply Drop crowdfunding)
- RSI Handle verification for authentication
- Theme engine architecture for future customization

## Tech Stack
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based with RSI Handle verification

## User Personas
1. **Casual Pilot** - Needs quick mission recommendations based on available time
2. **Merchant** - Focused on cargo routes and trade optimization
3. **Mercenary** - Looking for combat contracts and escort jobs
4. **Org Leader** - Coordinates operations and tracks server health

## Core Requirements (Static)
- [x] MobiGlass visual theme with cyan/navy colors
- [x] Navigation: INTEL, SIGNALS, CONTRACTS, ROADMAP
- [x] Ship database with Golden Truth specs (29 ships)
- [x] Mission analysis based on ship/system/time/activity/risk
- [x] Server status monitoring
- [x] Issue reporting system
- [x] Mercenary beacon system
- [x] Crowdfunding roadmap

## What's Been Implemented

### Jan 27, 2025 - Initial Build
- **Backend (FastAPI)**
  - Authentication: Register/Login/Verify with JWT
  - Ships API with full Golden Truth data
  - Intel analysis endpoint
  - Signals status and reporting
  - Contracts CRUD operations
  - Goals/roadmap endpoint
  
- **Frontend (React)**
  - Header with nav (INTEL, SIGNALS, CONTRACTS, ROADMAP)
  - Intel page with ship selection, system/time/activity/risk toggles
  - Scanning animation for mission analysis
  - Mission result modal
  - Signals page with server status, reliability metrics, report buttons, trend charts
  - Contracts page with filtering, shard input, contract cards
  - Roadmap page with progress bars and supporter CTA
  - Login/Register pages with RSI verification flow
  - Profile page with pilot license card
  - Settings page with theme selection prep

- **Styling**
  - Full MobiGlass theme implementation
  - CSS variables for theme engine
  - Responsive design
  - Custom fonts: Orbitron, Share Tech Mono, Rajdhani

## Prioritized Backlog

### P0 - Critical
- [ ] UEX Corp API integration for live cargo prices
- [ ] RSI Status Feed integration (RSS parse)
- [ ] Real RSI profile scraping for handle verification

### P1 - High Priority
- [ ] Bilateral rating system for contracts
- [ ] Onboarding carousel for first-time users
- [ ] Alert ticker for recent reports
- [ ] Shard-aware report filtering

### P2 - Nice to Have
- [ ] Manufacturer themes (Drake, Origin, Aegis)
- [ ] Admin panel for goal management
- [ ] Mobile responsive improvements
- [ ] Push notifications

## Next Tasks
1. Integrate UEX Corp API for live commodity data
2. Add RSI status feed parsing
3. Implement bilateral rating system
4. Build onboarding carousel
5. Add real-time polling for contracts (15s interval)
