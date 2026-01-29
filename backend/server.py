from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

from ships import SHIP_SPECS, get_ship_scu, get_all_ships

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

class ReportCreate(BaseModel):
    type: str
    system: Optional[str] = None
    location: Optional[str] = None
    shard: Optional[str] = None
    details: Optional[str] = None
    timestamp: Optional[str] = None

class ContractCreate(BaseModel):
    type: str
    title: str
    # Structured fields
    activity: Optional[str] = None
    threat: Optional[str] = None
    # Escort fields
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    cargo_value: Optional[str] = None
    # Other type fields
    status_select: Optional[str] = None
    environment: Optional[str] = None
    load: Optional[str] = None
    destination: Optional[str] = None
    job: Optional[str] = None
    role: Optional[str] = None
    compensation_type: Optional[str] = None
    meet_at: Optional[str] = None
    # Payment
    payment_amount: Optional[int] = 0
    # Location
    system: Optional[str] = None
    planet: Optional[str] = None
    location: Optional[str] = None
    shard: Optional[str] = None

class ReviewCreate(BaseModel):
    contract_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    review_type: str  # 'client_to_merc' or 'merc_to_client'

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
        avatar_preset=user.get('avatar_preset')
    )


# ===== Ships Routes =====

@api_router.get("/ships")
async def get_ships():
    return [
        {"name": name, "scu": spec["scu"], "type": spec["type"]}
        for name, spec in SHIP_SPECS.items()
    ]


# ===== Intel Routes =====

