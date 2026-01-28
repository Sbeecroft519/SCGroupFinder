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
- **Frontend**: React.js with Tailwind CSS, Recharts for data visualization
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

### Jan 28, 2025 - Signals Page Major Update
- **Dynamic Reliability Metrics**: Cargo, Combat, Salvage, FPS reliability based on report volume
- **Multi-Ticker System**: Configurable alert tickers (Threats, Stability, Issues) filtered by shard
- **Shard Management**: Session-based shard prompt with instructions on how to find your shard
- **Incident Trends Charts**:
  - Timeline view: Area chart showing reports over 7/14/30 days
  - Breakdown view: Pie/donut chart showing report type distribution
  - Locations view: Horizontal bar chart showing hotspot locations
- **Report Details Field**: Added details field for bug/cargo issue reports
- **Ticker Settings**: Settings page allows toggling each ticker type on/off

## Prioritized Backlog

### P0 - Critical (COMPLETED)
- [x] UEX Corp API integration for live cargo prices
- [x] RSI Status Feed integration (RSS parse)
- [x] RSI profile picture integration
- [x] Bilateral 5-star rating system
- [x] Dynamic reliability metrics
- [x] Multi-ticker system with shard filtering
- [x] Shard management system
- [x] Incident trend charts (Timeline, Breakdown, Locations)

### P1 - High Priority
- [ ] "Thinking/Scanning" animation for Intel module modal
- [ ] Full E2E test of RSI verification flow with live profile
- [ ] Onboarding carousel (5 slides) for first-time users

### P2 - Nice to Have
- [ ] Roadmap (Supply Drop) crowdfunding page full build
- [ ] Admin Panel for Roadmap goal management
- [ ] Supporter rewards (Gold Border, Badge) based on is_supporter flag
- [ ] "Pilot License" style for Profile page
- [ ] Manufacturer themes (Drake, Origin, Aegis)
- [ ] Push notifications

## Next Tasks
1. Implement the 5-slide onboarding tutorial for new users
2. Add "Thinking/Scanning" animation to Intel module
3. Full E2E test of RSI verification with a real profile
4. Build out the Roadmap/Supply Drop feature
5. Admin panel for managing Roadmap goals

## API Endpoints
- `/api/auth/register` - User registration
- `/api/auth/login` - User login (blocks unverified users)
- `/api/auth/verify-rsi` - RSI bio verification
- `/api/auth/me` - Get current user
- `/api/ships` - Get ship list
- `/api/intel/analyze` - Get mission recommendation
- `/api/signals/status` - Get server status with RSI feed
- `/api/signals/reports` - GET/POST reports
- `/api/signals/alerts` - GET recent alerts (all types)
- `/api/contracts` - GET/POST contracts
- `/api/contracts/{id}/accept` - Accept contract
- `/api/contracts/{id}/complete` - Complete contract
- `/api/contracts/{id}/review` - Review contract
- `/api/uex/commodities` - Proxy to UEX Corp API
- `/api/goals` - Get roadmap goals

## Database Schema
- **users**: email, password_hash, rsi_handle, verification_code, is_verified, reputation, avatar_url, theme_id, is_supporter, contracts_completed
- **reports**: type, system, location, shard, details, user_id, created_at
- **contracts**: type, title, description, location, shard, poster_id, accepted_by, status, client_review, merc_review
- **goals**: title, description, target_amount, current_amount, backers, status
