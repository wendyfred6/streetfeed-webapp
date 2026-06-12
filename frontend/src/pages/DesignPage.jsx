import { useState } from 'react';
import { COLORS, RADIUS, FONT, ALPHA } from '../design/tokens.js';

const s = {
  page: { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: COLORS.bg, color: COLORS.text, minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '24px 20px 80px' },
  heading: { fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textDim, marginBottom: 16, marginTop: 32, paddingTop: 24, borderTop: `1px solid ${COLORS.border}` },
  firstHeading: { fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: COLORS.textDim, marginBottom: 16 },
  label: { fontSize: 10, color: COLORS.textDim, marginTop: 4, textAlign: 'center' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
};

const CATEGORIES = {
  package:  { label: 'Pakket',     color: '#4488FF' },
  works:    { label: 'Obstructie', color: '#FF8833' },
  incident: { label: 'Melding',    color: '#FF4444' },
  event:    { label: 'Evenement',  color: '#AA77FF' },
  general:  { label: 'Algemeen',   color: '#888888' },
};

function Section({ title, first, children }) {
  return (
    <div>
      <div style={first ? s.firstHeading : s.heading}>{title}</div>
      {children}
    </div>
  );
}

function Token({ name, value }) {
  return (
    <div style={{ ...s.col, minWidth: 60 }}>
      <div style={{ width: 40, height: 40, borderRadius: RADIUS.md, background: value, border: `1px solid rgba(255,255,255,0.08)`, marginBottom: 4 }} />
      <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function RadiusDemo({ name, value }) {
  return (
    <div style={{ ...s.col, minWidth: 56 }}>
      <div style={{ width: 48, height: 32, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: value, marginBottom: 4 }} />
      <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: 'monospace' }}>{name}</div>
      <div style={{ fontSize: 9, color: COLORS.textDim }}>{value === 999 ? '999' : `${value}px`}</div>
    </div>
  );
}

function FontDemo({ name, size }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: size, fontWeight: 600, color: COLORS.text, minWidth: 140 }}>Reyer Anslostraat</div>
      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: 'monospace' }}>{name} · {size}px</div>
    </div>
  );
}

// ── Knop-varianten ──────────────────────────────────────────────────────────

