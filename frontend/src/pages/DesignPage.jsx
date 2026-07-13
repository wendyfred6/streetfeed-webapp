import { useState, useRef, useLayoutEffect } from 'react';
import { COLORS, RADIUS, FONT, GLASS, BG_GRADIENT } from '../design/tokens.js';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import Switch from '../components/Switch.jsx';

const CAT_OPTIONS = [
  { key: 'bezorging',   label: 'Bezorging' },
  { key: 'straatzaken', label: 'Straatzaken' },
  { key: 'melding',     label: 'Melding' },
  { key: 'evenement',   label: 'Evenement' },
];

const s = {
  page: { fontFamily: "'Inter', 'Helvetica Neue', sans-serif", background: BG_GRADIENT, color: COLORS.text, minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '24px 20px 80px' },
  heading: { fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textDim, marginBottom: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.07)' },
  firstHeading: { fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textDim, marginBottom: 16 },
  label: { fontSize: 10, color: COLORS.textDim, marginTop: 4, textAlign: 'center' },
  meta: { fontSize: 10, color: COLORS.textDim, marginBottom: 8 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
};

function Section({ title, first, children }) {
  return (
    <div>
      <div style={first ? s.firstHeading : s.heading}>{title}</div>
      {children}
    </div>
  );
}

// ── Tokens ───────────────────────────────────────────────────────────────────

function Token({ name, value }) {
  return (
    <div style={{ ...s.col, minWidth: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: RADIUS.md, background: value, border: '1px solid rgba(0,0,0,0.08)', marginBottom: 4 }} />
      <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: 'monospace', textAlign: 'center', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function RadiusDemo({ name, value }) {
  return (
    <div style={{ ...s.col, minWidth: 56 }}>
      <div style={{ width: 48, height: 32, background: 'rgba(255,255,255,0.75)', border: `1px solid ${COLORS.border}`, borderRadius: value, marginBottom: 4 }} />
      <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: 'monospace' }}>{name}</div>
      <div style={{ fontSize: 9, color: COLORS.textDim }}>{value === 999 ? 'pill' : `${value}px`}</div>
    </div>
  );
}

function FontDemo({ name, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: size, fontWeight: 600, color: COLORS.text, minWidth: 160 }}>Reyer Anslostraat</div>
      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: 'monospace' }}>{name} · {size}px</div>
    </div>
  );
}

// ── Knoppen ──────────────────────────────────────────────────────────────────

