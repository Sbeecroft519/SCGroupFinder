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

class ReportCreate(BaseModel):
    type: str
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
    
    # Time display mapping
    time_display = {'15m': '15-30 min', '30m': '30-45 min', '1h': '30-60 min', '2h': '60-120 min'}.get(request.time, '30-60 min')
    
    # Cargo - use UEX data for profit calculation
    if request.activity == 'cargo':
        reward_text = 'Variable'
        location_desc = 'Major trading stations with best buy/sell prices.'
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get('https://api.uexcorp.space/2.0/commodities')
                if resp.status_code == 200:
                    data = resp.json()
                    commodities = data.get('data', data) if isinstance(data, dict) else data
                    if commodities and len(commodities) > 0:
                        # Find profitable commodity based on risk tolerance
                        import random
                        if request.risk == 'HIGH':
                            # High risk = illegal/volatile goods
                            candidates = [c for c in commodities if c.get('kind') == 'Drug' or c.get('is_illegal')]
                        elif request.risk == 'LOW':
                            # Low risk = stable commodities
                            candidates = [c for c in commodities if c.get('kind') in ['Metal', 'Mineral', 'Food']]
                        else:
                            candidates = commodities
                        
                        if candidates:
                            commodity = random.choice(candidates[:10])
                            buy_price = commodity.get('price_buy', 0) or 0
                            sell_price = commodity.get('price_sell', 0) or 0
                            profit_per_scu = max(0, sell_price - buy_price)
                            total_profit = profit_per_scu * ship_scu
                            if total_profit > 0:
                                reward_text = f'{total_profit:,.0f} - {total_profit * 1.5:,.0f} aUEC'
                                location_desc = f"Trade {commodity.get('name', 'goods')} - Buy low, sell high across {request.system}."
        except Exception as e:
            logger.error(f"UEX cargo calc error: {e}")
        
        return MissionResponse(
            type='cargo', title='Cargo Hauling',
            description=f'Transport goods using your {request.ship} ({ship_scu} SCU capacity).',
            location={'name': f'{request.system} - Trade Route', 'description': location_desc, 'activities': 'Trading, Cargo Running'},
            duration=time_display, reward=reward_text if ship_scu > 0 else 'Ship has no cargo capacity',
            risk_level=request.risk, fallback={'title': 'Delivery Missions', 'description': 'Package delivery contracts from terminals'}
        )
    
    # Mining - unique location suggestions
    if request.activity == 'mining':
        mining_locations = {
            'Stanton': [
                {'name': 'Aaron Halo - Lyria Cluster', 'desc': 'Dense quantanium deposits. High yield but watch for pirates near refinery routes.', 'activities': 'Quantanium, Laranite'},
                {'name': 'Yela Asteroid Belt', 'desc': 'Beginner-friendly belt with stable rocks. Good for Prospector pilots learning the trade.', 'activities': 'Agricium, Titanium'},
                {'name': 'Aberdeen Deep Deposits', 'desc': 'Surface mining on Aberdeen. Harsh conditions but rich hadanite veins.', 'activities': 'Hadanite, Dolivine'}
            ],
            'Pyro': [
                {'name': 'Pyro Belt Alpha', 'desc': 'Lawless space with untapped riches. Bring escort or risk losing everything.', 'activities': 'Rare minerals, High risk'},
            ],
            'Nyx': [
                {'name': 'Delamar Fields', 'desc': 'Remote but peaceful mining grounds away from major traffic.', 'activities': 'Mixed minerals'}
            ]
        }
        import random
        locs = mining_locations.get(request.system, mining_locations['Stanton'])
        loc = random.choice(locs)
        return MissionResponse(
            type='mining', title='Mining Operations',
            description='Extract valuable minerals from asteroids and planetary deposits.',
            location={'name': loc['name'], 'description': loc['desc'], 'activities': loc['activities']},
            duration=time_display, reward='50,000 - 250,000 aUEC',
            risk_level=request.risk, fallback={'title': 'Hand Mining', 'description': 'Surface gems on moons - no ship required'}
        )
    
    # Chill - unique interesting locations, Variable reward
    if request.activity == 'chill':
        chill_locations = {
            'Stanton': [
                {'name': 'microTech Ice Caves', 'desc': 'Land near frozen lakes on microTech. Crystalline ice formations and bioluminescent flora inside. Bring a Pembroke suit!', 'activities': 'Spelunking, Photography'},
                {'name': 'Daymar Racing Canyons', 'desc': 'Tight canyon networks perfect for low-altitude racing. Community events every weekend.', 'activities': 'Racing, Stunt Flying'},
                {'name': 'Hurston Savanna Safari', 'desc': 'Drive a Cyclone across golden plains at sunset. Watch for territorial fauna.', 'activities': 'Ground Exploration, Wildlife'},
                {'name': 'Orison Cloud Platforms', 'desc': 'Floating city with stunning views. Best coffee in the system at Cafe Musain.', 'activities': 'Sightseeing, Social'},
                {'name': 'GrimHEX Underground', 'desc': 'Seedy asteroid bar with live music and underground racing. Mind your credits.', 'activities': 'Nightlife, Racing Bets'},
                {'name': 'Port Tressler Observation Deck', 'desc': 'Watch ships come and go from the premium lounge. Crusader fills half the viewport.', 'activities': 'Relaxation, Ship Spotting'}
            ],
            'Pyro': [
                {'name': 'Pyro Station Overlook', 'desc': 'Abandoned observation post with views of the burning star. Eerie and beautiful.', 'activities': 'Photography, Exploration'},
                {'name': 'Ruin Station Graffiti Tour', 'desc': 'Player-made art installations in derelict structures. A living museum of verse culture.', 'activities': 'Art, History'}
            ],
            'Nyx': [
                {'name': 'Levski Memorial', 'desc': 'Pay respects at the revolutionary monument. Rich history of the independence movement.', 'activities': 'History, Culture'}
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
            location={'name': f'{request.system} - Security Post', 'description': 'Bounty boards with active contracts. VHRT targets pay best.', 'activities': 'Bounty Hunting, PvE Combat'},
            duration=time_display, reward='15,000 - 100,000 aUEC',
            risk_level=request.risk, fallback={'title': 'Mercenary Work', 'description': 'Security contracts from mission givers'}
        )
    
    # Salvage
    if request.activity == 'salvage':
        return MissionResponse(
            type='salvage', title='Salvage Operations',
            description='Recover valuable materials from derelict ships and debris.',
            location={'name': f'{request.system} - Wreck Site', 'description': 'Fresh wrecks from recent combat. Hull scraping and component recovery.', 'activities': 'Hull Scraping, Component Recovery'},
            duration=time_display, reward='20,000 - 80,000 aUEC',
            risk_level=request.risk, fallback={'title': 'Assisted Salvage', 'description': 'Join a Reclaimer crew for guaranteed cuts'}
        )
    
    # FPS
    return MissionResponse(
        type='fps', title='FPS Contracts',
        description='Ground combat operations and bunker clearing missions.',
        location={'name': f'{request.system} - Underground Bunker', 'description': 'Clear out hostile occupants. Watch corners and bring meds.', 'activities': 'Bunker Clearing, Defense Contracts'},
        duration=time_display, reward='10,000 - 60,000 aUEC',
        risk_level=request.risk, fallback={'title': 'Security Detail', 'description': 'Guard duty at outposts - less action, steady pay'}
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
        'shard': report.shard,
        'user_id': user['id'] if user else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.reports.insert_one(report_doc)
    return {'message': 'Report submitted', 'id': report_doc['id']}


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
