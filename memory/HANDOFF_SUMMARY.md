# NavCom - Star Citizen Mission Advisor
## Complete Project Summary for Fork Handoff

---

## ORIGINAL PROBLEM STATEMENT
Build "NavCom" - a tactical companion web-app for Star Citizen players featuring:
- MobiGlass UI theme (dark navy #020b14, cyan #00f0ff)
- INTEL module (Mission Advisor with live UEX commodity data)
- SIGNALS module (Server Health & Crowdsourced Reports)
- CONTRACTS module (Mercenary Beacon / Uber-style job board)
- ROADMAP module (Supply Drop crowdfunding with Stripe)
- RSI Handle verification for authentication
- Admin panel for goal management

**Tech Stack**: React + FastAPI + MongoDB (user originally requested PHP/MySQL, pivoted with consent)

---

## WHAT HAS BEEN BUILT (100% Functional)

### Authentication System
- JWT-based auth with RSI Handle verification
- Users must add verification code to RSI bio, then scrape validates
- Avatar scraping from RSI profiles (improved regex patterns)
- Protected routes - ALL pages require login except /login and /register
- 5-slide onboarding carousel for first-time users
- Session-based shard prompt on every login

### INTEL Module (/intel)
- Mission type selector (Cargo Hauling, Mining, Chill/Exploration)
- Ship selector with 29 ships from Golden Truth data
- Time available input
- Risk tolerance slider
- **Live UEX Corp API integration** for commodity prices
- "Thinking/Scanning" animation during analysis
- Detailed mission recommendations with profit calculations

### SIGNALS Module (/signals)
- **Real RSI server status** via RSS feed parsing
- Crowdsourced incident reporting (Lag, 30K, Bugs, Pirates, PvP)
- Location picker with Star Citizen locations
- Shard input for targeted alerts
- **Dynamic reliability metrics** based on ACTUAL report data (no more random)
- **Incident Trends Charts**:
  - Timeline (Area chart - reports over 7/14/30 days)
  - Breakdown (Pie chart - report type distribution)
  - Locations (Bar chart - hotspot locations)
- Risk indicators (Location Congestion, PvP Risk)

### CONTRACTS Module (/contracts)
- Create contracts (Escort, Rescue, Transport, Mining Support, Combat)
- Browse available contracts
- Accept/Complete workflow
- **Bilateral 5-star rating system** (Client rates Merc, Merc rates Client)
- Reputation tracking

### ROADMAP Module (/roadmap)
- Crowdfunding goals with progress bars
- "Fund This Feature" buttons
- **Stripe integration** (test key: sk_test_emergent)
- Supporter tracking

### ADMIN Panel (/admin)
- Goals management (CRUD)
- Contributions list
- Users list with verification status
- **NEW: Reset Reports button** with timestamp tracking

### Settings (/settings)
- **Alert Tickers**: Toggle Threats/Stability/Issues tickers
- **Push Notifications**: WebSocket enable, Sound toggle, Alert type filters
- **Contract Notifications**: Filter by contract type (Escort, Rescue, etc.)
- **Themes**: MobiGlass (default), Scavenger, Luxury, MilSpec (coming soon)

### Alert Tickers (Header)
- Three scrolling tickers: LIVE THREATS, STABILITY, ISSUES
- Filter by user's current shard
- **Shows "ALL CLEAR" when no active reports**
- Toggleable in settings
- Only visible when logged in

### WebSocket Real-time Notifications
- Socket.IO integration for instant alerts
- Sound notification (toggleable)
- Browser push notifications (permission-based)
- Shard-based filtering
- Foundation for contract notifications

---

## ADMIN CREDENTIALS
```
Email: beecroft519@gmail.com
Password: Nv$C0m_Adm1n_2025!
RSI Handle: Mowri
```
Auto-created on server startup if not exists.

---

## KEY FILES

### Backend (/app/backend/)
- `server.py` - ALL API routes, auth, WebSocket, Stripe, admin endpoints
- `ships.py` - Golden Truth ship data (29 ships)
- `.env` - MONGO_URL, DB_NAME, STRIPE_SECRET_KEY

### Frontend (/app/frontend/src/)
- `App.js` - Main router, auth context, protected routes, onboarding
- `pages/Intel.jsx` - Mission advisor with UEX integration
- `pages/Signals.jsx` - Server health, reports, charts (USES REAL DATA)
- `pages/Contracts.jsx` - Job board
- `pages/Roadmap.jsx` - Crowdfunding
- `pages/Admin.jsx` - Admin panel with reset functionality
- `pages/Settings.jsx` - Ticker/notification settings
- `pages/Login.jsx` - Login form
- `pages/Register.jsx` - Registration with RSI verification
- `pages/Profile.jsx` - User profile
- `components/Header.jsx` - Navigation, shard display
- `components/AlertTicker.jsx` - Scrolling alert tickers
- `components/OnboardingCarousel.jsx` - 5-slide tutorial
- `hooks/useNotifications.js` - WebSocket hook

---

## API ENDPOINTS

### Auth
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login (returns JWT)
- POST `/api/auth/verify-rsi` - Verify RSI handle
- GET `/api/auth/me` - Get current user

### Intel
- POST `/api/intel/analyze` - Get mission recommendation
- GET `/api/ships` - Get ship list
- GET `/api/uex/commodities` - Proxy to UEX Corp API

### Signals
- GET `/api/signals/status` - Server status + RSI feed
- GET `/api/signals/reports?days=N` - Get reports for N days
- POST `/api/signals/report` - Submit report (broadcasts via WebSocket)
- GET `/api/signals/alerts` - Get recent alerts

### Contracts
- GET `/api/contracts` - List contracts
- POST `/api/contracts` - Create contract
- POST `/api/contracts/{id}/accept` - Accept contract
- POST `/api/contracts/{id}/complete` - Mark complete
- POST `/api/contracts/{id}/review` - Submit review

### Admin
- GET `/api/admin/goals` - List goals
- POST `/api/admin/goals` - Create goal
- PUT `/api/admin/goals/{id}` - Update goal
- DELETE `/api/admin/goals/{id}` - Delete goal
- GET `/api/admin/contributions` - List contributions
- GET `/api/admin/users` - List users
- POST `/api/admin/reset-reports` - Reset all reports
- GET `/api/admin/last-reset` - Get last reset timestamp

### Roadmap
- GET `/api/goals` - Public goals list
- POST `/api/goals/{id}/contribute` - Contribute (Stripe checkout)

### User Settings
- GET `/api/user/notification-settings`
- PUT `/api/user/notification-settings`

---

## DATABASE SCHEMA (MongoDB)

### users
```
{
  id, email, password_hash, rsi_handle, 
  rsi_verification_code, is_verified, is_admin, is_supporter,
  avatar_url, theme_id, reputation, contracts_completed, created_at
}
```

### reports
```
{
  id, type, system, location, shard, details, user_id, created_at
}
```

### contracts
```
{
  id, type, title, description, location, poster_id, 
  accepted_by, status, client_review, merc_review, created_at
}
```

### goals
```
{
  id, title, description, target_amount, current_amount, 
  backers, status, rewards, created_at
}
```

### contributions
```
{
  id, goal_id, user_id, amount, stripe_session, created_at
}
```

### settings
```
{
  key, value
}
```

### notification_settings
```
{
  user_id, websocket_enabled, sound_enabled, 
  threat_alerts, stability_alerts, issue_alerts,
  contract_alerts, contract_types
}
```

---

## 3RD PARTY INTEGRATIONS

| Service | Purpose | Key Required |
|---------|---------|--------------|
| UEX Corp API | Live commodity prices | No |
| RSI Status Feed | Server status RSS | No |
| RSI Profile Scraper | Bio verification + avatar | No |
| Stripe | Crowdfunding payments | Yes (test key in env) |
| Socket.IO | Real-time notifications | No |

---

## KNOWN ISSUES / PENDING

1. **RSI Avatar Scraping**: Improved but may need further regex tuning for edge cases
2. **Stripe**: Using test key - needs real key for production
3. **Themes**: Only MobiGlass active; Scavenger/Luxury/MilSpec marked "Coming Soon"
4. **Image Upload**: Not implemented - consider adding with moderation for user avatars

---

## FUTURE ENHANCEMENTS (BACKLOG)

- P1: User profile image upload with AI moderation
- P2: Real-time contract notifications by type
- P2: Org/group support
- P2: Fleet manager feature
- P3: Mobile responsive improvements
- P3: Push notifications via service worker

---

## THEME NAMES (Copyright Safe)
- MobiGlass (default)
- Scavenger (was Drake Interplanetary)
- Luxury (was Origin Jumpworks)
- MilSpec (was Aegis Dynamics)

---

## ENVIRONMENT VARIABLES

### Backend (.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
STRIPE_SECRET_KEY="sk_test_emergent"
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=<preview-url>
```

---

## TEST REPORTS
- `/app/test_reports/iteration_1.json`
- `/app/test_reports/iteration_2.json`

---

## CRITICAL NOTES FOR NEXT AGENT

1. **Signals reliability is now REAL DATA** - no more Math.random()
2. **All routes protected** - only /login and /register accessible without auth
3. **Tickers show "ALL CLEAR"** when no reports exist
4. **Admin reset clears reports collection** and logs timestamp
5. **Clipboard copy has fallback** for restricted contexts
6. **Admin email is beecroft519@gmail.com** (not outlook)
7. **WebSocket foundation ready** for contract notifications
