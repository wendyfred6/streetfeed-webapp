import { COLORS } from '../design/tokens.js';
import { t } from '../i18n/index.js';

// Shared body renderer for Terms/Privacy content — used both by LegalSheet
// (onboarding's consent step) and the Account page's inline accordion, so
// the two surfaces can never drift onto two different copies of the legal
// text (FRE-397/398). `sectionsKey` resolves to an array of
// { heading, body } or { heading, list } entries; `streetName` fills the
// one section (Privacy's "Zichtbaarheid") that names the resident's actual
// street, falling back to a generic phrase if no street name is available yet.
function interpolateStreet(str, streetName) {
  if (typeof str !== 'string') return str;
  return str.replace('{street}', streetName || t('legal_your_street_fallback'));
}

export default function LegalContent({ introKey, sectionsKey, contactCtaKey, streetName }) {
  const intro = t(introKey);
  const sections = t(sectionsKey);
  const contactCta = contactCtaKey ? t(contactCtaKey) : null;

  return (
    <div style={{ fontSize: 12, lineHeight: '18px', color: COLORS.text }}>
      <p style={{ margin: '0 0 12px' }}>{intro}</p>
      {sections.map((section, i) => (
        <div key={section.heading} style={{ marginBottom: i < sections.length - 1 ? 12 : 0 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{section.heading}</div>
          {section.list ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {section.list.map(item => <li key={item}>{interpolateStreet(item, streetName)}</li>)}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>{interpolateStreet(section.body, streetName)}</p>
          )}
        </div>
      ))}
      {contactCta && (
        <p style={{ margin: '12px 0 0', textDecoration: 'underline' }}>{contactCta}</p>
      )}
    </div>
  );
}
