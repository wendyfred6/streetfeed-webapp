import express from 'express';
// Must be imported before any route files — patches Express's router so
// rejected promises in async handlers/middleware reach the error middleware
// below instead of hanging the request with no response.
import 'express-async-errors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import streetsRoutes from './routes/streets.js';
import uploadRoutes from './routes/upload.js';
import pushRoutes from './routes/push.js';
import bagRoutes from './routes/bag.js';
import notificationsRoutes from './routes/notifications.js';
import { runMigrations } from './db/index.js';
import { runPhotoRetention } from './services/retention.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));
app.use('/api/auth', authRoutes);
app.use('/api/streets', streetsRoutes);
app.use('/api/streets', postsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/bag', bagRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

const DAY_MS = 24 * 60 * 60 * 1000;

// Exported so tests can await startup and get a handle to close the server
// (see smoke.test.js) — runtime behavior when run directly is unchanged.
export default runMigrations()
  .then(() => new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Streetfeed API listening on :${PORT}`);
      resolve(server);
    });
  }))
  .then((server) => {
    runPhotoRetention().catch(err => console.error('[retention] initial run failed:', err));
    // unref() so this timer alone never keeps the process alive (relevant
    // for tests, which boot this same default export and expect a clean exit).
    setInterval(() => {
      runPhotoRetention().catch(err => console.error('[retention] scheduled run failed:', err));
    }, DAY_MS).unref();
    return server;
  })
  .catch(err => { console.error('Startup failed:', err); process.exit(1); });
