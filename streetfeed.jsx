import { useState } from "react";

const COLORS = {
  bg: "#0F0F0F", surface: "#1A1A1A", border: "#2A2A2A",
  accent: "#E8FF47", text: "#F0F0F0", textMuted: "#888888", textDim: "#555555",
  pinned: "#1E2A00", pinnedBorder: "#4A6600",
  red: "#FF4444", blue: "#4488FF", orange: "#FF8833", purple: "#AA77FF", green: "#44BB44",
};

const CATEGORIES = {
  package:  { label: "Pakketje",  emoji: "📦", color: "#4488FF" },
  blockage: { label: "Blokkade",  emoji: "🚧", color: "#FF8833", pinnable: true },
  waste:    { label: "Grofvuil",  emoji: "🗑️", color: "#FF4444" },
  container:{ label: "Container", emoji: "🏗️", color: "#FF8833", pinnable: true },
  event:    { label: "Evenement", emoji: "🎉", color: "#AA77FF", pinnable: true, isEvent: true },
  incident: { label: "Melding",   emoji: "🚨", color: "#FF4444" },
  general:  { label: "Algemeen",  emoji: "💬", color: "#888888" },
};

const STREETS = [
  { id: 1, name: "Reyer Anslostraat", households: 111, members: 34 },
  { id: 2, name: "Eerste Helmersstraat", households: 89, members: 12 },
  { id: 3, name: "Gerard Doustraat", households: 143, members: 8 },
];

const INITIAL_POSTS = [
  {
    id: 1, streetId: 1, category: "blockage", pinned: true,
    author: "Wendy F.", role: "admin", time: "2 uur geleden",
    title: "Straat afgesloten do–vr",
    body: "Gemeente Amsterdam plant rioolwerkzaamheden op do 29 en vr 30 mei. Afgesloten voor verkeer 07:00–18:00.",
    endDate: "30 mei", likes: 4, comments: 2, reported: false,
  },
  {
    id: 2, streetId: 1, category: "event", pinned: true,
    author: "Mark S.", role: "member", time: "gisteren",
    title: "Straatborrel zaterdag 31 mei",
    body: "Weer die tijd! Vanaf 16:00 voor de deur bij nr. 24–28. Neem iets te drinken mee.",
    endDate: "31 mei", eventDate: "za 31 mei", eventTime: "16:00",
    eventLocation: "Voor nr. 24–28",
    bringList: ["Wijn", "Bier", "Frisdrank", "Hapjes"],
    rsvp: { yes: ["Mark S.","Wendy F.","Layla B.","Thomas K.","Nadia O.","Roberto G.","Anna de W.","Pieter H.","Sara M.","Farid O.","Lisa V.","Johan B.","Emma R.","Kees T."], maybe: ["Fatima A.","David L.","Yuki N."], no: [] },
    myRsvp: "yes", likes: 18, comments: 7, reported: false,
  },
  {
    id: 3, streetId: 1, category: "incident", pinned: false,
    author: "Veerle V.", role: "member", time: "43 min geleden",
    title: "Auto tegen fietsen aangereden — weggereden",
    body: "Auto is tegen een paar fietsen aan gereden en weggereden. Klonk niet best.",
    licenseplate: "ZG-345-X",
    photo: true, likes: 3, comments: 4, reported: false,
  },
  {
    id: 4, streetId: 1, category: "package", pinned: false,
    author: "Layla B.", role: "member", time: "1 uur geleden",
    title: "Pakketje voor nr. 67",
    body: "Er ligt een pakketje bij mij (nr. 71) voor Reyer Anslostraat 67. Bol.com doos. Bel even aan!",
    likes: 1, comments: 0, reported: false,
  },
  {
    id: 5, streetId: 1, category: "waste", pinned: false,
    author: "Thomas K.", role: "member", time: "3 uur geleden",
    title: "Grofvuil bij de containers",
    body: "Iemand heeft weer een oud matras naast de ondergrondse container gegooid. Melding gedaan bij gemeente (MOR).",
    likes: 6, comments: 3, reported: false,
  },
  {
    id: 6, streetId: 1, category: "general", pinned: false,
    author: "Nadia O.", role: "member", time: "gisteren",
    title: "Aanbeveling schilder gezocht",
    body: "Heeft iemand een goede schilder in de buurt? Binnenschilderwerk ~80m². Tips welkom!",
    likes: 2, comments: 5, reported: false,
  },
];

