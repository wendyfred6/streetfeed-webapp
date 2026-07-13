// One-off ops script — grants super-admin to an existing user by email.
// Not run automatically on startup/migration; invoke explicitly when needed:
//
//   node scripts/grant-super-admin.js someone@example.com
//
// (or `docker-compose exec backend node scripts/grant-super-admin.js someone@example.com`
// against the running container). See README.md "First-time super admin setup".

import 'dotenv/config';
import { query } from '../src/db/index.js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/grant-super-admin.js <email>');
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();

const { rows } = await query(
  'UPDATE users SET is_super_admin = true WHERE email = $1 RETURNING id, email',
  [normalizedEmail]
);

if (!rows.length) {
  console.error(`No user found with email ${normalizedEmail} — they must log in via magic link at least once first.`);
  process.exit(1);
}

console.log(`Granted super-admin to ${rows[0].email} (user id ${rows[0].id}).`);
process.exit(0);
