import { COLORS, RADIUS } from './tokens.js';

// Gedeelde basis voor alle onboarding TextFields en labels.
// Importeer deze constanten in OnboardingPage.jsx én HouseNumberPicker.jsx
// zodat er één bron van waarheid is voor TextField-styling.

export const FIELD_INPUT = {
  width: '100%',
  background: COLORS.background,
  border: `1px solid ${COLORS.accent}`,
  borderRadius: RADIUS.pill,
  height: 48,
  padding: '4px 16px',
  color: COLORS.text,
  fontSize: 12,
  lineHeight: '18px',
  outline: 'none',
  boxSizing: 'border-box',
};

export const FIELD_LABEL = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: COLORS.textDim,
  lineHeight: 'normal',
};

export const FIELD_GROUP = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
