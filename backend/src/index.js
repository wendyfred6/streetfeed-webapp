import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import streetsRoutes from './routes/streets.js';
import uploadRoutes from './routes/upload.js';
import pushRoutes from './routes/push.js';
import rdwRoutes from './routes/rdw.js';
import { runMigrations } from './db/index.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/uploads', express.static(UPLOAD_DIR));
app.use('/api/auth', authRoutes);
app.use('/api/streets', streetsRoutes);
app.use('/api/streets', postsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/rdw', rdwRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

runMigrations()
  .then(() => app.listen(PORT, () => console.log(`Streetfeed API listening on :${PORT}`)))
  .catch(err => { console.error('Startup failed:', err); process.exit(1); });
