export const BADGE_DEFINITIONS = {
  // Supporter Badges (manually assigned)
  SUPPORTER_BRONZE: {
    id: 'SUPPORTER_BRONZE',
    name: 'Bronze Supporter',
    icon: '🥉',
    description: 'Supporter of the project',
    category: 'SUPPORTER'
  },
  SUPPORTER_SILVER: {
    id: 'SUPPORTER_SILVER',
    name: 'Silver Supporter',
    icon: '🥈',
    description: 'Major contributor',
    category: 'SUPPORTER'
  },
  SUPPORTER_GOLD: {
    id: 'SUPPORTER_GOLD',
    name: 'Gold Supporter',
    icon: '🥇',
    description: 'Executive Producer',
    category: 'SUPPORTER'
  },
  
  // Role Specialist Badges (auto-awarded at 50)
  ACE_PILOT: {
    id: 'ACE_PILOT',
    name: 'Ace Pilot',
    icon: '✈️',
    description: 'Completed 50+ Combat contracts',
    category: 'SPECIALIST'
  },
  COMBAT_MEDIC: {
    id: 'COMBAT_MEDIC',
    name: 'Combat Medic',
    icon: '🏥',
    description: 'Completed 50+ Medical contracts',
    category: 'SPECIALIST'
  },
  HEAVY_HAULER: {
    id: 'HEAVY_HAULER',
    name: 'Heavy Hauler',
    icon: '📦',
    description: 'Completed 50+ Logistics contracts',
    category: 'SPECIALIST'
  },
  INDUSTRIALIST: {
    id: 'INDUSTRIALIST',
    name: 'Industrialist',
    icon: '⛏️',
    description: 'Completed 50+ Industrial contracts',
    category: 'SPECIALIST'
  },
  
  // Milestone Badges
  PIONEER: {
    id: 'PIONEER',
    name: 'Pioneer',
    icon: '🚀',
    description: 'Early adopter - joined during Alpha',
    category: 'MILESTONE'
  },
  FIVE_STAR: {
    id: 'FIVE_STAR',
    name: 'Five Star',
    icon: '⭐',
    description: 'Perfect 5.0 rating with 20+ contracts',
    category: 'MILESTONE'
  }
};

export const CONTRACT_CATEGORIES = [
  { id: 'COMBAT', label: '⚔️ Combat (Bounty, Escort, Security)', icon: '⚔️', shortLabel: 'Combat' },
  { id: 'MEDICAL', label: '🏥 Rescue (Medical, Evac)', icon: '🏥', shortLabel: 'Rescue' },
  { id: 'LOGISTICS', label: '📦 Cargo (Hauling, Transport)', icon: '📦', shortLabel: 'Cargo' },
  { id: 'INDUSTRIAL', label: '⛏️ Mining / Salvage', icon: '⛏️', shortLabel: 'Mining' },
  { id: 'LFG', label: '👥 LFG / Group Up (no payout)', icon: '👥', shortLabel: 'LFG' },
  { id: 'OTHER', label: '📋 Other (Recon, Misc)', icon: '📋', shortLabel: 'Other' }
];

export const CATEGORY_ICONS = {
  COMBAT: '⚔️',
  MEDICAL: '🏥',
  LOGISTICS: '📦',
  INDUSTRIAL: '⛏️',
  LFG: '👥',
  OTHER: '📋'
};

export const CATEGORY_LABELS = {
  COMBAT: 'Combat',
  MEDICAL: 'Rescue',
  LOGISTICS: 'Cargo',
  INDUSTRIAL: 'Mining',
  LFG: 'LFG',
  OTHER: 'Other'
};
