import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle, Wifi, WifiOff, Skull, Bug, Package, Users, Zap, MapPin, TrendingUp, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import axios from 'axios';
import { API } from '../App';

const REPORT_COLORS = {
  lag: '#ffcc00',
  mission_bug: '#ff9933',
  cargo_issue: '#00f0ff',
  pirates: '#ff3366',
  pvp: '#ff6600',
  '30k': '#ff0066'
};

const REPORT_TYPES = [
  { id: 'lag', label: 'Lag / Desync', icon: Wifi, color: '#ffcc00', requiresLocation: true },
  { id: 'mission_bug', label: 'Mission Bug', icon: Bug, color: '#ff9933', requiresLocation: false, needsDetails: true },
  { id: 'cargo_issue', label: 'Cargo Issue', icon: Package, color: '#00f0ff', requiresLocation: true, needsDetails: true },
  { id: 'pirates', label: 'Pirates', icon: Skull, color: '#ff3366', requiresLocation: true, timeSensitive: true },
  { id: 'pvp', label: 'PvP / Griefing', icon: Users, color: '#ff6600', requiresLocation: true, timeSensitive: true },
  { id: '30k', label: '30k Disconnect', icon: Zap, color: '#ff0066', requiresLocation: false }
];

const RELIABILITY_METRICS = [
  { id: 'cargo', label: 'Cargo Reliability', description: 'Cargo hauling mission stability', value: 78 },
  { id: 'combat', label: 'Combat Reliability', description: 'Combat mission and bounty stability', value: 83 },
  { id: 'salvage', label: 'Salvage Reliability', description: 'Salvage operation stability', value: 73 },
  { id: 'fps', label: 'FPS Reliability', description: 'Ground combat and bunker mission stability', value: 78 }
];

const RISK_INDICATORS = [
  { id: 'congestion', label: 'Location Congestion', description: 'Current player density in popular areas', value: 70 },
  { id: 'pvp', label: 'PvP Risk', description: 'Current griefing and PvP activity level', value: 75 }
];

