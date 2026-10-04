from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Query
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
import affiliation
import ratings_queue
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

from push_notifications import PushNotifications, create_push_router, ORG_EVENTS
push_notifications = PushNotifications(db)

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Stripe Configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')

# Discord OAuth Configuration
DISCORD_CLIENT_ID = os.environ.get('DISCORD_CLIENT_ID', '')
DISCORD_CLIENT_SECRET = os.environ.get('DISCORD_CLIENT_SECRET', '')
DISCORD_REDIRECT_URI = os.environ.get('DISCORD_REDIRECT_URI', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')

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
    if notification.get('type') in ORG_EVENTS and notification.get('target_user_id'):
        try:
            notification = {**notification, **await push_notifications.enqueue(notification)}
        except Exception as exc:
            logger.error('Could not persist org notification (%s)', type(exc).__name__)
    for queue in connected_clients:
        try:
            await queue.put(notification)
        except Exception:
            pass  # Client may have disconnected


async def _notify_rating_received(rated_user_id: str, rating: int, reviewer_handle: Optional[str], contract_title: Optional[str] = None):
    """Fire a 'rating_received' SSE toast to the rated user."""
    if not rated_user_id:
        return
    try:
        await broadcast_notification({
            "type": "rating_received",
            "target_user_id": rated_user_id,
            "title": "Reputation earned",
            "message": f"{reviewer_handle or 'A player'} rated you {rating}★" + (f" on \"{contract_title}\"" if contract_title else ""),
            "rating": rating,
            "reviewer_handle": reviewer_handle,
            "sound": "notification",
        })
    except Exception:
        pass

# Create the main app
app = FastAPI(title="NavCom API", version="2.0.0")
socket_app = socketio.ASGIApp(sio, app)

# CORS — must be added right after `app = FastAPI()` so cross-origin requests
# from the deployed frontend (different origin under Emergent's hosting) reach the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kubernetes liveness / readiness probe — must live at the raw root, NOT behind /api,
# because the probe is executed inside the pod against http://localhost:8001/health.
# Return a small JSON payload with 200 so the probe treats the pod as healthy.
@app.get("/health")
async def health_probe():
    return {"status": "ok"}

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
    contact_opt_in: Optional[bool] = False

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
    reputation: float = 0.0
    contracts_completed: int = 0
    created_at: str
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    badges: List[str] = []
    supporter_tier: str = "NONE"
    contact_opt_in: bool = False
    discord_linked: bool = False
    discord_username: Optional[str] = None
    discord_public: bool = False
    region: Optional[str] = None
    org_affiliation: Optional[dict] = None

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
    # Named crew roles with a seat count each, e.g. [{'name': 'Turret', 'count': 2}]
    crew_roles: Optional[List[dict]] = None
    # Duration
    duration_minutes: Optional[int] = 60
    # Timing (looking now vs scheduled future)
    timing_type: Optional[str] = 'now'  # 'now' | 'future'
    scheduled_start_at: Optional[str] = None  # ISO UTC
    scheduled_timezone: Optional[str] = None  # e.g. 'America/New_York'
    # Meeting location simplification
    meeting_visibility: Optional[str] = 'public'  # 'public' | 'disclosed_on_acceptance'
    meeting_system: Optional[str] = None  # 'Stanton' | 'Pyro' | 'Nyx'
    meeting_major_location: Optional[str] = None
    # Medical / Rescue PUBLIC fields
    rescue_bleedout_minutes: Optional[int] = None
    rescue_injury_tier: Optional[str] = None  # 'T1' | 'T2' | 'T3' | 'Unknown'
    rescue_pvp_area: Optional[str] = None  # 'Yes' | 'No' | 'Unknown'
    rescue_hostile_npcs: Optional[str] = None
    rescue_aa_turrets: Optional[str] = None
    rescue_needs_food_hydration: Optional[str] = None
    # Medical / Rescue PRIVATE fields (redacted server-side from unauthorized viewers)
    rescue_exact_location: Optional[str] = None
    rescue_body_location: Optional[str] = None
    rescue_private_notes: Optional[str] = None
    # Group join mode — single-slot job vs multi-join event
    join_mode: Optional[str] = None  # 'single' | 'multi' (auto-defaulted on create if None)
    max_participants: Optional[int] = None  # only meaningful when join_mode == 'multi'

class ReviewCreate(BaseModel):
    contract_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    tags: Optional[List[str]] = None
    review_type: str  # 'client_to_merc' or 'merc_to_client'

class ParticipantRating(BaseModel):
    participant_user_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    tags: Optional[List[str]] = None

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


RESCUE_PRIVATE_FIELDS = ('rescue_exact_location', 'rescue_body_location', 'rescue_private_notes')

async def _enrich_posters_discord(contracts):
    """Attach `poster.discord_linked` and (if the poster made it public) `poster.discord_username`
    onto each contract's poster snapshot. Batched — one DB lookup per contract list."""
    ids = list({c.get('poster_id') for c in contracts if c.get('poster_id')})
    if not ids:
        return
    users = await db.users.find(
        {'id': {'$in': ids}},
        {'_id': 0, 'id': 1, 'discord_id': 1, 'discord_username': 1, 'discord_public': 1}
    ).to_list(len(ids))
    lookup = {u['id']: u for u in users}
    for c in contracts:
        u = lookup.get(c.get('poster_id'))
        if not u:
            continue
        poster = c.get('poster') or {}
        poster['discord_linked'] = bool(u.get('discord_id'))
        if u.get('discord_id') and u.get('discord_public'):
            poster['discord_username'] = u.get('discord_username')
        c['poster'] = poster


def redact_private_fields(contract, user):
    """Strip private rescue fields from contract dict unless caller is poster, accepted rescuer, or admin."""
    if not contract:
        return contract
    if (contract.get('category') or '').upper() != 'MEDICAL':
        return contract
    user_id = user.get('id') if user else None
    is_admin = bool(user and user.get('is_admin'))
    is_poster = user_id and contract.get('poster_id') == user_id
    accepted = contract.get('accepted_by') or {}
    is_accepted = bool(user_id and accepted and accepted.get('id') == user_id)
    if is_admin or is_poster or is_accepted:
        return contract
    for f in RESCUE_PRIVATE_FIELDS:
        if f in contract:
            contract[f] = None
    return contract


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
        'reputation': 0.0,
        'contracts_completed': 0,
        'contact_opt_in': bool(user_data.contact_opt_in),
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
        reputation=user.get('reputation', 0.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url'),
        region=user.get('region'),
        org_affiliation=await affiliation.org_affiliation_for(db, user),
    ))

# ===== Discord OAuth =====

from fastapi.responses import RedirectResponse
from urllib.parse import urlencode

class DiscordCompleteRequest(BaseModel):
    pending_token: str
    rsi_handle: str
    verification_code: str

def _frontend_redirect(path: str, params: dict) -> RedirectResponse:
    base = FRONTEND_URL.rstrip('/') if FRONTEND_URL else ''
    qs = urlencode(params)
    return RedirectResponse(url=f"{base}{path}?{qs}")

def _create_discord_pending_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'scope': 'discord_pending',
        'exp': datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def _verify_discord_pending_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('scope') != 'discord_pending':
            return None
        return payload.get('user_id')
    except jwt.PyJWTError:
        return None


@api_router.get("/auth/discord/login")
async def discord_login_start():
    """Redirect the browser to Discord's OAuth authorization page."""
    if not DISCORD_CLIENT_ID or not DISCORD_REDIRECT_URI:
        raise HTTPException(status_code=503, detail="Discord login is not configured")
    params = {
        'client_id': DISCORD_CLIENT_ID,
        'redirect_uri': DISCORD_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'identify email',
        'prompt': 'consent',
    }
    return RedirectResponse(url=f"https://discord.com/api/oauth2/authorize?{urlencode(params)}")


@api_router.get("/auth/discord/callback")
async def discord_login_callback(code: Optional[str] = None, error: Optional[str] = None):
    """Handle Discord OAuth callback. Route user to verified login or RSI verification step."""
    if error or not code:
        return _frontend_redirect('/login', {'discord_error': error or 'missing_code'})
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET or not DISCORD_REDIRECT_URI:
        return _frontend_redirect('/login', {'discord_error': 'not_configured'})

    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            token_resp = await http.post(
                'https://discord.com/api/oauth2/token',
                data={
                    'client_id': DISCORD_CLIENT_ID,
                    'client_secret': DISCORD_CLIENT_SECRET,
                    'grant_type': 'authorization_code',
                    'code': code,
                    'redirect_uri': DISCORD_REDIRECT_URI,
                },
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
            )
            if token_resp.status_code != 200:
                logger.error(f"Discord token exchange failed: {token_resp.status_code} {token_resp.text}")
                return _frontend_redirect('/login', {'discord_error': 'token_exchange_failed'})
            access_token = token_resp.json().get('access_token')

            user_resp = await http.get(
                'https://discord.com/api/users/@me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            if user_resp.status_code != 200:
                logger.error(f"Discord user fetch failed: {user_resp.status_code}")
                return _frontend_redirect('/login', {'discord_error': 'user_fetch_failed'})
            d = user_resp.json()
    except httpx.HTTPError as e:
        logger.error(f"Discord OAuth network error: {e}")
        return _frontend_redirect('/login', {'discord_error': 'network'})

    discord_id = str(d.get('id') or '')
    discord_username = d.get('username') or d.get('global_name') or ''
    discord_email = (d.get('email') or '').lower().strip()
    discord_avatar = d.get('avatar')
    discord_avatar_url = (
        f"https://cdn.discordapp.com/avatars/{discord_id}/{discord_avatar}.png"
        if discord_id and discord_avatar else None
    )

    if not discord_id:
        return _frontend_redirect('/login', {'discord_error': 'no_discord_id'})

    # 1) Existing user by discord_id
    user = await db.users.find_one({'discord_id': discord_id}, {'_id': 0})

    # 2) Fall back to email match (link to existing account)
    if not user and discord_email:
        user = await db.users.find_one({'email': discord_email}, {'_id': 0})
        if user:
            await db.users.update_one(
                {'id': user['id']},
                {'$set': {
                    'discord_id': discord_id,
                    'discord_username': discord_username,
                    'discord_avatar_url': discord_avatar_url,
                }}
            )
            user['discord_id'] = discord_id

    # 3) New user - create pending record (no RSI handle yet, not verified)
    if not user:
        new_id = str(uuid.uuid4())
        user = {
            'id': new_id,
            'email': discord_email or f"discord_{discord_id}@starcitizengroupfinder.local",
            'password_hash': hash_password(str(uuid.uuid4())),  # random, unusable
            'rsi_handle': None,
            'discord_id': discord_id,
            'discord_username': discord_username,
            'discord_avatar_url': discord_avatar_url,
            'is_verified': False,
            'is_supporter': False,
            'is_admin': False,
            'theme_id': 'default',
            'reputation': 0.0,
            'contracts_completed': 0,
            'contact_opt_in': False,
            'created_at': datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user.copy())

    # If verified, issue JWT and drop them back at /login for the frontend to pick up
    if user.get('is_verified') and user.get('rsi_handle'):
        token = create_token(user['id'])
        return _frontend_redirect('/login', {'discord_token': token})

    # Otherwise, hand back a short-lived pending token so they can complete RSI verification
    pending = _create_discord_pending_token(user['id'])
    return _frontend_redirect('/register', {
        'discord': pending,
        'email': user.get('email') or '',
        'discord_username': discord_username or '',
    })


@api_router.post("/auth/discord/complete", response_model=TokenResponse)
async def discord_complete(req: DiscordCompleteRequest):
    """Finalize a Discord signup by attaching an RSI handle + verifying the bio code."""
    user_id = _verify_discord_pending_token(req.pending_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired Discord session. Please start over.")

    user = await db.users.find_one({'id': user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="Discord user record not found")

    rsi_handle = (req.rsi_handle or '').strip()
    if not rsi_handle:
        raise HTTPException(status_code=400, detail="RSI handle is required")

    # Enforce handle uniqueness (allow if it belongs to same user record)
    existing = await db.users.find_one({'rsi_handle': rsi_handle}, {'_id': 0})
    if existing and existing.get('id') != user_id:
        raise HTTPException(status_code=400, detail="RSI Handle already registered")

    # Verify RSI bio contains the code
    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(
                f"https://robertsspaceindustries.com/citizens/{rsi_handle}",
                follow_redirects=True,
            )
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="RSI Handle not found")
            page = resp.text
            if req.verification_code not in page:
                raise HTTPException(status_code=400, detail="Verification code not found in RSI bio")

            # Pull avatar from RSI profile (same patterns as verify-rsi)
            avatar_url = None
            avatar_patterns = [
                r'<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]+)"',
                r'src="(https://media\.robertsspaceindustries\.com/[^"]+)"',
                r'src="(/media/[^"]+heap_thumb[^"]*)"',
                r'src="(/media/[^"]+heap_infobox[^"]*\.(?:jpg|png))"',
            ]
            for pattern in avatar_patterns:
                m = re.search(pattern, page)
                if m:
                    avatar_url = m.group(1)
                    break
            if avatar_url:
                if avatar_url.startswith('//'):
                    avatar_url = 'https:' + avatar_url
                elif avatar_url.startswith('/'):
                    avatar_url = 'https://robertsspaceindustries.com' + avatar_url
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="RSI website timeout. Please try again.")
    except Exception as e:
        logger.error(f"Discord complete RSI verify error: {e}")
        raise HTTPException(status_code=500, detail="Verification service error")

    update_fields = {
        'rsi_handle': rsi_handle,
        'verification_code': req.verification_code,
        'is_verified': True,
    }
    if avatar_url and not user.get('avatar_url'):
        update_fields['avatar_url'] = avatar_url

    await db.users.update_one({'id': user_id}, {'$set': update_fields})
    user = await db.users.find_one({'id': user_id}, {'_id': 0})

    token = create_token(user['id'])
    return TokenResponse(token=token, user=UserResponse(
        id=user['id'],
        rsi_handle=user['rsi_handle'],
        is_verified=True,
        is_supporter=user.get('is_supporter', False),
        is_admin=user.get('is_admin', False),
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 0.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url'),
        avatar_preset=user.get('avatar_preset'),
        region=user.get('region'),
        org_affiliation=await affiliation.org_affiliation_for(db, user),
    ))

@api_router.post("/auth/demo-login", response_model=TokenResponse)
async def demo_login():
    """Instant demo login — bypasses RSI verification. Gated by ENABLE_DEMO_LOGIN env var."""
    if os.environ.get('ENABLE_DEMO_LOGIN', '').lower() != 'true':
        raise HTTPException(status_code=403, detail="Demo login is disabled.")

    DEMO_EMAIL = "demo@starcitizengroupfinder.local"
    DEMO_HANDLE = "Demo_Player"

    user = await db.users.find_one({'email': DEMO_EMAIL}, {'_id': 0})
    if not user:
        user = {
            'id': str(uuid.uuid4()),
            'email': DEMO_EMAIL,
            'rsi_handle': DEMO_HANDLE,
            'password_hash': hash_password(str(uuid.uuid4())),  # random, never usable
            'is_verified': True,
            'is_admin': False,
            'is_supporter': False,
            'theme_id': 'default',
            'reputation': 4.8,
            'contracts_completed': 12,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'avatar_url': None,
            'avatar_preset': 'pilot',
            'badges': [],
            'supporter_tier': 'NONE',
            'is_demo': True,
        }
        await db.users.insert_one(user.copy())

    # Seed demo job board content once (idempotent)
    await seed_demo_content()

    token = create_token(user['id'])

    return TokenResponse(token=token, user=UserResponse(
        id=user['id'],
        rsi_handle=user['rsi_handle'],
        is_verified=True,
        is_supporter=False,
        is_admin=False,
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 4.8),
        contracts_completed=user.get('contracts_completed', 12),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url'),
        avatar_preset=user.get('avatar_preset'),
        region=user.get('region') or 'USA',
        org_affiliation=await affiliation.org_affiliation_for(db, user),
    ))