const PENDING_MEMBERS = [
  { id: 1, name: "Roberto G.", address: "Reyer Anslostraat 44", time: "10 min geleden" },
  { id: 2, name: "Anna de W.", address: "Reyer Anslostraat 91", time: "gisteren" },
];

const MEMBERS = [
  { id: 1, name: "Wendy F.", address: "nr. 52", role: "admin" },
  { id: 2, name: "Mark S.", address: "nr. 24", role: "member" },
  { id: 3, name: "Layla B.", address: "nr. 71", role: "moderator" },
  { id: 4, name: "Thomas K.", address: "nr. 38", role: "member" },
  { id: 5, name: "Nadia O.", address: "nr. 15", role: "member" },
  { id: 6, name: "Veerle V.", address: "nr. 8", role: "member" },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = {
  app: { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: COLORS.bg, color: COLORS.text, minHeight: "100vh", maxWidth: 480, margin: "0 auto" },
  header: { background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 },
  logo: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" },
  accent: { color: COLORS.accent },
  streetBadge: { fontSize: 11, color: COLORS.textMuted, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px" },
  feed: { padding: "0 0 100px 0" },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: COLORS.textDim, padding: "16px 20px 8px" },
  card: (pinned) => ({ margin: "0 12px 8px", background: pinned ? COLORS.pinned : COLORS.surface, border: `1px solid ${pinned ? COLORS.pinnedBorder : COLORS.border}`, borderRadius: 12, padding: "14px 16px" }),
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 },
  cardBody: { fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 },
  cardMeta: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  cardMetaLeft: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.textDim },
  pinnedBadge: { background: COLORS.accent, color: "#000", fontSize: 9, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4 },
  endDateBadge: { fontSize: 10, color: COLORS.accent, background: "rgba(232,255,71,0.1)", border: "1px solid rgba(232,255,71,0.2)", borderRadius: 4, padding: "2px 6px" },
  filterBar: { display: "flex", gap: 6, padding: "12px 20px", overflowX: "auto", scrollbarWidth: "none" },
  filterChip: (active) => ({ background: active ? COLORS.accent : COLORS.surface, color: active ? "#000" : COLORS.textMuted, border: `1px solid ${active ? COLORS.accent : COLORS.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }),
  fab: { position: "fixed", bottom: 80, right: 20, width: 52, height: 52, borderRadius: "50%", background: COLORS.accent, color: "#000", fontSize: 24, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(232,255,71,0.4)", zIndex: 40, fontWeight: 700 },
  tabBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, display: "flex", zIndex: 50 },
  tab: (active) => ({ flex: 1, padding: "12px 0 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: active ? 700 : 400, color: active ? COLORS.accent : COLORS.textDim }),
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: COLORS.surface, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto" },
  sheetHandle: { width: 36, height: 4, background: COLORS.border, borderRadius: 2, margin: "0 auto 20px" },
  sheetTitle: { fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: "-0.3px" },
  input: { width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10 },
  textarea: { width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none", height: 80, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: COLORS.textMuted, display: "block", marginBottom: 6 },
  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 },
  catOption: (selected, cat) => ({ background: selected ? `${CATEGORIES[cat]?.color}22` : COLORS.bg, border: `1px solid ${selected ? CATEGORIES[cat]?.color : COLORS.border}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: selected ? COLORS.text : COLORS.textMuted, fontWeight: selected ? 600 : 400 }),
  submitBtn: { width: "100%", background: COLORS.accent, color: "#000", border: "none", borderRadius: 10, padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 8 },
  cancelBtn: { width: "100%", background: "none", color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px", fontSize: 14, cursor: "pointer", marginTop: 8 },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 6px" }),
  infoBox: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 },
  adminCard: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 },
  statRow: { display: "flex", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "12px", textAlign: "center" },
  statNum: { fontSize: 24, fontWeight: 800, color: COLORS.accent },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  streetCard: { margin: "0 12px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px", cursor: "pointer" },
  emptyState: { textAlign: "center", padding: "40px 20px", color: COLORS.textDim, fontSize: 13 },
  actionBtn: { background: "none", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 },
  reportBtn: { background: "none", border: "none", color: COLORS.textDim, fontSize: 11, cursor: "pointer", padding: 0 },
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function CatBadge({ cat }) {
  const c = CATEGORIES[cat];
  return <span style={{ ...s.badge(c?.color || "#888"), textTransform: "none", fontSize: 11 }}>{c?.emoji} {c?.label}</span>;
}

