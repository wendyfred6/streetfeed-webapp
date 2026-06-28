import { COLORS, RADIUS } from './tokens.js';

// Wrapper div — zichtbare pill: border, radius, achtergrond zitten hier.
// Gebruik altijd als parent van FIELD_INPUT_ELEMENT.
export const FIELD_INPUT_WRAPPER = {
  position: 'relative',
  height: 48,
  width: '100%',
  borderRadius: RADIUS.pill,
  border: `1px solid ${COLORS.accent}`,
  background: COLORS.background,
  overflow: 'hidden',
};

// Feitelijk <input>/<select> element binnen FIELD_INPUT_WRAPPER.
// font-size: 16 voorkomt iOS Safari auto-zoom bij focus;
// scale(0.75) zorgt dat het visueel als 12px verschijnt.
// Breedte/hoogte zijn pre-scaled (÷ 0.75) zodat het de wrapper vult.
export const FIELD_INPUT_ELEMENT = {
  display: 'block',
  fontSize: 16,
  transform: 'scale(0.75)',
  transformOrigin: 'top left',
  width: '133.333%',
  height: 64,
  padding: '5.333px 21.333px',
  lineHeight: '24px',
  color: COLORS.text,
  background: 'transparent',
  border: 'none',
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