async def seed_demo_content():
    """Seed sample job board content the first time a demo user logs in. Idempotent."""
    marker = await db.app_config.find_one({'key': 'demo_seeded'}, {'_id': 0})
    if marker and marker.get('value') is True:
        return

    # Sample NPC-style posters
    demo_posters = [
        {'handle': 'Vega_Hauler', 'reputation': 4.9, 'contracts': 47, 'avatar_preset': 'hauler'},
        {'handle': 'RescueRanger', 'reputation': 5.0, 'contracts': 31, 'avatar_preset': 'medic'},
        {'handle': 'Cpt_Ironclad', 'reputation': 4.7, 'contracts': 88, 'avatar_preset': 'bounty'},
        {'handle': 'OrbitalMining', 'reputation': 4.6, 'contracts': 23, 'avatar_preset': 'miner'},
    ]
    poster_docs = []
    for p in demo_posters:
        existing = await db.users.find_one({'rsi_handle': p['handle']}, {'_id': 0})
        if existing:
            poster_docs.append(existing)
            continue
        pid = str(uuid.uuid4())
        doc = {
            'id': pid,
            'email': f"{p['handle'].lower()}@starcitizengroupfinder.local",
            'rsi_handle': p['handle'],
            'password_hash': hash_password(str(uuid.uuid4())),
            'is_verified': True,
            'is_admin': False,
            'is_supporter': False,
            'theme_id': 'default',
            'reputation': p['reputation'],
            'contracts_completed': p['contracts'],
            'created_at': datetime.now(timezone.utc).isoformat(),
            'avatar_url': None,
            'avatar_preset': p['avatar_preset'],
            'badges': [],
            'supporter_tier': 'NONE',
            'is_demo_npc': True,
        }
        await db.users.insert_one(doc.copy())
        poster_docs.append(doc)

    now = datetime.now(timezone.utc)

    def poster_summary(doc):
        return {
            'handle': doc['rsi_handle'],
            'reputation': doc.get('reputation', 0.0),
            'is_supporter': False,
            'avatar_url': None,
            'avatar_preset': doc.get('avatar_preset'),
        }

    # Four sample contracts
    samples = [
        {
            'category': 'LOGISTICS',
            'title': 'Cargo run Hurston → microTech, 300 SCU',
            'description': 'Need a reliable hauler for a Titanium run. Split profits 50/50. No pirate-space detours.',
            'system': 'Stanton', 'planet': 'Hurston', 'location': 'Lorville',
            'compensation_type': 'Split Profits', 'split_profits': True, 'payment_amount': 0,
            'poster': poster_docs[0], 'duration_minutes': 120, 'shard': 'USA',
        },
        {
            'category': 'MEDICAL',
            'title': 'Medical evac — incap at Daymar outpost',
            'description': 'Down near Shubin SM0-10. Will tip well. Need a C8R or Cutlass Red ASAP.',
            'system': 'Stanton', 'planet': 'Daymar', 'location': 'Shubin SM0-10',
            'compensation_type': 'Flat Fee', 'payment_amount': 25000,
            'poster': poster_docs[1], 'duration_minutes': 30, 'shard': 'Europe',
        },
        {
            'category': 'COMBAT',
            'title': 'Bounty escort — VHRT target at CRU-L1',
            'description': 'Flying solo Vanguard, need 1-2 gunners for a verified VHRT. Loot split included.',
            'system': 'Stanton', 'planet': 'Crusader', 'location': 'CRU-L1',
            'compensation_type': 'Split Profits', 'split_profits': True, 'payment_amount': 0,
            'poster': poster_docs[2], 'duration_minutes': 90, 'shard': 'USA',
        },
    ]

    for s in samples:
        doc = {
            'id': str(uuid.uuid4()),
            'title': s['title'],
            'description': s['description'],
            'compensation_type': s.get('compensation_type'),
            'split_profits': s.get('split_profits', False),
            'system': s['system'], 'planet': s['planet'], 'location': s['location'],
            'shard': s.get('shard'),
            'category': s['category'],
            'poster_id': s['poster']['id'],
            'poster_handle': s['poster']['rsi_handle'],
            'poster': poster_summary(s['poster']),
            'accepted_by': None,
            'client_review': None,
            'merc_review': None,
            'created_at': now.isoformat(),
            'payment_amount': s.get('payment_amount', 0),
            'assigned_to': None,
            'is_multi_crew': False,
            'status': 'open',
            'duration_minutes': s['duration_minutes'],
            'expires_at': (now + timedelta(minutes=s['duration_minutes'])).isoformat(),
            'is_demo_seed': True,
        }
        await db.contracts.insert_one(doc)

    # Multi-crew sample — Carrack expedition
    mc_poster = poster_docs[3]
    mc_doc = {
        'id': str(uuid.uuid4()),
        'title': 'Carrack deep-space expedition — crew wanted',
        'description': 'Heading into Pyro for a 3-hour mining run. Need a co-pilot, engineer, and a turret gunner. Cut of yield per slot.',
        'compensation_type': 'Split Profits', 'split_profits': True,
        'system': 'Pyro', 'planet': 'Pyro III', 'location': 'Ruin Station',
        'shard': 'USA', 'category': 'INDUSTRIAL',
        'poster_id': mc_poster['id'], 'poster_handle': mc_poster['rsi_handle'],
        'poster': poster_summary(mc_poster),
        'accepted_by': None, 'client_review': None, 'merc_review': None,
        'created_at': now.isoformat(),
        'manifest': [
            {'role': 'Co-Pilot', 'payout': 30000, 'status': 'OPEN', 'applicant_id': None, 'filled_by': None, 'bids': []},
            {'role': 'Engineer', 'payout': 25000, 'status': 'OPEN', 'applicant_id': None, 'filled_by': None, 'bids': []},
            {'role': 'Turret Gunner', 'payout': 20000, 'status': 'OPEN', 'applicant_id': None, 'filled_by': None, 'bids': []},
        ],
        'is_multi_crew': True,
        'status': 'mustering',
        'payment_amount': 75000,
        'duration_minutes': 180,
        'expires_at': (now + timedelta(minutes=180)).isoformat(),
        'is_demo_seed': True,
    }
    await db.contracts.insert_one(mc_doc)

    await db.app_config.update_one(
        {'key': 'demo_seeded'},
        {'$set': {'key': 'demo_seeded', 'value': True, 'seeded_at': now.isoformat()}},
        upsert=True,
    )

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
        reputation=user.get('reputation', 0.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url'),
        avatar_preset=user.get('avatar_preset'),
        badges=user.get('badges', []),
        supporter_tier=user.get('supporter_tier', 'NONE'),
        contact_opt_in=user.get('contact_opt_in', False),
        discord_linked=bool(user.get('discord_id')),
        discord_username=user.get('discord_username'),
        discord_public=bool(user.get('discord_public', False)),
        region=user.get('region'),
        org_affiliation=await affiliation.org_affiliation_for(db, user),
    )


class DiscordVisibilityUpdate(BaseModel):
    discord_public: bool