function RoleBadge({ role }) {
  const map = { admin: [COLORS.accent, "👑 Admin"], moderator: [COLORS.purple, "🛡️ Moderator"], member: [COLORS.textDim, "Bewoner"] };
  const [color, label] = map[role] || [COLORS.textDim, role];
  return <span style={s.badge(color)}>{label}</span>;
}

// ─── RSVP BAR ─────────────────────────────────────────────────────────────────

function RsvpBar({ post, onRsvp }) {
  const { yes, maybe } = post.rsvp;
  const my = post.myRsvp;
  const btn = (type, emoji, label, color) => (
    <button onClick={(e) => { e.stopPropagation(); onRsvp(post.id, type); }} style={{ flex: 1, background: my === type ? `${color}22` : COLORS.bg, border: `1px solid ${my === type ? color : COLORS.border}`, borderRadius: 8, padding: "7px 4px", color: my === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: my === type ? 700 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span><span>{label}</span>
    </button>
  );
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...s.infoBox, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}><span style={{ color: COLORS.purple }}>📅</span> {post.eventDate} {post.eventTime}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted }}><span style={{ color: COLORS.purple }}>📍</span> {post.eventLocation}</div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
        <span style={{ color: COLORS.text, fontWeight: 700 }}>{yes.length}</span> komen{maybe.length > 0 && <> · <span style={{ color: COLORS.text, fontWeight: 700 }}>{maybe.length}</span> misschien</>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {btn("yes", "✅", "Ik kom", COLORS.green)}
        {btn("maybe", "🤔", "Misschien", COLORS.orange)}
        {btn("no", "❌", "Afwezig", COLORS.red)}
      </div>
    </div>
  );
}

// ─── INCIDENT EXTRA ───────────────────────────────────────────────────────────

function IncidentExtra({ post }) {
  return (
    <div style={{ marginTop: 10 }}>
      {post.licenseplate && (
        <div style={{ ...s.infoBox, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Kenteken</span>
          <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 800, background: "#FFD700", color: "#000", padding: "2px 10px", borderRadius: 4, letterSpacing: "2px" }}>{post.licenseplate}</span>
        </div>
      )}
      {post.photo && (
        <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
          📷 Foto bijgevoegd · <span style={{ color: COLORS.accent }}>Bekijk foto</span>
        </div>
      )}
      <a href="https://www.politie.nl/aangifte-of-melding-doen" target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "none", border: `1px solid ${COLORS.red}44`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLORS.red, textDecoration: "none", textAlign: "center" }}>
        🚔 Aangifte doen via politie.nl →
      </a>
    </div>
  );
}

// ─── RDW LOOKUP ──────────────────────────────────────────────────────────────

