export function MultiToggle({
  options,
  selected,
  onChange,
  testidPrefix
}) {
  const set = new Set(selected || []);
  return <div style={{
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6
  }}>
      {options.map(o => {
      const active = set.has(o);
      return <button key={o} type="button" onClick={() => {
        const next = new Set(set);
        if (active) next.delete(o);else next.add(o);
        onChange([...next]);
      }} data-testid={`${testidPrefix}-${o}`} style={{
        padding: '5px 10px',
        fontSize: 11,
        letterSpacing: 1,
        fontFamily: 'var(--nc-font-mono)',
        background: active ? 'var(--nc-cyan)' : 'transparent',
        color: active ? 'var(--nc-bg-primary)' : 'var(--nc-text-secondary)',
        border: `1px solid ${active ? 'var(--nc-cyan)' : 'var(--nc-border)'}`,
        cursor: 'pointer'
      }}>
            {o}
          </button>;
    })}
    </div>;
}
