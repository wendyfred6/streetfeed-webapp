import { COLORS, RADIUS } from './tokens.js';

export const FIELD_INPUT = {
  width: '100%',
  background: COLORS.background,
  border: `1px solid ${COLORS.borderTertiary}`,
  borderRadius: RADIUS.pill,
  height: 48,
  padding: '4px 16px',
  color: COLORS.text,
  fontSize: 16,
  lineHeight: '24px',
  outline: 'none',
  boxSizing: 'border-box',
};

export const FIELD_LABEL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0,
  textTransform: 'uppercase',
  color: COLORS.textDim,
  lineHeight: 'normal',
};

export const FIELD_GROUP = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
