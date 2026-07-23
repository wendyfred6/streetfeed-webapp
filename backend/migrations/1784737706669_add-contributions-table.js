export const shorthands = undefined;

// FRE-403: Hall of Fame achievements are historical facts, not something
// recalculated from whichever posts happen to still exist — a resident's
// 100th accepted package stays their 100th accepted package even after that
// post expires (FRE-402). An immutable, append-only event log (one row per
// qualifying action, written once at post-creation time) is the mechanism:
// it makes every time window (week/month/year/all-time) the same date-range
// query against permanent rows, rather than needing a separate "live query
// for recent windows, counter for old ones" split.
export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS contributions (
      id         SERIAL PRIMARY KEY,
      user_id    INT REFERENCES users(id) ON DELETE SET NULL,
      street_id  INT REFERENCES streets(id) ON DELETE CASCADE,
      category   TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_contributions_street_category_created
      ON contributions(street_id, category, created_at);
    CREATE INDEX IF NOT EXISTS idx_contributions_user_street_category
      ON contributions(user_id, street_id, category);
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS contributions;`);
}
