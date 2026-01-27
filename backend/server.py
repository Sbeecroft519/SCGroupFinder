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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    rsi_handle: str
    is_verified: bool = False
    is_supporter: bool = False
    theme_id: str = "default"
    reputation: float = 5.0
    contracts_completed: int = 0
    created_at: str

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
    
    # Create user
    user = {
        'id': str(uuid.uuid4()),
        'email': user_data.email,
        'password_hash': hash_password(user_data.password),
        'rsi_handle': user_data.rsi_handle,
        'verification_code': user_data.verification_code,
        'is_verified': True,  # For demo, auto-verify
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
    
    token = create_token(user['id'])
    
    user_response = UserResponse(
        id=user['id'],
        email=user['email'],
        rsi_handle=user['rsi_handle'],
        is_verified=user.get('is_verified', False),
        is_supporter=user.get('is_supporter', False),
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 5.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', '')
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return UserResponse(
        id=user['id'],
        email=user['email'],
        rsi_handle=user['rsi_handle'],
        is_verified=user.get('is_verified', False),
        is_supporter=user.get('is_supporter', False),
        theme_id=user.get('theme_id', 'default'),
        reputation=user.get('reputation', 5.0),
        contracts_completed=user.get('contracts_completed', 0),
        created_at=user.get('created_at', '')
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
    
    # Activity-based mission generation
    missions = {
        'cargo': {
            'title': 'Cargo Hauling',
            'description': f'Transport goods using your {request.ship} ({ship_scu} SCU capacity).',
            'location': {
                'name': f'{request.system} - Trade Hub',
                'description': 'Major trading stations with best buy/sell prices.',
                'activities': 'Trading, Cargo Running'
            },
            'reward': f'{ship_scu * 100:,} - {ship_scu * 200:,} aUEC' if ship_scu > 0 else 'Variable'
        },
        'combat': {
            'title': 'Combat Missions',
            'description': 'Engage hostile targets and complete bounty contracts.',
            'location': {
                'name': f'{request.system} - Combat Zone',
                'description': 'Active conflict areas with bounty targets.',
                'activities': 'Bounty Hunting, PvE Combat'
            },
            'reward': '15,000 - 100,000 aUEC'
        },
        'salvage': {
            'title': 'Salvage Operations',
            'description': 'Recover valuable materials from derelict ships and debris.',
            'location': {
                'name': f'{request.system} - Salvage Site',
                'description': 'Wreckage fields with recoverable materials.',
                'activities': 'Hull Scraping, Component Recovery'
            },
            'reward': '20,000 - 80,000 aUEC'
        },
        'fps': {
            'title': 'FPS Contracts',
            'description': 'Ground combat operations and bunker clearing missions.',
            'location': {
                'name': f'{request.system} - Ground Site',
                'description': 'Underground bunkers and surface installations.',
                'activities': 'Bunker Clearing, Defense Contracts'
            },
            'reward': '10,000 - 60,000 aUEC'
        },
        'mining': {
            'title': 'Mining Operations',
            'description': 'Extract valuable minerals from asteroids and planetary deposits.',
            'location': {
                'name': f'{request.system} - Mining Belt',
                'description': 'Resource-rich asteroid fields.',
                'activities': 'Quantanium Mining, Gem Extraction'
            },
            'reward': '50,000 - 200,000 aUEC'
        },
        'chill': {
            'title': 'Exploration & Touring',
            'description': 'Sightseeing, cave exploration, or scenic spots.',
            'location': {
                'name': 'microTech Ice Caves',
                'description': 'Land near the frozen lakes on microTech\'s surface. Look for cave entrances - crystalline ice formations inside. Bring a Pembroke suit!',
                'activities': 'Spelunking, Photography'
            },
            'reward': 'Variable - Variable'
        }
    }
    
    mission_data = missions.get(request.activity, missions['chill'])
    
    # Convert time to display format
    time_display = {
        '15m': '15-30 min',
        '30m': '30-45 min',
        '1h': '30-60 min',
        '2h': '60-120 min'
    }.get(request.time, '30-60 min')
    
    return MissionResponse(
        type=request.activity,
        title=mission_data['title'],
        description=mission_data['description'],
        location=mission_data['location'],
        duration=time_display,
        reward=mission_data['reward'],
        risk_level=request.risk,
        fallback={
            'title': 'FPS Missions',
            'description': 'Ground combat and bunker clearing'
        }
    )


# ===== Signals Routes =====

@api_router.get("/signals/status")
async def get_signals_status():
    # Get report count from last 24h
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    reports_count = await db.reports.count_documents({
        'created_at': {'$gte': yesterday.isoformat()}
    })
    
    return {
        'server_status': 'operational',
        'rsi_status': {
            'status': 'operational',
            'lastIncident': {
                'title': 'Platform Services Disruption',
                'date': '2025-01-24 13:40 UTC'
            }
        },
        'reports_24h': reports_count or 5
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
        'poster': {
            'handle': user['rsi_handle'],
            'reputation': user.get('reputation', 5.0),
            'is_supporter': user.get('is_supporter', False)
        },
        'status': 'open',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.contracts.insert_one(contract_doc)
    
    # Return without _id
    contract_doc.pop('_id', None)
    return contract_doc


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
