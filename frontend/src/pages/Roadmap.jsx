import { useState, useEffect } from 'react';
import { Map, Target, Star, Shield, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth, API } from '../App';

// Default roadmap items (fallback if no DB items)
const DEFAULT_ROADMAP_ITEMS = [
  {
    id: '1',
    title: 'SC Group Finder Refocus',
    description: 'NavCom has been refocused into SC Group Finder: a Star Citizen player-to-player Job Board and Group Finder built around contracts, applicants, reputation, and trusted coordination.',
    status: 'STABLE',
  },
  {
    id: '2',
    title: 'Job & Group Board',
    description: 'Primary board for paid jobs, group posts, applications, accept/decline flow, and reputation-based player selection.',
    status: 'STABLE',
  },
  {
    id: '3',
    title: 'LFG / Group Up Posts',
    description: 'LFG now lives inside the Job Board as a no-payout post type for casual crews, group sessions, and non-contract gameplay.',
    status: 'STABLE',
  },
  {
    id: '4',
    title: 'Demo Mode',
    description: 'Visitors can try the app instantly without creating an account or completing RSI verification.',
    status: 'STABLE',
  },
  {
    id: '5',
    title: 'Looking Now / Future Time Scheduling',
    description: 'Posts can be created for immediate sessions with listing duration or scheduled for a future day, time, and timezone.',
    status: 'STABLE',
  },
  {
    id: '6',
    title: 'Simplified Meeting Locations',
    description: 'Job posts now use a cleaner Meeting Location flow with Disclosed on Acceptance, Stanton, Pyro, and Nyx, plus major hubs only.',
    status: 'STABLE',
  },
  {
    id: '7',
    title: 'Medical / Rescue Privacy Tools',
    description: 'Rescue posts now support public system-only visibility, bleed-out countdowns, injury and risk flags, and private rescue details revealed only to accepted rescuers.',
    status: 'STABLE',
  },
  {
    id: '8',
    title: 'Region-Based Signals',
    description: 'Signals and alerts now use player-facing Server Region language while keeping backend compatibility.',
    status: 'STABLE',
  },
  {
    id: '9',
    title: 'Multi-Crew Manifests',
    description: 'Post multi-crew jobs with defined roles, crew slots, applicants, and payout tracking.',
    status: 'STABLE',
  },
  {
    id: '10',
    title: 'Two-Way Reputation',
    description: 'Players can build trust through ratings, reviews, completed jobs, and profile reputation.',
    status: 'STABLE',
  },
  {
    id: '11',
    title: 'Optional Intel Tool',
    description: 'A session-planner Intel module (paused while Job Board polish ships). Suggests a fun mission profile based on your ship and free time — not a min-max calculator.',
    status: 'IN_PROGRESS',
  },
  {
    id: '12',
    title: 'Organization Dispatch Tools',
    description: 'Coming soon: organization profiles, specialties, Discord contract alerts, and rescue-safe dispatch tools for medical, security, cargo, and industrial orgs.',
    status: 'COMING_SOON',
  },
  {
    id: '13',
    title: 'Advanced Org Dispatch',
    description: 'Future tools may include multiple Discord channels, advanced alert filters, on-call status, org reputation, and respond-as-organization workflows.',
    status: 'BACKLOG',
  },
];

// Status color helper
const getStatusColor = (status) => {
  switch (status) {
    case 'STABLE':
    case 'COMPLETE':
      return { bg: 'rgba(0, 255, 136, 0.2)', text: '#00ff88' };
    case 'IN_PROGRESS':
      return { bg: 'rgba(0, 240, 255, 0.2)', text: '#00f0ff' };
    case 'COMING_SOON':
      return { bg: 'rgba(170, 0, 255, 0.2)', text: '#c977ff' };
    case 'PLANNED':
      return { bg: 'rgba(255, 215, 0, 0.2)', text: '#ffd700' };
    case 'BACKLOG':
    default:
      return { bg: 'rgba(136, 136, 136, 0.2)', text: '#888' };
  }
};

export default function Roadmap() {
  const { user } = useAuth();
  const [roadmapItems, setRoadmapItems] = useState(DEFAULT_ROADMAP_ITEMS);

  useEffect(() => {
    // Fetch roadmap items from API
    axios.get(`${API}/roadmap`)
      .then(res => {
        if (res.data && res.data.length > 0) {
          setRoadmapItems(res.data);
        }
      })
      .catch(() => {
        // Use default items on error
      });
  }, []);

  return (
    <div className="navcom-page" data-testid="roadmap-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-label">// SUPPLY_DROP</div>
        <h1 className="page-title">Feature Roadmap</h1>
        <p className="page-subtitle">SC Group Finder development status and upcoming features</p>
      </div>

      {/* Support CTA */}
      <div className="nc-card" style={{ marginBottom: 32, background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, transparent 50%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Star size={24} className="text-gold" />
              <h3 className="font-display" style={{ fontSize: 18, color: 'var(--nc-text-primary)' }}>
                Support the Project
              </h3>
            </div>
            <p className="text-muted" style={{ fontSize: 14, maxWidth: 500 }}>
              Help keep SC Group Finder running and support future development. Every contribution helps!
            </p>
          </div>
          <a 
            href="https://www.paypal.com/ncp/payment/LKB6D77Y94TVQ" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nc-btn nc-btn-gold" 
            style={{ textDecoration: 'none' }}
            data-testid="donate-btn"
          >
            <Shield size={16} />
            SUPPORT THE PROJECT
          </a>
        </div>
      </div>

      {/* Feature Roadmap Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {roadmapItems.map(item => {
          const statusColor = getStatusColor(item.status);
          
          return (
            <div 
              key={item.id} 
              className="nc-card" 
              data-testid={`roadmap-${item.id}`}
              style={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {item.status === 'STABLE' ? (
                      <CheckCircle size={18} style={{ color: '#00ff88' }} />
                    ) : (
                      <Target size={18} style={{ color: statusColor.text }} />
                    )}
                    <h3 style={{ 
                      color: '#fff', 
                      fontSize: 16, 
                      fontFamily: 'var(--nc-font-display)',
                      margin: 0
                    }}>
                      {item.title}
                    </h3>
                  </div>
                  <p style={{ 
                    color: '#aaa', 
                    fontSize: 14, 
                    margin: 0,
                    fontFamily: 'var(--nc-font-body)',
                    lineHeight: 1.5
                  }}>
                    {item.description}
                  </p>
                </div>
                <span style={{
                  padding: '4px 12px',
                  fontSize: 11,
                  letterSpacing: '1px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--nc-font-mono)',
                  background: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.text}`,
                  flexShrink: 0
                }}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
