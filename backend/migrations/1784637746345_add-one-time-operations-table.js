// Generic ledger for one-off administrative operations that must never run
// twice — e.g. the temporary pre-Founding-Residents clean-slate reset
// (see backend/src/routes/adminReset.js, itself a temporary file deleted
// after use). This table is schema, so it's a real migration; the actual
// destructive data operation is NOT — it lives in the temporary endpoint
// instead, invoked explicitly by a super admin, not run automatically on
// deploy. Left in place after the endpoint is removed (a single harmless
// row/empty table isn't worth a follow-up migration to drop, and every
// migration is one more chance to repeat 2026-07-20's timestamp-ordering
// incident).
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
CREATE TABLE IF NOT EXISTS one_time_operations (
  key TEXT PRIMARY KEY,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
  `);
}

export async function down(pgm) {
  pgm.sql(`
DROP TABLE IF EXISTS one_time_operations;
  `);
}
