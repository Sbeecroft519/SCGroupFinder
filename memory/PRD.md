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
- Full MobiGlass UI with all 4 modules (INTEL, SIGNALS, CONTRACTS, ROADMAP)
- JWT authentication with RSI Handle verification flow
- Ships API with Golden Truth data (29 ships)

### Jan 28, 2025 - Feature Additions
- **UEX Corp Integration**: Live commodity/mining prices via `/api/uex/commodities`
- **RSI Status Feed**: Real-time parsing of `status.robertsspaceindustries.com/index.xml`
- **Bilateral Rating System**: 5-star reviews (Client ↔ Merc), reputation auto-calculation
- **RSI Avatar Integration**: Profile pictures pulled from RSI during verification
- **Privacy**: Removed public email display from profiles

## Prioritized Backlog

### P0 - Critical
- [x] UEX Corp API integration for live cargo prices
- [x] RSI Status Feed integration (RSS parse)
- [x] RSI profile picture integration
- [x] Bilateral 5-star rating system

### P1 - High Priority
- [ ] Onboarding carousel for first-time users
- [ ] Alert ticker for recent reports
- [ ] Shard-aware report filtering

### P2 - Nice to Have
- [ ] Manufacturer themes (Drake, Origin, Aegis)
- [ ] Admin panel for goal management
- [ ] Push notifications

## Next Tasks
1. Integrate UEX Corp API for live commodity data
2. Add RSI status feed parsing
3. Implement bilateral rating system
4. Build onboarding carousel
5. Add real-time polling for contracts (15s interval)
