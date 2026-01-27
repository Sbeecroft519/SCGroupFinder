import { useState } from 'react';
import { Radar, MapPin, Clock, DollarSign, AlertTriangle, Rocket, Crosshair, Wrench, Target, Pickaxe, Coffee, Check, Loader2, TrendingUp, X } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const SHIPS = [
  { name: "Aurora MR", scu: 0, type: "Starter/Light Fighter" },
  { name: "Aurora CL", scu: 6, type: "Starter/Light Freight" },
  { name: "Mustang Alpha", scu: 4, type: "Starter/Light Freight" },
  { name: "C8X Pisces Expedition", scu: 4, type: "Snub/Pathfinder" },
  { name: "Cutter", scu: 4, type: "Starter/Light Freight" },
  { name: "Avenger Titan", scu: 8, type: "Light Freight" },
  { name: "Nomad", scu: 24, type: "Light Freight" },
  { name: "Cutlass Black", scu: 46, type: "Medium Freight" },
  { name: "Freelancer", scu: 66, type: "Medium Freight" },
  { name: "Freelancer MAX", scu: 120, type: "Heavy Freight" },
  { name: "Spirit C1", scu: 64, type: "Medium Freight" },
  { name: "Zeus Mk II CL", scu: 128, type: "Medium Freight" },
  { name: "Mercury Star Runner", scu: 114, type: "Data/Freight" },
  { name: "Raft", scu: 96, type: "Industrial Freight" },
  { name: "Constellation Andromeda", scu: 96, type: "Gunship/Freight" },
  { name: "Constellation Taurus", scu: 174, type: "Heavy Freight" },
  { name: "Corsair", scu: 72, type: "Exploration/Gunship" },
  { name: "Caterpillar", scu: 576, type: "Heavy Cargo" },
  { name: "C2 Hercules", scu: 696, type: "Heavy Cargo" },
  { name: "M2 Hercules", scu: 522, type: "Military Transport" },
  { name: "A2 Hercules", scu: 216, type: "Bomber/Gunship" },
  { name: "Hull A", scu: 64, type: "Light Cargo" },
  { name: "Hull C", scu: 4608, type: "Super Heavy Cargo" },
  { name: "Carrack", scu: 456, type: "Exploration" },
  { name: "890 Jump", scu: 388, type: "Capital/Luxury" },
  { name: "Vulture", scu: 12, type: "Salvage" },
  { name: "Reclaimer", scu: 420, type: "Heavy Salvage" },
  { name: "Prospector", scu: 32, type: "Mining" },
  { name: "MOLE", scu: 96, type: "Mining" }
];

const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];
const TIMES = ['15m', '30m', '1h', '2h'];
const ACTIVITIES = [
  { id: 'cargo', label: 'Cargo', icon: Rocket },
  { id: 'combat', label: 'Combat', icon: Crosshair },
  { id: 'salvage', label: 'Salvage', icon: Wrench },
  { id: 'fps', label: 'FPS', icon: Target },
  { id: 'mining', label: 'Mining', icon: Pickaxe },
  { id: 'chill', label: 'Chill', icon: Coffee }
];
const RISKS = ['LOW', 'MEDIUM', 'HIGH'];

const SCANNING_STEPS = [
  { id: 'vessel', label: 'Scanning Vessel Parameters', icon: Rocket },
  { id: 'market', label: 'Querying UEX Market Data', icon: TrendingUp },
  { id: 'risk', label: 'Analyzing Risk Vectors', icon: AlertTriangle },
  { id: 'routes', label: 'Calculating Optimal Routes', icon: MapPin },
  { id: 'profile', label: 'Generating Mission Profile', icon: Radar }
];

