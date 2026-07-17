// FRE-368: Lost & Found's Gevonden (Found) type needs a required pickup-
// location field, not asked for Verloren (Lost). Distinct from the existing
// `event_location` column, which is Evenement-specific and its own separate
// tracked gap (FRE-355) — not something to repurpose here.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pickup_location TEXT;
  `);
}

export async function down(pgm) {
  pgm.sql(`
ALTER TABLE posts DROP COLUMN IF EXISTS pickup_location;
  `);
}
