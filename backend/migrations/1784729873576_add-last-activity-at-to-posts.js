export const shorthands = undefined;

// FRE-402: true post-object retention needs an explicit "activity" concept
// (creation / edit / new comment), not the database's own updated_at —
// activity is a product decision about what counts, not a storage mechanic.
export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE posts SET last_activity_at = created_at;
  `);
}

export async function down(pgm) {
  pgm.sql(`ALTER TABLE posts DROP COLUMN IF EXISTS last_activity_at;`);
}
