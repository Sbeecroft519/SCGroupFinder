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

from ships import SHIP_SPECS, get_ship_scu, get_all_ships

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'navcom-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Create the main app
app = FastAPI(title="NavCom API", version="2.0.0")

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
    theme_id: str = "default"
    reputation: float = 5.0
    contracts_completed: int = 0
    created_at: str
    avatar_url: Optional[str] = None

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
    timestamp: Optional[str] = None

class ContractCreate(BaseModel):
    type: str
    title: str
    description: str
    location: Optional[str] = None
    rescue_type: Optional[str] = None
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
            avatar_match = re.search(r'<img[^>]*class="[^"]*thumb[^"]*"[^>]*src="([^"]+)"', page_content)
            if not avatar_match:
                avatar_match = re.search(r'src="(https://robertsspaceindustries\.com/media/[^"]+)"', page_content)
            if avatar_match:
                avatar_url = avatar_match.group(1)
                if avatar_url.startswith('//'):
                    avatar_url = 'https:' + avatar_url
            
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
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 5.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', ''),
        avatar_url=user.get('avatar_url')
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
    
    # Cargo - use best profitable routes based on risk
    if request.activity == 'cargo':
        # High-profit trade routes (realistic SC economy)
        trade_routes = {
            'Stanton': {
                'LOW': [
                    {'commodity': 'Agricium', 'buy': 'Shubin SAL-2 (Lyria)', 'sell': 'Area18 TDD', 'buy_price': 25.50, 'sell_price': 27.89, 'profit_per_scu': 2.39},
                    {'commodity': 'Titanium', 'buy': 'Lathan (Arial)', 'sell': 'Port Olisar', 'buy_price': 8.04, 'sell_price': 9.12, 'profit_per_scu': 1.08},
                    {'commodity': 'Stims', 'buy': 'Orison', 'sell': 'GrimHEX', 'buy_price': 2.80, 'sell_price': 3.75, 'profit_per_scu': 0.95},
                ],
                'MEDIUM': [
                    {'commodity': 'Laranite', 'buy': 'Bountiful Harvest (Daymar)', 'sell': 'New Babbage TDD', 'buy_price': 27.50, 'sell_price': 31.89, 'profit_per_scu': 4.39},
                    {'commodity': 'Agricium', 'buy': 'HDMS-Thedus (Arial)', 'sell': 'Lorville CBD', 'buy_price': 24.12, 'sell_price': 28.50, 'profit_per_scu': 4.38},
                    {'commodity': 'Titanium', 'buy': 'Kudre Ore (Daymar)', 'sell': 'Area18 TDD', 'buy_price': 7.80, 'sell_price': 9.45, 'profit_per_scu': 1.65},
                ],
                'HIGH': [
                    {'commodity': 'Quantanium (Refined)', 'buy': 'CRU-L1 Refinery', 'sell': 'Area18 TDD', 'buy_price': 44.00, 'sell_price': 88.50, 'profit_per_scu': 44.50, 'note': 'Refinery wait time required'},
                    {'commodity': 'WiDoW', 'buy': 'JT (Yela)', 'sell': 'GrimHEX', 'buy_price': 24.00, 'sell_price': 96.00, 'profit_per_scu': 72.00, 'note': 'Illegal - High pirate activity at JT'},
                    {'commodity': 'Slam', 'buy': 'Nuen Waste (Daymar)', 'sell': 'GrimHEX', 'buy_price': 12.50, 'sell_price': 52.00, 'profit_per_scu': 39.50, 'note': 'Illegal - Avoid scans'},
                    {'commodity': 'Laranite', 'buy': 'Arial (Contested)', 'sell': 'Lorville CBD', 'buy_price': 26.00, 'sell_price': 32.50, 'profit_per_scu': 6.50, 'note': 'PvP hotspot'},
                ]
            },
            'Pyro': {
                'LOW': [{'commodity': 'Medical Supplies', 'buy': 'Stanton Import', 'sell': 'Pyro Stations', 'buy_price': 17.50, 'sell_price': 35.00, 'profit_per_scu': 17.50}],
                'MEDIUM': [{'commodity': 'Processed Food', 'buy': 'Stanton Import', 'sell': 'Pyro Settlements', 'buy_price': 1.35, 'sell_price': 8.50, 'profit_per_scu': 7.15}],
                'HIGH': [{'commodity': 'WiDoW', 'buy': 'Pyro Production', 'sell': 'Stanton Black Market', 'buy_price': 18.00, 'sell_price': 110.00, 'profit_per_scu': 92.00, 'note': 'Extremely dangerous'}]
            },
            'Nyx': {
                'LOW': [{'commodity': 'Hydrogen Fuel', 'buy': 'Delamar Refineries', 'sell': 'Levski', 'buy_price': 1.02, 'sell_price': 1.45, 'profit_per_scu': 0.43}],
                'MEDIUM': [{'commodity': 'Distilled Spirits', 'buy': 'Levski Production', 'sell': 'Stanton Export', 'buy_price': 4.95, 'sell_price': 6.25, 'profit_per_scu': 1.30}],
                'HIGH': [{'commodity': 'Maze', 'buy': 'Nyx Underground', 'sell': 'Stanton Black Market', 'buy_price': 42.00, 'sell_price': 115.00, 'profit_per_scu': 73.00, 'note': 'Illegal narcotic'}]
            }
        }
        
        import random
        routes = trade_routes.get(request.system, trade_routes['Stanton']).get(request.risk, trade_routes['Stanton']['MEDIUM'])
        route = random.choice(routes)
        
        total_profit = route['profit_per_scu'] * ship_scu
        min_profit = int(total_profit * 0.85)
        max_profit = int(total_profit * 1.15)
        investment = route['buy_price'] * ship_scu
        roi = (total_profit / investment * 100) if investment > 0 else 0
        
        note = f" ⚠️ {route.get('note')}" if route.get('note') else ""
        
        return MissionResponse(
            type='cargo', title='Cargo Hauling',
            description=f"Trade commodities between stations{note}",
            location={
                'name': f"{route['commodity']} Trade Route",
                'description': f"{route['buy']} → {route['sell']}",
                'activities': f"LIVE: {route['commodity']} | Buy at {route['buy']} ({route['buy_price']:.2f} aUEC/SCU) → Sell at {route['sell']} ({route['sell_price']:.2f} aUEC/SCU) | Profit: {route['profit_per_scu']:.2f} aUEC / {ship_scu} SCU"
            },
            duration=time_display, 
            reward=f"{min_profit:,} aUEC - {max_profit:,} aUEC" if ship_scu > 0 else 'Ship has no cargo capacity',
            risk_level=request.risk, 
            fallback={'title': 'Delivery Missions', 'description': 'Package delivery from contract terminals - no cargo investment needed'},
            profit_data={
                'commodity': route['commodity'],
                'route': f"{route['buy']} → {route['sell']}",
                'buy_price': route['buy_price'],
                'sell_price': route['sell_price'],
                'profit_per_scu': round(route['profit_per_scu'], 2),
                'total_profit': int(total_profit),
                'investment': int(investment),
                'roi': round(roi, 1),
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
                'LOW': [{'location': 'Pyro Belt Edge', 'material': 'Mixed Ores', 'refinery': 'Pyro Station', 'sell': 'Local Buyers', 'yield': '20,000 - 60,000', 'desc': 'Lawless but sparse population at edges.'}],
                'MEDIUM': [{'location': 'Pyro I Rings', 'material': 'Bexalite Deposits', 'refinery': 'Ruin Station', 'sell': 'Stanton Export', 'yield': '100,000 - 250,000', 'desc': 'High value ore. Pirate patrols common.'}],
                'HIGH': [{'location': 'Pyro Core Belt', 'material': 'Taranite + Quantanium', 'refinery': 'Mobile Refinery', 'sell': 'Black Market', 'yield': '200,000 - 500,000', 'desc': 'Richest deposits. Expect PvP. Go with fleet.'}]
            },
            'Nyx': {
                'LOW': [{'location': 'Delamar Fields', 'material': 'Titanium + Copper', 'refinery': 'Levski Refinery', 'sell': 'Levski', 'yield': '25,000 - 70,000', 'desc': 'Quiet mining away from traffic.'}],
                'MEDIUM': [{'location': 'Delamar Deep', 'material': 'Gold Veins', 'refinery': 'Levski', 'sell': 'Levski or Export', 'yield': '70,000 - 180,000', 'desc': 'Concentrated gold deposits underground.'}],
                'HIGH': [{'location': 'Nyx Belt', 'material': 'Quantanium Hotspot', 'refinery': 'Closest Available', 'sell': 'Best Market', 'yield': '150,000 - 350,000', 'desc': 'Remote but lucrative. Long travel times.'}]
            }
        }
        
        import random
        routes = mining_routes.get(request.system, mining_routes['Stanton']).get(request.risk, mining_routes['Stanton']['MEDIUM'])
        route = random.choice(routes)
        
        return MissionResponse(
            type='mining', title=f"Mining: {route['material'].split('(')[0].strip()}",
            description=route['desc'],
            location={
                'name': f"⛏️ {route['location']}",
                'description': f"Material: {route['material']}\n🔧 Refine at: {route['refinery']}\n💰 Sell at: {route['sell']}",
                'activities': f"Expected yield: {route['yield']} aUEC"
            },
            duration=time_display, reward=route['yield'] + ' aUEC',
            risk_level=request.risk, 
            fallback={'title': 'Join Mining Crew', 'description': 'Operate lasers on a MOLE for guaranteed profit share'}
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
                {'name': 'Pyro Star Overlook', 'desc': 'Abandoned station with views of the burning star. Eerie and beautiful.', 'activities': 'Photography'},
                {'name': 'Ruin Station Art Walk', 'desc': 'Player graffiti installations in derelicts. Living museum of verse culture.', 'activities': 'Art, Culture'}
            ],
            'Nyx': [
                {'name': 'Levski Memorial Plaza', 'desc': 'Revolutionary monument. Rich history of the independence movement.', 'activities': 'History, Culture'},
                {'name': 'Delamar Caverns', 'desc': 'Deep cave systems with unique geological formations.', 'activities': 'Spelunking, Exploration'}
            ]
        }
        import random
        locs = chill_locations.get(request.system, chill_locations['Stanton'])
        loc = random.choice(locs)
        return MissionResponse(
            type='chill', title='Exploration & Touring',
            description='Sightseeing, cave exploration, or scenic spots.',
            location={'name': loc['name'], 'description': loc['desc'], 'activities': loc['activities']},
            duration=time_display, reward='Variable',
            risk_level='LOW', fallback={'title': 'Social Hub', 'description': 'Visit a landing zone and meet other pilots'}
        )
    
    # Combat
    if request.activity == 'combat':
        return MissionResponse(
            type='combat', title='Combat Missions',
            description='Engage hostile targets and complete bounty contracts.',
            location={'name': f'{request.system} - Security Post', 'description': 'Check bounty boards for VHRT/ERT contracts. Group bounties pay best.', 'activities': 'Bounty Hunting, PvE Combat'},
            duration=time_display, reward='15,000 - 100,000 aUEC',
            risk_level=request.risk, fallback={'title': 'Mercenary Work', 'description': 'Security contracts from mission givers'}
        )
    
    # Salvage
    if request.activity == 'salvage':
        return MissionResponse(
            type='salvage', title='Salvage Operations',
            description='Recover materials from derelict ships and debris.',
            location={'name': f'{request.system} - Wreck Sites', 'description': 'Fresh combat wrecks near comm arrays. Hull scraping and component recovery.', 'activities': 'Hull Scraping, Components'},
            duration=time_display, reward='20,000 - 80,000 aUEC',
            risk_level=request.risk, fallback={'title': 'Reclaimer Crew', 'description': 'Join a salvage ship for guaranteed cuts'}
        )
    
    # FPS
    return MissionResponse(
        type='fps', title='FPS Contracts',
        description='Ground combat operations and bunker clearing.',
        location={'name': f'{request.system} - Underground Bunker', 'description': 'Clear hostile occupants. Watch corners, bring meds and extra ammo.', 'activities': 'Bunker Clearing, Defense'},
        duration=time_display, reward='10,000 - 60,000 aUEC',
        risk_level=request.risk, fallback={'title': 'Security Detail', 'description': 'Guard duty at outposts - steady pay, less action'}
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
                root = ET.fromstring(response.text)
                ns = {'atom': 'http://www.w3.org/2005/Atom'}
                entries = root.findall('.//atom:entry', ns) or root.findall('.//entry')
                if entries:
                    latest = entries[0]
                    title_el = latest.find('atom:title', ns) or latest.find('title')
                    updated_el = latest.find('atom:updated', ns) or latest.find('updated')
                    title = title_el.text if title_el is not None else 'Unknown'
                    updated = updated_el.text if updated_el is not None else ''
                    
                    title_lower = title.lower()
                    if 'major' in title_lower or 'outage' in title_lower:
                        rsi_status['status'] = 'outage'
                    elif 'degraded' in title_lower or 'partial' in title_lower:
                        rsi_status['status'] = 'degraded'
                    
                    rsi_status['lastIncident'] = {'title': title, 'date': updated[:19].replace('T', ' ') + ' UTC'}
    except Exception as e:
        logger.error(f"RSI status fetch error: {e}")
    
    return {
        'server_status': rsi_status['status'],
        'rsi_status': rsi_status,
        'reports_24h': reports_count or 0
    }

@api_router.get("/signals/reports")
async def get_reports():
    reports = await db.reports.find(
        {},
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    return reports

@api_router.post("/signals/report")
async def create_report(report: ReportCreate, user = Depends(get_current_user)):
    report_doc = {
        'id': str(uuid.uuid4()),
        'type': report.type,
        'system': report.system,
        'location': report.location,
        'shard': report.shard,
        'user_id': user['id'] if user else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    return {'message': 'Report submitted', 'id': report_doc['id']}


@api_router.get("/signals/alerts")
async def get_alerts():
    """Get time-sensitive alerts (pirates, pvp) from last hour"""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    alerts = await db.reports.find(
        {
            'type': {'$in': ['pirates', 'pvp']},
            'created_at': {'$gte': one_hour_ago}
        },
        {'_id': 0}
    ).sort('created_at', -1).limit(20).to_list(20)
    
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
    query = {}
    if type:
        query['type'] = type
    
    contracts = await db.contracts.find(
        query,
        {'_id': 0}
    ).sort('created_at', -1).limit(50).to_list(50)
    return contracts

@api_router.post("/contracts")
async def create_contract(contract: ContractCreate, user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    contract_doc = {
        'id': str(uuid.uuid4()),
        'type': contract.type,
        'title': contract.title,
        'description': contract.description,
        'location': contract.location,
        'rescue_type': contract.rescue_type,
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
        # Return default goals if none exist
        return [
            GoalResponse(
                id='1',
                title='Mercenary Board',
                description='Full contract system with reputation, ratings, and payment tracking.',
                target_amount=5000,
                current_amount=3250,
                backers=42,
                status='active'
            ),
            GoalResponse(
                id='2',
                title='Fleet Manager',
                description='Track your ships, loadouts, and crew assignments in one place.',
                target_amount=3000,
                current_amount=1800,
                backers=28,
                status='active'
            )
        ]
    return goals


# ===== Root Route =====

@api_router.get("/")
async def root():
    return {"message": "NavCom API v2.0.0", "status": "operational"}


# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
