# NavCom Connect - Project Summary

## What It Is
**NavCom Connect** is a companion web app for Star Citizen players. It's a "MobiGlass-inspired" mission advisor, contract board, and community intel platform that helps players connect, trade services, and stay informed about in-game threats and server conditions.

## Tech Stack
- **Frontend**: React 18 + Vite, Shadcn/UI components, Lucide icons
- **Backend**: FastAPI (Python), async/await throughout
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT tokens, bcrypt password hashing
- **Real-time**: Server-Sent Events (SSE) for live notifications
- **Hosting**: Kubernetes container with Nginx reverse proxy

## Architecture
```
/app
├── backend/
│   └── server.py          # Single-file FastAPI app (~2600 lines)
├── frontend/
│   ├── src/
│   │   ├── pages/         # Intel, Signals, Contracts, Profile, Settings, Admin, etc.
│   │   ├── components/    # Header, AlertTicker, NotificationBell, etc.
│   │   ├── hooks/         # useSSENotifications, useNotifications
│   │   ├── utils/         # sounds.js
│   │   └── constants/     # ranks.js, badges.js
│   └── public/
│       └── sounds/        # Audio files for notifications
└── memory/
    └── PRD.md             # Product requirements doc
```

## Core Features

### 1. Mission Advisor (Intel Page)
- AI-style mission recommendations based on player's ship loadout
- Risk assessment using real-time Signals data
- Location data from UEXcorp API (Stanton) + fallbacks (Pyro, Nyx)

### 2. Signals (Player-Led Reporting)
- Report types: Pirates, PvP, Lag/Desync, Mission Bugs, Cargo Bugs
- Shard-specific AND global alerts
- Optional description field (150 char, profanity filtered)
- Feeds into AlertTicker (top of screen) and Intel risk calculations

### 3. Job Board (Contracts)
- Players post contracts (Combat, Medical, Logistics, Industrial, Other)
- Other players bid on contracts
- Contract poster reviews bids, accepts one
- Two-way rating system after completion
- Multi-crew slot support

### 4. Citizen Directory
- Browse all registered players
- Sortable by rank, rating, jobs completed
- Click to view full Citizen ID / profile

### 5. Reputation & Rank System
- **Ranks** (based on contracts completed): CIVILIAN → FREELANCER → ASSOCIATE → OPERATIVE → VETERAN → ELITE → LEGEND
- **Ratings**: 1-5 stars from completed contracts
- **Badges**: Supporter tiers (Bronze/Silver/Gold), admin-assignable

### 6. Real-Time Notifications (SSE)
- New contract posted (category-specific sounds)
- Someone bid on your contract
- Your bid was accepted
- Intel alerts (threats, server issues)
- Sound toggle in Settings

### 7. Theme System
- 4 themes: MobiGlass (cyan), Scavenger (orange), Luxury (white), MilSpec (red)
- CSS variables cascade via `[data-theme="x"]` on document root
- Persisted to user profile in DB

### 8. Admin Panel
- User management (view all users, assign badges)
- Roadmap management (CRUD for roadmap items)

## Key Database Collections
- `users` - accounts, profiles, badges, theme preference
- `contracts` - job postings with status workflow
- `contract_bids` - bids on contracts
- `contract_ratings` - post-completion ratings
- `reports` - player intel reports (signals)
- `roadmap` - admin-managed roadmap items
- `notification_settings` - per-user alert preferences

## API Highlights
- `POST /api/auth/register` / `login` / `GET /me`
- `GET/POST /api/contracts`, `POST /:id/bid`, `POST /:id/accept-bid/:bidId`
- `POST /api/signals/report`, `GET /api/signals/alerts`
- `GET /api/notifications/stream` (SSE endpoint)
- `GET /api/users/directory`
- `GET /api/locations/categorized` (UEXcorp + fallbacks)
- `PUT /api/user/theme`, `DELETE /api/user/account`

## Sound System
| Event | Sound File |
|-------|------------|
| Login success | login_success.mp3 |
| Combat contract | combat_contract.mp3 |
| Logistics contract | logistics_contract.mp3 |
| Medical contract | medical_contract.mp3 |
| Industrial contract | industrial_contract.mp3 |
| Someone bid on your contract | mercenary_bid.mp3 |
| Your bid accepted | bid_accepted.mp3 |
| Pirate/PvP threat | threat_reported.mp3 |
| Server stability issue | stability.mp3 |
| Mission/cargo bug | server_issue.mp3 |

## External Integrations
- **UEXcorp API**: `https://api.uexcorp.uk/2.0/poi` - Star Citizen location data (cached 24h)
- Fallback locations hardcoded for Pyro (10) and Nyx (6) systems

## User Flow
1. **Landing page** → explains features, prominent LOGIN/REGISTER
2. **Register** → email, password, RSI handle (verified against RSI website pattern)
3. **Onboarding carousel** → introduces key features
4. **Shard prompt** → select current server shard for relevant alerts
5. **Main app** → Intel, Signals, Job Board, Directory, Profile, Settings

## Design Philosophy
- Futuristic "MobiGlass" aesthetic (dark backgrounds, cyan/orange accents)
- Monospace fonts for data, display fonts for headers
- Glow effects, subtle animations
- Mobile-responsive with bottom nav

## What's Next (Backlog)
- P2: Refactor Contracts.jsx (1400+ lines) into smaller components
- P2: Org/group support
- P2: Fleet manager
- P3: Service worker push notifications

## Credentials (Dev/Test)
- **Admin**: beecroft519@gmail.com / Nv$C0m_Adm1n_2025!
- RSI Handle: Mowri

## Critical Notes for Developers
1. All API routes prefixed with `/api` (Nginx routes to backend:8001)
2. Frontend uses `REACT_APP_BACKEND_URL` from `.env`
3. MongoDB ObjectIds must be excluded from responses (`"_id": 0`)
4. SSE notifications broadcast via in-memory queue (not persistent)
5. Sounds controlled by `localStorage.navcom_sound_enabled`
6. Theme controlled by `data-theme` attribute on `<html>`
