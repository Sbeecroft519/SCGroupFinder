import { useState, useEffect } from 'react';
import { Map, Target, Rocket, Users, Shield, Star, ExternalLink, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API, useAuth } from '../App';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [goals, setGoals] = useState(MOCK_GOALS);
  const [loading, setLoading] = useState(false);
  const [contributingGoalId, setContributingGoalId] = useState(null);
  const [searchParams] = useSearchParams();

  // Check for success redirect from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Thank you for your contribution!', {
        description: 'Your support helps build new features.',
        duration: 5000,
      });
      // Refresh goals to show updated amounts
      fetchGoals();
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Contribution canceled');
    }
  }, [searchParams]);

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

  const handleContribute = async (goalId) => {
    if (!user) {
      toast.error('Please log in to contribute');
      return;
    }
    
    setContributingGoalId(goalId);
    try {
      const response = await axios.post(`${API}/stripe/create-checkout`, {
        goal_id: goalId,
        amount: 10 // Default $10 contribution
      });
      
      if (response.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else if (response.data.demo) {
        // Demo mode - no real Stripe
        toast.success('Demo: Contribution would be processed here');
        fetchGoals();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout');
    } finally {
      setContributingGoalId(null);
    }
  };

  return (
    <div className="navcom-page" data-testid="roadmap-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-label">// SUPPLY_DROP</div>
        <h1 className="page-title">Feature Roadmap</h1>
        <p className="page-subtitle">Community-funded feature bounties</p>
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
              Help keep NavCom running and support future development. Every contribution helps!
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
                  onClick={() => handleContribute(goal.id)}
                  disabled={contributingGoalId === goal.id}
                  data-testid={`fund-${goal.id}`}
                >
                  {contributingGoalId === goal.id ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <Rocket size={14} />
                      FUND THIS FEATURE
                    </>
                  )}
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
