// Sound notification utilities
// Preload audio files
const notificationSound = typeof Audio !== 'undefined' ? new Audio('/sounds/UI_1.mp3') : null;
const alertSound = typeof Audio !== 'undefined' ? new Audio('/sounds/UI_2.mp3') : null;

// Set volume (0.0 to 1.0)
if (notificationSound) notificationSound.volume = 0.5;
if (alertSound) alertSound.volume = 0.6;

// Get user preference from localStorage
export const isSoundEnabled = () => {
  return localStorage.getItem('navcom_sound_enabled') !== 'false';
};

// Play functions
export const playNotification = () => {
  if (isSoundEnabled() && notificationSound) {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(() => {}); // Ignore autoplay errors
  }
};

export const playAlert = () => {
  if (isSoundEnabled() && alertSound) {
    alertSound.currentTime = 0;
    alertSound.play().catch(() => {}); // Ignore autoplay errors
  }
};

// Toggle sound preference
export const setSoundEnabled = (enabled) => {
  localStorage.setItem('navcom_sound_enabled', enabled.toString());
};

export const getSoundEnabled = () => {
  return localStorage.getItem('navcom_sound_enabled') !== 'false';
};
