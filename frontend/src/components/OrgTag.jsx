import { Link } from 'react-router-dom';

const baseStyle = {
  fontFamily: 'var(--nc-font-mono)',
  fontSize: 10,
  letterSpacing: 1,
  padding: '1px 5px',
  color: 'var(--nc-text-muted)',
  background: 'rgba(0,240,255,0.06)',
  border: '1px solid rgba(0,240,255,0.22)',
  textDecoration: 'none',
  lineHeight: 1.6,
  whiteSpace: 'nowrap',
};

/** Quiet org affiliation badge — never louder than the handle it sits next to. */
export const OrgTag = ({ tag, orgId, testId }) => {
  if (!tag) return null;
  const label = `[${tag}]`;
  if (!orgId) {
    return <span style={baseStyle} data-testid={testId || `org-tag-${tag}`}>{label}</span>;
  }
  return (
    <Link
      to={`/orgs/${orgId}`}
      style={baseStyle}
      onClick={(e) => e.stopPropagation()}
      title="View org profile"
      data-testid={testId || `org-tag-${tag}`}
    >
      {label}
    </Link>
  );
};

export default OrgTag;
