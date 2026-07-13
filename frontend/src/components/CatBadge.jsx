import { COLORS, RADIUS } from '../design/tokens.js';
import { catLabel } from '../utils/categories.js';

export default function CatBadge({ cat }) {
  return (
    <span style={{
      display: 'inline-block',
      background: 'rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: RADIUS.pill,
      fontSize: 11, fontWeight: 600,
      color: COLORS.textMuted,
      padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {catLabel(cat)}
    </span>
  );
}
