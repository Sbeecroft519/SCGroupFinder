import { useState } from 'react';

// Small inline badge shown next to a poster's handle when they signed up via Discord.
// If `discordUsername` is provided (i.e. the user set discord_public = true),
// clicking the badge copies the username to the clipboard so others can add them.
export default function DiscordBadge({ discordLinked, discordUsername, size = 12 }) {
  const [copied, setCopied] = useState(false);
  if (!discordLinked) return null;

  const isPublic = !!discordUsername;
  const label = isPublic
    ? `Discord: ${discordUsername} (click to copy)`
    : 'This pilot signed up with Discord';

  const handleClick = async (e) => {
    if (!isPublic) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(discordUsername);
      } else {
        const ta = document.createElement('textarea');
        ta.value = discordUsername;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_err) {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <span
      onClick={handleClick}
      title={copied ? 'Copied!' : label}
      data-testid="discord-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginLeft: 4,
        padding: isPublic ? '2px 6px' : '2px',
        background: isPublic ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
        border: isPublic ? '1px solid #5865F2' : 'none',
        color: '#5865F2',
        fontFamily: 'var(--nc-font-mono)',
        fontSize: size - 1,
        cursor: isPublic ? 'pointer' : 'default',
        verticalAlign: 'middle',
        transition: 'background 120ms',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.606-.719 1.396-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.171 4.369a.07.07 0 0 0-.032.027C1.533 9.045.612 13.579 1.06 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.027 14.09 14.09 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.673-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/>
      </svg>
      {isPublic && (
        <span data-testid="discord-badge-username" style={{ fontSize: 10, letterSpacing: 0.5 }}>
          {copied ? 'COPIED' : discordUsername}
        </span>
      )}
    </span>
  );
}