@api_router.post("/intel/analyze", response_model=MissionResponse)
async def analyze_mission(request: IntelRequest):
    ship_scu = get_ship_scu(request.ship)
    time_display = {'15m': '15-30 min', '30m': '30-45 min', '1h': '30-60 min', '2h': '60-120 min'}.get(request.time, '30-60 min')
    
    # Pyro is always moderate-to-high risk due to full PvP
    effective_risk = request.risk
    pyro_warning = ""
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
        note += pyro_warning
        
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
            }
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
        
        desc = route['desc'] + pyro_warning
        
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
            fallback={'title': 'Join Mining Crew', 'description': f'Operate lasers on a MOLE in {request.system} for guaranteed profit share'}
        )
    
    # Chill - unique interesting locations, Variable reward
    if request.activity == 'chill':
        chill_locations = {
            'Stanton': [
                {'name': 'microTech Ice Caves', 'desc': 'Land near frozen lakes. Crystalline formations and bioluminescent flora inside. Pembroke suit required!', 'activities': 'Spelunking, Photography'},
                {'name': 'Daymar Racing Canyons', 'desc': 'Tight canyon networks for low-altitude racing. Community events on weekends.', 'activities': 'Racing, Stunt Flying'},
                {'name': 'Hurston Savanna at Sunset', 'desc': 'Golden plains stretching to horizon. Drive a Cyclone and watch for wildlife.', 'activities': 'Ground Exploration, Photography'},
                {'name': 'Orison Cloudview Gardens', 'desc': 'Floating platforms with stunning Crusader views. Best sunset in the verse.', 'activities': 'Sightseeing, Social'},
                {'name': 'GrimHEX Underground', 'desc': 'Asteroid bar with live music and underground racing. Watch your credits.', 'activities': 'Nightlife, Gambling'},
                {'name': 'Port Tressler Observatory', 'desc': 'Premium lounge overlooking Crusader. Ship spotting and relaxation.', 'activities': 'Relaxation, Ship Watching'}
            ],
            'Pyro': [
                {'name': 'Pyro Star Overlook', 'desc': 'Abandoned station with views of the burning star. Eerie and beautiful. Stay armed!', 'activities': 'Photography, Danger Tourism'},
                {'name': 'Ruin Station Art Walk', 'desc': 'Player graffiti installations in derelicts. Living museum of verse culture. Watch for ambushes.', 'activities': 'Art, Culture'}
            ],
            'Nyx': [
                {'name': 'Levski Memorial Plaza', 'desc': 'Revolutionary monument. Rich history of the independence movement.', 'activities': 'History, Culture'},
                {'name': 'Delamar Caverns', 'desc': 'Deep cave systems with unique geological formations.', 'activities': 'Spelunking, Exploration'}
            ]
        }
        import random
        locs = chill_locations.get(request.system, chill_locations['Stanton'])
        loc = random.choice(locs)
        
        # Chill in Pyro still has elevated risk
        chill_risk = 'MEDIUM' if request.system == 'Pyro' else 'LOW'
        desc = 'Sightseeing, cave exploration, or scenic spots.'
        if request.system == 'Pyro':
            desc += ' ⚠️ PYRO: Even chill activities carry PvP risk!'
        
        return MissionResponse(
            type='chill', title='Exploration & Touring',
            description=desc,
            location={'name': f"📍 {request.system} System: {loc['name']}", 'description': loc['desc'], 'activities': loc['activities']},
            duration=time_display, reward='Variable',
            risk_level=chill_risk, fallback={'title': 'Social Hub', 'description': f'Visit a landing zone in {request.system} and meet other pilots'}
        )
    
    # Combat
    if request.activity == 'combat':
        combat_desc = 'Engage hostile targets and complete bounty contracts.'
        if request.system == 'Pyro':
            combat_desc += ' ⚠️ PYRO: Full PvP - hostile players guaranteed!'
        combat_desc += pyro_warning
        
        combat_locations = {
            'Stanton': 'Security Post Kareah / Comm Arrays',
            'Pyro': 'Ruin Station vicinity / Jump point camps',
            'Nyx': 'Delamar patrol zones'
        }
        
        return MissionResponse(
            type='combat', title='Combat Missions',
            description=combat_desc,
            location={'name': f"📍 {request.system} System: {combat_locations.get(request.system, 'Security Post')}", 'description': 'Check bounty boards for VHRT/ERT contracts. Group bounties pay best.', 'activities': 'Bounty Hunting, PvE Combat' + (', PvP' if request.system == 'Pyro' else '')},
            duration=time_display, reward='15,000 - 100,000 aUEC',
            risk_level=effective_risk, fallback={'title': 'Mercenary Work', 'description': f'Security contracts from {request.system} mission givers'}
        )
    
    # Salvage
    if request.activity == 'salvage':
        salvage_desc = 'Recover materials from derelict ships and debris.'
        if request.system == 'Pyro':
            salvage_desc += ' ⚠️ PYRO: Expect combat over salvage rights!'
        salvage_desc += pyro_warning
        
        salvage_locations = {
            'Stanton': 'Comm Array debris fields / Post-battle wrecks',
            'Pyro': 'Ruin Station ship graveyard / Ambush aftermath',
            'Nyx': 'Delamar abandoned outposts'
        }
        
        return MissionResponse(
            type='salvage', title='Salvage Operations',
            description=salvage_desc,
            location={'name': f"📍 {request.system} System: {salvage_locations.get(request.system, 'Wreck Sites')}", 'description': 'Fresh combat wrecks near comm arrays. Hull scraping and component recovery.', 'activities': 'Hull Scraping, Components'},
            duration=time_display, reward='20,000 - 80,000 aUEC',
            risk_level=effective_risk, fallback={'title': 'Reclaimer Crew', 'description': f'Join a salvage ship in {request.system} for guaranteed cuts'}
        )
    
    # FPS
    fps_desc = 'Ground combat operations and bunker clearing.'
    if request.system == 'Pyro':
        fps_desc += ' ⚠️ PYRO: Other players may contest bunkers!'
    fps_desc += pyro_warning
    
    fps_locations = {
        'Stanton': 'Underground Bunkers (Hurston/microTech)',
        'Pyro': 'Contested outposts / Ruin Station interior',
        'Nyx': 'Levski underground / Delamar facilities'
    }
    
    return MissionResponse(
        type='fps', title='FPS Contracts',
        description=fps_desc,
        location={'name': f"📍 {request.system} System: {fps_locations.get(request.system, 'Underground Bunker')}", 'description': 'Clear hostile occupants. Watch corners, bring meds and extra ammo.', 'activities': 'Bunker Clearing, Defense'},
        duration=time_display, reward='10,000 - 60,000 aUEC',
        risk_level=effective_risk, fallback={'title': 'Security Detail', 'description': f'Guard duty at {request.system} outposts - steady pay, less action'}
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
    report_doc = {
        'id': str(uuid.uuid4()),
        'type': report.type,
        'system': report.system,
        'location': report.location,
        'shard': report.shard,
        'details': report.details,
        'user_id': user['id'] if user else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    
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
async def get_contracts(type: Optional[str] = None):
    # Filter out expired contracts (>1 hour old and still open)
    # Also hide COMPLETED contracts from the feed
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    query = {
        'status': {'$nin': ['completed', 'expired']},  # Hide completed/expired
        '$or': [
            {'status': {'$in': ['in_progress', 'pending_completion']}},  # Show active contracts regardless of age
            {'status': 'open', 'created_at': {'$gte': one_hour_ago}}  # Open but not expired (1 hour)
        ]
    }
    if type:
        query['type'] = type
    
    contracts = await db.contracts.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    
    # Mark expired contracts (open and older than 1 hour)
    await db.contracts.update_many(
        {'status': 'open', 'created_at': {'$lt': one_hour_ago}},
        {'$set': {'status': 'expired'}}
    )
    
    return contracts

@api_router.post("/contracts")
async def create_contract(contract: ContractCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract_doc = {
        'id': str(uuid.uuid4()),
        'type': contract.type,
        'title': contract.title,
        # Structured fields
        'activity': contract.activity,
        'threat': contract.threat,
        # Escort fields
        'start_location': contract.start_location,
        'end_location': contract.end_location,
        'cargo_value': contract.cargo_value,
        # Other type fields
        'status_select': contract.status_select,
        'environment': contract.environment,
        'load': contract.load,
        'destination': contract.destination,
        'job': contract.job,
        'role': contract.role,
        'compensation_type': contract.compensation_type,
        'meet_at': contract.meet_at,
        # Payment
        'payment_amount': contract.payment_amount or 0,
        # Location
        'system': contract.system,
        'planet': contract.planet,
        'location': contract.location,
        'shard': contract.shard,
        'poster_id': user['id'],
        'poster': {
            'handle': user['rsi_handle'],
            'reputation': user.get('reputation', 5.0),
            'is_supporter': user.get('is_supporter', False),
            'avatar_url': user.get('avatar_url')
        },
        'accepted_by': None,
        'status': 'open',
        'client_review': None,
        'merc_review': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.contracts.insert_one(contract_doc)
    contract_doc.pop('_id', None)
    
    # Broadcast new contract via WebSocket
    await broadcast_contract(contract_doc)
    
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
            frontend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace('/api', '').rstrip('/')
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
            frontend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').replace('/api', '').rstrip('/')
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
    
    # Map preset to file URL
    preset_files = {
        'pilot': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/ud2yrip4_Pilot%20Helmet%20Icon.jpg',
        'medic': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/y3sjh1kj_medic%20icon.jpg',
        'pirate': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/9jq4a6p0_pirate%20icon.jpg',
        'hauler': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/y9kqdygi_hauler%20icon.jpg',
        'miner': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/7i1hxlzx_mining%20icon.jpg',
        'bounty': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/2bvh7efg_bounty%20hunter%20icon.jpg',
        'engineer': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/3k5fmash_engineer%20icon.jpg',
        'explorer': 'https://customer-assets.emergentagent.com/job_citizen-hub-8/artifacts/rdo3h8bq_explorer%20icon.jpg',
    }
    
    avatar_url = preset_files.get(data.avatar_preset)
    if not avatar_url:
        raise HTTPException(status_code=400, detail="Invalid avatar preset")
    
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'avatar_preset': data.avatar_preset, 'avatar_url': avatar_url}}
    )
    return {'message': 'Avatar updated', 'avatar_url': avatar_url}


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
        admin_password = 'Nv$C0m_Adm1n_2025!'
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
    
    if contract['status'] == 'in_progress':
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

# Include router AFTER all routes are defined
app.include_router(api_router)
