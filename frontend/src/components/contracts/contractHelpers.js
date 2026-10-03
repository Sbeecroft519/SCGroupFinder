import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/badges';
export const MAJOR_LOCATIONS = {
  Stanton: ['Area18', 'Baijini Point', 'Orison', 'Seraphim Station', 'Grim HEX', 'Lorville', 'Everus Harbor', 'New Babbage', 'Port Tressler'],
  Pyro: ['Checkmate Station', 'Ruin Station', 'Pyro Gateway'],
  Nyx: ['Levski', 'Delamar', 'Nyx Gateway']
};
export const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'];
export const generateTitle = contract => {
  const cat = CATEGORY_LABELS[contract.category] || 'Contract';
  return contract.title || `${cat} Contract`;
};
export const _collectParticipants = contract => {
  if (!contract) return [];
  const seen = new Set();
  const out = [];
  (contract.accepted_participants || []).forEach(p => {
    if (p?.id && !seen.has(p.id) && p.id !== contract.poster_id) {
      seen.add(p.id);
      out.push({
        id: p.id,
        handle: p.rsi_handle || p.handle,
        slot: null
      });
    }
  });
  (contract.manifest || []).forEach(slot => {
    const ab = slot.accepted_by;
    if (ab?.id && !seen.has(ab.id) && ab.id !== contract.poster_id) {
      seen.add(ab.id);
      out.push({
        id: ab.id,
        handle: ab.rsi_handle || ab.handle,
        slot: slot.role || slot.slot_name || null
      });
    }
  });
  return out;
};
export const getTimeAgo = dateStr => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
export const getCategoryDisplay = categoryId => {
  const icon = CATEGORY_ICONS[categoryId] || '📋';
  const label = CATEGORY_LABELS[categoryId] || 'Other';
  return {
    icon,
    label
  };
};
export const getContractPayout = contract => {
  if (contract.is_multi_crew && contract.manifest) {
    return contract.manifest.reduce((sum, slot) => sum + slot.payout, 0);
  }
  return contract.payment_amount || contract.payout || 0;
};
export const getCrewStatus = contract => {
  if (!contract.is_multi_crew || !contract.manifest) return null;
  const filled = contract.manifest.filter(s => s.status === 'FILLED').length;
  return `${filled}/${contract.manifest.length}`;
};
export const getCrewSeatSummary = contract => {
  if (!contract.is_multi_crew || !contract.manifest) return null;
  const total = contract.manifest.length;
  const filled = contract.manifest.filter(s => s.status === 'FILLED').length;
  const openRoles = [...new Set(contract.manifest.filter(s => s.status !== 'FILLED').map(s => s.role).filter(Boolean))];
  return {
    filled,
    total,
    openRoles
  };
};
export const getTimeRemaining = contract => {
  // Don't show timer for active/in_progress/completed/cancelled contracts.
  if (['active', 'in_progress', 'pending_completion', 'completed', 'cancelled'].includes(contract.status)) {
    return null;
  }
  if (!contract.expires_at) return null;
  const now = new Date();
  const expires = new Date(contract.expires_at);
  const diffMs = expires - now;
  if (diffMs <= 0) return {
    text: 'Expired',
    color: '#ff4d4d',
    isDistress: false
  };
  const fmt = (ms, prefix = '') => {
    const totalMins = Math.floor(ms / 60000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor(totalMins % 1440 / 60);
    const mins = totalMins % 60;
    let body;
    if (days > 0) body = `${days}d ${hours}h`;else if (hours > 0) body = `${hours}h ${mins}m`;else body = `${mins}m`;
    return `${prefix}${body}`;
  };

  // Future Time posts: anchor the timer to the scheduled start, not the listing-window expiry.
  if (contract.timing_type === 'future' && contract.scheduled_start_at) {
    const start = new Date(contract.scheduled_start_at);
    const untilStart = start - now;
    if (untilStart > 0) {
      const startsSoon = untilStart <= 60 * 60 * 1000; // ≤ 1h
      return {
        text: fmt(untilStart, 'Starts in '),
        color: startsSoon ? '#ff9900' : 'rgba(255,255,255,0.55)',
        isDistress: false
      };
    }
    // Event has started — show time left in the active window.
    return {
      text: fmt(diffMs, 'Live · ') + ' left',
      color: 'var(--nc-cyan)',
      isDistress: false
    };
  }

  // Looking-Now posts: existing behaviour, with day rollover so we never print 5000+ hours.
  const totalMins = Math.floor(diffMs / 60000);
  const isDistress = contract.duration_minutes === 30;
  let color = 'rgba(255,255,255,0.5)';
  if (isDistress) color = '#ff4d4d';else if (totalMins < 10) color = '#ff9900';
  return {
    text: fmt(diffMs),
    color,
    isDistress
  };
};
