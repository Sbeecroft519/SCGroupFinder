import { useEffect, useState } from 'react';

/**
 * Hook that returns a live countdown string + status for a rescue bleedout target.
 * @param {string|null} expiresIso ISO datetime string (UTC).
 * @returns {{label:string, expired:boolean}}
 */
export function useBleedoutCountdown(expiresIso) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiresIso) return { label: '—:—', expired: false };
  const ms = new Date(expiresIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return { label: '—:—', expired: false };
  if (ms <= 0) return { label: 'Deceased', expired: true };
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  // touch tick to silence unused warning
  void tick;
  return { label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, expired: false };
}

/**
 * Tiny inline SVG heart-monitor graphic. When `flatline` is true, draws a flat line
 * with a slow blink. When false, draws a rolling pulse line.
 */
export function HeartMonitor({ flatline = false, color }) {
  const c = color || (flatline ? '#888' : '#ff4466');
  return (
    <svg
      width="44"
      height="16"
      viewBox="0 0 44 16"
      fill="none"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      {flatline ? (
        <line x1="0" y1="8" x2="44" y2="8" stroke={c} strokeWidth="1.5">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
        </line>
      ) : (
        <polyline
          points="0,8 6,8 9,3 12,13 15,8 22,8 24,5 26,11 28,8 44,8"
          stroke={c}
          strokeWidth="1.6"
          fill="none"
        >
          <animate attributeName="stroke-dasharray" values="0,80;80,0;0,80" dur="2.4s" repeatCount="indefinite" />
        </polyline>
      )}
    </svg>
  );
}