export default function Intel() {
  const [ship, setShip] = useState(SHIPS[0].name);
  const [system, setSystem] = useState('Stanton');
  const [time, setTime] = useState('1h');
  const [activity, setActivity] = useState('cargo');
  const [risk, setRisk] = useState('MEDIUM');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [mission, setMission] = useState(null);

  const selectedShip = SHIPS.find(s => s.name === ship);

  const handleAnalyze = async () => {
    setIsScanning(true);
    setScanStep(0);
    setMission(null);

    // Simulate scanning animation
    for (let i = 0; i < SCANNING_STEPS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanStep(i + 1);
    }

    try {
      const response = await axios.post(`${API}/intel/analyze`, {
        ship,
        system,
        time,
        activity,
        risk
      });
      setMission(response.data);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Generate fallback mission
      setMission({
        type: activity,
        title: getActivityTitle(activity),
        description: getActivityDescription(activity),
        location: {
          name: `${system} - Recommended Zone`,
          description: 'Based on current server conditions',
          activities: activity
        },
        duration: time,
        reward: 'Variable',
        risk_level: risk,
        fallback: {
          title: 'FPS Missions',
          description: 'Ground combat and bunker clearing'
        }
      });
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsScanning(false);
    }
  };

  const getActivityTitle = (act) => {
    const titles = {
      cargo: 'Cargo Hauling',
      combat: 'Combat Missions',
      salvage: 'Salvage Operations',
      fps: 'FPS Contracts',
      mining: 'Mining Operations',
      chill: 'Exploration & Touring'
    };
    return titles[act] || 'Mission';
  };

  const getActivityDescription = (act) => {
    const descs = {
      cargo: 'Transport goods between stations for profit',
      combat: 'Engage hostile targets in space combat',
      salvage: 'Recover materials from derelict ships',
      fps: 'Ground-based combat and bunker clearing',
      mining: 'Extract valuable minerals from asteroids',
      chill: 'Sightseeing, cave exploration, or scenic spots'
    };
    return descs[act] || '';
  };

  return (
    <div className="navcom-page" data-testid="intel-page">
      {/* Scanning Overlay */}
      {isScanning && (
        <div className="scanning-overlay" data-testid="scanning-overlay">
          <div className="scanning-ring">
            <Radar className="scanning-icon" size={48} />
          </div>
          <div className="scanning-steps">
            {SCANNING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isComplete = scanStep > index;
              const isActive = scanStep === index;
              return (
                <div 
                  key={step.id} 
                  className={`scanning-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                >
                  <StepIcon className="scanning-step-icon" size={16} />
                  <span className="scanning-step-text">{step.label}</span>
                  {isComplete && <Check size={14} className="text-green" />}
                  {isActive && <Loader2 size={14} className="text-cyan animate-spin" />}
                </div>
              );
            })}
          </div>
          <div className="scanning-progress">
            <div className="scanning-progress-bar" />
          </div>
        </div>
      )}

      {/* Mission Result Modal */}
      {mission && !isScanning && (
        <div className="mission-modal-overlay" onClick={() => setMission(null)} data-testid="mission-modal">
          <div className="mission-modal" onClick={e => e.stopPropagation()}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// MISSION_RECOMMENDATION</div>
                <h2 className="mission-title">{mission.title}</h2>
              </div>
              <button className="mission-modal-close" onClick={() => setMission(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              <p className="mission-description">{mission.description}</p>
              
              {mission.location && (
                <div className="mission-location">
                  <div className="mission-location-title">
                    <MapPin size={14} />
                    {mission.location.name}
                  </div>
                  <p className="mission-location-desc">{mission.location.description}</p>
                  <p className="mission-location-activities">
                    Suggested activities: {mission.location.activities}
                  </p>
                </div>
              )}

              <div className="mission-stats">
                <div className="mission-stat">
                  <span className="mission-stat-label">
                    <Clock size={14} />
                    LENGTH OF MISSION
                  </span>
                  <span className="mission-stat-value">{mission.duration}</span>
                </div>
                <div className="mission-stat">
                  <span className="mission-stat-label">
                    <DollarSign size={14} />
                    REWARD RANGE
                  </span>
                  <span className="mission-stat-value">{mission.reward}</span>
                </div>
                <div className="mission-stat">
                  <span className="mission-stat-label">
                    <AlertTriangle size={14} />
                    RISK RATING
                  </span>
                  <span className={`mission-stat-value ${mission.risk_level?.toLowerCase()}`}>
                    {mission.risk_level}
                  </span>
                </div>
              </div>

              {mission.fallback && (
                <div className="mission-fallback">
                  <div className="mission-fallback-label">FALLBACK OPTION</div>
                  <div className="mission-fallback-title">{mission.fallback.title}</div>
                  <p className="mission-fallback-desc">{mission.fallback.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-label">// MISSION_ADVISOR</div>
        <h1 className="page-title">What Should I Do?</h1>
      </div>

      {/* Main Content */}
      <div className="intel-layout">
        {/* Configuration Panel */}
        <div className="intel-config">
          {/* Ship Selection */}
          <div className="form-group">
            <label className="nc-label">
              <Rocket size={14} />
              VESSEL
            </label>
            <select 
              className="nc-select" 
              value={ship} 
              onChange={e => setShip(e.target.value)}
              data-testid="ship-select"
            >
              {SHIPS.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            <div className="ship-info">
              Cargo: {selectedShip?.scu} SCU
            </div>
          </div>

          {/* System Selection */}
          <div className="form-group">
            <label className="nc-label">
              <MapPin size={14} />
              SYSTEM
            </label>
            <div className="nc-toggle-group" data-testid="system-toggle">
              {SYSTEMS.map(s => (
                <button
                  key={s}
                  className={`nc-toggle ${system === s ? 'active' : ''}`}
                  onClick={() => setSystem(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="form-group">
            <label className="nc-label">
              <Clock size={14} />
              AVAILABLE TIME
            </label>
            <div className="nc-toggle-group" data-testid="time-toggle">
              {TIMES.map(t => (
                <button
                  key={t}
                  className={`nc-toggle ${time === t ? 'active' : ''}`}
                  onClick={() => setTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Selection */}
          <div className="form-group">
            <label className="nc-label">
              <Radar size={14} />
              ACTIVITY
            </label>
            <div className="activity-grid" data-testid="activity-grid">
              {ACTIVITIES.map(act => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    className={`activity-btn ${activity === act.id ? 'active' : ''}`}
                    onClick={() => setActivity(act.id)}
                  >
                    <Icon className="activity-btn-icon" size={24} />
                    <span className="activity-btn-label">{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk Selection */}
          <div className="form-group">
            <label className="nc-label">
              <AlertTriangle size={14} />
              RISK TOLERANCE
            </label>
            <div className="nc-toggle-group" data-testid="risk-toggle">
              {RISKS.map(r => (
                <button
                  key={r}
                  className={`nc-toggle ${risk === r ? 'active' : ''}`}
                  onClick={() => setRisk(r)}
                  style={risk === r ? { background: r === 'HIGH' ? 'rgba(255,51,102,0.2)' : r === 'MEDIUM' ? 'rgba(255,204,0,0.2)' : 'rgba(0,255,136,0.2)' } : {}}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <button 
            className="nc-btn nc-btn-primary analyze-btn"
            onClick={handleAnalyze}
            disabled={isScanning}
            data-testid="analyze-btn"
          >
            <Radar size={18} />
            ANALYZE
          </button>
        </div>

        {/* Configuration Preview */}
        <div className="intel-preview">
          <div className="nc-card">
            <div className="page-label">// CONFIGURATION_PREVIEW</div>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">VESSEL</span>
                <span className="preview-value">{ship}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">SYSTEM</span>
                <span className="preview-value">{system}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">TIME</span>
                <span className="preview-value">{time === '1h' ? '60 minutes' : time === '2h' ? '120 minutes' : time === '30m' ? '30 minutes' : '15 minutes'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">ACTIVITY</span>
                <span className="preview-value text-cyan">{activity.toUpperCase()}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">RISK</span>
                <span className={`preview-value ${risk === 'HIGH' ? 'text-red' : risk === 'MEDIUM' ? 'text-orange' : 'text-green'}`}>
                  {risk}
                </span>
              </div>
            </div>
            <div className="preview-ship-graphic">
              <Rocket size={80} className="text-cyan" style={{ opacity: 0.3 }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .intel-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
        }
        
        .intel-config {
          background: var(--nc-bg-card);
          border: 1px solid var(--nc-border);
          padding: 24px;
        }
        
        .ship-info {
          font-family: var(--nc-font-mono);
          font-size: 12px;
          color: var(--nc-cyan);
          margin-top: 8px;
        }
        
        .analyze-btn {
          width: 100%;
          margin-top: 24px;
          padding: 16px;
          font-size: 14px;
        }
        
        .preview-grid {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .preview-label {
          font-family: var(--nc-font-mono);
          font-size: 11px;
          color: var(--nc-text-muted);
          letter-spacing: 1px;
        }
        
        .preview-value {
          font-family: var(--nc-font-display);
          font-size: 14px;
          color: var(--nc-text-primary);
        }
        
        .preview-ship-graphic {
          margin-top: 32px;
          display: flex;
          justify-content: center;
          padding: 24px;
        }
        
        @media (max-width: 1024px) {
          .intel-layout {
            grid-template-columns: 1fr;
          }
          
          .intel-preview {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
