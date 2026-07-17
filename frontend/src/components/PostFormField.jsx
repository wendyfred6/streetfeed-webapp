import { COLORS, RADIUS } from '../design/tokens.js';
import { FIELD_INPUT, FIELD_LABEL } from '../design/fieldStyles.js';
import { formatEventDate } from '../utils/eventDate.js';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';

// Shared field primitives for the post composer, matching Figma
// "🌼 Streetfeed Pattern Library v0.1"'s "Field Types" section (FieldLabel +
// TextField, node 241:25298) — replaces PostFormFields.jsx's previous ad hoc
// s.input/s.textarea/s.label styles, which predated the Pattern Library
// (FRE-372). Built on FIELD_INPUT/FIELD_LABEL from design/fieldStyles.js —
// the same Figma-aligned styles already verified for Onboarding (FRE-302/303)
// and HouseNumberPicker, rather than a second, drifting copy of them.
// appStyles.js's s.label/s.input/s.textarea are shared well beyond the
// composer (Event RSVP section headings, PostCard's comment editor) and are
// intentionally left untouched here.
//
// Figma's TextField component currently only defines a "Default" state
// (confirmed via its component prop signature: `state?: "Default"`) — focus
// is already covered globally by global.css's :focus-visible rule (the same
// accent color, applied to any native input/select/textarea), so these
// components render real form elements rather than reinventing focus in JS.
// Error/disabled extend beyond what Figma v0.1 currently specifies, using
// the existing Feedback/Error token and global.css's disabled-opacity rule —
// the same kind of accepted gap as the Pattern Library's own Primary Action
// disabled state, which isn't in the library either.

const fieldInput = (error) => ({
  ...FIELD_INPUT,
  border: `1px solid ${error ? COLORS.error : COLORS.borderTertiary}`,
});

export function FieldLabel({ children, htmlFor }) {
  return <label htmlFor={htmlFor} style={FIELD_LABEL}>{children}</label>;
}

// Single-line Text Input Field (Figma node 241:25315).
export function TextField({ label, error, style, wrapperStyle, ...props }) {
  return (
    <div style={wrapperStyle}>
      {label && <FieldLabel htmlFor={props.id}>{label}</FieldLabel>}
      <input style={{ ...fieldInput(error), ...style }} {...props} />
    </div>
  );
}

// Textarea Field (Figma node 241:25317) — its own "Multi-line" TextField
// variant, not the single-line one resized: Figma specifies a fixed 20px
// radius here (`rounded-[20px]`), not the single-line field's pill radius.
// (Confirmed directly against the Figma component's generated code — an
// earlier version of this file wrongly assumed the pill radius would just
// auto-clamp to match; it doesn't, Figma genuinely uses a different value.)
export function TextareaField({ label, error, style, wrapperStyle, ...props }) {
  return (
    <div style={wrapperStyle}>
      {label && <FieldLabel htmlFor={props.id}>{label}</FieldLabel>}
      <textarea style={{ ...fieldInput(error), borderRadius: RADIUS.lg, height: 'auto', minHeight: 100, padding: '16px', resize: 'none', ...style }} {...props} />
    </div>
  );
}

// Date/Time Field (FRE-374) — visually the same Dropdown Field pattern as
// Situatie ("Kies" + trailing ChevronDown until a value is picked, then shows
// the chosen value), but backed by a real native <input type="date"/"time">
// laid invisibly on top so tapping it opens the platform's own date/time
// picker — the native picker itself isn't being replaced, only its trigger.
export function DateField({ type = 'date', label, value, onChange, placeholder = 'Kies', error, style, wrapperStyle, ...props }) {
  const displayValue = value ? (type === 'date' ? formatEventDate(value) : value) : '';
  return (
    <div style={wrapperStyle}>
      {label && <FieldLabel htmlFor={props.id}>{label}</FieldLabel>}
      <div style={{ position: 'relative' }}>
        <div style={{ ...fieldInput(error), display: 'flex', alignItems: 'center', paddingRight: 40, color: value ? COLORS.text : COLORS.textDim, pointerEvents: 'none', ...style }}>
          {displayValue || placeholder}
        </div>
        <input
          type={type}
          value={value}
          onChange={onChange}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, padding: 0, border: 'none', opacity: 0, cursor: 'pointer' }}
          {...props}
        />
        <CaretDownIcon size={16} color={COLORS.textDim} weight="regular"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// Dropdown Field (Figma node 241:25313) — a native <select> styled to match
// TextField, with a trailing ChevronDown, so mobile OS picker semantics and
// accessibility come from the platform rather than a custom implementation
// (same pattern HouseNumberPicker already uses for its own dropdowns).
export function DropdownField({ label, error, style, wrapperStyle, placeholder, children, ...props }) {
  return (
    <div style={wrapperStyle}>
      {label && <FieldLabel htmlFor={props.id}>{label}</FieldLabel>}
      <div style={{ position: 'relative' }}>
        <select
          style={{ ...fieldInput(error), paddingRight: 40, appearance: 'none', WebkitAppearance: 'none', ...style }}
          {...props}
        >
          {placeholder && <option value="" disabled hidden>{placeholder}</option>}
          {children}
        </select>
        <CaretDownIcon size={16} color={COLORS.textDim} weight="regular"
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
