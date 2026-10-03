// Sound effects for NavCom
const SOUNDS = {
  combat: new Audio('/sounds/combat_contract.mp3'),
  logistics: new Audio('/sounds/logistics_contract.mp3'),
  medical: new Audio('/sounds/medical_contract.mp3'),
  industrial: new Audio('/sounds/industrial_contract.mp3'),
  threat: new Audio('/sounds/threat_reported.mp3'),
  issue: new Audio('/sounds/server_issue.mp3'),
  stability: new Audio('/sounds/stability.mp3'),
  bid: new Audio('/sounds/mercenary_bid.mp3'),
  bidAccepted: new Audio('/sounds/bid_accepted.mp3'),
  login: new Audio('/sounds/login_success.mp3'),
};

// Set volumes (40% to avoid startling users)
Object.values(SOUNDS).forEach(s => s.volume = 0.4);

// Broadcast cues (new jobs / reports) arrive in bursts — one cue per burst is plenty.
// Personal cues (bids, accepts, login) always play; they're never spammy.
const BURST_WINDOW_MS = 5000;
const BURST_GATED = new Set(['combat', 'logistics', 'medical', 'industrial', 'threat', 'issue', 'stability']);
let lastBurstCueAt = 0;

/** True if a burst cue is allowed right now (and claims the window). */
export const claimBurstCue = () => {
  const now = Date.now();
  if (now - lastBurstCueAt < BURST_WINDOW_MS) return false;
  lastBurstCueAt = now;
  return true;
};

const playSound = (key) => {
  if (localStorage.getItem('navcom_sound_enabled') === 'false') return;
  if (BURST_GATED.has(key) && !claimBurstCue()) return;
  const sound = SOUNDS[key];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
};

// Contract category sounds
export const playContractSound = (category) => {
  const map = { 
    'COMBAT': 'combat', 
    'LOGISTICS': 'logistics', 
    'MEDICAL': 'medical', 
    'INDUSTRIAL': 'industrial', 
    'OTHER': 'logistics' 
  };
  playSound(map[category?.toUpperCase()] || 'logistics');
};

// Alert/threat sound
export const playThreatSound = () => playSound('threat');

// Server issue sound (mission bug, cargo issues)
export const playIssueSound = () => playSound('issue');

// Stability sound (lag, desync, 30K)
export const playStabilitySound = () => playSound('stability');

// Bid sounds
export const playBidSound = () => playSound('bid');
export const playBidAcceptedSound = () => playSound('bidAccepted');

// Login success sound
export const playLoginSound = () => playSound('login');

// Legacy exports (for backwards compatibility)
export const playNotification = () => playSound('logistics');
export const playAlert = () => playSound('threat');

export const isSoundEnabled = () => localStorage.getItem('navcom_sound_enabled') !== 'false';
