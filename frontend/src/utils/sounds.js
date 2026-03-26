// Sound effects for NavCom
const SOUNDS = {
  combat: new Audio('/sounds/combat_contract.mp3'),
  logistics: new Audio('/sounds/logistics_contract.mp3'),
  medical: new Audio('/sounds/medical_contract.mp3'),
  threat: new Audio('/sounds/threat_reported.mp3'),
  login: new Audio('/sounds/login_success.mp3'),
};

// Set volumes
Object.values(SOUNDS).forEach(s => s.volume = 0.5);

const playSound = (key) => {
  if (localStorage.getItem('navcom_sound_enabled') === 'false') return;
  const sound = SOUNDS[key];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
};

// Contract category sounds
export const playContractSound = (category) => {
  const map = { 'COMBAT': 'combat', 'Combat': 'combat', 'LOGISTICS': 'logistics', 'Logistics': 'logistics', 'MEDICAL': 'medical', 'Medical': 'medical', 'INDUSTRIAL': 'logistics', 'OTHER': 'logistics' };
  playSound(map[category] || 'logistics');
};

// Alert/threat sound
export const playThreatSound = () => playSound('threat');

// Login success sound
export const playLoginSound = () => playSound('login');

// Legacy exports (for backwards compatibility)
export const playNotification = () => playSound('logistics');
export const playAlert = () => playSound('threat');

export const isSoundEnabled = () => localStorage.getItem('navcom_sound_enabled') !== 'false';
