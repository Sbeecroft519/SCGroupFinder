import { Link } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';

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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
};

const verifiedStyle = {
  ...baseStyle,
  color: '#00ff88',
  background: 'rgba(0,255,136,0.08)',
  border: '1px solid rgba(0,255,136,0.35)',
};

/** Quiet org affiliation badge — never louder than the handle it sits next to. */
export const OrgTag = ({ tag, orgId, verified = false, testId }) => {
  if (!tag) return null;
  const style = verified ? verifiedStyle : baseStyle;
  const body = (
    <>
      [{tag}]
      {verified && <BadgeCheck size={10} />}
    </>
  );
  const title = verified ? 'Affiliation confirmed by the org' : 'Self-declared affiliation (unconfirmed)';
  if (!orgId) {
    return <span style={style} title={title} data-testid={testId || `org-tag-${tag}`}>{body}</span>;
  }
  return (
    <Link
      to={`/orgs/${orgId}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
      title={title}
      data-testid={testId || `org-tag-${tag}`}
    >
      {body}
    </Link>
  );
};

export default OrgTag;
