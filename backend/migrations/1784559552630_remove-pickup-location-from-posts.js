// Reverts the pickup_location column added this same session
// (1784269180089_add-pickup-location-to-posts.js, FRE-368). Product
// direction changed before the pilot ever launched: the pickup location
// for a Gevonden (Found) post is the finder's own address, already known
// via the post author's profile (users.house_number / posts' author_house
// join) -- it should be derived and displayed, not manually entered as a
// separate field. Zero production data ever used this column, so this is
// a clean rollback, not a backward-compat-preserving deprecation.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
ALTER TABLE posts DROP COLUMN IF EXISTS pickup_location;
  `);
}

export async function down(pgm) {
  pgm.sql(`
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pickup_location TEXT;
  `);
}