function BtnPrimary({ children, disabled }) {
  return (
    <button disabled={disabled} style={{ background: COLORS.terracotta, color: '#FFFFFF', border: 'none', borderRadius: RADIUS.pill, padding: '11px 20px', fontSize: 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function BtnSecondary({ children }) {
  return (
    <button style={{ background: COLORS.surface, color: COLORS.terracotta, border: `2px solid ${COLORS.terracotta}`, borderRadius: RADIUS.pill, padding: '11px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function BtnGhost({ children }) {
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

// ── Chips ───────────────────────────────────────────────────────────────────

function FilterChip({ label, active }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', background: active ? COLORS.accent : COLORS.surface, color: active ? '#000' : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: RADIUS.pill, padding: '5px 12px', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}
    </div>
  );
}

function CatChip({ label, color, selected }) {
  return (
    <div style={{ background: selected ? `${color}22` : COLORS.bg, border: `1px solid ${selected ? color : COLORS.border}`, borderRadius: RADIUS.pill, padding: '7px 14px', fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label}
    </div>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: RADIUS.xs, fontSize: 10, fontWeight: 700, padding: '2px 6px' }}>
      {label}
    </span>
  );
}

// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ on }) {
  return (
    <div style={{ width: 36, height: 20, borderRadius: 10, background: on ? COLORS.accent : COLORS.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: on ? '#000' : COLORS.textDim, transition: 'left 0.2s' }} />
    </div>
  );
}

// ── Chevron ─────────────────────────────────────────────────────────────────

function Chevron({ rotate = 0, color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color || COLORS.textMuted} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.2s', transform: `rotate(${rotate}deg)` }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Kaart-voorbeeld ─────────────────────────────────────────────────────────

function CardExample() {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.xl, padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <Badge label="Pakket" color={COLORS.blue} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Pakket voor nr. 28-hs</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: COLORS.textDim }}>
        <span style={{ fontWeight: 600, color: COLORS.textMuted }}>Wendy 52-2</span>
        <span>·</span><span>3 min geleden</span>
        <Chevron rotate={0} />
      </div>
    </div>
  );
}

// ── Hoofd-pagina ─────────────────────────────────────────────────────────────

export default function DesignPage() {
  const [chipActive, setChipActive] = useState('package');
  const [filterActive, setFilterActive] = useState('all');
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

      {/* ── RADIUS ── */}
      <Section title="Border radius">
        <div style={s.row}>
          {Object.entries(RADIUS).map(([name, value]) => (
            <RadiusDemo key={name} name={name} value={value} />
          ))}
        </div>
      </Section>

      {/* ── TYPOGRAFIE ── */}
      <Section title="Typografie">
        {Object.entries(FONT).map(([name, size]) => (
          <FontDemo key={name} name={name} size={size} />
        ))}
      </Section>

      {/* ── KNOPPEN ── */}
      <Section title="Knoppen">
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Primary · Secondary · Ghost · Small-action</div>
        <div style={{ ...s.row, alignItems: 'center', marginBottom: 16 }}>
          <BtnPrimary>Plaatsen</BtnPrimary>
          <BtnSecondary>Annuleren</BtnSecondary>
          <BtnGhost>Melden</BtnGhost>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Primary disabled</div>
        <div style={{ ...s.row, alignItems: 'center', marginBottom: 16 }}>
          <BtnPrimary disabled>Plaatsen</BtnPrimary>
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Small-action (goedkeuren / afwijzen)</div>
        <div style={s.row}>
          <BtnSmall color={COLORS.accent}>Goedkeuren</BtnSmall>
          <BtnSmall color={COLORS.red}>Afwijzen</BtnSmall>
          <BtnSmall color={COLORS.blue}>RDW-lookup</BtnSmall>
        </div>
      </Section>

      {/* ── CHIPS ── */}
      <Section title="Chips">
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Filter chips (filterBar)</div>
        <div style={{ ...s.row, marginBottom: 16 }}>
          {['all', 'package', 'works', 'incident', 'event', 'general'].map(k => (
            <FilterChip key={k} label={k === 'all' ? 'Alle' : CATEGORIES[k]?.label || k} active={filterActive === k} onClick={() => setFilterActive(k)} />
          ))}
        </div>
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Categorie-chips (nieuw bericht)</div>
        <div style={s.row}>
          {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
            <CatChip key={key} label={label} color={color} selected={chipActive === key} onClick={() => setChipActive(key)} />
          ))}
        </div>
      </Section>

      {/* ── BADGES ── */}
      <Section title="Badges">
        <div style={s.row}>
          {Object.entries(CATEGORIES).map(([, { label, color }]) => (
            <Badge key={label} label={label} color={color} />
          ))}
          <Badge label="Pinned" color={COLORS.accent} />
        </div>
      </Section>

      {/* ── INPUTS ── */}
      <Section title="Inputs">
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Text input — tik erin voor focus-state (gele rand)</div>
        <input
          style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
          placeholder="Bijv. Ladder te leen voor het weekend"
        />
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Textarea</div>
        <textarea
          style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'none', height: 72, marginBottom: 10, fontFamily: 'inherit' }}
          placeholder="Extra details..."
        />
        <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 8 }}>Select</div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <select style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}>
            <option>Selecteer bezorger</option>
            <option>PostNL</option>
            <option>DHL</option>
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </Section>

      {/* ── TOGGLE ── */}
      <Section title="Toggle">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle on={toggleOn} />
            <span style={{ fontSize: 13, color: COLORS.textMuted }} onClick={() => setToggleOn(v => !v)}>
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
            <div style={s.label}>Klik om te draaien</div>
          </div>
          <div style={s.col}><Chevron rotate={90} color={COLORS.accent} /><div style={s.label}>90° · accent</div></div>
          <div style={s.col}><Chevron rotate={270} color={COLORS.textDim} /><div style={s.label}>270° · dim</div></div>
          <div style={s.col}><Chevron rotate={0} color={COLORS.blue} /><div style={s.label}>0° · blue</div></div>
        </div>
      </Section>

      {/* ── KAART ── */}
      <Section title="Kaart">
        <CardExample />
      </Section>

      {/* ── INFOBOX ── */}
      <Section title="InfoBox">
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, padding: '10px 12px', marginBottom: 8, fontSize: 13, color: COLORS.textMuted }}>
          <span style={{ fontWeight: 700, color: COLORS.text }}>Lokatie: </span>nr. 27–34
        </div>
        <div style={{ background: `rgba(232,255,71,0.06)`, border: `1px solid rgba(232,255,71,0.2)`, borderRadius: RADIUS.md, padding: '12px 14px', fontSize: 13, color: COLORS.textMuted }}>
          Accent infobox — bijv. voor de notificatie-banner
        </div>
      </Section>
    </div>
  );
}
