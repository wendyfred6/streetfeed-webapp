// The baseline migration's households=111 for Reyer Anslostraat was a
// placeholder guess from before this app had any real address data. Verified
// against the actual BAG register (PDOK Locatieserver, the same source
// backend/src/routes/bag.js already uses live for onboarding) on 2026-07-25:
// 85 unique addresses (house numbers 1-30, including letter/toevoeging
// suffixes), not 111.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
UPDATE streets SET households = 85 WHERE name = 'Reyer Anslostraat';
  `);
}

export async function down(pgm) {
  pgm.sql(`
UPDATE streets SET households = 111 WHERE name = 'Reyer Anslostraat';
  `);
}