function RdwLookup({ kenteken }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const clean = kenteken.replace(/-/g, "").toUpperCase();

  const lookup = async () => {
    if (clean.length < 4) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setConfirmed(false);
    try {
      const res = await fetch(`https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${clean}`);
      const data = await res.json();
      if (data.length === 0) { setError("Kenteken niet gevonden in RDW"); }
      else {
        const v = data[0];
        setResult({
          merk: v.merk || "–",
          type: v.handelsbenaming || v.type_remsysteem_voertuig || "–",
          kleur: v.eerste_kleur || "–",
          bouwjaar: v.datum_eerste_toelating ? v.datum_eerste_toelating.slice(0, 4) : "–",
          brandstof: v.brandstof_omschrijving || "–",
        });
      }
    } catch (e) { setError("Kon RDW niet bereiken"); }
    setLoading(false);
  };

  if (!clean || clean.length < 4) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {!result && !loading && !error && (
        <button onClick={lookup} style={{ width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.blue}`, borderRadius: 8, padding: "9px 12px", color: COLORS.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          🔍 Voertuig opzoeken via RDW
        </button>
      )}
      {loading && (
        <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.textMuted, textAlign: "center" }}>Zoeken in RDW...</div>
      )}
      {error && (
        <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.red }}>{error}</div>
      )}
      {result && !confirmed && (
        <div style={{ background: `${COLORS.blue}11`, border: `1px solid ${COLORS.blue}44`, borderRadius: 10, padding: "12px 14px", marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: COLORS.blue, marginBottom: 8 }}>
            🔍 Gevonden via RDW — alleen voor jou zichtbaar
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            {[["Merk", result.merk], ["Type", result.type], ["Kleur", result.kleur], ["Bouwjaar", result.bouwjaar]].map(([label, val]) => (
              <div key={label} style={{ background: COLORS.bg, borderRadius: 6, padding: "6px 10px" }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
            ⚠️ Deze gegevens worden <strong style={{ color: COLORS.text }}>niet</strong> automatisch in de post geplaatst. Wat jij zelf typt is jouw verantwoordelijkheid.
          </div>
          <button onClick={() => setConfirmed(true)} style={{ width: "100%", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ✓ Ja, dit is de auto
          </button>
        </div>
      )}
      {confirmed && result && (
        <div style={{ ...s.infoBox, fontSize: 12, color: COLORS.green }}>
          ✓ {result.merk} {result.type} · {result.kleur} · {result.bouwjaar} — opgeslagen voor jouw aangifte
        </div>
      )}
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onRsvp, onOpenEvent, onReport, isAdmin }) {
  const cat = CATEGORIES[post.category];
  const isEvent = post.category === "event";
  const isIncident = post.category === "incident";

  return (
    <div style={s.card(post.pinned)} onClick={isEvent ? () => onOpenEvent(post) : undefined}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat?.color || "#888", marginTop: 6, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            {post.pinned && <span style={s.pinnedBadge}>📌 Pinned</span>}
            {post.endDate && <span style={s.endDateBadge}>t/m {post.endDate}</span>}
            <CatBadge cat={post.category} />
          </div>
          <div style={s.cardTitle}>{post.title}</div>
          <div style={s.cardBody}>{post.body}</div>
          {isEvent && post.rsvp && <RsvpBar post={post} onRsvp={onRsvp} />}
          {isIncident && <IncidentExtra post={post} />}
        </div>
      </div>
      <div style={s.cardMeta}>
        <div style={s.cardMetaLeft}>
          <span style={{ fontSize: 10, fontWeight: 600, color: post.role === "admin" ? COLORS.accent : post.role === "moderator" ? COLORS.purple : COLORS.textDim }}>
            {post.role === "admin" ? "👑 " : post.role === "moderator" ? "🛡️ " : ""}{post.author}
          </span>
          <span>·</span><span>{post.time}</span>
          {isEvent && <span style={{ color: COLORS.purple, fontSize: 11 }}>· Tik voor details</span>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={s.actionBtn} onClick={(e) => { e.stopPropagation(); onLike(post.id); }}>♥ {post.likes}</button>
          <button style={s.actionBtn} onClick={(e) => e.stopPropagation()}>💬 {post.comments}</button>
          {!isAdmin && (
            <button style={{ ...s.reportBtn, color: post.reported ? COLORS.red : COLORS.textDim }} onClick={(e) => { e.stopPropagation(); onReport(post.id); }} title="Meld dit bericht">
              {post.reported ? "🚩" : "⚑"}
            </button>
          )}
          {isAdmin && (
            <button style={{ ...s.reportBtn, color: COLORS.red }} onClick={(e) => { e.stopPropagation(); onReport(post.id); }} title="Verwijder bericht">🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EVENT DETAIL SHEET ───────────────────────────────────────────────────────

function EventDetailSheet({ post, onClose, onRsvp }) {
  const { yes, maybe } = post.rsvp;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.sheetHandle} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={s.badge(COLORS.purple)}>🎉 EVENEMENT</span>
          {post.pinned && <span style={s.pinnedBadge}>📌 Pinned</span>}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{post.title}</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>{post.body}</div>
        <div style={{ ...s.infoBox, display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>📅</span> {post.eventDate} om {post.eventTime}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>📍</span> {post.eventLocation}</div>
          <div style={{ fontSize: 13 }}><span style={{ color: COLORS.purple }}>👥</span> <strong>{yes.length}</strong> komen · <strong>{maybe.length}</strong> misschien</div>
        </div>
        {post.bringList?.length > 0 && (
          <>
            <div style={s.label}>Meenemen</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {post.bringList.map(item => <span key={item} style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "4px 10px", fontSize: 12, color: COLORS.textMuted }}>{item}</span>)}
            </div>
          </>
        )}
        <div style={s.label}>Jouw RSVP</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["yes","✅","Ik kom",COLORS.green],["maybe","🤔","Misschien",COLORS.orange],["no","❌","Afwezig",COLORS.red]].map(([type,emoji,label,color]) => (
            <button key={type} onClick={() => onRsvp(post.id, type)} style={{ flex: 1, background: post.myRsvp === type ? `${color}22` : COLORS.bg, border: `1px solid ${post.myRsvp === type ? color : COLORS.border}`, borderRadius: 8, padding: "10px 4px", color: post.myRsvp === type ? color : COLORS.textMuted, fontSize: 12, fontWeight: post.myRsvp === type ? 700 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 18 }}>{emoji}</span><span>{label}</span>
            </button>
          ))}
        </div>
        {yes.length > 0 && (
          <>
            <div style={s.label}>Aanwezigen ({yes.length})</div>
            <div style={{ ...s.infoBox, marginBottom: 16 }}>
              {yes.map((name, i) => <div key={name} style={{ fontSize: 13, padding: "4px 0", borderBottom: i < yes.length - 1 ? `1px solid ${COLORS.border}` : "none", color: COLORS.textMuted }}>{name === "Wendy F." ? "👑 " : ""}{name === post.author ? <strong style={{ color: COLORS.text }}>{name} (organisator)</strong> : name}</div>)}
            </div>
          </>
        )}
        <button style={s.cancelBtn} onClick={onClose}>Sluiten</button>
      </div>
    </div>
  );
}

// ─── NEW POST SHEET ───────────────────────────────────────────────────────────

function NewPostSheet({ onClose, onSubmit }) {
  const [cat, setCat] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [bringItems, setBringItems] = useState("");
  const [licenseplate, setLicenseplate] = useState("");

  const isEvent = cat === "event";
  const isIncident = cat === "incident";
  const isPinnable = CATEGORIES[cat]?.pinnable;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.sheetHandle} />
        <div style={s.sheetTitle}>Nieuw bericht</div>
        <label style={s.label}>Categorie</label>
        <div style={s.catGrid}>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <div key={key} style={s.catOption(cat === key, key)} onClick={() => setCat(key)}>
              <span style={{ fontSize: 16 }}>{c.emoji}</span><span>{c.label}</span>
            </div>
          ))}
        </div>
        <label style={s.label}>Titel</label>
        <input style={s.input} placeholder="Korte omschrijving..." value={title} onChange={e => setTitle(e.target.value)} />
        <label style={s.label}>Bericht</label>
        <textarea style={s.textarea} placeholder="Details..." value={body} onChange={e => setBody(e.target.value)} />
        {isIncident && (
          <>
            <label style={s.label}>Kenteken (optioneel)</label>
            <input style={{ ...s.input, fontFamily: "monospace", letterSpacing: "2px", textTransform: "uppercase" }} placeholder="bijv. ZG-345-X" value={licenseplate} onChange={e => setLicenseplate(e.target.value.toUpperCase())} />
            <RdwLookup kenteken={licenseplate} />
          </>
        )}
        {isEvent && (
          <>
            <label style={s.label}>Datum</label>
            <input style={s.input} placeholder="bijv. za 31 mei" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            <label style={s.label}>Tijd</label>
            <input style={s.input} placeholder="bijv. 16:00" value={eventTime} onChange={e => setEventTime(e.target.value)} />
            <label style={s.label}>Locatie</label>
            <input style={s.input} placeholder="bijv. Voor nr. 24–28" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
            <label style={s.label}>Meenemen (komma-gescheiden)</label>
            <input style={s.input} placeholder="bijv. Wijn, Bier, Hapjes" value={bringItems} onChange={e => setBringItems(e.target.value)} />
          </>
        )}
        {isPinnable && (
          <>
            <label style={s.label}>Einddatum</label>
            <input style={s.input} placeholder="bijv. 31 mei" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </>
        )}
        <button style={s.submitBtn} onClick={() => { if (title.trim()) { onSubmit({ cat, title, body, endDate, eventDate, eventTime, eventLocation, bringItems, licenseplate }); onClose(); } }}>Plaatsen</button>
        <button style={s.cancelBtn} onClick={onClose}>Annuleren</button>
      </div>
    </div>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────

function AdminView({ pending, onApprove, onReject, members, onRoleChange }) {
  const [subTab, setSubTab] = useState("queue");
  return (
    <div style={s.feed}>
      <div style={{ display: "flex", gap: 6, padding: "12px 12px 0" }}>
        {[["queue", "Verzoeken"], ["members", "Bewoners"], ["manage", "Beheer"]].map(([id, label]) => (
          <div key={id} style={{ ...s.filterChip(subTab === id), borderRadius: 8 }} onClick={() => setSubTab(id)}>{label}</div>
        ))}
      </div>

      {subTab === "queue" && (
        <>
          <div style={{ ...s.statRow, padding: "12px 12px 0" }}>
            <div style={s.statCard}><div style={s.statNum}>34</div><div style={s.statLabel}>Bewoners</div></div>
            <div style={s.statCard}><div style={s.statNum}>{pending.length}</div><div style={s.statLabel}>In afwachting</div></div>
            <div style={s.statCard}><div style={s.statNum}>111</div><div style={s.statLabel}>Adressen</div></div>
          </div>
          <div style={s.sectionLabel}>Toegangsverzoeken</div>
          {pending.length === 0 ? <div style={s.emptyState}>Geen openstaande verzoeken ✓</div> : pending.map(p => (
            <div key={p.id} style={{ ...s.adminCard, margin: "0 12px 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>{p.address} · {p.time}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, background: COLORS.accent, color: "#000", border: "none", borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={() => onApprove(p.id)}>✓ Goedkeuren</button>
                <button style={{ flex: 1, background: "none", color: COLORS.red, border: `1px solid ${COLORS.red}`, borderRadius: 8, padding: "8px", fontSize: 12, cursor: "pointer" }} onClick={() => onReject(p.id)}>✕ Afwijzen</button>
              </div>
            </div>
          ))}
        </>
      )}

      {subTab === "members" && (
        <>
          <div style={s.sectionLabel}>Bewonerslijst ({members.length})</div>
          {members.map(m => (
            <div key={m.id} style={{ ...s.adminCard, margin: "0 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{m.address}</div>
              </div>
              <select
                value={m.role}
                onChange={e => onRoleChange(m.id, e.target.value)}
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
              >
                <option value="member">👤 Bewoner</option>
                <option value="moderator">🛡️ Moderator</option>
                <option value="admin">🔑 Admin</option>
              </select>
            </div>
          ))}
        </>
      )}

      {subTab === "manage" && (
        <div style={{ padding: "12px 12px 0" }}>
          {["📌 Pins beheren", "⚙️ Straat instellingen", "🔗 Uitnodigingslink delen", "📊 Statistieken"].map(item => (
            <div key={item} style={{ ...s.adminCard, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <span style={{ fontSize: 13 }}>{item}</span>
              <span style={{ color: COLORS.textDim }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────

function SettingsView() {
  const [lang, setLang] = useState(0);
  const [notifs, setNotifs] = useState({ package: true, blockage: true, event: true, waste: false, incident: true, general: false });
  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>Profiel</div>
      <div style={{ padding: "0 12px" }}>
        {[{ label: "Naam", value: "Wendy F." }, { label: "Adres", value: "Reyer Anslostraat 52" }, { label: "Rol", value: "👑 Super Admin" }].map(item => (
          <div key={item.label} style={{ ...s.adminCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={s.sectionLabel}>Notificaties</div>
      <div style={{ padding: "0 12px" }}>
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <div key={key} style={{ ...s.adminCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>{c.emoji} {c.label}</span>
            <div onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} style={{ width: 36, height: 20, borderRadius: 10, background: notifs[key] ? COLORS.accent : COLORS.border, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: notifs[key] ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: notifs[key] ? "#000" : COLORS.textDim, transition: "left 0.2s" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={s.sectionLabel}>Taal / Language</div>
      <div style={{ padding: "0 12px" }}>
        <div style={s.adminCard}>
          <div style={{ display: "flex", gap: 8 }}>
            {["🇳🇱 Nederlands", "🇬🇧 English"].map((l, i) => (
              <div key={l} onClick={() => setLang(i)} style={{ flex: 1, textAlign: "center", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: lang === i ? 700 : 400, background: lang === i ? COLORS.accent : "none", color: lang === i ? "#000" : COLORS.textMuted, cursor: "pointer" }}>{l}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={s.sectionLabel}>Privacy & Data</div>
      <div style={{ padding: "0 12px" }}>
        <div style={{ ...s.adminCard, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Zo gaan we om met jouw data:</div>
          {["📦 Pakketje foto's worden na 7 dagen verwijderd", "🚨 Melding foto's worden na 30 dagen verwijderd", "🗑️ Grofvuil foto's worden na 14 dagen verwijderd", "📵 Geen telefoonnummers opgeslagen", "👁️ Alleen de Straat Admin ziet wie er lid is", "🔒 Gegevens worden niet gedeeld met derden"].map(item => (
            <div key={item} style={{ padding: "3px 0" }}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STREETS VIEW ─────────────────────────────────────────────────────────────

function StreetsView() {
  return (
    <div style={s.feed}>
      <div style={s.sectionLabel}>Jouw straten</div>
      {STREETS.map(st => (
        <div key={st.id} style={s.streetCard}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{st.name}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, display: "flex", gap: 12 }}>
            <span>🏠 {st.households} adressen</span><span>👥 {st.members} bewoners</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
            {st.id === 1 && <span style={s.badge(COLORS.accent)}>👑 ADMIN</span>}
            <span style={s.badge(COLORS.blue)}>LID</span>
          </div>
        </div>
      ))}
      <div style={s.sectionLabel}>Andere straten</div>
      <div style={{ ...s.streetCard, opacity: 0.5 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>+ Nieuwe straat aanvragen...</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function Streetfeed() {
  const [tab, setTab] = useState("feed");
  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [pending, setPending] = useState(PENDING_MEMBERS);
  const [members, setMembers] = useState(MEMBERS);
  const [showPost, setShowPost] = useState(false);
  const [eventDetail, setEventDetail] = useState(null);
  const [reportedToast, setReportedToast] = useState(false);

  const isAdmin = true; // Wendy is admin
  const pinnedPosts = posts.filter(p => p.streetId === 1 && p.pinned);
  const regularPosts = posts.filter(p => p.streetId === 1 && !p.pinned && (filter === "all" || p.category === filter));

  const handleLike = (id) => setPosts(ps => ps.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));

  const handleRsvp = (id, type) => {
    const update = (p) => {
      if (p.id !== id) return p;
      const rsvp = { yes: [...p.rsvp.yes], maybe: [...p.rsvp.maybe], no: [...p.rsvp.no] };
      if (p.myRsvp) rsvp[p.myRsvp] = rsvp[p.myRsvp].filter(n => n !== "Wendy F.");
      const newType = p.myRsvp === type ? null : type;
      if (newType) rsvp[newType] = [...rsvp[newType], "Wendy F."];
      return { ...p, myRsvp: newType, rsvp };
    };
    setPosts(ps => ps.map(update));
    if (eventDetail?.id === id) setEventDetail(update);
  };

  const handleReport = (id) => {
    if (isAdmin) {
      setPosts(ps => ps.filter(p => p.id !== id));
    } else {
      setPosts(ps => ps.map(p => p.id === id ? { ...p, reported: true } : p));
      setReportedToast(true);
      setTimeout(() => setReportedToast(false), 2500);
    }
  };

  const handleNewPost = ({ cat, title, body, endDate, eventDate, eventTime, eventLocation, bringItems, licenseplate }) => {
    const isEvent = cat === "event";
    setPosts(ps => [{
      id: Date.now(), streetId: 1, category: cat,
      pinned: CATEGORIES[cat]?.pinnable && !!endDate,
      author: "Wendy F.", role: "admin", time: "zojuist",
      title, body, endDate: endDate || null, likes: 0, comments: 0, reported: false,
      ...(licenseplate ? { licenseplate } : {}),
      ...(isEvent ? { eventDate, eventTime, eventLocation, bringList: bringItems ? bringItems.split(",").map(i => i.trim()) : [], rsvp: { yes: ["Wendy F."], maybe: [], no: [] }, myRsvp: "yes" } : {}),
    }, ...ps]);
  };

  return (
    <div style={s.app}>
      {/* Toast */}
      {reportedToast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: COLORS.surface, border: `1px solid ${COLORS.red}`, borderRadius: 10, padding: "10px 20px", fontSize: 13, color: COLORS.text, zIndex: 200, whiteSpace: "nowrap" }}>
          🚩 Bericht gemeld bij de moderator
        </div>
      )}

      <div style={s.header}>
        <div style={s.logo}>Street<span style={s.accent}>feed</span></div>
        <div style={s.streetBadge}>📍 Reyer Anslostraat</div>
      </div>

      {tab === "feed" && (
        <div style={s.feed}>
          <div style={s.filterBar}>
            <div style={s.filterChip(filter === "all")} onClick={() => setFilter("all")}>Alles</div>
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <div key={key} style={s.filterChip(filter === key)} onClick={() => setFilter(key)}>{c.emoji} {c.label}</div>
            ))}
          </div>
          {pinnedPosts.length > 0 && filter === "all" && (
            <><div style={s.sectionLabel}>📌 Vastgepind</div>
            {pinnedPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} isAdmin={isAdmin} />)}</>
          )}
          <div style={s.sectionLabel}>Recente berichten</div>
          {regularPosts.length === 0 ? <div style={s.emptyState}>Geen berichten in deze categorie</div>
            : regularPosts.map(p => <PostCard key={p.id} post={p} onLike={handleLike} onRsvp={handleRsvp} onOpenEvent={setEventDetail} onReport={handleReport} isAdmin={isAdmin} />)}
        </div>
      )}
      {tab === "streets" && <StreetsView />}
      {tab === "admin" && <AdminView pending={pending} onApprove={id => setPending(p => p.filter(m => m.id !== id))} onReject={id => setPending(p => p.filter(m => m.id !== id))} members={members} onRoleChange={(id, role) => setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m))} />}
      {tab === "settings" && <SettingsView />}

      {tab === "feed" && <button style={s.fab} onClick={() => setShowPost(true)}>+</button>}

      <div style={s.tabBar}>
        {[{ id: "feed", icon: "🏠", label: "Feed" }, { id: "streets", icon: "🗺️", label: "Straten" }, { id: "admin", icon: "👑", label: "Beheer", badge: pending.length }, { id: "settings", icon: "⚙️", label: "Instellingen" }].map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 18, position: "relative" }}>
              {t.icon}
              {t.badge > 0 && <span style={{ position: "absolute", top: -4, right: -6, fontSize: 9, background: COLORS.red, color: "#fff", borderRadius: "50%", padding: "1px 4px" }}>{t.badge}</span>}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {showPost && <NewPostSheet onClose={() => setShowPost(false)} onSubmit={handleNewPost} />}
      {eventDetail && <EventDetailSheet post={eventDetail} onClose={() => setEventDetail(null)} onRsvp={handleRsvp} />}
    </div>
  );
}
