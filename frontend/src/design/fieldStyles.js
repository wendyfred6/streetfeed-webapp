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

// Geen textTransform: het gedeelde FieldLabel-component in Figma (node 329:2103)
// heeft geen uppercase — dat zit alleen op de "STAP X VAN 4"-sectietitel.
export const FIELD_LABEL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0,
  color: COLORS.textDim,
  lineHeight: 'normal',
};

export const FIELD_GROUP = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