@api_router.put("/user/discord-visibility")
async def update_discord_visibility(data: DiscordVisibilityUpdate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not user.get('discord_id'):
        raise HTTPException(status_code=400, detail="No Discord account linked")
    await db.users.update_one({'id': user['id']}, {'$set': {'discord_public': bool(data.discord_public)}})
    return {'discord_public': bool(data.discord_public)}


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
                
                # First pass: find the HIGHEST game version across all deployment notices
                # (the feed order isn't guaranteed; historical notices can shadow current ones)
                seen_versions = []
                for item in items:
                    desc_el = item.find('description')
                    desc = desc_el.text if desc_el is not None else ''
                    for m in re.finditer(r'Star Citizen Alpha ([\d\.\-\w]+)', desc):
                        seen_versions.append(m.group(1))
                if seen_versions:
                    def _ver_key(v):
                        head = v.split('-', 1)[0]
                        parts = [int(p) if p.isdigit() else 0 for p in head.split('.')]
                        return parts + [0] * (4 - len(parts))
                    rsi_status['gameVersion'] = max(seen_versions, key=_ver_key)

                # Manual override — RSI often lags on hotfix deploys (4.8.1, 4.8.2, ...).
                # Set GAME_VERSION_OVERRIDE=4.8.3 in backend/.env to pin the current version.
                override = os.environ.get('GAME_VERSION_OVERRIDE', '').strip()
                if override:
                    rsi_status['gameVersion'] = override
                
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
async def get_contracts(category: Optional[str] = None, user = Depends(get_current_user)):
    # Filter out expired/completed/cancelled contracts using expires_at or fallback to 1hr for legacy
    now = datetime.now(timezone.utc).isoformat()
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    # Hide demo activity from verified non-demo users so the live board stays clean.
    # Demo users still see all demo content; admins always see everything.
    is_demo_viewer = bool(user and (user.get('is_demo') or user.get('is_demo_npc')))
    is_admin_viewer = bool(user and user.get('is_admin'))
    
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

    # Hide demo posts from verified non-demo viewers (admins still see everything)
    if not (is_demo_viewer or is_admin_viewer):
        query['is_demo_post'] = {'$ne': True}
        query['is_demo_seed'] = {'$ne': True}

    contracts = await db.contracts.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    # Mark expired contracts - ONLY for open/mustering status (never expire active contracts)
    expired_ids = [c['id'] for c in await db.contracts.find(
        {'$or': [
            {'status': {'$in': ['open', 'mustering']}, 'expires_at': {'$lt': now, '$ne': None}},
            {'status': 'open', 'expires_at': None, 'created_at': {'$lt': one_hour_ago}}
        ]},
        {'id': 1}
    ).to_list(500)]
    if expired_ids:
        await db.contracts.update_many(
            {'id': {'$in': expired_ids}},
            {'$set': {'status': 'expired'}}
        )
        for cid in expired_ids:
            asyncio.create_task(cleanup_discord_messages_for_contract(cid))

    contracts = [redact_private_fields(c, user) for c in contracts]
    await _enrich_posters_discord(contracts)
    await affiliation.enrich_org_tags(db, contracts)
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
            'reputation': user.get('reputation', 0.0),
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
        if contract.crew_roles:
            contract_doc['crew_roles'] = [
                {'name': str(r.get('name') or 'Crew'), 'count': max(1, int(r.get('count') or 1))}
                for r in contract.crew_roles
            ]
    else:
        contract_doc['payment_amount'] = contract.payment_amount or contract.payout or 0
        contract_doc['assigned_to'] = None
        contract_doc['is_multi_crew'] = False
        contract_doc['status'] = 'open'
    
    # Calculate expires_at based on timing_type / duration
    duration_mins = contract.duration_minutes or 60
    contract_doc['duration_minutes'] = duration_mins

    timing_type = contract.timing_type or 'now'
    scheduled_start_dt = None
    if timing_type == 'future':
        if not contract.scheduled_start_at:
            raise HTTPException(
                status_code=400,
                detail="Future time posts require scheduled_start_at"
            )
        try:
            scheduled_start_dt = datetime.fromisoformat(
                contract.scheduled_start_at.replace('Z', '+00:00')
            )
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=400,
                detail="scheduled_start_at must be a valid ISO 8601 datetime"
            )
        # Future posts stay active until FUTURE_POST_ACTIVE_WINDOW_HOURS after the scheduled start.
        contract_doc['expires_at'] = (
            scheduled_start_dt + timedelta(hours=FUTURE_POST_ACTIVE_WINDOW_HOURS)
        ).isoformat()
    else:
        contract_doc['expires_at'] = (
            datetime.now(timezone.utc) + timedelta(minutes=duration_mins)
        ).isoformat()

    # Timing fields
    contract_doc['timing_type'] = timing_type
    contract_doc['scheduled_start_at'] = contract.scheduled_start_at
    contract_doc['scheduled_timezone'] = contract.scheduled_timezone

    # Meeting location fields
    contract_doc['meeting_visibility'] = contract.meeting_visibility or 'public'
    contract_doc['meeting_system'] = contract.meeting_system
    contract_doc['meeting_major_location'] = contract.meeting_major_location

    # Medical / Rescue (only persisted if MEDICAL category, but harmless otherwise)
    contract_doc['rescue_injury_tier'] = contract.rescue_injury_tier
    contract_doc['rescue_pvp_area'] = contract.rescue_pvp_area
    contract_doc['rescue_hostile_npcs'] = contract.rescue_hostile_npcs
    contract_doc['rescue_aa_turrets'] = contract.rescue_aa_turrets
    contract_doc['rescue_needs_food_hydration'] = contract.rescue_needs_food_hydration
    contract_doc['rescue_bleedout_minutes'] = contract.rescue_bleedout_minutes
    if contract.rescue_bleedout_minutes:
        contract_doc['rescue_bleedout_expires_at'] = (
            datetime.now(timezone.utc) + timedelta(minutes=contract.rescue_bleedout_minutes)
        ).isoformat()
    else:
        contract_doc['rescue_bleedout_expires_at'] = None
    # Private fields
    contract_doc['rescue_exact_location'] = contract.rescue_exact_location
    contract_doc['rescue_body_location'] = contract.rescue_body_location
    contract_doc['rescue_private_notes'] = contract.rescue_private_notes

    # Group join mode — single-slot vs multi-join event
    join_mode, max_participants = resolve_join_mode(contract)
    contract_doc['join_mode'] = join_mode
    contract_doc['max_participants'] = max_participants
    contract_doc['accepted_participants'] = []

    # Tag posts by demo accounts so they can be hidden from verified users on the public board
    if user.get('is_demo') or user.get('is_demo_npc'):
        contract_doc['is_demo_post'] = True

    await db.contracts.insert_one(contract_doc)
    contract_doc.pop('_id', None)
    contract_doc = redact_private_fields(contract_doc, user)

    # Org Discord dispatch (fire-and-forget — never blocks contract creation)
    asyncio.create_task(dispatch_org_discord_alerts(contract_doc))
    
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

    join_mode = contract.get('join_mode') or 'single'

    if join_mode == 'multi':
        # Multi-join event: append to accepted_participants, keep status 'open',
        # do not overwrite accepted_by, do not lock other applicants out.
        accepted = contract.get('accepted_participants') or []
        if any(p.get('id') == user['id'] for p in accepted):
            raise HTTPException(status_code=400, detail="You are already accepted in this group")
        max_p = contract.get('max_participants') or DEFAULT_MULTI_MAX_PARTICIPANTS
        if len(accepted) >= max_p:
            raise HTTPException(status_code=400, detail="This group is full")

        update = {'$push': {'accepted_participants': participant_summary(user)}}
        # First joiner also populates accepted_by (back-compat for legacy single-slot UI).
        if not contract.get('accepted_by'):
            update['$set'] = {
                'accepted_by': {
                    'id': user['id'],
                    'handle': user.get('rsi_handle'),
                    'reputation': user.get('reputation', 0.0),
                    'avatar_url': user.get('avatar_url'),
                }
            }
        await db.contracts.update_one({'id': contract_id}, update)
        return {'message': 'Joined group', 'join_mode': 'multi', 'participants': len(accepted) + 1, 'max_participants': max_p}

    # Single-slot: existing behaviour.
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {
            'status': 'active',
            'accepted_by': {
                'id': user['id'],
                'handle': user['rsi_handle'],
                'reputation': user.get('reputation', 0.0),
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
    asyncio.create_task(cleanup_discord_messages_for_contract(contract_id))
    
    return {'message': 'Contract cancelled', 'status': 'cancelled'}


@api_router.post("/contracts/{contract_id}/complete")
async def complete_contract(contract_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    is_poster = contract['poster_id'] == user['id']
    is_merc = (contract.get('accepted_by') or {}).get('id') == user['id']
    
    if not is_poster and not is_merc:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {'status': 'completed'}}
    )
    asyncio.create_task(cleanup_discord_messages_for_contract(contract_id))
    asyncio.create_task(dispatch_completion_history(contract))
    await ratings_queue.create_obligations(db, contract, notify=broadcast_notification)
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
    is_merc = (contract.get('accepted_by') or {}).get('id') == user['id']
    
    if not is_poster and not is_merc:
        raise HTTPException(status_code=403, detail="Not authorized to review")
    
    review_data = {
        'rating': review.rating,
        'comment': review.comment,
        'tags': _clean_praise_tags(review.tags),
        'reviewer_handle': user['rsi_handle'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Client reviews merc, merc reviews client
    if is_poster:
        await db.contracts.update_one({'id': contract_id}, {'$set': {'client_review': review_data}})
        # Update merc's reputation
        merc_id = (contract.get('accepted_by') or {}).get('id')
        if merc_id:
            await update_user_reputation(merc_id)
            # Update mission history with rating
            await db.mission_history.update_one(
                {'contract_id': contract_id, 'user_id': merc_id},
                {'$set': {'rating_received': review.rating}}
            )
            await _notify_rating_received(merc_id, review.rating, user.get('rsi_handle'), contract.get('title'))
        await ratings_queue.settle(db, contract_id, user['id'])
    else:
        await db.contracts.update_one({'id': contract_id}, {'$set': {'merc_review': review_data}})
        # Update client's reputation
        await update_user_reputation(contract['poster_id'])
        await _notify_rating_received(contract['poster_id'], review.rating, user.get('rsi_handle'), contract.get('title'))
        await ratings_queue.settle(db, contract_id, user['id'])
    
    return {'message': 'Review submitted'}


class PosterRating(BaseModel):
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    tags: Optional[List[str]] = None


@api_router.post("/contracts/{contract_id}/rate-poster")
async def rate_poster(contract_id: str, payload: PosterRating, user = Depends(get_current_user)):
    """Participants of multi-role contracts can rate the poster (mirror of rate-participant).
    Upserts one rating per (contract, reviewer)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract['poster_id'] == user['id']:
        raise HTTPException(status_code=400, detail="You cannot rate yourself")

    # User must have been an accepted participant of this contract.
    participant_ids = set()
    for p in (contract.get('accepted_participants') or []):
        if p.get('id'):
            participant_ids.add(p['id'])
    for slot in (contract.get('manifest') or []):
        ab = slot.get('accepted_by') or {}
        if ab.get('id'):
            participant_ids.add(ab['id'])
    single = contract.get('accepted_by') or {}
    if single.get('id'):
        participant_ids.add(single['id'])
    if user['id'] not in participant_ids:
        raise HTTPException(status_code=403, detail="Only participants can rate the poster")

    entry = {
        'rated_user_id': contract['poster_id'],
        'rated_handle': (contract.get('poster') or {}).get('handle'),
        'rating': payload.rating,
        'comment': payload.comment,
        'tags': _clean_praise_tags(payload.tags),
        'reviewer_id': user['id'],
        'reviewer_handle': user.get('rsi_handle'),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.contracts.update_one(
        {'id': contract_id},
        {'$pull': {'poster_ratings': {'reviewer_id': user['id']}}}
    )
    await db.contracts.update_one(
        {'id': contract_id},
        {'$push': {'poster_ratings': entry}}
    )
    try:
        await update_user_reputation(contract['poster_id'])
    except Exception:
        pass
    await _notify_rating_received(contract['poster_id'], payload.rating, user.get('rsi_handle'), contract.get('title'))
    await ratings_queue.settle(db, contract_id, user['id'], contract['poster_id'])
    return {'message': 'Rating recorded'}


@api_router.post("/contracts/{contract_id}/rate-participant")
async def rate_participant(contract_id: str, payload: ParticipantRating, user = Depends(get_current_user)):
    """Poster-only. Multi-role contracts: rate each accepted participant individually.
    Upserts one rating per (contract, poster, participant)."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the poster can rate participants")

    # Build the set of valid participant ids (multi-join + multi-crew).
    valid_ids = set()
    handle_by_id = {}
    for p in (contract.get('accepted_participants') or []):
        if p.get('id'):
            valid_ids.add(p['id'])
            handle_by_id[p['id']] = p.get('rsi_handle') or p.get('handle')
    for slot in (contract.get('manifest') or []):
        ab = slot.get('accepted_by') or {}
        if ab.get('id'):
            valid_ids.add(ab['id'])
            handle_by_id[ab['id']] = ab.get('rsi_handle') or ab.get('handle')
    single = contract.get('accepted_by') or {}
    if single.get('id'):
        valid_ids.add(single['id'])
        handle_by_id[single['id']] = single.get('rsi_handle') or single.get('handle')

    if payload.participant_user_id not in valid_ids:
        raise HTTPException(status_code=400, detail="Not a participant of this contract")
    if payload.participant_user_id == user['id']:
        raise HTTPException(status_code=400, detail="You cannot rate yourself")

    entry = {
        'rated_user_id': payload.participant_user_id,
        'rated_handle': handle_by_id.get(payload.participant_user_id),
        'rating': payload.rating,
        'comment': payload.comment,
        'tags': _clean_praise_tags(payload.tags),
        'reviewer_id': user['id'],
        'reviewer_handle': user.get('rsi_handle'),
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    # Replace any existing rating from this poster for this participant.
    await db.contracts.update_one(
        {'id': contract_id},
        {'$pull': {'participant_ratings': {
            'rated_user_id': payload.participant_user_id,
            'reviewer_id': user['id'],
        }}}
    )
    await db.contracts.update_one(
        {'id': contract_id},
        {'$push': {'participant_ratings': entry}}
    )
    # Recompute the rated user's reputation.
    try:
        await update_user_reputation(payload.participant_user_id)
    except Exception as _e:
        pass
    await _notify_rating_received(payload.participant_user_id, payload.rating, user.get('rsi_handle'), contract.get('title'))
    await ratings_queue.settle(db, contract_id, user['id'], payload.participant_user_id)
    return {'message': 'Rating recorded', 'rated_user_id': payload.participant_user_id}


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

    # Include per-participant multi-role ratings targeting this user.
    as_participant = await db.contracts.find(
        {'participant_ratings.rated_user_id': user_id},
        {'participant_ratings': 1}
    ).to_list(200)
    for c in as_participant:
        for pr in (c.get('participant_ratings') or []):
            if pr.get('rated_user_id') == user_id and pr.get('rating'):
                ratings.append(pr['rating'])

    # Include multi-role poster ratings targeting this user (rated as poster).
    as_poster = await db.contracts.find(
        {'poster_id': user_id, 'poster_ratings': {'$exists': True, '$ne': []}},
        {'poster_ratings': 1}
    ).to_list(200)
    for c in as_poster:
        for pr in (c.get('poster_ratings') or []):
            if pr.get('rating'):
                ratings.append(pr['rating'])

    if ratings:
        avg_rating = sum(ratings) / len(ratings)
        await db.users.update_one(
            {'id': user_id},
            {'$set': {'reputation': round(avg_rating, 1), 'contracts_completed': len(ratings)}}
        )
    else:
        # No reviews yet — everyone starts at zero stars and earns them.
        await db.users.update_one({'id': user_id}, {'$set': {'reputation': 0.0}})


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


class ContactOptInUpdate(BaseModel):
    contact_opt_in: bool

@api_router.put("/user/contact-opt-in")
async def update_contact_opt_in(data: ContactOptInUpdate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    await db.users.update_one({'id': user['id']}, {'$set': {'contact_opt_in': bool(data.contact_opt_in)}})
    return {'contact_opt_in': bool(data.contact_opt_in)}




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


@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin = Depends(require_admin)):
    """Permanently delete a user and their contract history. Refuses to delete other admins or self."""
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.get('is_admin'):
        raise HTTPException(status_code=400, detail="Cannot delete an admin account")
    if target['id'] == admin['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Cascade-clean their contracts and bids so the board stays consistent
    await db.contracts.delete_many({'poster_id': user_id})
    await db.contracts.update_many(
        {'accepted_by.id': user_id},
        {'$set': {'status': 'cancelled', 'accepted_by': None}}
    )
    await db.contract_bids.delete_many({'bidder_id': user_id})
    await db.users.delete_one({'id': user_id})
    return {'message': 'User deleted', 'rsi_handle': target.get('rsi_handle')}


@api_router.post("/admin/contracts/repair-future-expiry")
async def admin_repair_future_expiry(admin = Depends(require_admin)):
    """One-shot repair tool for Future Time posts whose expires_at was incorrectly anchored to
    created_at + duration_minutes (legacy bug) instead of scheduled_start_at + 4h.

    Repairs only contracts where:
      - timing_type == 'future'
      - scheduled_start_at exists
      - expires_at < scheduled_start_at  (the canonical signature of the bug)
      - status is 'open' OR 'expired' (system-expired only; user-cancelled / completed are skipped)
      - cancelled_at is not set (defensive: never restore a user-cancelled post)

    Sets expires_at = scheduled_start_at + FUTURE_POST_ACTIVE_WINDOW_HOURS, and if the contract
    had been auto-flagged 'expired' by the system, restores status to 'open'.
    """
    candidates_query = {
        'timing_type': 'future',
        'scheduled_start_at': {'$ne': None, '$exists': True},
        'expires_at': {'$ne': None, '$exists': True},
        'status': {'$in': ['open', 'expired']},
        '$or': [
            {'cancelled_at': {'$exists': False}},
            {'cancelled_at': None},
        ],
    }

    candidates = await db.contracts.find(
        candidates_query,
        {'_id': 0, 'id': 1, 'status': 1, 'scheduled_start_at': 1, 'expires_at': 1}
    ).to_list(length=None)

    repaired = 0
    restored_to_open = 0
    skipped = 0
    repaired_ids: List[str] = []

    for c in candidates:
        sched_raw = c.get('scheduled_start_at')
        expires_raw = c.get('expires_at')
        if not sched_raw or not expires_raw:
            skipped += 1
            continue
        try:
            sched_dt = datetime.fromisoformat(sched_raw.replace('Z', '+00:00'))
            expires_dt = datetime.fromisoformat(expires_raw.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            skipped += 1
            continue

        # Bug signature: expires_at strictly before scheduled_start_at means the post
        # was set to die before it was supposed to begin.
        if expires_dt >= sched_dt:
            skipped += 1
            continue

        new_expires = (sched_dt + timedelta(hours=FUTURE_POST_ACTIVE_WINDOW_HOURS)).isoformat()
        update = {'expires_at': new_expires}
        if c.get('status') == 'expired':
            update['status'] = 'open'
            restored_to_open += 1

        result = await db.contracts.update_one({'id': c['id']}, {'$set': update})
        if result.modified_count:
            repaired += 1
            repaired_ids.append(c['id'])

    return {
        'message': 'Future Time expiry repair complete',
        'repaired': repaired,
        'restored_to_open': restored_to_open,
        'candidates_scanned': len(candidates),
        'skipped': skipped,
        'repaired_ids': repaired_ids,
        'window_hours': FUTURE_POST_ACTIVE_WINDOW_HOURS,
    }


@api_router.post("/admin/contracts/repair-multi-join-events")
async def admin_repair_multi_join_events(admin = Depends(require_admin)):
    """Recover Future Time / LFG contracts that were accidentally locked into single-slot
    behaviour when the very first applicant was accepted (legacy bug).

    Repairs only contracts where:
      - timing_type == 'future' OR category == 'LFG'
      - status in {'in_progress', 'active'} (i.e. closed by the legacy single-slot flow)
      - join_mode is missing or 'single'
      - cancelled_at is not set, completed_at is not set
      - either scheduled_start_at OR expires_at is in the future

    For each: sets join_mode='multi', max_participants=8 (if missing), seeds
    accepted_participants from accepted_by (if any), and reopens status='open'.
    Never touches completed or cancelled contracts.
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    candidates_query = {
        '$or': [
            {'timing_type': 'future'},
            {'category': 'LFG'},
        ],
        'status': {'$in': ['in_progress', 'active']},
        '$and': [
            {'$or': [{'join_mode': {'$exists': False}}, {'join_mode': None}, {'join_mode': 'single'}]},
            {'$or': [{'cancelled_at': {'$exists': False}}, {'cancelled_at': None}]},
            {'$or': [{'completed_at': {'$exists': False}}, {'completed_at': None}]},
            {'$or': [
                {'scheduled_start_at': {'$gt': now_iso}},
                {'expires_at': {'$gt': now_iso}},
            ]},
        ],
    }

    candidates = await db.contracts.find(
        candidates_query,
        {'_id': 0, 'id': 1, 'accepted_by': 1, 'accepted_participants': 1, 'max_participants': 1}
    ).to_list(length=None)

    repaired = 0
    repaired_ids: List[str] = []

    for c in candidates:
        existing_participants = c.get('accepted_participants') or []
        accepted_by = c.get('accepted_by')
        if accepted_by and not any((p.get('id') == accepted_by.get('id')) for p in existing_participants):
            existing_participants = [{
                'id': accepted_by.get('id'),
                'handle': accepted_by.get('handle'),
                'reputation': accepted_by.get('reputation', 0.0),
                'avatar_url': accepted_by.get('avatar_url'),
                'accepted_at': now_iso,
            }] + existing_participants

        update = {
            'join_mode': 'multi',
            'max_participants': c.get('max_participants') or DEFAULT_MULTI_MAX_PARTICIPANTS,
            'accepted_participants': existing_participants,
            'status': 'open',
        }

        result = await db.contracts.update_one({'id': c['id']}, {'$set': update})
        if result.modified_count:
            repaired += 1
            repaired_ids.append(c['id'])

    return {
        'message': 'Multi-join event repair complete',
        'repaired': repaired,
        'candidates_scanned': len(candidates),
        'repaired_ids': repaired_ids,
        'default_max_participants': DEFAULT_MULTI_MAX_PARTICIPANTS,
    }


def _demo_user_filter():
    """All accounts created via demo flow (main demo + NPC posters)."""
    return {'$or': [{'is_demo': True}, {'is_demo_npc': True}]}


@api_router.get("/admin/demo/stats")
async def admin_demo_stats(admin = Depends(require_admin)):
    demo_users = await db.users.count_documents(_demo_user_filter())
    demo_user_ids = [u['id'] async for u in db.users.find(_demo_user_filter(), {'_id': 0, 'id': 1})]
    demo_contracts = await db.contracts.count_documents({
        '$or': [
            {'is_demo_seed': True},
            {'poster_id': {'$in': demo_user_ids}},
        ]
    })
    demo_bids = await db.contract_bids.count_documents({'bidder_id': {'$in': demo_user_ids}})
    return {
        'enabled': os.environ.get('ENABLE_DEMO_LOGIN', '').lower() == 'true',
        'demo_users': demo_users,
        'demo_contracts': demo_contracts,
        'demo_bids': demo_bids,
    }


@api_router.post("/admin/demo/wipe")
async def admin_demo_wipe(admin = Depends(require_admin)):
    """Wipe all demo accounts, their contracts, and bids. Resets demo_seeded marker so the next
    demo login will reseed fresh sample content."""
    demo_user_ids = [u['id'] async for u in db.users.find(_demo_user_filter(), {'_id': 0, 'id': 1})]
    contracts_deleted = (await db.contracts.delete_many({
        '$or': [
            {'is_demo_seed': True},
            {'poster_id': {'$in': demo_user_ids}},
        ]
    })).deleted_count
    bids_deleted = (await db.contract_bids.delete_many({
        '$or': [
            {'bidder_id': {'$in': demo_user_ids}},
            {'contract_id': {'$exists': False}},  # orphaned safety net
        ]
    })).deleted_count
    users_deleted = (await db.users.delete_many(_demo_user_filter())).deleted_count
    await db.app_config.delete_one({'key': 'demo_seeded'})
    return {
        'message': 'Demo data wiped',
        'users_deleted': users_deleted,
        'contracts_deleted': contracts_deleted,
        'bids_deleted': bids_deleted,
    }



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


# ===== Organizations (early-access, gated by ENABLE_ORG_TOOLS) =====

ALLOWED_SPECIALTIES = {
    'Medical / Rescue', 'Security', 'Escort', 'Combat', 'Cargo', 'Mining',
    'Salvage', 'Training', 'New Player Help', 'Exploration', 'Events',
    'Roleplay', 'Other'
}
ALLOWED_REGIONS = {'USA', 'Europe', 'Australia', 'Asia', 'Global'}
ALLOWED_SYSTEMS = {'Stanton', 'Pyro', 'Nyx'}
ALLOWED_TIMING = {'now', 'future'}

# How long a "Future Time" post stays active on the board after its scheduled_start_at.
FUTURE_POST_ACTIVE_WINDOW_HOURS = 4

# Multi-join (events / LFG / Future Time) defaults & bounds.
JOIN_MODES = {'single', 'multi'}
DEFAULT_MULTI_MAX_PARTICIPANTS = 8
MIN_PARTICIPANTS = 2
MAX_PARTICIPANTS = 50


def resolve_join_mode(contract: 'ContractCreate') -> tuple[str, Optional[int]]:
    """Decide effective join_mode and max_participants for a new contract.

    Defaults:
      - LFG, or Future Time, or Events category → multi (8)
      - Everything else (paid jobs, medical/rescue, single now-posts) → single
    User-supplied join_mode is respected with bounds-checked max_participants.
    """
    user_mode = (contract.join_mode or '').lower() if contract.join_mode else None
    if user_mode and user_mode not in JOIN_MODES:
        raise HTTPException(status_code=400, detail="join_mode must be 'single' or 'multi'")

    cat = (contract.category or '').upper()
    timing = (contract.timing_type or 'now').lower()

    if user_mode:
        mode = user_mode
    elif cat == 'LFG':
        mode = 'multi'
    elif timing == 'future':
        mode = 'multi'
    else:
        mode = 'single'

    if mode != 'multi':
        return 'single', None

    raw_max = contract.max_participants if contract.max_participants is not None else DEFAULT_MULTI_MAX_PARTICIPANTS
    try:
        max_p = int(raw_max)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="max_participants must be an integer")
    if max_p < MIN_PARTICIPANTS or max_p > MAX_PARTICIPANTS:
        raise HTTPException(
            status_code=400,
            detail=f"max_participants must be between {MIN_PARTICIPANTS} and {MAX_PARTICIPANTS}",
        )
    return 'multi', max_p


def participant_summary(user: dict) -> dict:
    """Compact summary of a user as stored in accepted_participants."""
    return {
        'id': user['id'],
        'handle': user.get('rsi_handle'),
        'reputation': user.get('reputation', 0.0),
        'avatar_url': user.get('avatar_url'),
        'avatar_id': user.get('avatar_id'),
        'accepted_at': datetime.now(timezone.utc).isoformat(),
    }


def org_tools_enabled() -> bool:
    # Org features are LIVE. Env var kept only as a kill-switch for local disable
    # via ENABLE_ORG_TOOLS=off; anything else (including missing/false) enables.
    return os.environ.get('ENABLE_ORG_TOOLS', 'on').lower() != 'off'


def _require_org_tools_or_admin(user):
    """Write actions need either ENABLE_ORG_TOOLS=true OR an admin user."""
    if user and user.get('is_admin'):
        return
    if not org_tools_enabled():
        raise HTTPException(status_code=403, detail="Org tools are not yet available.")
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")


def _is_valid_discord_webhook(url: Optional[str]) -> bool:
    if not url or not isinstance(url, str):
        return False
    return url.startswith('https://discord.com/api/webhooks/') or url.startswith('https://discordapp.com/api/webhooks/')


def _public_org(org: dict) -> dict:
    """Strip private fields from an org doc before returning publicly."""
    if not org:
        return org
    org = {k: v for k, v in org.items() if k != '_id'}
    routes = org.get('alert_routes') or []
    org['discord_connected'] = bool(org.get('discord_webhook_url')) or any(
        r.get('enabled', True) and _is_valid_discord_webhook(r.get('webhook_url')) for r in routes
    )
    org['alert_routes_count'] = sum(1 for r in routes if r.get('enabled', True))
    org.pop('discord_webhook_url', None)
    org.pop('alert_routes', None)
    return org


class OrgCreate(BaseModel):
    name: str
    tag: str
    description: Optional[str] = ''
    rsi_org_url: Optional[str] = None
    discord_invite_url: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    specialties: Optional[List[str]] = []
    home_regions: Optional[List[str]] = []
    service_systems: Optional[List[str]] = []
    # Admin-only: owner of the new org (handle, email, or user_id).
    owner_handle: Optional[str] = None
    owner_email: Optional[str] = None
    owner_id: Optional[str] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None
    description: Optional[str] = None
    rsi_org_url: Optional[str] = None
    discord_invite_url: Optional[str] = None
    discord_history_webhook_url: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    specialties: Optional[List[str]] = None
    home_regions: Optional[List[str]] = None
    service_systems: Optional[List[str]] = None
    discord_alerts_enabled: Optional[bool] = None
    alert_categories: Optional[List[str]] = None
    alert_regions: Optional[List[str]] = None
    alert_systems: Optional[List[str]] = None
    alert_timing_types: Optional[List[str]] = None
    alert_rescue_only: Optional[bool] = None
    alert_min_payout: Optional[int] = None


class WebhookPayload(BaseModel):
    discord_webhook_url: str


class OrgAlertRoute(BaseModel):
    webhook_url: str
    label: Optional[str] = None              # human-readable name, e.g. "Medical channel"
    categories: Optional[List[str]] = []     # empty = catch-all
    rescue_only: Optional[bool] = False
    enabled: Optional[bool] = True


def _normalize_categories(cats: Optional[List[str]]) -> List[str]:
    return [c.strip().upper() for c in (cats or []) if c and c.strip()]


def _select_alert_routes(org: dict, contract: dict) -> List[dict]:
    """Return the route dicts that should fire for this contract.

    Routing rules:
      - Iterate `alert_routes` (only enabled, valid-webhook entries).
      - `rescue_only` routes require contract category == MEDICAL.
      - A route is a *specific match* when its categories list contains the contract category.
      - A route with no categories is a catch-all.
      - If any specific match exists → fire ONLY the first specific match (priority by array order).
      - Otherwise fire all catch-all routes.
      - If `alert_routes` is empty AND a legacy `discord_webhook_url` is set, that webhook fires
        as a single back-compat route so existing orgs don't go silent.
    """
    contract_cat = (contract.get('category') or '').upper()
    routes = [r for r in (org.get('alert_routes') or []) if r and r.get('enabled', True)
              and _is_valid_discord_webhook(r.get('webhook_url'))]
    if not routes:
        url = org.get('discord_webhook_url')
        if _is_valid_discord_webhook(url):
            return [{'webhook_url': url, 'label': 'default', 'categories': [], 'rescue_only': False, 'enabled': True}]
        return []

    specific: List[dict] = []
    catch_all: List[dict] = []
    for r in routes:
        if r.get('rescue_only') and contract_cat != 'MEDICAL':
            continue
        cats = _normalize_categories(r.get('categories'))
        if not cats:
            catch_all.append(r)
        elif contract_cat and contract_cat in cats:
            specific.append(r)

    if specific:
        return [specific[0]]
    return catch_all


@api_router.get("/orgs")
async def list_orgs(user = Depends(get_current_user)):
    """Public org list. Returns [] until org tools are enabled. Only approved orgs are public."""
    if not org_tools_enabled():
        return {'coming_soon': True, 'orgs': []}
    orgs = await db.organizations.find({'approval_status': 'approved'}, {'_id': 0}).sort('created_at', -1).to_list(200)
    counts = await affiliation.displayed_member_counts(db, [o['id'] for o in orgs])
    out = []
    for o in orgs:
        pub = _public_org(o)
        pub['displayed_member_count'] = counts.get(o['id'], 0)
        out.append(pub)
    return {'coming_soon': False, 'orgs': out}


@api_router.get("/orgs/approved-options")
async def list_approved_org_options(user = Depends(get_current_user)):
    """Minimal approved-org list used by the affiliation picker."""
    if not org_tools_enabled():
        return []
    orgs = await db.organizations.find(
        {'approval_status': 'approved'}, {'_id': 0, 'id': 1, 'name': 1, 'tag': 1}
    ).sort('name', 1).to_list(500)
    return orgs


@api_router.get("/orgs/{org_id}")
async def get_org(org_id: str, user = Depends(get_current_user)):
    if not org_tools_enabled():
        raise HTTPException(status_code=404, detail="Org not found")
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    pub = _public_org(org)
    members = await affiliation.displayed_members(db, org_id)
    pub['displayed_members'] = members
    pub['displayed_member_count'] = len(members)
    return pub


PRAISE_TAGS = [
    'Good pilot', 'Good gunner', 'Good medic', 'Good engineer', 'Great comms',
    'On time', 'Fair pay', 'Calm under fire', 'Knows the ropes', 'Would fly again',
]


def _clean_praise_tags(tags):
    if not tags:
        return []
    allowed = {t.lower(): t for t in PRAISE_TAGS}
    out = []
    for t in tags[:5]:
        canon = allowed.get(str(t).strip().lower())
        if canon and canon not in out:
            out.append(canon)
    return out


@api_router.get("/ratings/praise-tags")
async def list_praise_tags():
    return {'tags': PRAISE_TAGS}


@api_router.get("/users/{user_id}/praise")
async def get_user_praise(user_id: str):
    """Aggregate per-role praise tags this player has received."""
    counts: dict = {}
    cursor = db.contracts.find({'$or': [
        {'participant_ratings.rated_user_id': user_id},
        {'poster_ratings.rated_user_id': user_id},
        {'accepted_by.id': user_id, 'client_review': {'$ne': None}},
        {'poster_id': user_id, 'merc_review': {'$ne': None}},
    ]}, {'_id': 0, 'participant_ratings': 1, 'poster_ratings': 1,
         'client_review': 1, 'merc_review': 1, 'accepted_by': 1, 'poster_id': 1})
    async for c in cursor:
        buckets = [r for r in ((c.get('participant_ratings') or []) + (c.get('poster_ratings') or []))
                   if r.get('rated_user_id') == user_id]
        if (c.get('accepted_by') or {}).get('id') == user_id and c.get('client_review'):
            buckets.append(c['client_review'])
        if c.get('poster_id') == user_id and c.get('merc_review'):
            buckets.append(c['merc_review'])
        for r in buckets:
            for t in (r.get('tags') or []):
                counts[t] = counts.get(t, 0) + 1
    praise = sorted(({'tag': k, 'count': v} for k, v in counts.items()), key=lambda x: -x['count'])
    return {'praise': praise}


@api_router.get("/users/{user_id}/rating-history")
async def get_user_rating_history(user_id: str, limit: int = 5):
    """Most recent ratings received, with their notes — reputation as a story."""
    out = []
    cursor = db.contracts.find({'$or': [
        {'participant_ratings.rated_user_id': user_id},
        {'poster_ratings.rated_user_id': user_id},
        {'accepted_by.id': user_id, 'client_review': {'$ne': None}},
        {'poster_id': user_id, 'merc_review': {'$ne': None}},
    ]}, {'_id': 0, 'title': 1, 'category': 1, 'participant_ratings': 1, 'poster_ratings': 1,
         'client_review': 1, 'merc_review': 1, 'accepted_by': 1, 'poster_id': 1})
    async for c in cursor:
        entries = [r for r in ((c.get('participant_ratings') or []) + (c.get('poster_ratings') or []))
                   if r.get('rated_user_id') == user_id]
        if (c.get('accepted_by') or {}).get('id') == user_id and c.get('client_review'):
            entries.append(c['client_review'])
        if c.get('poster_id') == user_id and c.get('merc_review'):
            entries.append(c['merc_review'])
        for r in entries:
            out.append({
                'rating': r.get('rating'),
                'comment': r.get('comment'),
                'tags': r.get('tags') or [],
                'reviewer_handle': r.get('reviewer_handle'),
                'created_at': r.get('created_at'),
                'contract_title': c.get('title'),
                'category': c.get('category'),
            })
    out.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    return {'ratings': out[:max(1, min(20, limit))]}


@api_router.get("/leaderboard/commendations")
async def commendations_leaderboard(month: Optional[str] = None):
    """Monthly ranking of the most-commended crew, grouped by commendation."""
    now = datetime.now(timezone.utc)
    month = month or now.strftime('%Y-%m')
    prefix = month
    tally: dict = {}
    cursor = db.contracts.find(
        {'$or': [
            {'participant_ratings': {'$exists': True, '$ne': []}},
            {'poster_ratings': {'$exists': True, '$ne': []}},
            {'client_review': {'$ne': None}},
            {'merc_review': {'$ne': None}},
        ]},
        {'_id': 0, 'participant_ratings': 1, 'poster_ratings': 1, 'client_review': 1,
         'merc_review': 1, 'accepted_by': 1, 'poster_id': 1}
    )
    async for c in cursor:
        pairs = []
        for r in ((c.get('participant_ratings') or []) + (c.get('poster_ratings') or [])):
            pairs.append((r.get('rated_user_id'), r))
        if c.get('client_review'):
            pairs.append(((c.get('accepted_by') or {}).get('id'), c['client_review']))
        if c.get('merc_review'):
            pairs.append((c.get('poster_id'), c['merc_review']))
        for uid, r in pairs:
            if not uid or not (r.get('created_at') or '').startswith(prefix):
                continue
            for t in (r.get('tags') or []):
                tally.setdefault(t, {}).setdefault(uid, 0)
                tally[t][uid] += 1

    user_ids = list({uid for per in tally.values() for uid in per})
    handles = {}
    if user_ids:
        users = await db.users.find({'id': {'$in': user_ids}}, {'_id': 0, 'id': 1, 'rsi_handle': 1}).to_list(len(user_ids))
        handles = {u['id']: u.get('rsi_handle') for u in users}
    tag_map = await affiliation.org_tag_map(db, user_ids)

    boards = []
    for tag in PRAISE_TAGS:
        per = tally.get(tag) or {}
        if not per:
            continue
        ranked = sorted(per.items(), key=lambda kv: -kv[1])[:5]
        boards.append({
            'tag': tag,
            'leaders': [{
                'user_id': uid,
                'handle': handles.get(uid) or 'Unknown',
                'count': n,
                'org_tag': (tag_map.get(uid) or {}).get('tag'),
                'org_id': (tag_map.get(uid) or {}).get('org_id'),
                'org_verified': (tag_map.get(uid) or {}).get('verified', False),
            } for uid, n in ranked],
        })
    return {'month': month, 'boards': boards}


class OrgMemberInvite(BaseModel):
    handle: str


@api_router.post("/orgs/{org_id}/invite-member")
async def invite_org_member(org_id: str, payload: OrgMemberInvite, user = Depends(get_current_user)):
    """Org leader invites a player straight to a confirmed tag."""
    org = await _require_org_leader(org_id, user)
    handle = (payload.handle or '').strip()
    if not handle:
        raise HTTPException(status_code=400, detail="Handle required")
    member = await db.users.find_one(
        {'rsi_handle': {'$regex': f'^{re.escape(handle)}$', '$options': 'i'}},
        {'_id': 0, 'id': 1, 'rsi_handle': 1}
    )
    if not member:
        raise HTTPException(status_code=404, detail="No player with that handle")
    await db.users.update_one(
        {'id': member['id']},
        {'$set': {'org_affiliation_id': org_id, 'org_affiliation_status': 'verified',
                  'org_affiliation_set_at': datetime.now(timezone.utc).isoformat()}}
    )
    await broadcast_notification({
        'type': 'affiliation_reviewed',
        'target_user_id': member['id'],
        'title': 'Org tag granted',
        'message': f"{org.get('name')} added you as a confirmed member — their tag now shows on your handle",
        'sound': 'notification',
    })
    return {'member_id': member['id'], 'handle': member.get('rsi_handle'), 'affiliation_status': 'verified'}


class OrgAffiliationUpdate(BaseModel):
    org_id: Optional[str] = None


@api_router.get("/user/org-affiliation")
async def get_my_org_affiliation(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {'affiliation': await affiliation.org_affiliation_for(db, user)}


@api_router.put("/user/org-affiliation")
async def set_my_org_affiliation(payload: OrgAffiliationUpdate, user = Depends(get_current_user)):
    """Self-service: display one approved org next to your handle. No approval needed."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    org_id = (payload.org_id or '').strip() or None
    if org_id:
        org = await db.organizations.find_one(
            {'id': org_id, 'approval_status': 'approved'}, {'_id': 0, 'id': 1}
        )
        if not org:
            raise HTTPException(status_code=400, detail="Only approved orgs can be displayed")
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'org_affiliation_id': org_id,
                  'org_affiliation_status': 'pending' if org_id else None,
                  'org_affiliation_set_at': datetime.now(timezone.utc).isoformat()}}
    )
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0})
    return {'affiliation': await affiliation.org_affiliation_for(db, fresh)}


