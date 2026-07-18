// One-off ops action, done via migration instead of scripts/grant-super-admin.js
// because production has no working way to run that script right now: no SSH
// to the NAS, and Portainer's Console/exec feature has never connected
// reliably for this account. Migrations already run automatically on every
// backend boot (runMigrations()), so this piggybacks on the one deploy path
// that's actually proven reliable: git push -> CI build -> Portainer "Pull
// and Redeploy".
//
// Safe on any database: a no-op if the user doesn't exist yet (e.g. a fresh
// dev database), and re-setting is_super_admin = true on an account that
// already has it does nothing harmful.

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
UPDATE users SET is_super_admin = true WHERE email = 'wendy@fred6.nl';
  `);
}

export async function down(pgm) {
  pgm.sql(`
UPDATE users SET is_super_admin = false WHERE email = 'wendy@fred6.nl';
  `);
}
