import { useState, useEffect } from 'react';
import { Map, Target, Rocket, Users, Shield, Star, ExternalLink, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

// Initialize Stripe with test key
const stripePromise = loadStripe('pk_test_51IabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

const MOCK_GOALS = [
  {
    id: '1',
    title: 'Mercenary Board',
    description: 'Full contract system with reputation, ratings, and payment tracking.',
    target_amount: 5000,
    current_amount: 3250,
    backers: 42,
    status: 'active'
  },
  {
    id: '2',
    title: 'Fleet Manager',
    description: 'Track your ships, loadouts, and crew assignments in one place.',
    target_amount: 3000,
    current_amount: 1800,
    backers: 28,
    status: 'active'
  },
  {
    id: '3',
    title: 'Org Integration',
    description: 'Connect NavCom with RSI Org tools for fleet coordination.',
    target_amount: 7500,
    current_amount: 2250,
    backers: 35,
    status: 'active'
  },
  {
    id: '4',
    title: 'Mobile Companion App',
    description: 'Access NavCom on your phone while away from the verse.',
    target_amount: 10000,
    current_amount: 1500,
    backers: 22,
    status: 'planned'
  }
];

export default function Roadmap() {
  const [goals, setGoals] = useState(MOCK_GOALS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/goals`);
      if (response.data && response.data.length > 0) {
        setGoals(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      // Keep mock data
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (goal) => {
    return Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="navcom-page" data-testid="roadmap-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-label">// SUPPLY_DROP</div>
        <h1 className="page-title">Feature Roadmap</h1>
        <p className="page-subtitle">Community-funded feature bounties</p>
      </div>

      {/* Supporter CTA */}
      <div className="nc-card" style={{ marginBottom: 32, background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, transparent 50%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Star size={24} className="text-gold" />
              <h3 className="font-display" style={{ fontSize: 18, color: 'var(--nc-text-primary)' }}>
                Join the Syndicate
              </h3>
            </div>
            <p className="text-muted" style={{ fontSize: 14, maxWidth: 500 }}>
              Supporters get a gold profile border, exclusive badge, early access to features, and voting power on the roadmap.
            </p>
          </div>
          <button className="nc-btn nc-btn-gold" data-testid="become-supporter-btn">
            <Shield size={16} />
            BECOME A SUPPORTER
          </button>
        </div>
      </div>

      {/* Feature Goals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {goals.map(goal => {
          const progress = getProgress(goal);
          const isComplete = progress >= 100;
          
          return (
            <div key={goal.id} className="goal-card" data-testid={`goal-${goal.id}`}>
              <div className="goal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Target size={20} className={isComplete ? 'text-green' : 'text-cyan'} />
                  <h3 className="goal-title">{goal.title}</h3>
                  {goal.status === 'planned' && (
                    <span className="font-mono text-muted" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--nc-bg-secondary)', border: '1px solid var(--nc-border)' }}>
                      PLANNED
                    </span>
                  )}
                </div>
                <span className={`goal-percentage ${isComplete ? 'text-green' : ''}`}>
                  {progress}%
                </span>
              </div>

              <p className="goal-description">{goal.description}</p>

              <div className="goal-progress-container">
                <div className="goal-progress-bg">
                  <div 
                    className="goal-progress-fill" 
                    style={{ 
                      width: `${progress}%`,
                      background: isComplete 
                        ? 'var(--nc-green)' 
                        : 'linear-gradient(90deg, var(--nc-cyan-dim), var(--nc-cyan))'
                    }} 
                  />
                </div>
              </div>

              <div className="goal-meta">
                <span>
                  <strong className="text-cyan">{formatCurrency(goal.current_amount)}</strong>
                  {' / '}
                  {formatCurrency(goal.target_amount)}
                </span>
                <span>
                  <Users size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  {goal.backers} backers
                </span>
              </div>

              {!isComplete && (
                <button 
                  className="nc-btn nc-btn-secondary" 
                  style={{ marginTop: 16 }}
                  data-testid={`fund-${goal.id}`}
                >
                  <Rocket size={14} />
                  FUND THIS FEATURE
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="nc-card" style={{ marginTop: 32, textAlign: 'center' }}>
        <h3 className="font-display" style={{ fontSize: 16, marginBottom: 8, color: 'var(--nc-text-primary)' }}>
          Have a Feature Idea?
        </h3>
        <p className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Join our Discord to suggest new features and vote on the roadmap
        </p>
        <button className="nc-btn nc-btn-secondary">
          <ExternalLink size={14} />
          JOIN DISCORD
        </button>
      </div>
    </div>
  );
}
