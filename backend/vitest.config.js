import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Smoke tests boot a full app instance (including schema migrations)
    // against a shared Postgres. Running test files in parallel workers lets
    // two "CREATE TABLE IF NOT EXISTS" runs race each other on Postgres's
    // catalog, which isn't guaranteed atomic under concurrent DDL — surfaced
    // by adding a second full-boot smoke test alongside src/smoke.test.js
    // (FRE-322). Files still run in one process, just not concurrently.
    fileParallelism: false,
  },
});