export default function Signals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serverStatus, setServerStatus] = useState('operational');
  const [rsiStatus, setRsiStatus] = useState({ status: 'operational', lastIncident: null });
  const [reports24h, setReports24h] = useState(0);
  const [trendRange, setTrendRange] = useState(7);
  const [trendView, setTrendView] = useState('timeline');
  const [trendData, setTrendData] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [reportStats, setReportStats] = useState({ byType: {}, byLocation: {} });
  const [loading, setLoading] = useState(true);
  const [myShard, setMyShard] = useState('');
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportSystem, setReportSystem] = useState('Stanton');
  const [reportLocation, setReportLocation] = useState('');
  const [reportShard, setReportShard] = useState('');
  const [reportConfirmed, setReportConfirmed] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [uexLocations, setUexLocations] = useState(null);

  // Fetch UEXcorp locations
  useEffect(() => {
    axios.get(`${API}/locations/categorized`)
      .then(res => setUexLocations(res.data))
      .catch(() => setUexLocations(null));
  }, []);

  // Get locations grouped by type for the current system
  const getLocationsForSystem = (systemName) => {
    if (!uexLocations?.all) return { outposts: [], other: [] };
    
    const systemPois = uexLocations.all.filter(p => 
      p.star_system_name?.toLowerCase() === systemName.toLowerCase()
    );
    
    const outposts = systemPois.filter(p => p.type === 'Outpost');
    const other = systemPois.filter(p => p.type !== 'Outpost');
    
    return { outposts, other };
  };

  // Handle ?action=report from QuickActions FAB
  useEffect(() => {
    if (searchParams.get('action') === 'report') {
      // Default to 'threat' report type when coming from FAB
      setShowReportModal('threat');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchSignalsData();
  }, [trendRange]); // Refetch when trend range changes

  const fetchSignalsData = async () => {
    setLoading(true);
    try {
      // Fetch server status
      const statusRes = await axios.get(`${API}/signals/status`);
      if (statusRes.data) {
        setServerStatus(statusRes.data.server_status || 'operational');
        setRsiStatus(statusRes.data.rsi_status || { status: 'operational', lastIncident: null });
        setReports24h(statusRes.data.reports_24h || 0);
      }

      // Fetch recent reports and calculate stats
      const reportsRes = await axios.get(`${API}/signals/reports?days=${trendRange}`);
      if (reportsRes.data) {
        const reports = reportsRes.data;
        setRecentReports(reports.slice(0, 10));
        
        // Calculate stats from actual reports
        const byType = {};
        const byLocation = {};
        const byDate = {};
        
        reports.forEach(report => {
          // Count by type
          byType[report.type] = (byType[report.type] || 0) + 1;
          
          // Count by location
          if (report.location) {
            byLocation[report.location] = (byLocation[report.location] || 0) + 1;
          }
          
          // Count by date
          const dateKey = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!byDate[dateKey]) {
            byDate[dateKey] = { reports: 0, pirates: 0 };
          }
          byDate[dateKey].reports++;
          if (report.type === 'pirates' || report.type === 'pvp') {
            byDate[dateKey].pirates++;
          }
        });
        
        setReportStats({ byType, byLocation });
        
        // Build trend data from actual reports
        const trend = [];
        for (let i = trendRange; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          trend.push({
            date: dateKey,
            reports: byDate[dateKey]?.reports || 0,
            pirates: byDate[dateKey]?.pirates || 0
          });
        }
        setTrendData(trend);
      }
    } catch (error) {
      console.error('Failed to fetch signals data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (type) => {
    const reportType = REPORT_TYPES.find(r => r.id === type);
    setShowReportModal(reportType);
    setReportLocation('');
    setReportShard(myShard);
    setReportConfirmed(false);
    setReportDetails('');
  };

  const submitReport = async () => {
    if (!showReportModal) return;
    if (showReportModal.requiresLocation && !reportLocation) return;
    if (showReportModal.requiresLocation && !reportConfirmed) return;
    
    try {
      await axios.post(`${API}/signals/report`, {
        type: showReportModal.id,
        system: reportSystem,
        location: reportLocation || null,
        shard: reportShard || null,
        details: reportDetails || null,
        timestamp: new Date().toISOString()
      });
      setShowReportModal(null);
      setReportLocation('');
      setReportConfirmed(false);
      setReportDetails('');
      fetchSignalsData();
    } catch (error) {
      console.error('Failed to submit report:', error);
    }
  };

  // Calculate dynamic reliability based on ACTUAL reports and server status
  const calculateReliability = () => {
    const baseReliability = serverStatus === 'operational' ? 90 : serverStatus === 'degraded' ? 65 : 35;
    
    // Penalties based on actual report types
    const lagReports = (reportStats.byType?.lag || 0) + (reportStats.byType?.['30k'] || 0);
    const bugReports = (reportStats.byType?.mission_bug || 0) + (reportStats.byType?.cargo_issue || 0);
    const pvpReports = (reportStats.byType?.pirates || 0) + (reportStats.byType?.pvp || 0);
    
    // Each report type affects different activities
    const cargoHits = lagReports * 3 + bugReports * 4 + pvpReports * 2;
    const combatHits = lagReports * 2 + pvpReports * 1; // PvP doesn't hurt combat reliability
    const salvageHits = lagReports * 3 + bugReports * 2;
    const fpsHits = lagReports * 4 + bugReports * 1;
    
    return {
      cargo: Math.max(15, Math.min(95, baseReliability - cargoHits)),
      combat: Math.max(15, Math.min(95, baseReliability - combatHits)),
      salvage: Math.max(15, Math.min(95, baseReliability - salvageHits)),
      fps: Math.max(15, Math.min(95, baseReliability - fpsHits))
    };
  };

  const reliability = calculateReliability();

  // Generate breakdown data for pie chart from ACTUAL reports
  const getBreakdownData = () => {
    const { byType } = reportStats;
    if (!byType || Object.keys(byType).length === 0) {
      return [{ name: 'No Reports', value: 1, color: '#4a6070' }];
    }
    return Object.entries(byType).map(([type, count]) => ({
      name: REPORT_TYPES.find(r => r.id === type)?.label || type,
      value: count,
      color: REPORT_COLORS[type] || '#4a6070'
    }));
  };

  // Generate location data for bar chart from ACTUAL reports
  const getLocationData = () => {
    const { byLocation } = reportStats;
    if (!byLocation || Object.keys(byLocation).length === 0) {
      return [{ location: 'No Data', reports: 0 }];
    }
    return Object.entries(byLocation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([location, reports]) => ({ location, reports }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'green';
      case 'degraded': return 'orange';
      case 'outage': return 'red';
      default: return 'green';
    }
  };

  // Calculate stats from actual trend data
  const totalReports = trendData.reduce((sum, d) => sum + d.reports, 0);
  const avgReports = trendData.length > 0 ? (totalReports / trendData.length).toFixed(1) : '0.0';
  const peakReports = trendData.length > 0 ? Math.max(...trendData.map(d => d.reports), 0) : 0;
  const uniqueLocations = Object.keys(reportStats.byLocation || {}).length;

  return (
    <div className="navcom-page" data-testid="signals-page">
      {/* Report Location Modal */}
      {showReportModal && (
        <div className="mission-modal-overlay" onClick={() => setShowReportModal(null)}>
          <div className="mission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="mission-modal-header">
              <div>
                <div className="mission-type-badge">// SUBMIT_REPORT</div>
                <h2 className="mission-title" style={{ color: showReportModal.color }}>
                  {showReportModal.label}
                </h2>
              </div>
              <button className="mission-modal-close" onClick={() => setShowReportModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mission-modal-content">
              {/* Shard Input */}
              <div className="form-group">
                <label className="nc-label">
                  SERVER SHARD (Required for accurate reporting)
                </label>
                <input
                  type="text"
                  className="nc-input"
                  placeholder="Enter your shard number (e.g., 360)"
                  value={reportShard}
                  onChange={e => setReportShard(e.target.value)}
                />
                <span className="font-mono text-muted" style={{ fontSize: 10, marginTop: 4, display: 'block' }}>
                  Leave blank for global report (visible to all shards)
                </span>
              </div>

              {showReportModal.requiresLocation && (
                <>
                  <div className="form-group">
                    <label className="nc-label">
                      <MapPin size={14} />
                      SYSTEM
                    </label>
                    <div className="nc-toggle-group">
                      {['Stanton', 'Pyro', 'Nyx'].map(sys => (
                        <button
                          key={sys}
                          className={`nc-toggle ${reportSystem === sys ? 'active' : ''}`}
                          onClick={() => { setReportSystem(sys); setReportLocation(''); }}
                        >
                          {sys}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="nc-label">LOCATION</label>
                    <select 
                      className="nc-input"
                      value={reportLocation}
                      onChange={e => setReportLocation(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px' }}
                    >
                      <option value="">Select Location...</option>
                      {uexLocations?.all ? (
                        <>
                          <optgroup label={`${reportSystem} Locations`}>
                            {uexLocations.all
                              .filter(p => p.star_system_name?.toLowerCase() === reportSystem.toLowerCase())
                              .slice(0, 50)
                              .map(poi => (
                                <option key={poi.id} value={poi.name}>
                                  {poi.name}
                                </option>
                              ))
                            }
                          </optgroup>
                          <optgroup label="General">
                            <option value="Space (General)">Space (General)</option>
                            <option value="Jump Point">Jump Point</option>
                          </optgroup>
                        </>
                      ) : (
                        <option disabled>Loading locations...</option>
                      )}
                    </select>
                  </div>

                  {/* Confirmation Checkbox */}
                  <label className="confirm-checkbox">
                    <input 
                      type="checkbox" 
                      checked={reportConfirmed} 
                      onChange={e => setReportConfirmed(e.target.checked)}
                    />
                    <span>I confirm this report is accurate and happened within the last 15 minutes</span>
                  </label>
                </>
              )}

              {/* Details field for bugs/cargo issues */}
              {showReportModal.needsDetails && (
                <div className="form-group">
                  <label className="nc-label">DETAILS (Optional)</label>
                  <input
                    type="text"
                    className="nc-input"
                    placeholder={showReportModal.id === 'mission_bug' ? 'e.g., Bunker mission NPC stuck' : 'e.g., New Babbage cargo elevator'}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                  />
                </div>
              )}

              <button 
                className="nc-btn nc-btn-primary" 
                style={{ width: '100%', marginTop: 16, background: showReportModal.color, borderColor: showReportModal.color }}
                onClick={submitReport}
                disabled={showReportModal.requiresLocation && (!reportLocation || !reportConfirmed)}
              >
                SUBMIT REPORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-label">// SERVER_HEALTH</div>
          <h1 className="page-title">Server Health & Reporting</h1>
          <p className="page-subtitle">Real-time server stability and crowd-sourced reports</p>
        </div>
        <button 
          className="nc-btn nc-btn-secondary" 
          onClick={fetchSignalsData}
          disabled={loading}
          data-testid="refresh-btn"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Server Status Card */}
      <div className="nc-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className={`nc-status ${getStatusColor(serverStatus)}`}>
              <span className="nc-status-dot" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--nc-font-display)', fontSize: 18, color: 'var(--nc-text-primary)', marginBottom: 4 }}>
                Server Status
              </h3>
              <span className={`text-${getStatusColor(serverStatus)}`} style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>
                {serverStatus === 'operational' ? 'GREEN' : serverStatus === 'degraded' ? 'YELLOW' : 'RED'}
              </span>
            </div>
          </div>
          <div className="nc-stat-card" style={{ padding: '12px 24px' }}>
            <div className="nc-stat-value" style={{ fontSize: 28 }}>{reports24h}</div>
            <div className="nc-stat-label">Reports 24h</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--nc-border)', marginTop: 20, paddingTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {rsiStatus.status === 'operational' ? (
              <CheckCircle size={16} className="text-green" />
            ) : (
              <AlertTriangle size={16} className="text-orange" />
            )}
            <span className="font-mono text-muted" style={{ fontSize: 14, letterSpacing: 1 }}>RSI Official:</span>
            <span className={`text-${getStatusColor(rsiStatus.status)}`} style={{ fontFamily: 'var(--nc-font-display)', fontSize: 14, letterSpacing: 2 }}>
              {rsiStatus.status?.toUpperCase() || 'OPERATIONAL'}
            </span>
          </div>
          {rsiStatus.lastIncident && (
            <div style={{ background: 'var(--nc-bg-secondary)', padding: 12, border: '1px solid var(--nc-border)' }}>
              <div style={{ fontFamily: 'var(--nc-font-body)', fontSize: 16, color: 'var(--nc-text-secondary)' }}>
                {rsiStatus.lastIncident.title}
              </div>
              <div className="font-mono text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {rsiStatus.lastIncident.date}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer: Last Updated & Game Version */}
        <div style={{ borderTop: '1px solid var(--nc-border)', marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-mono text-muted" style={{ fontSize: 12 }}>
            Last Updated: {new Date().toUTCString().slice(0, -4)} UTC
          </span>
          <span className="font-mono text-muted" style={{ fontSize: 12 }}>
            Game Version: Star Citizen Alpha {rsiStatus.gameVersion || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Activity Reliability */}
      <div style={{ marginBottom: 28 }}>
        <h3 className="font-mono text-muted uppercase tracking-wide" style={{ fontSize: 18, marginBottom: 20 }}>
          ACTIVITY RELIABILITY (Based on reports & server health)
        </h3>
        <div className="grid-4">
          {[
            { id: 'cargo', label: 'Cargo Reliability', value: reliability.cargo },
            { id: 'combat', label: 'Combat Reliability', value: reliability.combat },
            { id: 'salvage', label: 'Salvage Reliability', value: reliability.salvage },
            { id: 'fps', label: 'FPS Reliability', value: reliability.fps }
          ].map(metric => (
            <div key={metric.id} className="nc-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={16} className={metric.value >= 70 ? 'text-green' : metric.value >= 40 ? 'text-orange' : 'text-red'} />
                <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-text-primary)' }}>
                  {metric.label}
                </span>
              </div>
              <div className="nc-progress" style={{ marginBottom: 12 }}>
                <div 
                  className={`nc-progress-bar ${metric.value >= 70 ? 'green' : metric.value >= 40 ? 'gold' : 'red'}`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono text-muted" style={{ fontSize: 14 }}>Current stability</span>
                <span className={metric.value >= 70 ? 'text-green' : metric.value >= 40 ? 'text-orange' : 'text-red'} style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16 }}>
                  {metric.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Indicators */}
      <div style={{ marginBottom: 28 }}>
        <h3 className="font-mono text-muted uppercase tracking-wide" style={{ fontSize: 18, marginBottom: 20 }}>
          RISK INDICATORS
        </h3>
        <div className="grid-2">
          {RISK_INDICATORS.map(indicator => (
            <div key={indicator.id} className="nc-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={16} className="text-green" />
                <span style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16, color: 'var(--nc-text-primary)' }}>
                  {indicator.label}
                </span>
              </div>
              <div className="nc-progress" style={{ marginBottom: 12 }}>
                <div 
                  className={`nc-progress-bar ${indicator.value > 70 ? 'gold' : 'green'}`}
                  style={{ width: `${indicator.value}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono text-muted" style={{ fontSize: 14 }}>{indicator.description}</span>
                <span className={indicator.value > 70 ? 'text-gold' : 'text-green'} style={{ fontFamily: 'var(--nc-font-display)', fontSize: 16 }}>
                  {indicator.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Section */}
      <div style={{ marginBottom: 28 }}>
        <h3 className="font-mono text-muted uppercase tracking-wide" style={{ fontSize: 18, marginBottom: 12 }}>
          REPORT AN ISSUE
        </h3>
        <p className="text-muted" style={{ fontSize: 16, marginBottom: 20 }}>
          Help improve intelligence with one-tap reports
        </p>
        <div className="report-grid" data-testid="report-grid">
          {REPORT_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                className="report-btn"
                onClick={() => handleReport(type.id)}
                data-testid={`report-${type.id}`}
                style={{ '--hover-color': type.color }}
              >
                <Icon className="report-btn-icon" size={24} />
                <span className="report-btn-label">{type.label}</span>
                {type.timeSensitive && <span className="report-badge-live">LIVE</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident Trends */}
      <div className="nc-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} className="text-cyan" />
            <span className="font-display uppercase" style={{ fontSize: 14, letterSpacing: 1 }}>
              INCIDENT TRENDS
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div className="nc-toggle-group" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--nc-text-muted)', marginRight: 8, fontFamily: 'var(--nc-font-mono)', letterSpacing: 1 }}>Days:</span>
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  className={`nc-toggle ${trendRange === d ? 'active' : ''}`}
                  onClick={() => setTrendRange(d)}
                  style={{ padding: '10px 14px', fontSize: 14 }}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="nc-toggle-group">
              {['Timeline', 'Breakdown', 'Locations'].map(v => (
                <button
                  key={v}
                  className={`nc-toggle ${trendView === v.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setTrendView(v.toLowerCase())}
                  style={{ padding: '10px 14px', fontSize: 14 }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Summary - scrollable on mobile */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 24 }}>
          <div className="grid-4" style={{ minWidth: 500 }}>
            <div className="nc-stat-card">
              <div className="nc-stat-value">{totalReports}</div>
              <div className="nc-stat-label">TOTAL REPORTS</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-value">{avgReports}</div>
              <div className="nc-stat-label">AVG/DAY</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-value">{peakReports}</div>
              <div className="nc-stat-label">SYSTEMS</div>
            </div>
            <div className="nc-stat-card">
              <div className="nc-stat-value">{uniqueLocations}</div>
              <div className="nc-stat-label">HOTSPOTS</div>
            </div>
          </div>
        </div>

        {/* Chart - conditional rendering based on view */}
        <div style={{ height: 300 }}>
          {trendView === 'timeline' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPirates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff3366" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff3366" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  stroke="#4a6070" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1a3344' }}
                />
                <YAxis 
                  stroke="#4a6070" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1a3344' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#0d1a26', 
                    border: '1px solid #1a3344',
                    borderRadius: 0,
                    fontFamily: 'Share Tech Mono'
                  }}
                  labelStyle={{ color: '#00f0ff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="reports" 
                  stroke="#00f0ff" 
                  fillOpacity={1}
                  fill="url(#colorReports)"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="pirates" 
                  stroke="#ff3366" 
                  fillOpacity={1}
                  fill="url(#colorPirates)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {trendView === 'breakdown' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
              <div style={{ width: 300, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getBreakdownData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {getBreakdownData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: '#0d1a26', 
                        border: '1px solid #1a3344',
                        borderRadius: 0,
                        fontFamily: 'Share Tech Mono'
                      }}
                      formatter={(value, name) => [`${value} reports`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {getBreakdownData().map((entry, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, background: entry.color }} />
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--nc-text-secondary)' }}>
                      {entry.name}
                    </span>
                    <span className="font-mono" style={{ fontSize: 12, color: entry.color, marginLeft: 'auto' }}>
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trendView === 'locations' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLocationData()} layout="vertical">
                <XAxis 
                  type="number" 
                  stroke="#4a6070" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1a3344' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="location" 
                  stroke="#4a6070" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#1a3344' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#0d1a26', 
                    border: '1px solid #1a3344',
                    borderRadius: 0,
                    fontFamily: 'Share Tech Mono'
                  }}
                  formatter={(value) => [`${value} reports`, 'Reports']}
                  labelStyle={{ color: '#00f0ff' }}
                />
                <Bar 
                  dataKey="reports" 
                  fill="#00f0ff"
                  radius={[0, 4, 4, 0]}
                >
                  {getLocationData().map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#ff3366' : index === 1 ? '#ff6600' : '#00f0ff'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
