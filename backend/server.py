from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import httpx
import socketio
import stripe
import secrets
import asyncio
import json

from ships import SHIP_SPECS, get_ship_scu, get_all_ships
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ===== Text Moderation =====
# Basic profanity/hate speech filter
BLOCKED_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt',
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'chink', 'spic', 'kike',
    'slut', 'whore', 'cock', 'penis', 'vagina', 'porn', 'nazi', 'hitler'
]

def moderate_text(text: str) -> str:
    """Replace blocked words with asterisks"""
    if not text:
        return text
    result = text
    for word in BLOCKED_WORDS:
        # Case insensitive replacement with asterisks
        pattern = re.compile(re.escape(word), re.IGNORECASE)
        result = pattern.sub('*' * len(word), result)
    return result

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Stripe Configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Socket.IO for real-time notifications
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# ===== UEXcorp POI Cache =====
poi_cache = {
    "data": None,
    "fetched_at": None
}
POI_CACHE_DURATION = timedelta(hours=24)

# Fallback locations for Pyro and Nyx (UEXcorp API doesn't have these yet)
PYRO_FALLBACK_LOCATIONS = [
    {"id": "pyro-1", "name": "Ruin Station", "star_system_name": "Pyro", "type": "Station", "is_available_live": 1},
    {"id": "pyro-2", "name": "Pyro Gateway", "star_system_name": "Pyro", "type": "Jump Point", "is_available_live": 1},
    {"id": "pyro-3", "name": "Pyro I", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-4", "name": "Pyro II", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-5", "name": "Pyro III", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-6", "name": "Pyro IV", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-7", "name": "Pyro V", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-8", "name": "Pyro VI", "star_system_name": "Pyro", "type": "Planet", "is_available_live": 1},
    {"id": "pyro-9", "name": "Checkmate Station", "star_system_name": "Pyro", "type": "Station", "is_available_live": 1},
    {"id": "pyro-10", "name": "Stanton-Pyro Jump Point", "star_system_name": "Pyro", "type": "Jump Point", "is_available_live": 1},
]

NYX_FALLBACK_LOCATIONS = [
    {"id": "nyx-1", "name": "Delamar", "star_system_name": "Nyx", "type": "Asteroid", "is_available_live": 1},
    {"id": "nyx-2", "name": "Levski", "star_system_name": "Nyx", "type": "Outpost", "is_available_live": 1},
    {"id": "nyx-3", "name": "Nyx I", "star_system_name": "Nyx", "type": "Planet", "is_available_live": 1},
    {"id": "nyx-4", "name": "Nyx II", "star_system_name": "Nyx", "type": "Planet", "is_available_live": 1},
    {"id": "nyx-5", "name": "Nyx III", "star_system_name": "Nyx", "type": "Planet", "is_available_live": 1},
    {"id": "nyx-6", "name": "Nyx Gateway", "star_system_name": "Nyx", "type": "Jump Point", "is_available_live": 1},
]

async def get_uexcorp_pois():
    """Fetch POIs from UEXcorp API with 24hr cache, includes fallbacks for Pyro/Nyx"""
    # Return cached data if fresh
    if poi_cache["data"] and poi_cache["fetched_at"]:
        if datetime.now(timezone.utc) - poi_cache["fetched_at"] < POI_CACHE_DURATION:
            return poi_cache["data"]
    
    # Fetch fresh data
    all_pois = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get("https://api.uexcorp.uk/2.0/poi")
            if response.status_code == 200:
                data = response.json()
                pois = data.get("data", data) if isinstance(data, dict) else data
                
                # Filter to only locations available in live game
                live_pois = [poi for poi in pois if poi.get("is_available_live") == 1]
                all_pois = live_pois
    except Exception as e:
        logger.error(f"UEXcorp POI fetch error: {e}")
    
    # Add fallback locations for Pyro and Nyx (UEXcorp doesn't have these)
    pyro_in_data = any(p.get("star_system_name") == "Pyro" for p in all_pois)
    nyx_in_data = any(p.get("star_system_name") == "Nyx" for p in all_pois)
    
    if not pyro_in_data:
        all_pois.extend(PYRO_FALLBACK_LOCATIONS)
    if not nyx_in_data:
        all_pois.extend(NYX_FALLBACK_LOCATIONS)
    
    # Update cache
    poi_cache["data"] = all_pois
    poi_cache["fetched_at"] = datetime.now(timezone.utc)
    
    return all_pois

async def get_signals_risk_for_location(system: str, location: str = None):
    """Get risk assessment based on recent Signals reports"""
    # Get reports from last 24 hours
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Build query - use created_at field
    query = {"created_at": {"$gte": cutoff.isoformat()}}
    if system:
        query["$or"] = [
            {"system": {"$regex": system, "$options": "i"}},
            {"location": {"$regex": system, "$options": "i"}}
        ]
    
    reports = await db.reports.find(query).to_list(100)
    
    if not reports:
        return {"risk_adjustment": 0, "warnings": [], "report_count": 0}
    
    # Count by type
    piracy_count = sum(1 for r in reports if r.get("type") == "piracy")
    pvp_count = sum(1 for r in reports if r.get("type") == "pvp")
    crash_count = sum(1 for r in reports if r.get("type") in ["30k", "crash", "bug"])
    
    warnings = []
    risk_adjustment = 0
    
    # Generate warnings and risk adjustment
    if piracy_count >= 3:
        warnings.append(f"⚠️ HIGH PIRACY ALERT: {piracy_count} reports in last 24h")
        risk_adjustment += 2
    elif piracy_count >= 1:
        warnings.append(f"⚠️ Piracy activity reported ({piracy_count}x)")
        risk_adjustment += 1
    
    if pvp_count >= 3:
        warnings.append(f"⚠️ PVP HOTSPOT: {pvp_count} engagements reported")
        risk_adjustment += 2
    elif pvp_count >= 1:
        warnings.append(f"⚠️ PvP activity in area ({pvp_count}x)")
        risk_adjustment += 1
    
    if crash_count >= 2:
        warnings.append(f"⚠️ Server instability: {crash_count} crash reports")
        risk_adjustment += 1
    
    # Get specific dangerous locations mentioned
    dangerous_locations = set()
    for r in reports:
        if r.get("type") in ["piracy", "pvp"] and r.get("location"):
            dangerous_locations.add(r.get("location"))
    
    return {
        "risk_adjustment": min(risk_adjustment, 3),  # Cap at 3
        "warnings": warnings,
        "report_count": len(reports),
        "dangerous_locations": list(dangerous_locations)[:5],  # Top 5
        "piracy_count": piracy_count,
        "pvp_count": pvp_count,
        "crash_count": crash_count
    }

# ===== SSE Notification System =====
connected_clients: List[asyncio.Queue] = []

async def broadcast_notification(notification: dict):
    """Send notification to all connected SSE clients"""
    for queue in connected_clients:
        try:
            await queue.put(notification)
        except:
            pass  # Client may have disconnected

# Create the main app
app = FastAPI(title="NavCom API", version="2.0.0")
socket_app = socketio.ASGIApp(sio, app)

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===== Pydantic Models =====

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    rsi_handle: str
    verification_code: Optional[str] = None
    is_verified: Optional[bool] = False

class RSIVerifyRequest(BaseModel):
    rsi_handle: str
    verification_code: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    rsi_handle: str
    is_verified: bool = False
    is_supporter: bool = False
    is_admin: bool = False
    theme_id: str = "default"
    reputation: float = 5.0
    contracts_completed: int = 0
    created_at: str
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    badges: List[str] = []
    supporter_tier: str = "NONE"

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class IntelRequest(BaseModel):
    ship: str
    system: str
    time: str
    activity: str
    risk: str

class MissionResponse(BaseModel):
    type: str
    title: str
    description: str
    location: dict
    duration: str
    reward: str
    risk_level: str
    fallback: Optional[dict] = None
    profit_data: Optional[dict] = None  # For cargo: commodity, route, profit_per_scu, total_profit, roi
    intel_summary: Optional[dict] = None  # Signals-based risk intel: warnings, dangerous_locations

class ReportCreate(BaseModel):
    type: str
    system: Optional[str] = None
    location: Optional[str] = None
    shard: Optional[str] = None
    details: Optional[str] = None
    description: Optional[str] = None  # New field for additional context (max 150 chars)
    timestamp: Optional[str] = None

# ===== Multi-Crew Manifest Models (defined before ContractCreate) =====

class ManifestSlot(BaseModel):
    role: str
    payout: int
    status: str = "OPEN"
    applicant_id: Optional[str] = None
    bids: List[dict] = []

class ContractCreate(BaseModel):
    title: str
    description: Optional[str] = None
    compensation_type: Optional[str] = None
    # Payment
    payment_amount: Optional[int] = 0
    payout: Optional[int] = None
    split_profits: Optional[bool] = False
    # Location
    system: Optional[str] = None
    planet: Optional[str] = None
    location: Optional[str] = None
    shard: Optional[str] = None
    # Category (single unified field)
    category: Optional[str] = 'OTHER'
    # Multi-crew manifest
    is_multi_crew: Optional[bool] = False
    manifest: Optional[List[ManifestSlot]] = None
    # Duration
    duration_minutes: Optional[int] = 60

class ReviewCreate(BaseModel):
    contract_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    review_type: str  # 'client_to_merc' or 'merc_to_client'

class BadgeAssignRequest(BaseModel):
    action: str = "add"  # "add" or "remove"
    badge_id: str

class RedeemCodeRequest(BaseModel):
    code: str

# Hardcoded redemption codes for supporter tiers
REDEMPTION_CODES = {
    "NAV-BRONZE-TEST": "BRONZE",
    "NAV-SILVER-TEST": "SILVER",
    "NAV-GOLD-TEST": "GOLD",
}

class GoalResponse(BaseModel):
    id: str
    title: str
    description: str
    target_amount: int
    current_amount: int
    backers: int
    status: str
    rewards: Optional[List[dict]] = None

class GoalCreate(BaseModel):
    title: str
    description: str
    target_amount: int
    rewards: Optional[List[dict]] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[int] = None
    status: Optional[str] = None
    rewards: Optional[List[dict]] = None

class ContributionCreate(BaseModel):
    goal_id: str
    amount: int

class NotificationSettings(BaseModel):
    websocket_enabled: bool = True
    sound_enabled: bool = True
    threat_alerts: bool = True
    stability_alerts: bool = True
    issue_alerts: bool = True
    contract_alerts: bool = True
    contract_types: Optional[List[str]] = None  # e.g., ['rescue', 'escort', 'transport']


# ===== Multi-Crew Request Models =====

class ManifestBidRequest(BaseModel):
    slot_index: int

class ManifestAcceptBidRequest(BaseModel):
    slot_index: int
    user_id: str


# ===== Utility Functions =====

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    user_id = verify_token(credentials.credentials)
    if not user_id:
        return None
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    return user

async def require_admin(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not user.get('is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Admin email constant
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'beecroft519@gmail.com')


# ===== Socket.IO Events =====

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_shard(sid, data):
    """Join a shard room for targeted notifications"""
    shard = data.get('shard')
    if shard:
        sio.enter_room(sid, f'shard_{shard}')
        logger.info(f"Client {sid} joined shard {shard}")

@sio.event
async def leave_shard(sid, data):
    """Leave a shard room"""
    shard = data.get('shard')
    if shard:
        sio.leave_room(sid, f'shard_{shard}')

@sio.event
async def subscribe_contracts(sid, data):
    """Subscribe to contract type notifications"""
    contract_types = data.get('types', [])
    for ctype in contract_types:
        sio.enter_room(sid, f'contract_{ctype}')
        logger.info(f"Client {sid} subscribed to {ctype} contracts")

async def broadcast_alert(alert_data):
    """Broadcast alert to relevant shard rooms"""
    shard = alert_data.get('shard')
    if shard:
        await sio.emit('new_alert', alert_data, room=f'shard_{shard}')
    await sio.emit('new_alert', alert_data)  # Also broadcast globally

async def broadcast_contract(contract_data):
    """Broadcast new contract to relevant subscribers"""
    contract_type = contract_data.get('type')
    if contract_type:
        await sio.emit('new_contract', contract_data, room=f'contract_{contract_type}')
    await sio.emit('new_contract', contract_data)  # Also broadcast globally


# ===== Auth Routes =====

@api_router.post("/auth/verify-rsi")
async def verify_rsi_handle(request: RSIVerifyRequest):
    """Verify that the user's RSI bio contains the verification code"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://robertsspaceindustries.com/citizens/{request.rsi_handle}"
            response = await client.get(url, follow_redirects=True)
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="RSI Handle not found")
            
            page_content = response.text
            
            # Extract avatar URL from RSI profile
            avatar_url = None
            import re
            # Try multiple patterns for RSI avatar images
            avatar_patterns = [
                r'<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]+)"',
                r'src="(https://media\.robertsspaceindustries\.com/[^"]+)"',
                r'src="(/media/[^"]+heap_thumb[^"]*)"',
                r'src="(/media/[^"]+heap_infobox[^"]*\.(?:jpg|png))"',
            ]
            for pattern in avatar_patterns:
                avatar_match = re.search(pattern, page_content)
                if avatar_match:
                    avatar_url = avatar_match.group(1)
                    break
            
            if avatar_url:
                if avatar_url.startswith('//'):
                    avatar_url = 'https:' + avatar_url
                elif avatar_url.startswith('/'):
                    avatar_url = 'https://robertsspaceindustries.com' + avatar_url
            
            if request.verification_code in page_content:
                await db.users.update_one(
                    {'rsi_handle': request.rsi_handle},
                    {'$set': {'is_verified': True, 'avatar_url': avatar_url}}
                )
                return {'verified': True, 'message': 'RSI Handle verified successfully', 'avatar_url': avatar_url}
            else:
                return {'verified': False, 'message': 'Verification code not found in RSI bio'}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="RSI website timeout. Please try again.")
    except Exception as e:
        logger.error(f"RSI verification error: {e}")
        raise HTTPException(status_code=500, detail="Verification service error")


@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if handle exists
    existing_handle = await db.users.find_one({'rsi_handle': user_data.rsi_handle})
    if existing_handle:
        raise HTTPException(status_code=400, detail="RSI Handle already registered")
    
    # Create user - verified status comes from frontend after RSI check
    user = {
        'id': str(uuid.uuid4()),
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'rsi_handle': user_data.rsi_handle,
        'verification_code': user_data.verification_code,
        'is_verified': user_data.is_verified or False,
        'is_supporter': False,
        'theme_id': 'default',
        'reputation': 5.0,
        'contracts_completed': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    return {'message': 'Registration successful', 'user_id': user['id']}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one(
        {'email': credentials.email},
        {'_id': 0}
    )
    
    if not user or user.get('password_hash') != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Block login if not verified
    if not user.get('is_verified', False):
        raise HTTPException(status_code=403, detail="Account not verified. Please complete RSI bio verification.")
    
    token = create_token(user['id'])
    
    return TokenResponse(token=token, user=UserResponse(
        id=user['id'],
        rsi_handle=user['rsi_handle'],
        is_verified=user.get('is_verified', False),
        is_supporter=user.get('is_supporter', False),
        is_admin=user.get('is_admin', False),
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 5.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url')
    ))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return UserResponse(
        id=user['id'],
        rsi_handle=user['rsi_handle'],
        is_verified=user.get('is_verified', False),
        is_supporter=user.get('is_supporter', False),
        is_admin=user.get('is_admin', False),
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 5.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url'),
        avatar_preset=user.get('avatar_preset'),
        badges=user.get('badges', []),
        supporter_tier=user.get('supporter_tier', 'NONE')
    )


# ===== Ships Routes =====

@api_router.get("/ships")
async def get_ships():
    return [
        {"name": name, "scu": spec["scu"], "type": spec["type"]}
        for name, spec in SHIP_SPECS.items()
    ]


# ===== Location/POI Routes =====

@api_router.get("/locations")
async def get_locations():
    """Return cached UEXcorp POI data"""
    pois = await get_uexcorp_pois()
    return {"locations": pois, "count": len(pois)}

@api_router.get("/locations/categorized")
async def get_categorized_locations():
    """Return POIs grouped by useful categories"""
    pois = await get_uexcorp_pois()
    
    # Categorize based on type and other flags
    categorized = {
        "trading": [p for p in pois if p.get("has_trade_terminal") or 'Trade' in (p.get("subtype") or '')],
        "mining": [p for p in pois if p.get("has_refinery") or p.get("type") == "Asteroid" or 'Mining' in (p.get("subtype") or '')],
        "medical": [p for p in pois if p.get("has_clinic")],
        "safe_zones": [p for p in pois if p.get("is_armistice")],
        "outposts": [p for p in pois if p.get("type") == "Outpost"],
        "bunkers": [p for p in pois if "UGF" in (p.get("subtype") or '') or "Bunker" in (p.get("subtype") or '')],
        "comm_arrays": [p for p in pois if "Comm Array" in (p.get("subtype") or '')],
        "racetracks": [p for p in pois if p.get("type") == "Racetrack"],
        "stanton": [p for p in pois if p.get("star_system_name") == "Stanton"],
        "pyro": [p for p in pois if p.get("star_system_name") == "Pyro"],
        "all": pois
    }
    
    return categorized


# ===== Intel Routes =====

@api_router.post("/intel/analyze", response_model=MissionResponse)
async def analyze_mission(request: IntelRequest):
    ship_scu = get_ship_scu(request.ship)
    time_display = {'15m': '15-30 min', '30m': '30-45 min', '1h': '30-60 min', '2h': '60-120 min'}.get(request.time, '30-60 min')
    
    # ===== Signals Integration: Get real-time risk from player reports =====
    signals_risk = await get_signals_risk_for_location(request.system)
    signals_warnings = signals_risk.get("warnings", [])
    dangerous_locations = signals_risk.get("dangerous_locations", [])
    
    # Pyro is always moderate-to-high risk due to full PvP
    effective_risk = request.risk
    pyro_warning = ""
    signals_warning = ""
    
    # Apply signals-based risk elevation
    if signals_risk["risk_adjustment"] >= 2:
        if effective_risk == 'LOW':
            effective_risk = 'MEDIUM'
            signals_warning = " 📡 INTEL: Risk elevated based on recent player reports"
        elif effective_risk == 'MEDIUM':
            effective_risk = 'HIGH'
            signals_warning = " 📡 INTEL: High threat level from player reports"
    elif signals_risk["risk_adjustment"] == 1 and effective_risk == 'LOW':
        signals_warning = " 📡 INTEL: Caution advised - recent activity reports"
    
    if request.system == 'Pyro':
        if request.risk == 'LOW':
            effective_risk = 'MEDIUM'
            pyro_warning = " ⚠️ PYRO: Minimum risk elevated to MEDIUM (full PvP system)"
        else:
            pyro_warning = " ⚠️ PYRO: Full PvP system - expect hostile players"
    
    # System-specific terminal/location keywords for filtering
    system_keywords = {
        'Stanton': ['Hurston', 'Lorville', 'Area18', 'ArcCorp', 'Crusader', 'Orison', 'microTech', 'New Babbage', 
                    'Port Tressler', 'GrimHEX', 'CRU-L', 'HUR-L', 'ARC-L', 'MIC-L', 'Everus', 'Baijini',
                    'Yela', 'Cellin', 'Daymar', 'Arial', 'Aberdeen', 'Magda', 'Ita', 'Euterpe', 'Calliope', 'Clio'],
        'Pyro': ['Pyro', 'Ruin Station', 'Checkmate', 'Ignis', 'Bloom', 'Terminus'],
        'Nyx': ['Nyx', 'Levski', 'Delamar']
    }
    
    # Cargo - fetch LIVE UEX data for best routes
    if request.activity == 'cargo':
        best_route = None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Fetch all commodity prices
                prices_resp = await client.get('https://uexcorp.space/api/2.0/commodities_prices_all')
                if prices_resp.status_code == 200:
                    prices_data = prices_resp.json()
                    prices = prices_data.get('data', prices_data) if isinstance(prices_data, dict) else prices_data
                    
                    # Filter by system - only include terminals in selected system
                    keywords = system_keywords.get(request.system, system_keywords['Stanton'])
                    
                    def is_in_system(terminal_name):
                        if not terminal_name:
                            return False
                        return any(kw.lower() in terminal_name.lower() for kw in keywords)
                    
                    # Group by commodity - find buy and sell locations IN THE SELECTED SYSTEM
                    commodity_prices = {}
                    for p in prices:
                        cname = p.get('commodity_name')
                        terminal = p.get('terminal_name', '')
                        if not cname or not is_in_system(terminal):
                            continue
                        if cname not in commodity_prices:
                            commodity_prices[cname] = {'buys': [], 'sells': []}
                        
                        if p.get('price_buy') and p.get('price_buy') > 0 and p.get('status_buy') == 1:
                            commodity_prices[cname]['buys'].append({
                                'terminal': terminal,
                                'price': p.get('price_buy'),
                                'stock': p.get('scu_buy', 0)
                            })
                        if p.get('price_sell') and p.get('price_sell') > 0 and p.get('status_sell') == 1:
                            commodity_prices[cname]['sells'].append({
                                'terminal': terminal,
                                'price': p.get('price_sell'),
                                'stock': p.get('scu_sell_stock', 0)
                            })
                    
                    # Calculate best routes
                    routes = []
                    for commodity, data in commodity_prices.items():
                        if not data['buys'] or not data['sells']:
                            continue
                        # Best buy (lowest price)
                        best_buy = min(data['buys'], key=lambda x: x['price'])
                        # Best sell (highest price)
                        best_sell = max(data['sells'], key=lambda x: x['price'])
                        
                        profit_per_scu = best_sell['price'] - best_buy['price']
                        if profit_per_scu > 100:  # Minimum viable profit
                            roi = (profit_per_scu / best_buy['price']) * 100 if best_buy['price'] > 0 else 0
                            routes.append({
                                'commodity': commodity,
                                'buy_terminal': best_buy['terminal'],
                                'buy_price': best_buy['price'],
                                'sell_terminal': best_sell['terminal'],
                                'sell_price': best_sell['price'],
                                'profit_per_scu': profit_per_scu,
                                'roi': roi,
                                'total_profit': profit_per_scu * ship_scu,
                                'investment': best_buy['price'] * ship_scu
                            })
                    
                    # Sort by total profit and filter by risk
                    routes.sort(key=lambda x: x['total_profit'], reverse=True)
                    
                    # Filter by risk level
                    illegal_commodities = ['WiDoW', 'Slam', 'Neon', 'E\'tam', 'Maze', 'Altruciatoxin']
                    high_value = ['Laranite', 'Agricium', 'Bexalite', 'Quantanium', 'Taranite']
                    
                    if effective_risk == 'LOW':
                        # Safe, stable commodities - lower profit but consistent
                        routes = [r for r in routes if r['commodity'] not in illegal_commodities and r['roi'] < 50]
                    elif effective_risk == 'HIGH':
                        # High risk = illegal or high-value targets
                        routes = [r for r in routes if r['commodity'] in illegal_commodities or r['commodity'] in high_value or r['roi'] > 30]
                    else:
                        # Medium - avoid illegal but allow decent profit
                        routes = [r for r in routes if r['commodity'] not in illegal_commodities]
                    
                    if routes:
                        best_route = routes[0]
        except Exception as e:
            logger.error(f"UEX API error: {e}")
        
        # Fallback routes if API fails - system-specific
        if not best_route:
            fallback_routes = {
                'Stanton': {
                    'LOW': {'commodity': 'Medical Supplies', 'buy_terminal': 'Orison - Providence Platform', 'buy_price': 1715, 'sell_terminal': 'GrimHEX', 'sell_price': 2150, 'profit_per_scu': 435},
                    'MEDIUM': {'commodity': 'Laranite', 'buy_terminal': 'HDMS-Lathan (Arial)', 'buy_price': 2788, 'sell_terminal': 'TDD New Babbage', 'sell_price': 3156, 'profit_per_scu': 368},
                    'HIGH': {'commodity': 'WiDoW', 'buy_terminal': 'Jumptown (Yela)', 'buy_price': 2400, 'sell_terminal': 'GrimHEX', 'sell_price': 11200, 'profit_per_scu': 8800}
                },
                'Pyro': {
                    'MEDIUM': {'commodity': 'Scrap', 'buy_terminal': 'Ruin Station Salvage', 'buy_price': 150, 'sell_terminal': 'Checkmate Station', 'sell_price': 320, 'profit_per_scu': 170},
                    'HIGH': {'commodity': 'Contraband Mix', 'buy_terminal': 'Pyro Smuggler Cache', 'buy_price': 800, 'sell_terminal': 'Ruin Station Black Market', 'sell_price': 2400, 'profit_per_scu': 1600}
                },
                'Nyx': {
                    'LOW': {'commodity': 'Processed Food', 'buy_terminal': 'Levski Market', 'buy_price': 120, 'sell_terminal': 'Delamar Outpost', 'sell_price': 185, 'profit_per_scu': 65},
                    'MEDIUM': {'commodity': 'Titanium', 'buy_terminal': 'Delamar Mining Hub', 'buy_price': 850, 'sell_terminal': 'Levski Refinery', 'sell_price': 1120, 'profit_per_scu': 270},
                    'HIGH': {'commodity': 'Gold', 'buy_terminal': 'Delamar Deep Mine', 'buy_price': 620, 'sell_terminal': 'Levski Black Market', 'sell_price': 980, 'profit_per_scu': 360}
                }
            }
            system_routes = fallback_routes.get(request.system, fallback_routes['Stanton'])
            best_route = system_routes.get(effective_risk, system_routes.get('MEDIUM', list(system_routes.values())[0]))
            best_route['total_profit'] = best_route['profit_per_scu'] * ship_scu
            best_route['investment'] = best_route['buy_price'] * ship_scu
            best_route['roi'] = (best_route['profit_per_scu'] / best_route['buy_price']) * 100
        
        note = ""
        if best_route.get('commodity') in ['WiDoW', 'Slam', 'Neon', 'E\'tam', 'Maze', 'Altruciatoxin', 'Contraband Mix']:
            note = " ⚠️ ILLEGAL - Scan risk, pirate activity"
        note += pyro_warning + signals_warning
        
        # Build intel summary for the response
        intel_summary = None
        if signals_warnings:
            intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
        
        return MissionResponse(
            type='cargo', title='Cargo Hauling',
            description=f"Trade {best_route['commodity']} for maximum profit{note}",
            location={
                'name': f"📍 {request.system} System: {best_route['commodity']} Trade Route",
                'description': f"{best_route['buy_terminal']} → {best_route['sell_terminal']}",
                'activities': f"Buy at {best_route['buy_price']:,.0f} aUEC/SCU, Sell at {best_route['sell_price']:,.0f} aUEC/SCU"
            },
            duration=time_display, 
            reward=f"{best_route['total_profit']:,.0f} aUEC" if ship_scu > 0 else 'Ship has no cargo capacity',
            risk_level=effective_risk, 
            fallback={'title': 'Delivery Missions', 'description': f'Package delivery from {request.system} contract terminals - no investment needed'},
            profit_data={
                'commodity': best_route['commodity'],
                'route': f"{best_route['buy_terminal']} → {best_route['sell_terminal']}",
                'buy_price': best_route['buy_price'],
                'sell_price': best_route['sell_price'],
                'profit_per_scu': round(best_route['profit_per_scu'], 0),
                'total_profit': int(best_route['total_profit']),
                'investment': int(best_route['investment']),
                'roi': round(best_route['roi'], 1),
                'ship_scu': ship_scu
            },
            intel_summary=intel_summary
        )
    
    # Mining - specific locations, materials, refinery, sell point
    if request.activity == 'mining':
        mining_routes = {
            'Stanton': {
                'LOW': [
                    {'location': 'Yela Asteroid Belt', 'material': 'Quantanium (5-15%)', 'refinery': 'CRU-L1 Refinery', 'sell': 'Area18 TDD', 'yield': '30,000 - 80,000', 'desc': 'Stable rocks, good for beginners. Low pirate activity.'},
                    {'location': 'Daymar Surface', 'material': 'Hadanite (Hand Mining)', 'refinery': 'N/A - Sell Raw', 'sell': 'Any Admin Office', 'yield': '15,000 - 40,000', 'desc': 'Surface gem deposits. Bring a ROC or hand tool.'},
                ],
                'MEDIUM': [
                    {'location': 'Aaron Halo Belt', 'material': 'Quantanium (15-30%)', 'refinery': 'ARC-L1 or HUR-L2', 'sell': 'Lorville TDD', 'yield': '80,000 - 200,000', 'desc': 'Dense quantanium cluster. Watch the 15-min instability timer.'},
                    {'location': 'Arial (Shubin Mining)', 'material': 'Laranite Deposits', 'refinery': 'HUR-L1 Refinery', 'sell': 'New Babbage', 'yield': '50,000 - 120,000', 'desc': 'Underground deposits near Shubin facilities.'},
                ],
                'HIGH': [
                    {'location': 'Aaron Halo - Deep Belt', 'material': 'Quantanium (30%+ Clusters)', 'refinery': 'CRU-L1 (Closest)', 'sell': 'Highest Bidder', 'yield': '150,000 - 400,000', 'desc': 'Premium rocks but heavy pirate presence. Bring escort.'},
                    {'location': 'Aberdeen Caves', 'material': 'Hadanite + Aphorite', 'refinery': 'N/A', 'sell': 'Lorville Admin', 'yield': '60,000 - 150,000', 'desc': 'Toxic atmosphere. Pembroke suit required. Rich gem veins.'},
                ]
            },
            'Pyro': {
                'MEDIUM': [{'location': 'Pyro Belt Edge', 'material': 'Mixed Ores', 'refinery': 'Pyro Station', 'sell': 'Local Buyers', 'yield': '20,000 - 60,000', 'desc': 'Lawless but sparse population at edges. Always watch your back.'}],
                'HIGH': [
                    {'location': 'Pyro I Rings', 'material': 'Bexalite Deposits', 'refinery': 'Ruin Station', 'sell': 'Stanton Export', 'yield': '100,000 - 250,000', 'desc': 'High value ore. Pirate patrols common. PvP guaranteed.'},
                    {'location': 'Pyro Core Belt', 'material': 'Taranite + Quantanium', 'refinery': 'Mobile Refinery', 'sell': 'Black Market', 'yield': '200,000 - 500,000', 'desc': 'Richest deposits. Expect PvP. Go with fleet.'}
                ]
            },
            'Nyx': {
                'LOW': [{'location': 'Delamar Fields', 'material': 'Titanium + Copper', 'refinery': 'Levski Refinery', 'sell': 'Levski', 'yield': '25,000 - 70,000', 'desc': 'Quiet mining away from traffic.'}],
                'MEDIUM': [{'location': 'Delamar Deep', 'material': 'Gold Veins', 'refinery': 'Levski', 'sell': 'Levski or Export', 'yield': '70,000 - 180,000', 'desc': 'Concentrated gold deposits underground.'}],
                'HIGH': [{'location': 'Nyx Belt', 'material': 'Quantanium Hotspot', 'refinery': 'Closest Available', 'sell': 'Best Market', 'yield': '150,000 - 350,000', 'desc': 'Remote but lucrative. Long travel times.'}]
            }
        }
        
        import random
        system_routes = mining_routes.get(request.system, mining_routes['Stanton'])
        routes = system_routes.get(effective_risk, system_routes.get('MEDIUM', list(system_routes.values())[0]))
        route = random.choice(routes) if isinstance(routes, list) else routes
        
        desc = route['desc'] + pyro_warning + signals_warning
        
        # Build intel summary
        intel_summary = None
        if signals_warnings:
            intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
        
        return MissionResponse(
            type='mining', title=f"Mining: {route['material'].split('(')[0].strip()}",
            description=desc,
            location={
                'name': f"📍 {request.system} System: {route['location']}",
                'description': f"Material: {route['material']}\n🔧 Refine at: {route['refinery']}\n💰 Sell at: {route['sell']}",
                'activities': f"Expected yield: {route['yield']} aUEC"
            },
            duration=time_display, reward=route['yield'] + ' aUEC',
            risk_level=effective_risk, 
            fallback={'title': 'Join Mining Crew', 'description': f'Operate lasers on a MOLE in {request.system} for guaranteed profit share'},
            intel_summary=intel_summary
        )
    
    # Chill - unique interesting locations, Variable reward
    if request.activity == 'chill':
        # Curated chill locations with rich descriptions
        chill_locations = {
            'Stanton': [
                {'name': 'microTech Ice Caves', 'desc': 'Crystalline formations and bioluminescent flora', 'activities': 'Spelunking, Photography', 'context': 'microTech'},
                {'name': 'Daymar Racing Canyons', 'desc': 'Tight canyon networks for low-altitude racing', 'activities': 'Racing, Stunt Flying', 'context': 'Daymar'},
                {'name': 'Hurston Savanna at Sunset', 'desc': 'Golden plains stretching to horizon', 'activities': 'Ground Exploration, Photography', 'context': 'Hurston'},
                {'name': 'Orison Cloudview Gardens', 'desc': 'Floating platforms with stunning Crusader views', 'activities': 'Sightseeing, Social', 'context': 'Crusader'},
                {'name': 'GrimHEX Underground', 'desc': 'Asteroid bar with live music and underground racing', 'activities': 'Nightlife, Gambling', 'context': 'Yela'},
                {'name': 'Port Tressler Observatory', 'desc': 'Premium lounge overlooking Crusader', 'activities': 'Relaxation, Ship Watching', 'context': 'Crusader'}
            ],
            'Pyro': [
                {'name': 'Pyro Star Overlook', 'desc': 'Abandoned station with views of the burning star', 'activities': 'Photography, Danger Tourism', 'context': 'Pyro'},
                {'name': 'Ruin Station Art Walk', 'desc': 'Player graffiti installations in derelicts', 'activities': 'Art, Culture', 'context': 'Pyro'}
            ],
            'Nyx': [
                {'name': 'Levski Memorial Plaza', 'desc': 'Revolutionary monument with rich history', 'activities': 'History, Culture', 'context': 'Delamar'},
                {'name': 'Delamar Caverns', 'desc': 'Deep cave systems with unique geological formations', 'activities': 'Spelunking, Exploration', 'context': 'Delamar'}
            ]
        }
        import random
        locs = chill_locations.get(request.system, chill_locations['Stanton'])
        loc = random.choice(locs)
        
        # Chill in Pyro still has elevated risk
        chill_risk = 'MEDIUM' if request.system == 'Pyro' else 'LOW'
        # Also elevate if signals show danger
        if signals_risk["risk_adjustment"] >= 2:
            chill_risk = 'MEDIUM'
        
        desc = 'Sightseeing, cave exploration, or scenic spots.'
        if request.system == 'Pyro':
            desc += ' ⚠️ PYRO: Even chill activities carry PvP risk!'
        desc += signals_warning
        
        intel_summary = None
        if signals_warnings:
            intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
        
        return MissionResponse(
            type='chill', title='Exploration & Touring',
            description=desc,
            location={
                'name': loc['name'],
                'description': f"{loc['context']}, {request.system}",
                'activities': loc['activities']
            },
            duration=time_display, reward='Variable',
            risk_level=chill_risk, fallback={'title': 'Social Hub', 'description': f'Visit a landing zone in {request.system} and meet other pilots'},
            intel_summary=intel_summary
        )
    
    # Combat - Use real locations from UEXcorp
    if request.activity == 'combat':
        combat_desc = 'Engage hostile targets and complete bounty contracts.'
        if request.system == 'Pyro':
            combat_desc += ' ⚠️ PYRO: Full PvP - hostile players guaranteed!'
        combat_desc += pyro_warning + signals_warning
        
        # Get real outpost locations from UEXcorp cache for combat zones
        import random
        pois = await get_uexcorp_pois()
        system_outposts = [p for p in pois if 
            p.get('star_system_name', '').lower() == request.system.lower() and
            p.get('type') == 'Outpost'
        ]
        
        if system_outposts:
            outpost = random.choice(system_outposts)
            combat_name = outpost.get('name', 'Security Post')
            combat_context = outpost.get('moon_name') or outpost.get('planet_name') or ''
        else:
            combat_name = 'Security Post Kareah'
            combat_context = ''
        
        intel_summary = None
        if signals_warnings:
            intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
        
        return MissionResponse(
            type='combat', title='Combat Missions',
            description=combat_desc,
            location={
                'name': combat_name,
                'description': f'{combat_context}, {request.system}' if combat_context else request.system,
                'activities': 'Bounty Hunting, PvE Combat' + (', PvP' if request.system == 'Pyro' else '')
            },
            duration=time_display, reward='15,000 - 100,000 aUEC',
            risk_level=effective_risk, fallback={'title': 'Mercenary Work', 'description': f'Security contracts from {request.system} mission givers'},
            intel_summary=intel_summary
        )
    
    # Salvage - Use real outpost locations from UEXcorp
    if request.activity == 'salvage':
        salvage_desc = 'Recover materials from derelict ships and debris.'
        if request.system == 'Pyro':
            salvage_desc += ' ⚠️ PYRO: Expect combat over salvage rights!'
        salvage_desc += pyro_warning + signals_warning
        
        # Get real outpost locations from UEXcorp cache
        import random
        pois = await get_uexcorp_pois()
        system_outposts = [p for p in pois if 
            p.get('star_system_name', '').lower() == request.system.lower() and
            p.get('type') == 'Outpost'
        ]
        
        if system_outposts:
            outpost = random.choice(system_outposts)
            salvage_name = outpost.get('name', 'Wreck Sites')
            salvage_context = outpost.get('moon_name') or outpost.get('planet_name') or ''
        else:
            salvage_name = 'Comm Array debris fields'
            salvage_context = ''
        
        intel_summary = None
        if signals_warnings:
            intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
        
        return MissionResponse(
            type='salvage', title='Salvage Operations',
            description=salvage_desc,
            location={
                'name': salvage_name,
                'description': f'{salvage_context}, {request.system}' if salvage_context else request.system,
                'activities': 'Hull Scraping, Components'
            },
            duration=time_display, reward='20,000 - 80,000 aUEC',
            risk_level=effective_risk, fallback={'title': 'Reclaimer Crew', 'description': f'Join a salvage ship in {request.system} for guaranteed cuts'},
            intel_summary=intel_summary
        )
    
    # FPS - Use real bunker locations from UEXcorp
    fps_desc = 'Ground combat operations and bunker clearing.'
    if request.system == 'Pyro':
        fps_desc += ' ⚠️ PYRO: Other players may contest bunkers!'
    fps_desc += pyro_warning + signals_warning
    
    # Get real bunker locations from UEXcorp cache
    import random
    pois = await get_uexcorp_pois()
    system_bunkers = [p for p in pois if 
        p.get('star_system_name', '').lower() == request.system.lower() and
        ('UGF' in (p.get('subtype') or '') or 'Bunker' in (p.get('subtype') or '') or p.get('type') == 'Outpost')
    ]
    
    if system_bunkers:
        bunker = random.choice(system_bunkers)
        bunker_name = bunker.get('name', 'Underground Bunker')
        bunker_context = bunker.get('moon_name') or bunker.get('planet_name') or ''
    else:
        # Fallback to generic
        bunker_name = 'Underground Bunker'
        bunker_context = ''
    
    intel_summary = None
    if signals_warnings:
        intel_summary = {"warnings": signals_warnings, "dangerous_locations": dangerous_locations}
    
    return MissionResponse(
        type='fps', title='FPS Contracts',
        description=fps_desc,
        location={
            'name': bunker_name,
            'description': f'{bunker_context}, {request.system}' if bunker_context else request.system,
            'activities': 'Bunker Clearing, Defense'
        },
        duration=time_display, reward='10,000 - 60,000 aUEC',
        risk_level=effective_risk, fallback={'title': 'Security Detail', 'description': f'Guard duty at {request.system} outposts - steady pay, less action'},
        intel_summary=intel_summary
    )


# ===== Signals Routes =====

@api_router.get("/signals/status")
async def get_signals_status():
    # Get report count from last 24h
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    reports_count = await db.reports.count_documents({
        'created_at': {'$gte': yesterday.isoformat()}
    })
    
    # Fetch RSI status from official feed
    rsi_status = {'status': 'operational', 'lastIncident': None}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get('https://status.robertsspaceindustries.com/index.xml')
            if response.status_code == 200:
                import xml.etree.ElementTree as ET
                import re
                root = ET.fromstring(response.text)
                
                # Parse RSS items
                items = root.findall('.//item')
                
                # First pass: find game version from any deployment notice
                for item in items:
                    desc_el = item.find('description')
                    desc = desc_el.text if desc_el is not None else ''
                    version_match = re.search(r'Star Citizen Alpha ([\d\.\-\w]+)', desc)
                    if version_match:
                        rsi_status['gameVersion'] = version_match.group(1)
                        break
                
                # Second pass: find latest unresolved incident
                for item in items:
                    title_el = item.find('title')
                    pub_el = item.find('pubDate')
                    title = title_el.text if title_el is not None else ''
                    pub_date = pub_el.text if pub_el is not None else ''
                    
                    title_lower = title.lower()
                    if '[resolved]' not in title_lower:
                        if 'outage' in title_lower or 'disruption' in title_lower:
                            rsi_status['status'] = 'degraded'
                        
                        rsi_status['lastIncident'] = {
                            'title': title,
                            'date': pub_date
                        }
                        break
    except Exception as e:
        logger.error(f"RSI status fetch error: {e}")
    
    return {
        'server_status': rsi_status['status'],
        'rsi_status': rsi_status,
        'reports_24h': reports_count or 0
    }


# ===== SSE Notifications Endpoint =====

@api_router.get("/notifications/stream")
async def notification_stream(request: Request):
    """SSE endpoint for real-time notifications"""
    
    async def event_generator():
        queue = asyncio.Queue()
        connected_clients.append(queue)
        
        try:
            # Send initial connection message
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"
            
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            if queue in connected_clients:
                connected_clients.remove(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@api_router.get("/signals/reports")
async def get_reports(days: int = 7):
    """Get reports from the last N days for trend analysis"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    reports = await db.reports.find(
        {'created_at': {'$gte': cutoff_date}},
        {'_id': 0}
    ).sort('created_at', -1).to_list(500)
    return reports

@api_router.post("/signals/report")
async def create_report(report: ReportCreate, user = Depends(get_current_user)):
    # Validate and moderate description if provided
    description = None
    if report.description:
        description = report.description.strip()
        if len(description) > 150:
            raise HTTPException(status_code=400, detail="Description too long (max 150 characters)")
        # Check for profanity
        description_lower = description.lower()
        for word in BLOCKED_WORDS:
            if word in description_lower:
                raise HTTPException(status_code=400, detail="Please keep descriptions professional")
        # Also moderate the text (replace any remaining issues)
        description = moderate_text(description)
    
    report_doc = {
        'id': str(uuid.uuid4()),
        'type': report.type,
        'system': report.system,
        'location': report.location,
        'shard': report.shard,
        'details': report.details,
        'description': description,  # New field
        'user_id': user['id'] if user else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    
    # Broadcast intel alert for high-priority reports (threats)
    if report.type in ['pirates', 'pvp']:
        await broadcast_notification({
            "type": "intel_alert",
            "report_type": report.type,
            "sound": "alert",
            "title": "⚠️ Intel Alert",
            "message": f"{report.type.upper()} reported at {report.location}"
        })
    # Broadcast for server/mission issues
    elif report.type in ['lag', 'mission_bug', 'cargo_bug']:
        await broadcast_notification({
            "type": "intel_alert",
            "report_type": report.type,
            "sound": "notification",
            "title": "Server Issue Reported",
            "message": f"{report.type.replace('_', ' ').title()} at {report.location or report.system}"
        })
    
    # Broadcast via WebSocket for real-time notifications
    await broadcast_alert(report_doc)
    
    return {'message': 'Report submitted', 'id': report_doc['id']}


@api_router.get("/signals/alerts")
async def get_alerts():
    """Get all alerts from last hour for multi-ticker system"""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    alerts = await db.reports.find(
        {
            'created_at': {'$gte': one_hour_ago}
        },
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    return alerts


# ===== UEX Corp Integration =====

@api_router.get("/uex/commodities")
async def get_uex_commodities():
    """Fetch live commodity prices from UEX Corp API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get('https://api.uexcorp.space/2.0/commodities')
            if response.status_code == 200:
                return response.json()
            return {'error': 'UEX API unavailable', 'data': []}
    except Exception as e:
        logger.error(f"UEX API error: {e}")
        return {'error': str(e), 'data': []}

@api_router.get("/uex/prices/{commodity_code}")
async def get_commodity_prices(commodity_code: str):
    """Fetch prices for a specific commodity"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f'https://api.uexcorp.space/2.0/commodities/{commodity_code}/prices')
            if response.status_code == 200:
                return response.json()
            return {'error': 'Commodity not found', 'data': []}
    except Exception as e:
        logger.error(f"UEX price error: {e}")
        return {'error': str(e), 'data': []}


# ===== Contracts Routes =====

@api_router.get("/contracts")
async def get_contracts(category: Optional[str] = None):
    # Filter out expired/completed/cancelled contracts using expires_at or fallback to 1hr for legacy
    now = datetime.now(timezone.utc).isoformat()
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    query = {
        'status': {'$nin': ['completed', 'expired', 'cancelled']},  # Hide completed/expired/cancelled
        '$or': [
            {'status': {'$in': ['in_progress', 'pending_completion', 'active']}},  # Show active contracts regardless (no expiry check)
            {'status': 'mustering', 'expires_at': {'$gt': now}},  # Multi-crew with expires_at
            {'status': 'mustering', 'expires_at': None, 'created_at': {'$gte': one_hour_ago}},  # Legacy mustering
            {'status': 'open', 'expires_at': {'$gt': now}},  # Open with expires_at
            {'status': 'open', 'expires_at': None, 'created_at': {'$gte': one_hour_ago}}  # Legacy open
        ]
    }
    if category:
        query['category'] = category
    
    contracts = await db.contracts.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    # Mark expired contracts - ONLY for open/mustering status (never expire active contracts)
    await db.contracts.update_many(
        {'$or': [
            {'status': {'$in': ['open', 'mustering']}, 'expires_at': {'$lt': now, '$ne': None}},
            {'status': 'open', 'expires_at': None, 'created_at': {'$lt': one_hour_ago}}
        ]},
        {'$set': {'status': 'expired'}}
    )
    
    return contracts

@api_router.post("/contracts")
async def create_contract(contract: ContractCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Apply text moderation to title and description
    moderated_title = moderate_text(contract.title)
    moderated_description = moderate_text(contract.description) if contract.description else None
    
    contract_doc = {
        'id': str(uuid.uuid4()),
        'title': moderated_title,
        'description': moderated_description,
        'compensation_type': contract.compensation_type,
        'split_profits': contract.split_profits or False,
        # Location
        'system': contract.system,
        'planet': contract.planet,
        'location': contract.location,
        'shard': contract.shard,
        # Category (single unified field)
        'category': contract.category or 'OTHER',
        'poster_id': user['id'],
        'poster_handle': user['rsi_handle'],
        'poster': {
            'handle': user['rsi_handle'],
            'reputation': user.get('reputation', 5.0),
            'is_supporter': user.get('is_supporter', False),
            'avatar_url': user.get('avatar_url')
        },
        'accepted_by': None,
        'client_review': None,
        'merc_review': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Handle multi-crew contracts with manifest
    if contract.is_multi_crew and contract.manifest and len(contract.manifest) > 0:
        contract_doc['manifest'] = [
            {
                'role': slot.role,
                'payout': slot.payout,
                'status': 'OPEN',
                'applicant_id': None,
                'filled_by': None,
                'bids': []
            }
            for slot in contract.manifest
        ]
        contract_doc['is_multi_crew'] = True
        contract_doc['status'] = 'mustering'
        contract_doc['payment_amount'] = sum(slot.payout for slot in contract.manifest)
    else:
        contract_doc['payment_amount'] = contract.payment_amount or contract.payout or 0
        contract_doc['assigned_to'] = None
        contract_doc['is_multi_crew'] = False
        contract_doc['status'] = 'open'
    
    # Calculate expires_at based on duration
    duration_mins = contract.duration_minutes or 60
    contract_doc['duration_minutes'] = duration_mins
    contract_doc['expires_at'] = (datetime.now(timezone.utc) + timedelta(minutes=duration_mins)).isoformat()
    
    await db.contracts.insert_one(contract_doc)
    contract_doc.pop('_id', None)
    
    # Broadcast new contract via WebSocket
    await broadcast_contract(contract_doc)
    
    # Broadcast via SSE for real-time notifications
    # Include category for client-side filtering based on notification preferences
    await broadcast_notification({
        "type": "new_contract",
        "sound": "notification",
        "title": "New Contract Posted",
        "message": f"{contract_doc['title']} - {contract_doc['category']}",
        "contract_id": contract_doc['id'],
        "category": contract_doc['category']  # For granular notification filtering
    })
    
    return contract_doc


@api_router.post("/contracts/{contract_id}/accept")
async def accept_contract(contract_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract['status'] != 'open':
        raise HTTPException(status_code=400, detail="Contract not available")
    if contract['poster_id'] == user['id']:
        raise HTTPException(status_code=400, detail="Cannot accept your own contract")
    
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {
            'status': 'active',
            'accepted_by': {
                'id': user['id'],
                'handle': user['rsi_handle'],
                'reputation': user.get('reputation', 5.0),
                'avatar_url': user.get('avatar_url')
            }
        }}
    )
    return {'message': 'Contract accepted'}


@api_router.post("/contracts/{contract_id}/cancel")
async def cancel_contract(contract_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Only owner can cancel
    if contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized - only contract owner can cancel")
    
    # Can only cancel if not already completed/cancelled
    if contract['status'] in ['completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Contract already finalized")
    
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {'status': 'cancelled', 'cancelled_at': datetime.now(timezone.utc).isoformat()}}
    )
    
    return {'message': 'Contract cancelled', 'status': 'cancelled'}


@api_router.post("/contracts/{contract_id}/complete")
async def complete_contract(contract_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    is_poster = contract['poster_id'] == user['id']
    is_merc = contract.get('accepted_by', {}).get('id') == user['id']
    
    if not is_poster and not is_merc:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {'status': 'completed'}}
    )
    return {'message': 'Contract marked complete'}


@api_router.post("/contracts/{contract_id}/review")
async def review_contract(contract_id: str, review: ReviewCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    is_poster = contract['poster_id'] == user['id']
    is_merc = contract.get('accepted_by', {}).get('id') == user['id']
    
    if not is_poster and not is_merc:
        raise HTTPException(status_code=403, detail="Not authorized to review")
    
    review_data = {
        'rating': review.rating,
        'comment': review.comment,
        'reviewer_handle': user['rsi_handle'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Client reviews merc, merc reviews client
    if is_poster:
        await db.contracts.update_one({'id': contract_id}, {'$set': {'client_review': review_data}})
        # Update merc's reputation
        merc_id = contract.get('accepted_by', {}).get('id')
        if merc_id:
            await update_user_reputation(merc_id)
            # Update mission history with rating
            await db.mission_history.update_one(
                {'contract_id': contract_id, 'user_id': merc_id},
                {'$set': {'rating_received': review.rating}}
            )
    else:
        await db.contracts.update_one({'id': contract_id}, {'$set': {'merc_review': review_data}})
        # Update client's reputation
        await update_user_reputation(contract['poster_id'])
    
    return {'message': 'Review submitted'}


async def update_user_reputation(user_id: str):
    """Recalculate user reputation based on all reviews received"""
    # Get all reviews where this user was reviewed
    as_merc = await db.contracts.find(
        {'accepted_by.id': user_id, 'client_review': {'$ne': None}},
        {'client_review.rating': 1}
    ).to_list(100)
    
    as_client = await db.contracts.find(
        {'poster_id': user_id, 'merc_review': {'$ne': None}},
        {'merc_review.rating': 1}
    ).to_list(100)
    
    ratings = []
    for c in as_merc:
        if c.get('client_review', {}).get('rating'):
            ratings.append(c['client_review']['rating'])
    for c in as_client:
        if c.get('merc_review', {}).get('rating'):
            ratings.append(c['merc_review']['rating'])
    
    if ratings:
        avg_rating = sum(ratings) / len(ratings)
        await db.users.update_one(
            {'id': user_id},
            {'$set': {'reputation': round(avg_rating, 1), 'contracts_completed': len(ratings)}}
        )


# ===== Goals/Roadmap Routes =====

@api_router.get("/goals", response_model=List[GoalResponse])
async def get_goals():
    goals = await db.goals.find({}, {'_id': 0}).to_list(20)
    if not goals:
        # Create default goals
        default_goals = [
            {
                'id': str(uuid.uuid4()),
                'title': 'Server Infrastructure',
                'description': 'Keep NavCom running with dedicated hosting, database, and API infrastructure.',
                'target_amount': 500,
                'current_amount': 0,
                'backers': 0,
                'status': 'active',
                'rewards': [
                    {'tier': 'Bronze', 'amount': 5, 'reward': 'Supporter Badge'},
                    {'tier': 'Silver', 'amount': 15, 'reward': 'Gold Profile Border'},
                    {'tier': 'Gold', 'amount': 30, 'reward': 'Early Access Features'}
                ]
            },
            {
                'id': str(uuid.uuid4()),
                'title': 'Fleet Manager',
                'description': 'Track your ships, loadouts, and crew assignments in one place.',
                'target_amount': 300,
                'current_amount': 0,
                'backers': 0,
                'status': 'planned',
                'rewards': [
                    {'tier': 'Backer', 'amount': 10, 'reward': 'Priority Access'}
                ]
            }
        ]
        for goal in default_goals:
            await db.goals.insert_one(goal)
        return default_goals
    return goals

@api_router.post("/goals/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, contribution: ContributionCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    goal = await db.goals.find_one({'id': goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Create Stripe checkout session
    if stripe.api_key:
        try:
            frontend_url = os.environ['FRONTEND_URL']
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'NavCom: {goal["title"]}',
                            'description': f'Contribution to {goal["title"]}'
                        },
                        'unit_amount': contribution.amount * 100,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{frontend_url}/roadmap?success=true',
                cancel_url=f'{frontend_url}/roadmap?canceled=true',
                metadata={
                    'goal_id': goal_id,
                    'user_id': user['id'],
                    'amount': contribution.amount
                }
            )
            return {'url': session.url, 'session_id': session.id}
        except Exception as e:
            logger.error(f"Stripe error: {e}")
            # Fall back to demo mode
            pass
    
    # Demo mode without valid Stripe key
    await db.goals.update_one(
        {'id': goal_id},
        {'$inc': {'current_amount': contribution.amount, 'backers': 1}}
    )
    await db.users.update_one({'id': user['id']}, {'$set': {'is_supporter': True}})
    return {'message': 'Contribution recorded (demo mode)', 'demo': True}

# Simplified checkout endpoint
class CheckoutRequest(BaseModel):
    goal_id: str
    amount: int = 10

@api_router.post("/stripe/create-checkout")
async def create_checkout(request: CheckoutRequest, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    goal = await db.goals.find_one({'id': request.goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if stripe.api_key and stripe.api_key.startswith('sk_'):
        try:
            frontend_url = os.environ['FRONTEND_URL']
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': f'NavCom Feature: {goal["title"]}',
                            'description': goal.get('description', 'Support NavCom development')
                        },
                        'unit_amount': request.amount * 100,
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{frontend_url}/roadmap?success=true',
                cancel_url=f'{frontend_url}/roadmap?canceled=true',
                metadata={
                    'goal_id': request.goal_id,
                    'user_id': user['id'],
                    'amount': request.amount
                }
            )
            return {'url': session.url}
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")
    
    # Demo mode
    await db.goals.update_one(
        {'id': request.goal_id},
        {'$inc': {'current_amount': request.amount, 'backers': 1}}
    )
    return {'demo': True, 'message': 'Demo contribution recorded'}

@api_router.post("/stripe/webhook")
async def stripe_webhook(request):
    """Handle Stripe webhook for successful payments"""
    # In production, verify webhook signature
    payload = await request.body()
    event = stripe.Event.construct_from(payload, stripe.api_key)
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        goal_id = session['metadata'].get('goal_id')
        user_id = session['metadata'].get('user_id')
        amount = int(session['metadata'].get('amount', 0))
        
        if goal_id and user_id:
            await db.goals.update_one(
                {'id': goal_id},
                {'$inc': {'current_amount': amount, 'backers': 1}}
            )
            await db.contributions.insert_one({
                'id': str(uuid.uuid4()),
                'goal_id': goal_id,
                'user_id': user_id,
                'amount': amount,
                'stripe_session': session['id'],
                'created_at': datetime.now(timezone.utc).isoformat()
            })
            await db.users.update_one({'id': user_id}, {'$set': {'is_supporter': True}})
    
    return {'received': True}


# ===== Admin Routes =====

@api_router.get("/admin/goals")
async def admin_get_goals(admin = Depends(require_admin)):
    goals = await db.goals.find({}, {'_id': 0}).to_list(50)
    return goals

@api_router.post("/admin/goals")
async def admin_create_goal(goal: GoalCreate, admin = Depends(require_admin)):
    goal_doc = {
        'id': str(uuid.uuid4()),
        'title': goal.title,
        'description': goal.description,
        'target_amount': goal.target_amount,
        'current_amount': 0,
        'backers': 0,
        'status': 'active',
        'rewards': goal.rewards or [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.goals.insert_one(goal_doc)
    goal_doc.pop('_id', None)
    return goal_doc

@api_router.put("/admin/goals/{goal_id}")
async def admin_update_goal(goal_id: str, goal: GoalUpdate, admin = Depends(require_admin)):
    update_data = {k: v for k, v in goal.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.goals.update_one({'id': goal_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {'message': 'Goal updated'}

@api_router.delete("/admin/goals/{goal_id}")
async def admin_delete_goal(goal_id: str, admin = Depends(require_admin)):
    result = await db.goals.delete_one({'id': goal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {'message': 'Goal deleted'}

@api_router.get("/admin/contributions")
async def admin_get_contributions(admin = Depends(require_admin)):
    contributions = await db.contributions.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return contributions

@api_router.get("/admin/users")
async def admin_get_users(admin = Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(100)
    return users


# ===== Admin Roadmap Management =====

class RoadmapItemCreate(BaseModel):
    title: str
    description: str = ''
    status: str = 'PLANNED'

class RoadmapItemUpdate(BaseModel):
    title: str = None
    description: str = None
    status: str = None

@api_router.get("/admin/roadmap")
async def get_roadmap_items(admin = Depends(require_admin)):
    """Get all roadmap items for admin management"""
    items = await db.roadmap_items.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return items

@api_router.post("/admin/roadmap")
async def create_roadmap_item(item: RoadmapItemCreate, admin = Depends(require_admin)):
    """Create a new roadmap item"""
    if item.status not in ['STABLE', 'IN_PROGRESS', 'PLANNED', 'BACKLOG']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    item_doc = {
        'id': str(uuid.uuid4()),
        'title': item.title,
        'description': item.description,
        'status': item.status,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.roadmap_items.insert_one(item_doc)
    item_doc.pop('_id', None)
    return item_doc

@api_router.put("/admin/roadmap/{item_id}")
async def update_roadmap_item(item_id: str, item: RoadmapItemUpdate, admin = Depends(require_admin)):
    """Update a roadmap item"""
    update_data = {k: v for k, v in item.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    if 'status' in update_data and update_data['status'] not in ['STABLE', 'IN_PROGRESS', 'PLANNED', 'BACKLOG']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.roadmap_items.update_one({'id': item_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {'message': 'Item updated'}

@api_router.delete("/admin/roadmap/{item_id}")
async def delete_roadmap_item(item_id: str, admin = Depends(require_admin)):
    """Delete a roadmap item"""
    result = await db.roadmap_items.delete_one({'id': item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {'message': 'Item deleted'}

@api_router.get("/roadmap")
async def get_public_roadmap():
    """Get roadmap items for public display"""
    items = await db.roadmap_items.find({}, {'_id': 0}).sort('created_at', 1).to_list(100)
    return items


# ===== User Notification Settings =====

@api_router.get("/user/notification-settings")
async def get_notification_settings(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    settings = await db.notification_settings.find_one({'user_id': user['id']}, {'_id': 0})
    if not settings:
        return NotificationSettings().dict()
    return settings

@api_router.put("/user/notification-settings")
async def update_notification_settings(settings: NotificationSettings, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    await db.notification_settings.update_one(
        {'user_id': user['id']},
        {'$set': {**settings.dict(), 'user_id': user['id']}},
        upsert=True
    )
    return {'message': 'Settings updated'}


# Avatar preset endpoint
class AvatarUpdate(BaseModel):
    avatar_preset: str

@api_router.put("/user/avatar")
async def update_avatar(data: AvatarUpdate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Map preset to NEW transparent PNG file URLs
    preset_files = {
        'pilot': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/qir020ik_pilot.png',
        'medic': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/horusbmi_rescue.png',
        'pirate': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/gcw4ywaa_pirate.png',
        'hauler': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/yjw0cw3r_cargo%20hauler.png',
        'miner': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/3vgt2etd_mining.png',
        'bounty': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/feh9f09a_bounty%20hunter%20icon.png',
        'engineer': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/fkdyhw8p_engineer.png',
        'explorer': 'https://customer-assets.emergentagent.com/job_spacecontracts/artifacts/7rceprgl_explorer%20icon.png',
    }
    
    avatar_url = preset_files.get(data.avatar_preset)
    if not avatar_url:
        raise HTTPException(status_code=400, detail="Invalid avatar preset")
    
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'avatar_preset': data.avatar_preset, 'avatar_url': avatar_url}}
    )
    return {'message': 'Avatar updated', 'avatar_url': avatar_url}


class ThemeUpdate(BaseModel):
    theme_id: str

@api_router.put("/user/theme")
async def update_theme(data: ThemeUpdate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    valid_themes = ['default', 'scavenger', 'luxury', 'milspec']
    if data.theme_id not in valid_themes:
        raise HTTPException(status_code=400, detail="Invalid theme")
    
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'theme_id': data.theme_id}}
    )
    return {'message': 'Theme updated', 'theme_id': data.theme_id}


# ===== Account Deletion =====

class DeleteAccountRequest(BaseModel):
    confirmation: str  # Must match "DELETE"

@api_router.delete("/user/account")
async def delete_account(request: DeleteAccountRequest, user = Depends(get_current_user)):
    """Delete user account - requires confirmation text 'DELETE'"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if request.confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Invalid confirmation")
    
    user_id = user['id']
    
    # Delete user's data
    await db.contracts.delete_many({'poster_id': user_id})
    await db.contract_bids.delete_many({'user_id': user_id})
    await db.reports.delete_many({'user_id': user_id})
    await db.notification_settings.delete_many({'user_id': user_id})
    await db.users.delete_one({'id': user_id})
    
    return {'message': 'Account deleted'}


# ===== Admin Data Reset Routes =====

@api_router.post("/admin/reset-reports")
async def admin_reset_reports(admin = Depends(require_admin)):
    """Reset all reports and update reset timestamp"""
    await db.reports.delete_many({})
    reset_time = datetime.now(timezone.utc).isoformat()
    await db.settings.update_one(
        {'key': 'last_reset'},
        {'$set': {'key': 'last_reset', 'value': reset_time}},
        upsert=True
    )
    return {'message': 'Reports reset', 'reset_at': reset_time}

@api_router.get("/admin/last-reset")
async def admin_get_last_reset(admin = Depends(require_admin)):
    """Get last reset timestamp"""
    setting = await db.settings.find_one({'key': 'last_reset'}, {'_id': 0})
    return {'last_reset': setting['value'] if setting else None}


@api_router.post("/admin/users/{user_id}/badge")
async def admin_assign_badge(user_id: str, request: BadgeAssignRequest, admin = Depends(require_admin)):
    """Assign or remove supporter badges from a user"""
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    badges = user.get('badges', [])
    supporter_badges = ['SUPPORTER_BRONZE', 'SUPPORTER_SILVER', 'SUPPORTER_GOLD']
    supporter_tier = 'NONE'
    
    if request.badge_id == 'REMOVE_SUPPORTER' or request.action == 'remove':
        # Remove all supporter badges
        badges = [b for b in badges if b not in supporter_badges]
        supporter_tier = 'NONE'
    else:
        # Remove existing supporter badge first (only one tier allowed)
        badges = [b for b in badges if b not in supporter_badges]
        # Add new badge
        if request.badge_id not in badges:
            badges.append(request.badge_id)
        # Set supporter_tier based on badge
        if request.badge_id == 'SUPPORTER_GOLD':
            supporter_tier = 'GOLD'
        elif request.badge_id == 'SUPPORTER_SILVER':
            supporter_tier = 'SILVER'
        elif request.badge_id == 'SUPPORTER_BRONZE':
            supporter_tier = 'BRONZE'
    
    await db.users.update_one(
        {'id': user_id},
        {'$set': {'badges': badges, 'supporter_tier': supporter_tier}}
    )
    
    return {'message': 'Badge updated', 'badges': badges, 'supporter_tier': supporter_tier}


@api_router.post("/redeem-code")
async def redeem_code(request: RedeemCodeRequest, user = Depends(get_current_user)):
    """Redeem an access code for supporter tier"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    code = request.code.strip().upper()
    
    if code not in REDEMPTION_CODES:
        return {"success": False, "message": "Invalid or expired code"}
    
    tier = REDEMPTION_CODES[code]
    
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'supporter_tier': tier}}
    )
    
    tier_names = {"BRONZE": "Contributor", "SILVER": "Sponsor", "GOLD": "Patron"}
    
    return {
        "success": True,
        "tier": tier,
        "message": f"Congratulations! You are now a {tier_names[tier]}!"
    }


# ===== Root Route =====

@api_router.get("/")
async def root():
    return {"message": "NavCom API v2.0.0", "status": "operational"}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create admin account if not exists
    admin = await db.users.find_one({'email': ADMIN_EMAIL})
    if not admin:
        admin_password = os.environ.get('ADMIN_PASSWORD', 'changeme-in-production')
        admin_user = {
            'id': str(uuid.uuid4()),
            'email': ADMIN_EMAIL,
            'password_hash': hash_password(admin_password),
            'rsi_handle': 'Mowri',
            'is_verified': True,
            'is_admin': True,
            'is_supporter': True,
            'theme_id': 'default',
            'reputation': 5.0,
            'contracts_completed': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin account created: {ADMIN_EMAIL}")
    else:
        # Ensure existing admin has is_admin flag
        await db.users.update_one({'email': ADMIN_EMAIL}, {'$set': {'is_admin': True}})

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ===== Contract Bidding System =====

@api_router.get("/contracts/{contract_id}/bids")
async def get_contract_bids(contract_id: str, user = Depends(get_current_user)):
    """Get all bids for a contract (poster only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only poster can view bids")
    bids = await db.contract_bids.find({'contract_id': contract_id}, {'_id': 0}).to_list(50)
    return bids

@api_router.post("/contracts/{contract_id}/bid")
async def submit_bid(contract_id: str, user = Depends(get_current_user)):
    """Submit a bid for a contract"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check concurrency - user can only have 1 active contract
    active = await db.contracts.find_one({
        '$or': [
            {'poster_id': user['id'], 'status': {'$in': ['open', 'in_progress', 'pending_completion']}},
            {'accepted_by.id': user['id'], 'status': {'$in': ['in_progress', 'pending_completion']}}
        ]
    })
    if active:
        raise HTTPException(status_code=400, detail="You already have an active contract")
    
    # Check if already bid
    existing_bid = await db.contract_bids.find_one({'contract_id': contract_id, 'bidder_id': user['id']})
    if existing_bid:
        raise HTTPException(status_code=400, detail="Already bid on this contract")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract or contract['status'] != 'open':
        raise HTTPException(status_code=400, detail="Contract not available")
    if contract['poster_id'] == user['id']:
        raise HTTPException(status_code=400, detail="Cannot bid on your own contract")
    
    bid = {
        'id': str(uuid.uuid4()),
        'contract_id': contract_id,
        'bidder_id': user['id'],
        'bidder': {
            'handle': user['rsi_handle'],
            'reputation': user.get('reputation', 5.0),
            'avatar_url': user.get('avatar_url'),
            'contracts_completed': user.get('contracts_completed', 0)
        },
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.contract_bids.insert_one(bid)
    bid.pop('_id', None)
    
    # Notify the contract poster about new bid
    await broadcast_notification({
        "type": "new_bid",
        "sound": "notification",
        "title": "New Bid Received",
        "message": f"{user['rsi_handle']} bid on your contract",
        "contract_id": contract_id,
        "target_user_id": contract['poster_id']
    })
    
    return bid

@api_router.post("/contracts/{contract_id}/bids/{bid_id}/accept")
async def accept_bid(contract_id: str, bid_id: str, user = Depends(get_current_user)):
    """Accept a bid - triggers handshake"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract or contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    bid = await db.contract_bids.find_one({'id': bid_id, 'contract_id': contract_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Get bidder info
    bidder = await db.users.find_one({'id': bid['bidder_id']}, {'_id': 0, 'password_hash': 0})
    
    # Update contract to in_progress
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {
            'status': 'in_progress',
            'accepted_by': {
                'id': bid['bidder_id'],
                'handle': bid['bidder']['handle'],
                'reputation': bid['bidder']['reputation'],
                'avatar_url': bid['bidder'].get('avatar_url')
            }
        }}
    )
    
    # Update bid status
    await db.contract_bids.update_one({'id': bid_id}, {'$set': {'status': 'accepted'}})
    
    # Decline other bids
    await db.contract_bids.update_many(
        {'contract_id': contract_id, 'id': {'$ne': bid_id}},
        {'$set': {'status': 'declined'}}
    )
    
    # Notify the bidder that their bid was accepted (urgent!)
    await broadcast_notification({
        "type": "bid_accepted",
        "sound": "alert",
        "title": "Bid Accepted!",
        "message": f"Your bid on '{contract['title']}' was accepted!",
        "contract_id": contract_id,
        "target_user_id": bid['bidder_id']
    })
    
    return {'message': 'Bid accepted', 'merc_handle': bid['bidder']['handle']}

@api_router.post("/contracts/{contract_id}/bids/{bid_id}/decline")
async def decline_bid(contract_id: str, bid_id: str, user = Depends(get_current_user)):
    """Decline a bid"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract or contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.contract_bids.update_one({'id': bid_id}, {'$set': {'status': 'declined'}})
    return {'message': 'Bid declined'}

@api_router.post("/contracts/{contract_id}/mark-complete")
async def mark_contract_complete(contract_id: str, user = Depends(get_current_user)):
    """Mark contract as complete (requires both parties)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    is_poster = contract['poster_id'] == user['id']
    is_merc = contract.get('accepted_by', {}).get('id') == user['id']
    
    if not is_poster and not is_merc:
        raise HTTPException(status_code=403, detail="Not a party to this contract")
    
    # BUG FIX: Accept both 'in_progress' AND 'active' status (contracts are set to 'active' when accepted)
    if contract['status'] in ['in_progress', 'active']:
        # First party marking complete
        completed_by = 'poster' if is_poster else 'merc'
        await db.contracts.update_one(
            {'id': contract_id},
            {'$set': {'status': 'pending_completion', 'completed_by': completed_by}}
        )
        return {'message': 'Waiting for other party', 'status': 'pending_completion'}
    
    elif contract['status'] == 'pending_completion':
        # Check if this is the other party
        first_completer = contract.get('completed_by')
        if (first_completer == 'poster' and is_poster) or (first_completer == 'merc' and is_merc):
            return {'message': 'Already marked complete, waiting for other party'}
        
        # Both parties confirmed - complete the contract
        await db.contracts.update_one(
            {'id': contract_id},
            {'$set': {'status': 'completed', 'completed_at': datetime.now(timezone.utc).isoformat()}}
        )
        
        # Increment completed contracts for both users
        await db.users.update_one({'id': contract['poster_id']}, {'$inc': {'contracts_completed': 1}})
        await db.users.update_one({'id': contract['accepted_by']['id']}, {'$inc': {'contracts_completed': 1}})
        
        # Save mission history for the merc
        merc_id = contract['accepted_by']['id']
        payout = contract.get('payment_amount', 0)
        category = contract.get('category', 'OTHER')
        history_record = {
            'user_id': merc_id,
            'contract_id': contract_id,
            'contract_title': contract.get('title', ''),
            'contract_type': contract.get('type', ''),
            'category': category,
            'role': contract.get('role', 'Mercenary'),
            'payout_received': payout,
            'rating_received': None,  # Updated when client rates
            'completed_at': datetime.now(timezone.utc).isoformat(),
            'poster_handle': contract.get('poster', {}).get('handle', contract.get('poster_handle', ''))
        }
        await db.mission_history.insert_one(history_record)
        
        # Update merc's aggregate stats including category
        await db.users.update_one(
            {'id': merc_id},
            {
                '$inc': {
                    'total_missions_completed': 1,
                    'total_earnings': payout,
                    f'missions_by_type.{contract.get("type", "other")}': 1,
                    f'contracts_by_category.{category}': 1
                }
            }
        )
        
        # Check for specialist badge awards at 50 completions
        SPECIALIST_BADGES = {
            'COMBAT': 'ACE_PILOT',
            'MEDICAL': 'COMBAT_MEDIC',
            'LOGISTICS': 'HEAVY_HAULER',
            'INDUSTRIAL': 'INDUSTRIALIST'
        }
        merc = await db.users.find_one({'id': merc_id})
        if merc and category in SPECIALIST_BADGES:
            cat_count = merc.get('contracts_by_category', {}).get(category, 0)
            badge_id = SPECIALIST_BADGES[category]
            if cat_count >= 50 and badge_id not in merc.get('badges', []):
                await db.users.update_one(
                    {'id': merc_id},
                    {'$addToSet': {'badges': badge_id}}
                )
        
        # Check for Five Star badge
        if merc:
            total_completed = merc.get('total_missions_completed', 0)
            avg_rating = merc.get('reputation', 0)
            if total_completed >= 20 and avg_rating == 5.0 and 'FIVE_STAR' not in merc.get('badges', []):
                await db.users.update_one(
                    {'id': merc_id},
                    {'$addToSet': {'badges': 'FIVE_STAR'}}
                )
        
        return {'message': 'Contract completed!', 'status': 'completed', 'show_rating': True}
    
    return {'message': 'Invalid contract state'}

@api_router.get("/user/active-contract")
async def get_user_active_contract(user = Depends(get_current_user)):
    """Check if user has an active contract"""
    if not user:
        return {'has_active': False}
    
    active = await db.contracts.find_one({
        '$or': [
            {'poster_id': user['id'], 'status': {'$in': ['open', 'in_progress', 'pending_completion']}},
            {'accepted_by.id': user['id'], 'status': {'$in': ['in_progress', 'pending_completion']}}
        ]
    }, {'_id': 0})
    
    return {'has_active': active is not None, 'contract': active}

@api_router.get("/user/my-bids")
async def get_user_bids(user = Depends(get_current_user)):
    """Get user's pending bids"""
    if not user:
        return []
    bids = await db.contract_bids.find(
        {'bidder_id': user['id'], 'status': 'pending'},
        {'_id': 0}
    ).to_list(20)
    return bids


@api_router.get("/users/{user_id}/mission-history")
async def get_user_mission_history(user_id: str):
    """Get user's mission history and stats"""
    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get mission history records
    missions = await db.mission_history.find(
        {'user_id': user_id},
        {'_id': 0}
    ).sort('completed_at', -1).limit(50).to_list(50)
    
    # Calculate earnings breakdown
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    earnings_week = sum(m.get('payout_received', 0) for m in missions if m.get('completed_at', '') >= week_ago)
    earnings_month = sum(m.get('payout_received', 0) for m in missions if m.get('completed_at', '') >= month_ago)
    
    # Calculate average rating
    ratings = [m.get('rating_received') for m in missions if m.get('rating_received')]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    
    return {
        'summary': {
            'total_completed': user.get('total_missions_completed', user.get('contracts_completed', 0)),
            'total_earnings': user.get('total_earnings', 0),
            'success_rate': 100,  # All completed = success
            'average_rating': round(avg_rating, 1),
            'missions_by_type': user.get('missions_by_type', {}),
            'earnings_week': earnings_week,
            'earnings_month': earnings_month
        },
        'missions': missions
    }


@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get public profile data for a user"""
    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.get("/user/my-contracts")
async def get_user_contracts(user = Depends(get_current_user)):
    """Get user's contracts (posted or accepted) including completed ones for rating"""
    if not user:
        return []
    
    contracts = await db.contracts.find(
        {
            '$or': [
                {'poster_id': user['id']},
                {'accepted_by.id': user['id']}
            ]
        },
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    return contracts

@api_router.get("/user/accepted-bids")
async def get_accepted_bids(user = Depends(get_current_user)):
    """Get bids that were recently accepted - for merc notification"""
    if not user:
        return []
    
    # Find bids where user is the bidder and status changed to accepted
    # Also return the contract info with client details
    accepted_bids = await db.contract_bids.find(
        {'bidder_id': user['id'], 'status': 'accepted', 'notified': {'$ne': True}},
        {'_id': 0}
    ).to_list(10)
    
    # Get contract details for each accepted bid
    result = []
    for bid in accepted_bids:
        contract = await db.contracts.find_one(
            {'id': bid['contract_id']},
            {'_id': 0}
        )
        if contract:
            result.append({
                'bid_id': bid['id'],
                'contract': contract,
                'client_handle': contract.get('poster', {}).get('handle'),
                'client_avatar': contract.get('poster', {}).get('avatar_url')
            })
    
    return result

@api_router.post("/user/accepted-bids/{bid_id}/acknowledge")
async def acknowledge_accepted_bid(bid_id: str, user = Depends(get_current_user)):
    """Mark an accepted bid as notified so it doesn't show again"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    await db.contract_bids.update_one(
        {'id': bid_id, 'bidder_id': user['id']},
        {'$set': {'notified': True}}
    )
    return {'success': True}


# ===== User Search Endpoint =====

@api_router.get("/users/search")
async def search_users(q: str):
    """Search for users by RSI handle (case-insensitive partial match)"""
    if not q or len(q) < 2:
        return {"users": []}
    
    users = await db.users.find(
        {"rsi_handle": {"$regex": q, "$options": "i"}},
        {"_id": 0, "password_hash": 0}
    ).limit(20).to_list(20)
    
    # Calculate rank based on contracts completed
    def get_rank(contracts_completed):
        if contracts_completed >= 100:
            return "ADMIRAL"
        elif contracts_completed >= 50:
            return "CAPTAIN"
        elif contracts_completed >= 25:
            return "COMMANDER"
        elif contracts_completed >= 10:
            return "LIEUTENANT"
        elif contracts_completed >= 5:
            return "FREELANCER"
        elif contracts_completed >= 1:
            return "CONTRACTOR"
        else:
            return "CIVILIAN"
    
    return {
        "users": [
            {
                "id": u["id"],
                "handle": u.get("rsi_handle", "Unknown"),
                "rank": get_rank(u.get("contracts_completed", 0)),
                "reputation": u.get("reputation", 5.0)
            }
            for u in users
        ]
    }


# ===== Multi-Crew Manifest Endpoints =====

@api_router.get("/contracts/{contract_id}")
async def get_contract_details(contract_id: str, user = Depends(get_current_user)):
    """Get a single contract by ID"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract.pop("_id", None)
    return contract


@api_router.post("/contracts/{contract_id}/manifest/bid")
async def bid_on_manifest_slot(contract_id: str, bid: ManifestBidRequest, user = Depends(get_current_user)):
    """Submit a bid for a specific crew slot in a multi-crew contract"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if not contract.get("manifest"):
        raise HTTPException(status_code=400, detail="Not a multi-crew contract")
    
    if contract["poster_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot bid on your own contract")
    
    manifest = contract["manifest"]
    
    if bid.slot_index < 0 or bid.slot_index >= len(manifest):
        raise HTTPException(status_code=400, detail="Invalid slot index")
    
    slot = manifest[bid.slot_index]
    
    if slot["status"] == "FILLED":
        raise HTTPException(status_code=400, detail="Slot already filled")
    
    if any(b["user_id"] == user["id"] for b in slot.get("bids", [])):
        raise HTTPException(status_code=400, detail="Already bid on this slot")
    
    new_bid = {
        "user_id": user["id"],
        "handle": user.get("rsi_handle", "Unknown"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if "bids" not in manifest[bid.slot_index]:
        manifest[bid.slot_index]["bids"] = []
    
    manifest[bid.slot_index]["bids"].append(new_bid)
    manifest[bid.slot_index]["status"] = "PENDING"
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"manifest": manifest}}
    )
    
    return {"message": "Bid submitted", "slot_index": bid.slot_index}


@api_router.delete("/contracts/{contract_id}/manifest/bid/{slot_index}")
async def withdraw_manifest_bid(contract_id: str, slot_index: int, user = Depends(get_current_user)):
    """Withdraw a bid from a manifest slot"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    manifest = contract.get("manifest", [])
    
    if slot_index < 0 or slot_index >= len(manifest):
        raise HTTPException(status_code=400, detail="Invalid slot index")
    
    slot = manifest[slot_index]
    original_count = len(slot.get("bids", []))
    slot["bids"] = [b for b in slot.get("bids", []) if b["user_id"] != user["id"]]
    
    if len(slot["bids"]) == original_count:
        raise HTTPException(status_code=400, detail="No bid to withdraw")
    
    if len(slot["bids"]) == 0 and slot["status"] == "PENDING":
        slot["status"] = "OPEN"
    
    manifest[slot_index] = slot
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"manifest": manifest}}
    )
    
    return {"message": "Bid withdrawn"}


@api_router.post("/contracts/{contract_id}/manifest/accept-bid")
async def accept_manifest_bid(contract_id: str, request: ManifestAcceptBidRequest, user = Depends(get_current_user)):
    """Accept a bid for a manifest slot (owner only)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["poster_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can accept bids")
    
    manifest = contract.get("manifest", [])
    
    if request.slot_index < 0 or request.slot_index >= len(manifest):
        raise HTTPException(status_code=400, detail="Invalid slot index")
    
    slot = manifest[request.slot_index]
    accepted_bid = next((b for b in slot.get("bids", []) if b["user_id"] == request.user_id), None)
    
    if not accepted_bid:
        raise HTTPException(status_code=400, detail="Bid not found")
    
    # ATOMIC: Remove accepted user's bids from all other slots
    for i, s in enumerate(manifest):
        if i != request.slot_index:
            s["bids"] = [b for b in s.get("bids", []) if b["user_id"] != request.user_id]
            if len(s["bids"]) == 0 and s["status"] == "PENDING":
                s["status"] = "OPEN"
    
    # Fill the slot
    manifest[request.slot_index] = {
        **slot,
        "status": "FILLED",
        "applicant_id": request.user_id,
        "filled_by": {
            "user_id": request.user_id,
            "handle": accepted_bid["handle"]
        },
        "bids": []
    }
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"manifest": manifest}}
    )
    
    return {"message": f"Bid accepted for slot {request.slot_index}"}


@api_router.post("/contracts/{contract_id}/deploy")
async def deploy_team(contract_id: str, user = Depends(get_current_user)):
    """Deploy a multi-crew team (owner only, at least one slot filled)"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract["poster_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can deploy")
    
    if contract["status"] != "mustering":
        raise HTTPException(status_code=400, detail="Contract not in mustering phase")
    
    manifest = contract.get("manifest", [])
    filled_count = sum(1 for s in manifest if s["status"] == "FILLED")
    
    if filled_count == 0:
        raise HTTPException(status_code=400, detail="No crew members assigned")
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "active", "deployed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Team deployed", "crew_count": filled_count}


# Include router AFTER all routes are defined
app.include_router(api_router)