class AffiliationDecision(BaseModel):
    action: str  # 'verify' | 'reject'


async def _require_org_leader(org_id: str, user):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    org = await db.organizations.find_one({'id': org_id}, {'_id': 0, 'id': 1, 'owner_id': 1, 'name': 1})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if org.get('owner_id') != user['id'] and not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Only the org leader can manage affiliations")
    return org


@api_router.get("/orgs/{org_id}/affiliations")
async def list_org_affiliations(org_id: str, user = Depends(get_current_user)):
    """Org leader view: everyone displaying this org tag, with their verification state."""
    await _require_org_leader(org_id, user)
    rows = await db.users.find(
        {'org_affiliation_id': org_id},
        {'_id': 0, 'id': 1, 'rsi_handle': 1, 'reputation': 1,
         'org_affiliation_status': 1, 'org_affiliation_set_at': 1},
    ).sort('rsi_handle', 1).to_list(500)
    for r in rows:
        r['affiliation_status'] = r.pop('org_affiliation_status', None) or 'pending'
    return {'members': rows}


@api_router.post("/orgs/{org_id}/affiliations/{member_id}")
async def decide_org_affiliation(org_id: str, member_id: str, payload: AffiliationDecision,
                                 user = Depends(get_current_user)):
    """Confirm or reject a member displaying the org tag."""
    org = await _require_org_leader(org_id, user)
    action = (payload.action or '').lower()
    if action not in ('verify', 'reject', 'reset'):
        raise HTTPException(status_code=400, detail="action must be verify, reject or reset")
    new_status = {'verify': 'verified', 'reject': 'rejected', 'reset': 'pending'}[action]
    res = await db.users.update_one(
        {'id': member_id, 'org_affiliation_id': org_id},
        {'$set': {'org_affiliation_status': new_status,
                  'org_affiliation_reviewed_at': datetime.now(timezone.utc).isoformat()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="That player is not displaying this org")
    await broadcast_notification({
        'type': 'affiliation_reviewed',
        'target_user_id': member_id,
        'title': 'Org affiliation ' + ('confirmed' if new_status == 'verified' else new_status),
        'message': f"{org.get('name')} {'confirmed' if new_status == 'verified' else 'rejected'} your displayed affiliation",
        'sound': 'notification',
    })
    return {'member_id': member_id, 'affiliation_status': new_status}


class RegionUpdate(BaseModel):
    region: Optional[str] = None


@api_router.put("/user/region")
async def set_my_region(payload: RegionUpdate, user = Depends(get_current_user)):
    """Remember the player's server region against their account, not the session."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    region = (payload.region or '').strip() or 'Global'
    await db.users.update_one({'id': user['id']}, {'$set': {'region': region}})
    return {'region': region}


@api_router.get("/user/org-invites")
async def get_my_org_invites(user = Depends(get_current_user)):
    """Persistent pending org-owner invitations for the current user."""
    if not user or not org_tools_enabled():
        return []
    cursor = db.organizations.find(
        {'owner_id': user['id'], 'owner_pending': True},
        {'_id': 0, 'id': 1, 'name': 1, 'tag': 1, 'created_at': 1}
    )
    orgs = await cursor.to_list(50)
    return [{
        'org_id': o['id'],
        'org_name': o.get('name'),
        'org_tag': o.get('tag'),
        'invited_at': o.get('created_at'),
    } for o in orgs]


@api_router.post("/user/org-invites/{org_id}/accept")
async def accept_my_org_invite(org_id: str, user = Depends(get_current_user)):
    """Clear the pending flag once the invited owner acknowledges the invite."""
    res = await db.organizations.update_one(
        {'id': org_id, 'owner_id': user['id'], 'owner_pending': True},
        {'$set': {'owner_pending': False, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invite not found")
    return {'ok': True}


@api_router.get("/user/my-org")
async def get_my_org(user = Depends(get_current_user)):
    """Return the org owned by (or where the user is an officer of) the current user, with
    PRIVATE fields (webhook URL, alert filters) included since they manage it."""
    if not user or not org_tools_enabled():
        return {'org': None}
    org = await db.organizations.find_one({
        '$or': [
            {'owner_id': user['id']},
            {'officers': user['id']},
        ]
    }, {'_id': 0})
    if not org:
        return {'org': None}
    # Owner / officer sees the discord_webhook_url for management.
    org['discord_connected'] = bool(org.get('discord_webhook_url'))
    return {'org': org}


@api_router.post("/orgs/register")
async def register_org(payload: OrgCreate, user = Depends(get_current_user)):
    """Self-serve org registration. Any RSI-verified user can apply; goes into the
    admin approval queue. Blocks duplicate ownership and duplicate tags."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not org_tools_enabled():
        raise HTTPException(status_code=403, detail="Org tools are not yet available.")
    if not user.get('is_verified'):
        raise HTTPException(status_code=403, detail="Verify your RSI handle before registering an org.")

    name = (payload.name or '').strip()
    tag = (payload.tag or '').strip().upper()
    if not name or len(name) < 3 or len(name) > 64:
        raise HTTPException(status_code=400, detail="Name must be 3–64 characters")
    if not tag or len(tag) < 2 or len(tag) > 8:
        raise HTTPException(status_code=400, detail="Tag must be 2–8 characters")
    if await db.organizations.find_one({'tag': tag}):
        raise HTTPException(status_code=400, detail="Tag already taken")
    if await db.organizations.find_one({'owner_id': user['id']}):
        raise HTTPException(status_code=400, detail="You already own an organization")

    bad = [s for s in (payload.specialties or []) if s not in ALLOWED_SPECIALTIES]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown specialties: {bad}")

    now_iso = datetime.now(timezone.utc).isoformat()
    org = {
        'id': str(uuid.uuid4()),
        'name': name,
        'tag': tag,
        'description': (payload.description or '')[:1000],
        'rsi_org_url': payload.rsi_org_url,
        'discord_invite_url': payload.discord_invite_url,
        'logo_url': payload.logo_url,
        'banner_url': payload.banner_url,
        'owner_id': user['id'],
        'owner_handle': user.get('rsi_handle'),
        'officers': [],
        'members': [user['id']],
        'specialties': payload.specialties or [],
        'home_regions': [r for r in (payload.home_regions or []) if r in ALLOWED_REGIONS],
        'service_systems': [s for s in (payload.service_systems or []) if s in ALLOWED_SYSTEMS],
        'discord_webhook_url': None,
        'discord_alerts_enabled': False,
        'alert_routes': [],
        'alert_categories': [],
        'alert_regions': [],
        'alert_systems': [],
        'alert_timing_types': [],
        'alert_rescue_only': False,
        'alert_min_payout': None,
        'approval_status': 'pending',
        'approved_at': None,
        'approved_by': None,
        'self_registered': True,
        'owner_pending': False,  # self-registered, no invite acceptance step
        'created_at': now_iso,
        'updated_at': now_iso,
    }
    await db.organizations.insert_one(org)

    # Notify every admin in real-time.
    try:
        admins = await db.users.find({'is_admin': True}, {'id': 1}).to_list(50)
        for a in admins:
            await broadcast_notification({
                "type": "org_application",
                "target_user_id": a['id'],
                "title": "New Org Application",
                "message": f"[{tag}] {name} — submitted by {user.get('rsi_handle')}. Review in Admin › Org Approvals.",
                "org_id": org['id'],
                "org_name": name,
                "org_tag": tag,
                "link": "/admin",
                "sound": "notification",
            })
    except Exception:
        pass

    return _public_org(org)


@api_router.post("/orgs")
async def create_org(payload: OrgCreate, admin = Depends(require_admin)):
    """Admin-invitation only: admins create the org on behalf of a chosen owner.
    The owner then becomes the only non-admin user who can edit the org / connect a webhook.
    """
    name = (payload.name or '').strip()
    tag = (payload.tag or '').strip().upper()
    if not name or len(name) < 3 or len(name) > 64:
        raise HTTPException(status_code=400, detail="Name must be 3–64 characters")
    if not tag or len(tag) < 2 or len(tag) > 8:
        raise HTTPException(status_code=400, detail="Tag must be 2–8 characters")
    if await db.organizations.find_one({'tag': tag}):
        raise HTTPException(status_code=400, detail="Tag already taken")

    # Resolve target owner from handle / email / id (at least one is required).
    if not (payload.owner_id or payload.owner_handle or payload.owner_email):
        raise HTTPException(status_code=400, detail="owner_handle, owner_email, or owner_id is required")
    owner_query = {}
    if payload.owner_id:
        owner_query = {'id': payload.owner_id}
    elif payload.owner_email:
        owner_query = {'email': payload.owner_email.strip().lower()}
    elif payload.owner_handle:
        owner_query = {'rsi_handle': payload.owner_handle.strip()}
    owner = await db.users.find_one(owner_query, {'_id': 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Target owner not found")
    if await db.organizations.find_one({'owner_id': owner['id']}):
        raise HTTPException(status_code=400, detail="That user already owns an organization")

    bad = [s for s in (payload.specialties or []) if s not in ALLOWED_SPECIALTIES]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown specialties: {bad}")

    now_iso = datetime.now(timezone.utc).isoformat()
    org = {
        'id': str(uuid.uuid4()),
        'name': name,
        'tag': tag,
        'description': (payload.description or '')[:1000],
        'rsi_org_url': payload.rsi_org_url,
        'discord_invite_url': payload.discord_invite_url,
        'logo_url': payload.logo_url,
        'banner_url': payload.banner_url,
        'owner_id': owner['id'],
        'owner_handle': owner.get('rsi_handle'),
        'officers': [],
        'members': [owner['id']],
        'specialties': payload.specialties or [],
        'home_regions': [r for r in (payload.home_regions or []) if r in ALLOWED_REGIONS],
        'service_systems': [s for s in (payload.service_systems or []) if s in ALLOWED_SYSTEMS],
        'discord_webhook_url': None,
        'discord_alerts_enabled': False,
        'alert_routes': [],
        'alert_categories': [],
        'alert_regions': [],
        'alert_systems': [],
        'alert_timing_types': [],
        'alert_rescue_only': False,
        'alert_min_payout': None,
        # Admin-created orgs still go through approval — admin can immediately approve them.
        'approval_status': 'pending',
        'approved_at': None,
        'approved_by': None,
        'invited_by': admin['id'],
        'owner_pending': True,
        'created_at': now_iso,
        'updated_at': now_iso,
    }
    await db.organizations.insert_one(org)

    # Notify the invited owner in real-time (bell + toast on their client).
    try:
        await broadcast_notification({
            "type": "org_invite",
            "target_user_id": owner['id'],
            "title": "Organization Invitation",
            "message": f"You have been invited to lead {org['name']} [{org['tag']}]. Open Orgs to set it up.",
            "org_id": org['id'],
            "org_name": org['name'],
            "org_tag": org['tag'],
            "link": "/orgs",
            "sound": "notification",
        })
    except Exception as _e:
        pass

    return _public_org(org)


@api_router.put("/orgs/{org_id}")
async def update_org(org_id: str, payload: OrgUpdate, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if not (user.get('is_admin') or org['owner_id'] == user['id'] or user['id'] in (org.get('officers') or [])):
        raise HTTPException(status_code=403, detail="Only owner or officer can edit")

    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    # Validate history webhook (allow empty string to clear it)
    if 'discord_history_webhook_url' in updates:
        val = (updates['discord_history_webhook_url'] or '').strip()
        if val and not _is_valid_discord_webhook(val):
            raise HTTPException(status_code=400, detail="Invalid Discord webhook URL")
        updates['discord_history_webhook_url'] = val or None
    # Validate name / tag length + uniqueness (matches OrgCreate rules)
    if 'name' in updates:
        name = (updates['name'] or '').strip()
        if not name or len(name) < 3 or len(name) > 64:
            raise HTTPException(status_code=400, detail="Name must be 3–64 characters")
        updates['name'] = name
    if 'tag' in updates:
        tag = (updates['tag'] or '').strip().upper()
        if not tag or len(tag) < 2 or len(tag) > 8:
            raise HTTPException(status_code=400, detail="Tag must be 2–8 characters")
        if tag != (org.get('tag') or '') and await db.organizations.find_one({'tag': tag, 'id': {'$ne': org_id}}):
            raise HTTPException(status_code=400, detail="Tag already taken")
        updates['tag'] = tag
    # Validate enum-like sets
    if 'specialties' in updates:
        bad = [s for s in updates['specialties'] if s not in ALLOWED_SPECIALTIES]
        if bad:
            raise HTTPException(status_code=400, detail=f"Unknown specialties: {bad}")
    for f, allowed in [('home_regions', ALLOWED_REGIONS), ('alert_regions', ALLOWED_REGIONS),
                        ('service_systems', ALLOWED_SYSTEMS), ('alert_systems', ALLOWED_SYSTEMS),
                        ('alert_timing_types', ALLOWED_TIMING)]:
        if f in updates:
            updates[f] = [v for v in updates[f] if v in allowed]
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.organizations.update_one({'id': org_id}, {'$set': updates})
    org = await db.organizations.find_one({'id': org_id})
    return _public_org(org)


@api_router.post("/orgs/{org_id}/join")
async def join_org(org_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if user['id'] in (org.get('members') or []):
        return {'message': 'Already a member'}
    await db.organizations.update_one({'id': org_id}, {'$addToSet': {'members': user['id']}})
    return {'message': 'Joined'}


@api_router.post("/orgs/{org_id}/leave")
async def leave_org(org_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if org['owner_id'] == user['id']:
        raise HTTPException(status_code=400, detail="Owner cannot leave — transfer or delete the org")
    await db.organizations.update_one({'id': org_id}, {
        '$pull': {'members': user['id'], 'officers': user['id']},
    })
    return {'message': 'Left'}


@api_router.post("/orgs/{org_id}/discord-webhook")
async def set_discord_webhook(org_id: str, payload: WebhookPayload, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if not (user.get('is_admin') or org['owner_id'] == user['id'] or user['id'] in (org.get('officers') or [])):
        raise HTTPException(status_code=403, detail="Only owner or officer can connect a webhook")
    if not _is_valid_discord_webhook(payload.discord_webhook_url):
        raise HTTPException(status_code=400, detail="Webhook URL must be a Discord webhook URL")
    await db.organizations.update_one({'id': org_id}, {'$set': {
        'discord_webhook_url': payload.discord_webhook_url,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }})
    return {'connected': True}


@api_router.post("/orgs/{org_id}/test-discord")
async def test_discord(org_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if not (user.get('is_admin') or org['owner_id'] == user['id'] or user['id'] in (org.get('officers') or [])):
        raise HTTPException(status_code=403, detail="Only owner or officer can test webhook")
    url = org.get('discord_webhook_url')
    if not _is_valid_discord_webhook(url):
        raise HTTPException(status_code=400, detail="No Discord webhook connected")
    payload = {
        'username': 'SC Group Finder',
        'content': f"✅ Test alert from **{org['name']}** ({org['tag']}). Your Discord dispatch channel is connected.",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, json=payload)
        return {'success': 200 <= r.status_code < 300, 'status': r.status_code}
    except Exception as e:
        logger.error(f"Discord test failed: {e}")
        return {'success': False, 'error': 'Webhook request failed'}


# ===== Per-category alert routes =====

def _require_org_admin(user: dict, org: dict):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not (user.get('is_admin') or org['owner_id'] == user['id'] or user['id'] in (org.get('officers') or [])):
        raise HTTPException(status_code=403, detail="Only owner or officer can manage routes")


def _validate_route_payload(payload: OrgAlertRoute) -> dict:
    if not _is_valid_discord_webhook(payload.webhook_url):
        raise HTTPException(status_code=400, detail="Invalid Discord webhook URL")
    cats = _normalize_categories(payload.categories)
    # Keep the allowlist in sync with the alert filters in Organizations.jsx (ALERT_CATEGORIES).
    allowed = {'MEDICAL', 'COMBAT', 'CARGO', 'MINING', 'SALVAGE', 'ESCORT', 'LFG', 'OTHER'}
    bad = [c for c in cats if c not in allowed]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown categories: {bad}")
    return {
        'id': str(uuid.uuid4()),
        'webhook_url': payload.webhook_url,
        'label': (payload.label or '').strip()[:64] or None,
        'categories': cats,
        'rescue_only': bool(payload.rescue_only),
        'enabled': bool(payload.enabled) if payload.enabled is not None else True,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }


@api_router.get("/orgs/{org_id}/routes")
async def list_org_routes(org_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    _require_org_admin(user, org)
    return {'routes': org.get('alert_routes') or []}


@api_router.post("/orgs/{org_id}/routes")
async def add_org_route(org_id: str, payload: OrgAlertRoute, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    _require_org_admin(user, org)
    route = _validate_route_payload(payload)
    await db.organizations.update_one(
        {'id': org_id},
        {'$push': {'alert_routes': route}, '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return route


@api_router.put("/orgs/{org_id}/routes/{route_id}")
async def update_org_route(org_id: str, route_id: str, payload: OrgAlertRoute, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    _require_org_admin(user, org)
    existing = next((r for r in (org.get('alert_routes') or []) if r.get('id') == route_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Route not found")
    updated = _validate_route_payload(payload)
    updated['id'] = route_id
    updated['created_at'] = existing.get('created_at') or updated['created_at']
    await db.organizations.update_one(
        {'id': org_id, 'alert_routes.id': route_id},
        {'$set': {'alert_routes.$': updated, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return updated


@api_router.delete("/orgs/{org_id}/routes/{route_id}")
async def delete_org_route(org_id: str, route_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    _require_org_admin(user, org)
    res = await db.organizations.update_one(
        {'id': org_id},
        {'$pull': {'alert_routes': {'id': route_id}}, '$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {'message': 'Route removed'}


@api_router.post("/orgs/{org_id}/routes/{route_id}/test")
async def test_org_route(org_id: str, route_id: str, user = Depends(get_current_user)):
    _require_org_tools_or_admin(user)
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    _require_org_admin(user, org)
    route = next((r for r in (org.get('alert_routes') or []) if r.get('id') == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    if not _is_valid_discord_webhook(route.get('webhook_url')):
        raise HTTPException(status_code=400, detail="Route has no valid webhook URL")
    cat_summary = ', '.join(route.get('categories') or []) or 'CATCH-ALL'
    rescue_tag = ' · rescue-only' if route.get('rescue_only') else ''
    payload = {
        'username': 'SC Group Finder',
        'content': (
            f"✅ Test alert from **{org['name']}** ({org['tag']}).\n"
            f"Route: **{route.get('label') or 'unnamed'}** · {cat_summary}{rescue_tag}.\n"
            f"If you're seeing this, dispatch will fire here when a matching contract is posted."
        ),
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(route['webhook_url'], json=payload)
        return {'success': 200 <= r.status_code < 300, 'status': r.status_code}
    except Exception as e:
        logger.error(f"Discord route test failed: {e}")
        return {'success': False, 'error': 'Webhook request failed'}


# ===== Admin Org Approval =====

@api_router.get("/admin/orgs")
async def admin_list_orgs(status_filter: Optional[str] = Query(None, alias="status"), admin = Depends(require_admin)):
    """Admin sees ALL orgs (incl. pending/rejected). Optional ?status=pending|approved|rejected filter."""
    q = {}
    if status_filter:
        q['approval_status'] = status_filter
    orgs = await db.organizations.find(q, {'_id': 0}).sort('created_at', -1).to_list(500)
    # Admin gets discord_connected (still no full URL)
    return [_public_org(o) | {'approval_status': o.get('approval_status', 'pending'),
                              'approved_at': o.get('approved_at'),
                              'approved_by': o.get('approved_by')}
            for o in orgs]


@api_router.post("/admin/orgs/{org_id}/approve")
async def admin_approve_org(org_id: str, admin = Depends(require_admin)):
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    await db.organizations.update_one({'id': org_id}, {'$set': {
        'approval_status': 'approved',
        'approved_at': datetime.now(timezone.utc).isoformat(),
        'approved_by': admin['id'],
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }})
    if org.get('approval_status') != 'approved' and org.get('owner_id'):
        await broadcast_notification({'type': 'org_approved', 'target_user_id': org['owner_id'],
            'org_id': org_id, 'title': 'Organization approved',
            'message': f"{org['name']} [{org['tag']}] has been approved.", 'link': '/orgs'})
    return {'message': 'Approved', 'org_id': org_id}


@api_router.post("/admin/orgs/{org_id}/reject")
async def admin_reject_org(org_id: str, admin = Depends(require_admin)):
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    await db.organizations.update_one({'id': org_id}, {'$set': {
        'approval_status': 'rejected',
        'approved_at': None,
        'approved_by': admin['id'],
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }})
    if org.get('approval_status') != 'rejected' and org.get('owner_id'):
        await broadcast_notification({'type': 'org_rejected', 'target_user_id': org['owner_id'],
            'org_id': org_id, 'title': 'Organization application update',
            'message': f"{org['name']} [{org['tag']}] was not approved.", 'link': '/orgs'})
    return {'message': 'Rejected', 'org_id': org_id}


class OrgReassign(BaseModel):
    owner_id: Optional[str] = None
    owner_handle: Optional[str] = None
    owner_email: Optional[str] = None


@api_router.post("/admin/orgs/{org_id}/reassign")
async def admin_reassign_org_owner(org_id: str, payload: OrgReassign, admin = Depends(require_admin)):
    """Reassign an organization to a different owner (admin only)."""
    org = await db.organizations.find_one({'id': org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    if not (payload.owner_id or payload.owner_handle or payload.owner_email):
        raise HTTPException(status_code=400, detail="owner_handle, owner_email, or owner_id is required")
    q = {}
    if payload.owner_id:
        q = {'id': payload.owner_id}
    elif payload.owner_email:
        q = {'email': payload.owner_email.strip().lower()}
    elif payload.owner_handle:
        q = {'rsi_handle': payload.owner_handle.strip()}
    new_owner = await db.users.find_one(q, {'_id': 0})
    if not new_owner:
        raise HTTPException(status_code=404, detail="Target owner not found")
    if new_owner['id'] == org.get('owner_id'):
        raise HTTPException(status_code=400, detail="User is already the owner")
    existing = await db.organizations.find_one({'owner_id': new_owner['id'], 'id': {'$ne': org_id}})
    if existing:
        raise HTTPException(status_code=400, detail="That user already owns another organization")
    members = list(org.get('members') or [])
    if new_owner['id'] not in members:
        members.append(new_owner['id'])
    officers = [o for o in (org.get('officers') or []) if o != new_owner['id']]
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.organizations.update_one({'id': org_id}, {'$set': {
        'owner_id': new_owner['id'],
        'owner_handle': new_owner.get('rsi_handle'),
        'members': members,
        'officers': officers,
        'owner_pending': True,
        'updated_at': now_iso,
    }})
    # Notify the new owner in real-time (bell + toast).
    try:
        await broadcast_notification({
            "type": "org_invite",
            "target_user_id": new_owner['id'],
            "title": "Organization Ownership Transferred",
            "message": f"You are now the owner of {org.get('name')} [{org.get('tag')}]. Open Orgs to manage it.",
            "org_id": org_id,
            "org_name": org.get('name'),
            "org_tag": org.get('tag'),
            "link": "/orgs",
            "sound": "notification",
        })
    except Exception:
        pass
    updated = await db.organizations.find_one({'id': org_id}, {'_id': 0})
    return _public_org(updated) | {'approval_status': updated.get('approval_status', 'pending')}


@api_router.delete("/admin/orgs/{org_id}")
async def admin_delete_org(org_id: str, admin = Depends(require_admin)):
    """Permanently delete an organization (admin only)."""
    res = await db.organizations.delete_one({'id': org_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Org not found")
    return {'message': 'Deleted', 'org_id': org_id}


# ===== Discord Dispatch =====

def _build_discord_message(contract: dict) -> dict:
    """Construct a Discord webhook payload from a contract.
    Strict privacy: never include rescue_exact_location / rescue_body_location / rescue_private_notes."""
    cat = (contract.get('category') or 'OTHER').upper()
    is_lfg = cat == 'LFG'
    is_medical = cat == 'MEDICAL'
    title_prefix = {
        'MEDICAL': 'New Rescue Contract',
        'COMBAT': 'New Combat Contract',
        'LOGISTICS': 'New Cargo Contract',
        'INDUSTRIAL': 'New Industrial Contract',
        'LFG': 'New LFG / Group Up Post',
    }.get(cat, 'New Contract')

    timing = 'Looking Now' if contract.get('timing_type') != 'future' else (
        f"Future: {contract.get('scheduled_start_at')} {contract.get('scheduled_timezone') or ''}".strip()
    )
    region = contract.get('shard') or 'Global'
    system = contract.get('meeting_system') or contract.get('system') or 'Unknown'

    # Public meeting location (rescues hide exact location)
    if is_medical:
        meeting = f"System: {system} (exact location private)"
    elif contract.get('meeting_visibility') == 'disclosed_on_acceptance':
        meeting = 'Disclosed on Acceptance'
    elif contract.get('meeting_major_location'):
        meeting = f"{system} - {contract['meeting_major_location']}"
    else:
        meeting = system

    payout = contract.get('payment_amount') or 0
    payout_line = '👥 LFG · No payout' if is_lfg else (f"💰 {payout:,} aUEC" if payout else 'No flat payout')

    fields = [
        {'name': 'Category', 'value': cat, 'inline': True},
        {'name': 'Timing', 'value': timing, 'inline': True},
        {'name': 'Region', 'value': region, 'inline': True},
        {'name': 'Meeting', 'value': meeting, 'inline': False},
        {'name': 'Payout', 'value': payout_line, 'inline': True},
    ]
    if is_medical:
        fields.extend([
            {'name': 'Bleed-out expires at', 'value': contract.get('rescue_bleedout_expires_at') or 'Unknown', 'inline': True},
            {'name': 'Injury Tier', 'value': contract.get('rescue_injury_tier') or 'Unknown', 'inline': True},
            {'name': 'PvP Area', 'value': contract.get('rescue_pvp_area') or 'Unknown', 'inline': True},
            {'name': 'Hostile NPCs', 'value': contract.get('rescue_hostile_npcs') or 'Unknown', 'inline': True},
            {'name': 'AA Turrets', 'value': contract.get('rescue_aa_turrets') or 'Unknown', 'inline': True},
            {'name': 'Hydration / Food', 'value': contract.get('rescue_needs_food_hydration') or 'Unknown', 'inline': True},
        ])

    frontend_url = os.environ.get('FRONTEND_URL', '').rstrip('/')
    link = f"{frontend_url}/contracts/{contract['id']}" if frontend_url and contract.get('id') else None
    description = contract.get('description') or ''
    if is_medical:
        description = (description + "\n\n🔒 Exact rescue location is hidden until the poster accepts a rescuer.").strip()

    embed = {
        'title': title_prefix,
        'description': f"**{contract.get('title','(untitled)')}**\n{description}"[:2000],
        'color': 0xff4466 if is_medical else (0xff6600 if is_lfg else 0x00f0ff),
        'fields': fields,
        'footer': {'text': 'SC Group Finder'},
    }
    if link:
        embed['url'] = link
    return {'username': 'SC Group Finder', 'embeds': [embed]}


def _org_matches_contract(org: dict, contract: dict) -> bool:
    """Filter rules per spec — empty list means "no restriction"."""
    # Approval gate — unapproved/rejected orgs never receive dispatch
    if (org.get('approval_status') or 'pending') != 'approved':
        return False
    if not org.get('discord_alerts_enabled'):
        return False
    # Org must have at least one dispatch target: either the legacy single webhook
    # OR at least one enabled, valid alert_route.
    has_legacy = _is_valid_discord_webhook(org.get('discord_webhook_url'))
    has_route = any(
        r.get('enabled', True) and _is_valid_discord_webhook(r.get('webhook_url'))
        for r in (org.get('alert_routes') or [])
    )
    if not (has_legacy or has_route):
        return False
    cat = (contract.get('category') or '').upper()
    if org.get('alert_rescue_only') and cat != 'MEDICAL':
        return False
    cats = org.get('alert_categories') or []
    if cats and cat not in [c.upper() for c in cats]:
        return False
    regions = org.get('alert_regions') or []
    if regions and 'Global' not in regions:
        if (contract.get('shard') or 'Global') not in regions:
            return False
    systems = org.get('alert_systems') or []
    if systems and (contract.get('meeting_system') or contract.get('system')) not in systems:
        return False
    timings = org.get('alert_timing_types') or []
    if timings and (contract.get('timing_type') or 'now') not in timings:
        return False
    min_payout = org.get('alert_min_payout')
    if min_payout and (contract.get('payment_amount') or 0) < min_payout:
        return False
    return True


async def dispatch_completion_history(contract: dict) -> None:
    """Fire-and-forget. Post a completion summary to any org's #contract-history webhook."""
    if not org_tools_enabled():
        return
    try:
        orgs = await db.organizations.find(
            {'approval_status': 'approved', 'discord_history_webhook_url': {'$ne': None}},
            {'_id': 0, 'id': 1, 'discord_history_webhook_url': 1}
        ).to_list(500)
    except Exception as e:
        logger.warning(f"history dispatch fetch failed: {e}")
        return
    if not orgs:
        return
    cat = (contract.get('category') or 'OTHER').upper()
    region = contract.get('shard') or 'Global'
    system = contract.get('meeting_system') or contract.get('system') or 'Unknown'
    payout = contract.get('payment_amount') or 0
    poster = contract.get('poster_handle') or 'Unknown'
    title = contract.get('title') or 'Contract'
    payload = {
        'embeds': [{
            'title': f'✅ Contract Completed — {title}',
            'color': 0x2ecc71,
            'fields': [
                {'name': 'Category', 'value': cat, 'inline': True},
                {'name': 'Region', 'value': region, 'inline': True},
                {'name': 'System', 'value': system, 'inline': True},
                {'name': 'Payout', 'value': (f"{payout:,} aUEC" if payout else 'None'), 'inline': True},
                {'name': 'Posted by', 'value': poster, 'inline': True},
            ],
            'footer': {'text': 'Star Citizen Group Finder'},
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }]
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        for org in orgs:
            url = org.get('discord_history_webhook_url')
            if not url:
                continue
            try:
                r = await client.post(url, json=payload)
                if r.status_code >= 400:
                    logger.warning(f"history dispatch org {org.get('id')} returned {r.status_code}")
            except Exception as e:
                logger.warning(f"history dispatch org {org.get('id')} failed: {e}")


async def dispatch_org_discord_alerts(contract: dict):
    """Fire-and-forget. Never blocks contract creation. Logs on failure.
    Uses ?wait=true so Discord returns the created message id — we store one
    record per destination in `discord_contract_messages` so the message can
    be deleted from the channel when the contract expires / cancels / completes.
    """
    if not org_tools_enabled():
        return
    try:
        # Pull orgs that have dispatch enabled. We accept orgs with either a legacy
        # discord_webhook_url OR a populated alert_routes array; route selection picks
        # the right channel at fire time.
        orgs = await db.organizations.find(
            {
                'approval_status': 'approved',
                'discord_alerts_enabled': True,
                '$or': [
                    {'discord_webhook_url': {'$ne': None}},
                    {'alert_routes.0': {'$exists': True}},
                ],
            },
            {'_id': 0}
        ).to_list(500)
    except Exception as e:
        logger.error(f"org dispatch fetch failed: {e}")
        return
    if not orgs:
        return
    payload = _build_discord_message(contract)
    async with httpx.AsyncClient(timeout=8.0) as client:
        for org in orgs:
            if not _org_matches_contract(org, contract):
                continue
            for route in _select_alert_routes(org, contract):
                webhook_url = route['webhook_url']
                parsed = _parse_webhook_url(webhook_url)
                request_url = webhook_url + ('&' if '?' in webhook_url else '?') + 'wait=true'
                try:
                    r = await client.post(request_url, json=payload)
                    if r.status_code >= 400:
                        logger.warning(
                            f"org {org.get('id')} route {route.get('label')} returned {r.status_code}"
                        )
                        continue
                    if not parsed:
                        continue
                    try:
                        body = r.json()
                    except Exception:
                        body = {}
                    message_id = body.get('id')
                    if not message_id:
                        continue
                    webhook_id, webhook_token = parsed
                    await db.discord_contract_messages.insert_one({
                        'id': str(uuid.uuid4()),
                        'contract_id': contract.get('id'),
                        'org_id': org.get('id'),
                        'route_id': route.get('id'),
                        'route_label': route.get('label'),
                        'discord_message_id': str(message_id),
                        'discord_channel_id': str(body.get('channel_id') or ''),
                        'discord_webhook_id': webhook_id,
                        'discord_webhook_token': webhook_token,
                        'posted_at': datetime.now(timezone.utc).isoformat(),
                        'deleted_at': None,
                        'delete_status': 'pending',
                    })
                except Exception as e:
                    logger.warning(
                        f"org {org.get('id')} route {route.get('label')} dispatch failed: {e}"
                    )


_WEBHOOK_URL_RE = re.compile(r"https?://(?:[^/]+\.)?discord(?:app)?\.com/api/webhooks/(\d+)/([^/?#]+)")


def _parse_webhook_url(url: Optional[str]) -> Optional[tuple]:
    """Return (webhook_id, webhook_token) or None."""
    if not url:
        return None
    m = _WEBHOOK_URL_RE.match(url)
    if not m:
        return None
    return m.group(1), m.group(2)


async def _delete_discord_webhook_message(client: httpx.AsyncClient, webhook_id: str, token: str, message_id: str) -> bool:
    """DELETE https://discord.com/api/webhooks/{id}/{token}/messages/{message_id}
    Returns True if the message is gone from Discord (204 deleted, 404 already gone)."""
    url = f"https://discord.com/api/webhooks/{webhook_id}/{token}/messages/{message_id}"
    try:
        r = await client.delete(url)
        return r.status_code in (204, 404)
    except Exception as e:
        logger.warning(f"discord webhook delete failed for {message_id}: {e}")
        return False


async def cleanup_discord_messages_for_contract(contract_id: str) -> None:
    """Delete every Discord message we posted for a contract. Safe to call multiple times."""
    if not contract_id:
        return
    try:
        pending = await db.discord_contract_messages.find(
            {'contract_id': contract_id, 'deleted_at': None},
            {'_id': 0}
        ).to_list(200)
    except Exception as e:
        logger.warning(f"cleanup fetch failed for {contract_id}: {e}")
        return
    if not pending:
        return
    async with httpx.AsyncClient(timeout=8.0) as client:
        for rec in pending:
            ok = await _delete_discord_webhook_message(
                client,
                rec.get('discord_webhook_id'),
                rec.get('discord_webhook_token'),
                rec.get('discord_message_id'),
            )
            try:
                await db.discord_contract_messages.update_one(
                    {'id': rec['id']},
                    {'$set': {
                        'deleted_at': datetime.now(timezone.utc).isoformat() if ok else None,
                        'delete_status': 'deleted' if ok else 'retry_required',
                    }}
                )
            except Exception as e:
                logger.warning(f"cleanup persist failed for {rec.get('id')}: {e}")



@app.on_event("startup")
async def startup_event():
    await push_notifications.initialize()
    app.state.push_worker = asyncio.create_task(push_notifications.run())
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
            'reputation': 0.0,
            'contracts_completed': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin account created: {ADMIN_EMAIL}")
    else:
        # Ensure existing admin has is_admin flag
        await db.users.update_one({'email': ADMIN_EMAIL}, {'$set': {'is_admin': True}})

    # Background sweeper for medical/rescue contracts
    #   - Delete (not just expire) MEDICAL contracts 10 minutes after bleed-out time
    #   - Delete MEDICAL contracts immediately once they reach completed status
    async def deceased_cleanup_loop():
        while True:
            try:
                cutoff_10min = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
                # Discord-message cleanup BEFORE we delete the contract row,
                # so the linkage from message → contract survives the sweep.
                doomed = await db.contracts.find(
                    {'$or': [
                        {'category': 'MEDICAL',
                         'rescue_bleedout_expires_at': {'$ne': None, '$lt': cutoff_10min},
                         'status': {'$nin': ['completed']}},
                        {'category': 'MEDICAL', 'status': 'completed'},
                    ]},
                    {'id': 1}
                ).to_list(500)
                for c in doomed:
                    try:
                        await cleanup_discord_messages_for_contract(c['id'])
                    except Exception as e:
                        logger.warning(f"pre-delete discord cleanup failed for {c.get('id')}: {e}")
                # Delete deceased rescues 10 min past bleedout
                await db.contracts.delete_many({
                    'category': 'MEDICAL',
                    'rescue_bleedout_expires_at': {'$ne': None, '$lt': cutoff_10min},
                    'status': {'$nin': ['completed']},
                })
                # Delete completed medical rescues so the board stays clean
                await db.contracts.delete_many({
                    'category': 'MEDICAL',
                    'status': 'completed',
                })
            except Exception as e:
                logger.error(f"Medical contract cleanup error: {e}")
            # Run every 60 seconds for prompt deletion within the 10-minute target
            await asyncio.sleep(60)

    async def contract_expiry_loop():
        """Server-side expiry: never rely on the browser timer. Every minute, flip
        open/mustering contracts whose expires_at has passed to `expired` and delete
        the corresponding Discord webhook messages."""
        while True:
            try:
                now_iso = datetime.now(timezone.utc).isoformat()
                one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                expired = await db.contracts.find(
                    {'$or': [
                        {'status': {'$in': ['open', 'mustering']},
                         'expires_at': {'$ne': None, '$lt': now_iso}},
                        {'status': 'open', 'expires_at': None,
                         'created_at': {'$lt': one_hour_ago}},
                    ]},
                    {'id': 1}
                ).to_list(500)
                if expired:
                    ids = [c['id'] for c in expired]
                    await db.contracts.update_many(
                        {'id': {'$in': ids}},
                        {'$set': {'status': 'expired', 'expired_at': now_iso}}
                    )
                    for cid in ids:
                        try:
                            await cleanup_discord_messages_for_contract(cid)
                        except Exception as e:
                            logger.warning(f"expiry discord cleanup failed for {cid}: {e}")
                # Retry previously-failed webhook deletes.
                retries = await db.discord_contract_messages.find(
                    {'delete_status': 'retry_required'},
                    {'_id': 0, 'contract_id': 1}
                ).to_list(200)
                for cid in {rr['contract_id'] for rr in retries if rr.get('contract_id')}:
                    try:
                        await cleanup_discord_messages_for_contract(cid)
                    except Exception as e:
                        logger.warning(f"retry discord cleanup failed for {cid}: {e}")
            except Exception as e:
                logger.error(f"contract_expiry_loop error: {e}")
            await asyncio.sleep(60)

    async def rating_obligation_loop():
        """Backfill historical completed jobs once, then expire overdue obligations."""
        try:
            created = await ratings_queue.backfill(db)
            if created:
                logger.info(f"rating obligations backfilled: {created}")
        except Exception as e:
            logger.error(f"rating obligation backfill failed: {e}")
        while True:
            try:
                await ratings_queue.expire_due(db)
            except Exception as e:
                logger.error(f"rating obligation expiry error: {e}")
            await asyncio.sleep(3600)

    asyncio.create_task(deceased_cleanup_loop())
    asyncio.create_task(contract_expiry_loop())
    asyncio.create_task(rating_obligation_loop())

@app.on_event("shutdown")
async def shutdown_db_client():
    if getattr(app.state, 'push_worker', None):
        app.state.push_worker.cancel()
        try:
            await app.state.push_worker
        except asyncio.CancelledError:
            pass
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
    tags = await affiliation.org_tag_map(db, [b.get('bidder_id') for b in bids])
    for b in bids:
        t = tags.get(b.get('bidder_id'))
        if t:
            b['org_tag'] = t['tag']
            b['org_id'] = t['org_id']
            b['org_verified'] = t.get('verified', False)
    return bids

@api_router.post("/contracts/{contract_id}/bid")
async def submit_bid(contract_id: str, user = Depends(get_current_user)):
    """Submit a bid for a contract"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    contract = await db.contracts.find_one({'id': contract_id})
    if not contract or contract['status'] != 'open':
        raise HTTPException(status_code=400, detail="Contract not available")
    if contract['poster_id'] == user['id']:
        raise HTTPException(status_code=400, detail="Cannot bid on your own contract")

    # Check if already bid on this contract
    existing_bid = await db.contract_bids.find_one({'contract_id': contract_id, 'bidder_id': user['id']})
    if existing_bid:
        raise HTTPException(status_code=400, detail="Already bid on this contract")

    join_mode = contract.get('join_mode') or 'single'

    if join_mode == 'multi':
        # Multi-join events: friction-free RSVP. Only block already-accepted or full.
        accepted = contract.get('accepted_participants') or []
        if any(p.get('id') == user['id'] for p in accepted):
            raise HTTPException(status_code=400, detail="You are already accepted in this group")
        max_p = contract.get('max_participants') or DEFAULT_MULTI_MAX_PARTICIPANTS
        if len(accepted) >= max_p:
            raise HTTPException(status_code=400, detail="This group is full")
    else:
        # Single-slot jobs: enforce assignment exclusivity (one paid contract at a time).
        # Posting/hosting a contract does NOT count — posters may still apply to other jobs.
        active = await db.contracts.find_one({
            '$or': [
                {
                    'accepted_by.id': user['id'],
                    'status': {'$in': ['in_progress', 'pending_completion', 'active']},
                },
                {
                    'manifest': {
                        '$elemMatch': {'applicant_id': user['id'], 'status': 'FILLED'},
                    },
                    'status': {'$nin': ['completed', 'cancelled', 'expired']},
                },
            ]
        })
        if active:
            raise HTTPException(status_code=400, detail="You already have an active contract")

    # Block bids on medical/rescue posts where the patient has bled out
    if (contract.get('category') or '').upper() == 'MEDICAL' and contract.get('rescue_bleedout_expires_at'):
        try:
            if datetime.fromisoformat(contract['rescue_bleedout_expires_at'].replace('Z', '+00:00')) <= datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Patient has bled out — rescue closed.")
        except (ValueError, TypeError):
            pass
    
    bid = {
        'id': str(uuid.uuid4()),
        'contract_id': contract_id,
        'bidder_id': user['id'],
        'bidder': {
            'handle': user['rsi_handle'],
            'reputation': user.get('reputation', 0.0),
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

    join_mode = contract.get('join_mode') or 'single'
    bidder_id = bid['bidder_id']
    bidder_summary = {
        'id': bidder_id,
        'handle': bid['bidder']['handle'],
        'reputation': bid['bidder']['reputation'],
        'avatar_url': bid['bidder'].get('avatar_url'),
    }

    if join_mode == 'multi':
        # Multi-join event: append to accepted_participants, keep status 'open',
        # do NOT auto-decline other pending bids (host accepts each individually).
        accepted = contract.get('accepted_participants') or []
        if any(p.get('id') == bidder_id for p in accepted):
            raise HTTPException(status_code=400, detail="Bidder is already accepted")
        max_p = contract.get('max_participants') or DEFAULT_MULTI_MAX_PARTICIPANTS
        if len(accepted) >= max_p:
            raise HTTPException(status_code=400, detail="Group is full — cannot accept more bids")

        bidder_user = await db.users.find_one({'id': bidder_id}, {'_id': 0})
        participant = participant_summary(bidder_user) if bidder_user else {**bidder_summary, 'accepted_at': datetime.now(timezone.utc).isoformat()}

        update = {'$push': {'accepted_participants': participant}}
        if not contract.get('accepted_by'):
            update['$set'] = {'accepted_by': bidder_summary}
        await db.contracts.update_one({'id': contract_id}, update)
        await db.contract_bids.update_one({'id': bid_id}, {'$set': {'status': 'accepted'}})

        # Notify the bidder
        await broadcast_notification({
            "type": "bid_accepted",
            "sound": "alert",
            "title": "You're in!",
            "message": f"You were accepted into '{contract['title']}'",
            "contract_id": contract_id,
            "target_user_id": bidder_id
        })
        return {
            'message': 'Bid accepted',
            'merc_handle': bid['bidder']['handle'],
            'join_mode': 'multi',
            'participants': len(accepted) + 1,
            'max_participants': max_p,
        }

    # Single-slot legacy behaviour.
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {
            'status': 'in_progress',
            'accepted_by': bidder_summary
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
        "target_user_id": bidder_id
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
    is_merc = (contract.get('accepted_by') or {}).get('id') == user['id']
    
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
        contract['status'] = 'completed'
        contract['completed_at'] = datetime.now(timezone.utc).isoformat()
        await ratings_queue.create_obligations(db, contract, notify=broadcast_notification)
        
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

@api_router.post("/contracts/{contract_id}/mark-complete-multi")
async def mark_multi_role_complete(contract_id: str, user = Depends(get_current_user)):
    """Poster-only, one-shot completion for multi-join / multi-crew contracts (which
    have no two-party handshake). Transitions status to 'completed' and triggers
    Discord message cleanup + optional history dispatch."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    contract = await db.contracts.find_one({'id': contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract['poster_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Only the poster can complete this contract")
    is_multi = contract.get('join_mode') == 'multi' or contract.get('is_multi_crew')
    if not is_multi:
        raise HTTPException(status_code=400, detail="Use /mark-complete for single-slot contracts")
    if contract['status'] in ('completed', 'cancelled', 'expired'):
        return {'message': 'Contract already finalised', 'status': contract['status']}
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.contracts.update_one(
        {'id': contract_id},
        {'$set': {'status': 'completed', 'completed_at': now_iso}}
    )
    # Increment poster's completion count.
    await db.users.update_one({'id': contract['poster_id']}, {'$inc': {'contracts_completed': 1}})
    # Increment each participant's completion count.
    seen = set()
    for p in (contract.get('accepted_participants') or []):
        if p.get('id') and p['id'] not in seen and p['id'] != contract['poster_id']:
            seen.add(p['id'])
            await db.users.update_one({'id': p['id']}, {'$inc': {'contracts_completed': 1}})
    for slot in (contract.get('manifest') or []):
        ab = slot.get('accepted_by') or {}
        if ab.get('id') and ab['id'] not in seen and ab['id'] != contract['poster_id']:
            seen.add(ab['id'])
            await db.users.update_one({'id': ab['id']}, {'$inc': {'contracts_completed': 1}})
    contract['status'] = 'completed'
    contract['completed_at'] = now_iso
    asyncio.create_task(cleanup_discord_messages_for_contract(contract_id))
    asyncio.create_task(dispatch_completion_history(contract))
    await ratings_queue.create_obligations(db, contract, notify=broadcast_notification)
    return {'message': 'Contract completed', 'status': 'completed', 'show_rating': True, 'multi': True}


@api_router.get("/user/active-contract")
async def get_user_active_contract(user = Depends(get_current_user)):
    """Whether the current user is currently *assigned* (accepted as sole contractor or
    filled into a crew slot) on any active contract.

    Posting/hosting a contract does NOT count — a poster can still apply to other users'
    jobs. Only true contractor/crewmate assignments block further applications.
    """
    if not user:
        return {'has_active': False}

    active = await db.contracts.find_one({
        '$or': [
            # Accepted as the sole contractor on a single-crew job.
            {
                'accepted_by.id': user['id'],
                'status': {'$in': ['in_progress', 'pending_completion', 'active']},
            },
            # Filled into a slot on someone else's multi-crew job.
            {
                'manifest': {
                    '$elemMatch': {'applicant_id': user['id'], 'status': 'FILLED'},
                },
                'status': {'$nin': ['completed', 'cancelled', 'expired']},
            },
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
    user['org_affiliation'] = await affiliation.org_affiliation_for(db, user)
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
                {'accepted_by.id': user['id']},
                {'accepted_participants.id': user['id']},
                {'manifest.accepted_by.id': user['id']},
            ]
        },
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    await affiliation.enrich_org_tags(db, contracts)
    completed_ids = [c['id'] for c in contracts if c.get('status') == 'completed']
    withheld = await ratings_queue.withheld_contract_ids(db, user['id'], completed_ids)
    for c in contracts:
        if c['id'] in withheld:
            ratings_queue.redact_withheld(c, user['id'])
    return contracts


@api_router.get("/ratings/pending")
async def get_pending_ratings(user = Depends(get_current_user)):
    """Every rating this player still owes. Survives logout; expires after 14 days."""
    if not user:
        return {'count': 0, 'items': []}
    items = await ratings_queue.pending_for(db, user['id'])
    tags = await affiliation.org_tag_map(db, [i.get('ratee_id') for i in items])
    for i in items:
        t = tags.get(i.get('ratee_id'))
        if t:
            i['ratee_org_tag'] = t['tag']
            i['ratee_org_id'] = t['org_id']
            i['ratee_org_verified'] = t.get('verified', False)
    return {'count': len(items), 'items': items, 'window_days': ratings_queue.RATING_WINDOW_DAYS}

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

@api_router.get("/users/directory")
async def get_user_directory(user = Depends(get_current_user)):
    """Get all users for the citizen directory with live stats"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0, "email": 0}
    ).to_list(500)
    
    # Enrich each user with live contract stats
    for u in users:
        user_id = u.get('id')
        
        # Count completed contracts (as poster or mercenary)
        completed_as_poster = await db.contracts.count_documents({
            'poster_id': user_id, 
            'status': 'completed'
        })
        completed_as_merc = await db.contracts.count_documents({
            'accepted_merc_id': user_id,
            'status': 'completed'
        })
        total_completed = completed_as_poster + completed_as_merc
        
        # Get all ratings received by this user
        ratings = await db.contract_ratings.find({'rated_user_id': user_id}).to_list(100)
        avg_rating = sum(r.get('rating', 0) for r in ratings) / len(ratings) if ratings else 0
        
        u['contracts_completed'] = total_completed
        u['reputation'] = round(avg_rating, 1)
        u['total_reviews'] = len(ratings)
    
    return users


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
    contract = redact_private_fields(contract, user)
    await _enrich_posters_discord([contract])
    await affiliation.enrich_org_tags(db, [contract])
    if user and contract.get('status') == 'completed':
        if contract_id in await ratings_queue.withheld_contract_ids(db, user['id'], [contract_id]):
            ratings_queue.redact_withheld(contract, user['id'])
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



# ===== Pilot's Lounge (LFG) =====

# Ship-to-activity compatibility mapping
SHIP_ACTIVITY_MAP = {
    # Mining ships -> mining activities
    "Prospector": ["mining"],
    "MOLE": ["mining", "crew"],
    # Salvage ships -> salvage (mapped to exploration/crew in lounge)
    "Vulture": ["exploration", "crew"],
    "Reclaimer": ["exploration", "crew", "org"],
    # Combat ships -> combat, pvp
    "Aurora MR": ["combat", "pvp"],
    "Cutlass Black": ["combat", "pvp", "trade", "crew"],
    "Constellation Andromeda": ["combat", "crew", "org"],
    "Corsair": ["combat", "exploration", "crew"],
    "M2 Hercules": ["combat", "org"],
    "A2 Hercules": ["combat", "pvp", "org"],
    # Cargo/Trade ships -> trade
    "Aurora CL": ["trade", "vibing"],
    "Mustang Alpha": ["trade", "vibing"],
    "Cutter": ["trade", "vibing"],
    "Avenger Titan": ["trade", "combat", "vibing"],
    "Nomad": ["trade", "vibing"],
    "Freelancer": ["trade", "crew"],
    "Freelancer MAX": ["trade"],
    "Spirit C1": ["trade"],
    "Zeus Mk II CL": ["trade"],
    "Mercury Star Runner": ["trade", "exploration"],
    "Raft": ["trade", "org"],
    "Constellation Taurus": ["trade", "crew"],
    "Caterpillar": ["trade", "org"],
    "C2 Hercules": ["trade", "org"],
    "Hull A": ["trade"],
    "Hull C": ["trade", "org"],
    # Exploration ships
    "C8X Pisces Expedition": ["exploration", "vibing"],
    "Carrack": ["exploration", "org", "crew"],
    # Luxury
    "890 Jump": ["vibing", "org"],
}

class BroadcastCreate(BaseModel):
    activity: str
    title: str
    description: Optional[str] = None
    available_from: str = "Now"
    available_until: str = "2 hours"
    group_size: str = "Any"
    region: str = "Any"

class QuickMatchPreferences(BaseModel):
    ship: Optional[str] = None
    preferred_activities: List[str] = []
    region: str = "Any"

@api_router.post("/lounge/quick-match")
async def quick_match(prefs: QuickMatchPreferences, user = Depends(get_current_user)):
    """Get broadcast suggestions based on ship and activity preferences"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get all active broadcasts
    now = datetime.now(timezone.utc)
    broadcasts = await db.broadcasts.find(
        {"status": "open", "expires_at": {"$gt": now.isoformat()}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    if not broadcasts:
        return {"matches": [], "total": 0}
    
    # Build list of compatible activities
    compatible_activities = set(prefs.preferred_activities)
    
    # Add ship-based activities
    if prefs.ship and prefs.ship in SHIP_ACTIVITY_MAP:
        compatible_activities.update(SHIP_ACTIVITY_MAP[prefs.ship])
    
    # If no preferences at all, return all available now
    if not compatible_activities:
        available_now = [b for b in broadcasts if b.get("available_from") == "Now"]
        return {"matches": available_now[:5], "total": len(available_now)}
    
    # Score and rank broadcasts
    scored_matches = []
    for b in broadcasts:
        score = 0
        reasons = []
        
        # Activity match (highest weight)
        if b.get("activity") in compatible_activities:
            score += 10
            reasons.append(f"Activity: {b.get('activity')}")
        
        # Region match
        if prefs.region != "Any" and b.get("region") == prefs.region:
            score += 3
            reasons.append(f"Region: {prefs.region}")
        elif b.get("region") == "Any":
            score += 1  # Flexible region is good
        
        # Available now bonus
        if b.get("available_from") == "Now":
            score += 2
            reasons.append("Available now")
        
        # Low response count (easier to join)
        if b.get("responses", 0) < 3:
            score += 1
        
        # Don't match own broadcast
        if b.get("user_id") == user["id"]:
            continue
        
        # Already hailed - lower priority
        if user["id"] in b.get("hailers", []):
            score -= 5
        
        if score > 0:
            scored_matches.append({
                **b,
                "match_score": score,
                "match_reasons": reasons
            })
    
    # Sort by score descending
    scored_matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "matches": scored_matches[:5],
        "total": len(scored_matches),
        "compatible_activities": list(compatible_activities)
    }

@api_router.put("/user/lounge-preferences")
async def update_lounge_preferences(prefs: QuickMatchPreferences, user = Depends(get_current_user)):
    """Save user's Quick Match preferences"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "lounge_prefs": {
                "ship": prefs.ship,
                "preferred_activities": prefs.preferred_activities,
                "region": prefs.region
            }
        }}
    )
    return {"message": "Preferences saved"}

@api_router.get("/user/lounge-preferences")
async def get_lounge_preferences(user = Depends(get_current_user)):
    """Get user's Quick Match preferences"""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return user.get("lounge_prefs", {
        "ship": None,
        "preferred_activities": [],
        "region": "Any"
    })

@api_router.get("/lounge/broadcasts")
async def get_broadcasts():
    """Get all active broadcasts"""
    now = datetime.now(timezone.utc)
    # Auto-expire old broadcasts
    await db.broadcasts.update_many(
        {"status": "open", "expires_at": {"$lt": now.isoformat()}},
        {"$set": {"status": "expired"}}
    )
    broadcasts = await db.broadcasts.find(
        {"status": "open"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return broadcasts

@api_router.post("/lounge/broadcasts")
async def create_broadcast(data: BroadcastCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check for existing active broadcast
    existing = await db.broadcasts.find_one({"user_id": user["id"], "status": "open"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active broadcast. Close it first.")
    
    # Calculate expiry (max 4 hours)
    hours_map = {"1 hour": 1, "2 hours": 2, "3 hours": 3, "4 hours": 4, "Late / No limit": 4}
    hours = hours_map.get(data.available_until, 4)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=min(hours, 4))
    
    broadcast = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "handle": user.get("rsi_handle", "Unknown"),
        "activity": data.activity,
        "title": data.title[:80],
        "description": (data.description or "")[:280],
        "available_from": data.available_from,
        "available_until": data.available_until,
        "group_size": data.group_size,
        "region": data.region,
        "status": "open",
        "responses": 0,
        "hailers": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat()
    }
    await db.broadcasts.insert_one(broadcast)
    return {"message": "Broadcast created", "id": broadcast["id"]}

@api_router.post("/lounge/broadcasts/{broadcast_id}/hail")
async def hail_broadcast(broadcast_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    broadcast = await db.broadcasts.find_one({"id": broadcast_id})
    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    
    # Cannot hail your own broadcast
    if broadcast["user_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot hail your own broadcast")
    
    if user["id"] in broadcast.get("hailers", []):
        raise HTTPException(status_code=400, detail="Already hailed")
    
    await db.broadcasts.update_one(
        {"id": broadcast_id},
        {"$inc": {"responses": 1}, "$push": {"hailers": user["id"]}}
    )
    return {"message": "Hail sent"}

@api_router.post("/lounge/broadcasts/{broadcast_id}/close")
async def close_broadcast(broadcast_id: str, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    broadcast = await db.broadcasts.find_one({"id": broadcast_id})
    if not broadcast:
        raise HTTPException(status_code=404, detail="Broadcast not found")
    
    if broadcast["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your broadcast")
    
    await db.broadcasts.update_one(
        {"id": broadcast_id},
        {"$set": {"status": "closed"}}
    )
    return {"message": "Comms closed"}


# Include router AFTER all routes are defined
api_router.include_router(create_push_router(push_notifications, get_current_user))
app.include_router(api_router)
