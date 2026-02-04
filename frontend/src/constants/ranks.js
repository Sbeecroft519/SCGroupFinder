export const RANKS = [
  { name: 'CIVILIAN', min: 0, color: '#888888' },
  { name: 'FREELANCER', min: 1, color: '#00ff88' },
  { name: 'ASSOCIATE', min: 10, color: '#00a8ff' },
  { name: 'OPERATIVE', min: 50, color: '#aa55ff' },
  { name: 'VETERAN', min: 100, color: '#ffd700' },
  { name: 'ELITE', min: 250, color: '#00f0ff' },
  { name: 'LEGEND', min: 500, color: '#ff4444' }
];

export function getUserRank(totalCompleted) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalCompleted >= RANKS[i].min) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}