function BtnPrimary({ children, disabled }) {
  return (
    <button disabled={disabled} style={{ background: COLORS.accent, color: '#fff', border: 'none', borderRadius: RADIUS.pill, padding: '11px 20px', fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function BtnSecondary({ children }) {
  return (
    <button style={{ background: COLORS.surface, color: COLORS.accent, border: `2px solid ${COLORS.accent}`, borderRadius: RADIUS.pill, padding: '11px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function BtnSmall({ children, color }) {
  return (
    <button style={{ background: `${color}18`, color, border: `1px solid ${color}`, borderRadius: RADIUS.md, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

// ── Segmented Control ────────────────────────────────────────────────────────

function SegmentedControl({ options, value, onChange, label }) {
  const itemRefs = useRef({});
  const [capsule, setCapsule] = useState({ left: 0, width: 60 });

  useLayoutEffect(() => {
    const item = itemRefs.current[value];
    if (!item) return;
    setCapsule({ left: item.offsetLeft, width: item.offsetWidth });
  }, [value]);

  return (
    <div style={{ padding: '4px 0 8px' }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.accent, marginBottom: 6 }}>{label}</div>
      )}
      <div style={{
        position: 'relative', display: 'flex',
        background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: RADIUS.pill, padding: 4, overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        <div style={{
          position: 'absolute', top: 4, left: 4 + capsule.left, height: 'calc(100% - 8px)', width: capsule.width,
          background: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.pill,
          boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
          transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
        }} />
        {options.map(({ key, label: optLabel }) => (
          <div key={key} ref={el => { itemRefs.current[key] = el; }} onClick={() => onChange(key)}
            style={{
              position: 'relative', zIndex: 1, padding: '7px 12px', minHeight: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: value === key ? 700 : 500,
              color: value === key ? COLORS.accent : COLORS.textMuted,
              cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', flexShrink: 0, transition: 'color 0.25s',
            }}>
            {optLabel}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Badges ───────────────────────────────────────────────────────────────────

function CatBadge({ label }) {
  return (
    <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: RADIUS.pill, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function AccentBadge({ label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: `${color}18`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>
      {label}
    </span>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onClick, label = 'Toggle' }) {
  return (
    <Switch checked={on} onChange={onClick} label={label}
      trackOffColor="rgba(0,0,0,0.14)" knobOnColor="#fff" knobOffColor="#fff" knobShadow />
  );
}

// ── Chevron ──────────────────────────────────────────────────────────────────

function Chevron({ rotate = 0, color }) {
  return (
    <CaretDownIcon size={18} color={color || COLORS.textMuted} weight="regular"
      style={{ transition: 'transform 0.2s', transform: `rotate(${rotate}deg)` }} />
  );
}

// ── Kaart ─────────────────────────────────────────────────────────────────────

function CardExample({ pinned }) {
  return (
    <div style={{
      background: pinned ? COLORS.pinned : 'rgba(255,255,255,0.70)',
      border: `1px solid ${pinned ? COLORS.pinnedBorder : 'rgba(255,255,255,0.50)'}`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      borderRadius: RADIUS.lg, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <CatBadge label="Pakket" />
        {pinned && (
          <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.accent, background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, borderRadius: RADIUS.pill, padding: '2px 8px' }}>Pinned</span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: COLORS.text }}>Pakket voor nr. 28-hs</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: COLORS.textDim }}>
        <span style={{ fontWeight: 600, color: COLORS.textMuted }}>Wendy 52-2</span>
        <span>·</span>
        <span>3 min geleden</span>
        <Chevron rotate={0} />
      </div>
    </div>
  );
}

// ── Glass presets ─────────────────────────────────────────────────────────────

function GlassDemo({ name, preset }) {
  return (
    <div style={{ ...s.col, flex: 1, minWidth: 80 }}>
      <div style={{ width: '100%', height: 52, borderRadius: RADIUS.md, ...preset, border: `1px solid rgba(0,0,0,0.06)` }} />
      <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 4, fontFamily: 'monospace' }}>{name}</div>
    </div>
  );
}

// ── Hoofd-pagina ──────────────────────────────────────────────────────────────

export default function DesignPage() {
  const [segFilter, setSegFilter] = useState('all');
  const [segCat, setSegCat] = useState('package');
  const [toggleOn, setToggleOn] = useState(true);
  const [chevronRotated, setChevronRotated] = useState(false);

  return (
    <div style={s.page}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
        Street<span style={{ color: COLORS.accent }}>feed</span>
        <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim, marginLeft: 10 }}>Design System</span>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>
        Tokens en componenten — live vanuit de broncode
      </div>

      {/* ── KLEUREN ── */}
      <Section title="Kleuren" first>
        <div style={s.row}>
          {Object.entries(COLORS).map(([name, value]) => (
            <Token key={name} name={name} value={value} />
          ))}
        </div>
      </Section>

      {/* ── GRADIËNT + GLASS ── */}
      <Section title="Achtergrond & Glass">
        <div style={s.meta}>BG_GRADIENT — pagina-achtergrond (radial-ellipse warm wit)</div>
        <div style={{ height: 48, borderRadius: RADIUS.lg, background: BG_GRADIENT, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12 }} />
        <div style={s.meta}>GLASS presets — backdrop-filter blur</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {Object.entries(GLASS).map(([name, preset]) => (
            <GlassDemo key={name} name={name} preset={preset} />
          ))}
        </div>
      </Section>

      {/* ── BORDER RADIUS ── */}
      <Section title="Border radius">
        <div style={s.row}>
          {Object.entries(RADIUS).map(([name, value]) => (
            <RadiusDemo key={name} name={name} value={value} />
          ))}
        </div>
      </Section>

      {/* ── TYPOGRAFIE ── */}
      <Section title="Typografie · Inter">
        {Object.entries(FONT).map(([name, size]) => (
          <FontDemo key={name} name={name} size={size} />
        ))}
      </Section>

      {/* ── KNOPPEN ── */}
      <Section title="Knoppen">
        <div style={s.meta}>Primary · Secondary</div>
        <div style={{ ...s.row, alignItems: 'center', marginBottom: 16 }}>
          <BtnPrimary>Plaatsen</BtnPrimary>
          <BtnSecondary>Annuleren</BtnSecondary>
        </div>
        <div style={s.meta}>Primary disabled</div>
        <div style={{ ...s.row, alignItems: 'center', marginBottom: 16 }}>
          <BtnPrimary disabled>Plaatsen</BtnPrimary>
        </div>
        <div style={s.meta}>Small-action</div>
        <div style={s.row}>
          <BtnSmall color={COLORS.accent}>Goedkeuren</BtnSmall>
          <BtnSmall color={COLORS.red}>Afwijzen</BtnSmall>
          <BtnSmall color={COLORS.blue}>Details</BtnSmall>
        </div>
      </Section>

      {/* ── SEGMENTED CONTROL ── */}
      <Section title="Segmented Control">
        <div style={s.meta}>Feed-filter — met "Filter" label (small-caps Electric Pink)</div>
        <SegmentedControl
          label="Filter"
          value={segFilter}
          onChange={setSegFilter}
          options={[{ key: 'all', label: 'Alle' }, ...CAT_OPTIONS]}
        />
        <div style={{ ...s.meta, marginTop: 12 }}>Categorie-selector nieuw bericht — zonder label</div>
        <SegmentedControl
          value={segCat}
          onChange={setSegCat}
          options={CAT_OPTIONS}
        />
      </Section>

      {/* ── BADGES ── */}
      <Section title="Badges">
        <div style={s.meta}>Categorie-badges — neutraal frosted glass</div>
        <div style={s.row}>
          {CAT_OPTIONS.map(({ label }) => <CatBadge key={label} label={label} />)}
          <CatBadge label="Gezocht" />
        </div>
        <div style={{ ...s.meta, marginTop: 4 }}>Speciale badges — gekleurd</div>
        <div style={s.row}>
          <AccentBadge label="Pinned" color={COLORS.accent} />
          <AccentBadge label="Admin" color={COLORS.accent} />
          <AccentBadge label="Mod" color={COLORS.purple} />
          <AccentBadge label="LID" color={COLORS.blue} />
        </div>
      </Section>

      {/* ── INPUTS ── */}
      <Section title="Inputs">
        <div style={s.meta}>Text input</div>
        <input
          style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
          placeholder="Bijv. Ladder te leen voor het weekend"
        />
        <div style={s.meta}>Textarea</div>
        <textarea
          style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'none', height: 72, marginBottom: 10, fontFamily: 'inherit' }}
          placeholder="Extra details..."
        />
        <div style={s.meta}>Select</div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <select style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}>
            <option>Selecteer bezorger</option>
            <option>PostNL</option>
            <option>DHL</option>
          </select>
          <CaretDownIcon size={14} color={COLORS.textDim} weight="regular" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </Section>

      {/* ── TOGGLE ── */}
      <Section title="Toggle">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle on={toggleOn} onClick={() => setToggleOn(v => !v)} />
            <span style={{ fontSize: 13, color: COLORS.textMuted, cursor: 'pointer' }} onClick={() => setToggleOn(v => !v)}>
              {toggleOn ? 'Aan' : 'Uit'} — klik om te wisselen
            </span>
          </div>
          <Toggle on={false} />
        </div>
      </Section>

      {/* ── CHEVRON ── */}
      <Section title="Chevron">
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ ...s.col, cursor: 'pointer' }} onClick={() => setChevronRotated(v => !v)}>
            <Chevron rotate={chevronRotated ? 180 : 0} />
            <div style={s.label}>klik om te draaien</div>
          </div>
          <div style={s.col}><Chevron rotate={90} color={COLORS.accent} /><div style={s.label}>90° · accent</div></div>
          <div style={s.col}><Chevron rotate={270} color={COLORS.textDim} /><div style={s.label}>270° · dim</div></div>
        </div>
      </Section>

      {/* ── KAART ── */}
      <Section title="Kaart">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CardExample />
          <CardExample pinned />
        </div>
      </Section>

      {/* ── INFOBOX ── */}
      <Section title="InfoBox">
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 8, fontSize: 13, color: COLORS.textMuted }}>
          <span style={{ fontWeight: 700, color: COLORS.text }}>Lokatie: </span>nr. 27–34
        </div>
        <div style={{ background: 'rgba(255,0,102,0.05)', border: '1px solid rgba(255,0,102,0.18)', borderRadius: RADIUS.md, padding: '12px 14px', fontSize: 13, color: COLORS.textMuted }}>
          Accent infobox — notificatie-banner of hoofd-actie highlight
        </div>
      </Section>
    </div>
  );
}
