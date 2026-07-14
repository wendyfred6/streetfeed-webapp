// FRE-336: carrier and location are both confirmed dead — neither column
// appears in posts' INSERT or UPDATE column lists (routes/posts/crud.js),
// so nothing has written to them since at least the M3 category rework.
// `location` was already explicitly superseded before that, per the old
// schema.sql comment: "Migratie: Van/Tot huisnummers (vervangt location
// voor adresbereik)" — start_house/end_house replaced it. `carrier` has
// its own "legacy weergave voor oudere posts" comment in PostCard.jsx.
//
// event_location was NOT included here despite looking similar (also
// absent from crud.js) — it has dedicated, non-generic i18n strings
// (event_location_placeholder: "E.g. in front of no. 24-28") suggesting
// an intended-but-never-wired form field rather than an abandoned one.
// See FRE-336's end-report / the follow-up issue filed for that gap.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
ALTER TABLE posts DROP COLUMN IF EXISTS carrier;
ALTER TABLE posts DROP COLUMN IF EXISTS location;
  `);
}

export async function down(pgm) {
  pgm.sql(`
ALTER TABLE posts ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT;
  `);
}
