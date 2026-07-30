export const shorthands = undefined;

// FRE-371: comment edit-own support — nullable, set only when a resident
// edits their own comment body (never touched by comment creation), so the
// UI can show a subtle "Edited" label without a separate boolean column.
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE comments DROP COLUMN IF EXISTS edited_at;`);
}
