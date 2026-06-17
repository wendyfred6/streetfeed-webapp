// ─── DEMO API CLIENT ───────────────────────────────────────────────────────────
// Handles all API calls in demo mode without hitting any real backend.
// State is kept in-memory (resets on page reload — that's fine for a demo).

import {
  DEMO_USER, DEMO_STREET,
  DEMO_POSTS, DEMO_PENDING, DEMO_MEMBERS, DEMO_PUSH_SETTINGS, DEMO_HALL_OF_FAME,
  DEMO_NOTIFICATIONS,
} from './data.js';

// Deep-clone initial state so mutations don't affect the originals
let posts         = JSON.parse(JSON.stringify(DEMO_POSTS));
let pending       = JSON.parse(JSON.stringify(DEMO_PENDING));
let members       = JSON.parse(JSON.stringify(DEMO_MEMBERS));
let push          = { ...DEMO_PUSH_SETTINGS };
let notifications = JSON.parse(JSON.stringify(DEMO_NOTIFICATIONS));

const delay = () => new Promise(r => setTimeout(r, 150 + Math.random() * 200));

export async function demoRequest(method, path, body) {
  await delay();

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (method === 'GET'  && path === '/auth/me')     return DEMO_USER;
  if (method === 'POST' && path === '/auth/logout') return null;

  // ── Streets ───────────────────────────────────────────────────────────────
  if (method === 'GET' && path === '/streets/1') return { ...DEMO_STREET };
  if (method === 'GET' && path === '/streets')   return [{ ...DEMO_STREET }];
  if (method === 'GET' && path === '/streets/1/hall-of-fame') return JSON.parse(JSON.stringify(DEMO_HALL_OF_FAME));

  // ── Posts ─────────────────────────────────────────────────────────────────
  if (method === 'GET' && path.startsWith('/streets/1/posts')) {
    const qs = path.includes('?') ? new URLSearchParams(path.split('?')[1]) : null;
    const cat = qs?.get('category');
    const result = cat ? posts.filter(p => p.category === cat) : posts;
    return JSON.parse(JSON.stringify(result));
  }

  if (method === 'POST' && path === '/streets/1/posts') {
    const newPost = {
      id: Date.now(),
      category:       body.category,
      sub_type:       body.subType || null,
      title:          body.title,
      body:           body.body || '',
      pinned:         body.pinned || false,
      start_house:    body.startHouse || null,
      end_house:      body.endHouse || null,
      start_date:     body.startDate || null,
      end_date:       body.endDate || null,
      start_time:     body.startTime || null,
      end_time:       body.endTime || null,
      event_date:     body.eventDate || null,
      event_time:     body.eventTime || null,
      event_location: body.eventLocation || null,
      bring_list:     body.bringList || [],
      license_plate:  body.licensePlate || null,
      photo_key:      body.photoKey || null,
      link:           body.link || null,
      carrier:        body.carrier || null,
      attachment_name: body.attachmentName || null,
      allow_join:     body.allowJoin || false,
      joiners:        body.allowJoin ? [] : undefined,
      my_join:        false,
      rsvp:           body.category === 'event' ? { yes: [DEMO_USER.name], maybe: [], no: [] } : undefined,
      my_rsvp:        body.category === 'event' ? 'yes' : undefined,
      author_name:    DEMO_USER.name,
      author_role:    'admin',
      likes: 0, liked: false, comments: 0,
      created_at:     new Date().toISOString(),
      reported: false,
    };
    posts = [newPost, ...posts];
    return newPost;
  }

  // Like
  const likeM = path.match(/^\/streets\/1\/posts\/(\d+)\/like$/);
  if (method === 'POST' && likeM) {
    const post = posts.find(p => p.id === +likeM[1]);
    if (post) { post.liked = !post.liked; post.likes += post.liked ? 1 : -1; }
    return { liked: post?.liked };
  }

  // RSVP
  const rsvpM = path.match(/^\/streets\/1\/posts\/(\d+)\/rsvp$/);
  if (method === 'POST' && rsvpM) {
    const post = posts.find(p => p.id === +rsvpM[1]);
    if (post?.rsvp) {
      if (post.my_rsvp) post.rsvp[post.my_rsvp] = post.rsvp[post.my_rsvp].filter(n => n !== DEMO_USER.name);
      const next = body.type === post.my_rsvp ? null : body.type;
      if (next) post.rsvp[next] = [...post.rsvp[next], DEMO_USER.name];
      post.my_rsvp = next;
      return { rsvp: next };
    }
    return { rsvp: null };
  }

  // Delete post
  const delPostM = path.match(/^\/streets\/1\/posts\/(\d+)$/);
  if (method === 'DELETE' && delPostM) {
    posts = posts.filter(p => p.id !== +delPostM[1]);
    return null;
  }

  // Report post
  const reportM = path.match(/^\/streets\/1\/posts\/(\d+)\/report$/);
  if (method === 'POST' && reportM) {
    const post = posts.find(p => p.id === +reportM[1]);
    if (post) post.reported = true;
    return null;
  }

  // Join / Ik doe mee
  const joinM = path.match(/^\/streets\/1\/posts\/(\d+)\/join$/);
  if (method === 'POST' && joinM) {
    const post = posts.find(p => p.id === +joinM[1]);
    if (post) {
      post.my_join = !post.my_join;
      if (post.my_join) {
        post.joiners = [...(post.joiners || []), DEMO_USER.name];
      } else {
        post.joiners = (post.joiners || []).filter(n => n !== DEMO_USER.name);
      }
      return { joined: post.my_join };
    }
    return { joined: false };
  }

  // ── Admin: pending queue ───────────────────────────────────────────────────
  if (method === 'GET' && path === '/streets/1/pending') return JSON.parse(JSON.stringify(pending));

  const approveM = path.match(/^\/streets\/1\/pending\/(\d+)\/approve$/);
  if (method === 'POST' && approveM) {
    pending = pending.filter(p => p.id !== +approveM[1]);
    return null;
  }

  const rejectM = path.match(/^\/streets\/1\/pending\/(\d+)$/);
  if (method === 'DELETE' && rejectM) {
    pending = pending.filter(p => p.id !== +rejectM[1]);
    return null;
  }

  // ── Admin: members ─────────────────────────────────────────────────────────
  if (method === 'GET' && path === '/streets/1/members') return JSON.parse(JSON.stringify(members));

  const roleM = path.match(/^\/streets\/1\/members\/(\d+)\/role$/);
  if (method === 'PATCH' && roleM) {
    const m = members.find(m => m.id === +roleM[1]);
    if (m) m.role = body.role;
    return null;
  }

  // ── Push settings ──────────────────────────────────────────────────────────
  if (method === 'GET'   && path === '/push/settings') return { ...push };
  if (method === 'PATCH' && path === '/push/settings') { push = { ...push, ...body.settings }; return null; }

  // ── Notificatie-inbox ────────────────────────────────────────────────────
  if (method === 'GET' && path === '/notifications') {
    return JSON.parse(JSON.stringify(notifications));
  }
  if (method === 'GET' && path === '/notifications/unread-count') {
    return { count: notifications.filter(n => !n.read_at).length };
  }
  if (method === 'POST' && path === '/notifications/read-all') {
    notifications = notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
    return { ok: true };
  }

  // ── BAG huisnummers (Reyer Anslostraat: oneven 1-29, even 2-30) ─────────────
  const bagM = path.match(/^\/bag\/addresses\/(\d+)$/);
  if (method === 'GET' && bagM) {
    const suffixes = ['hs', '1', '2', '3', '4'];
    const result = [];
    for (let n = 1; n <= 29; n += 2) for (const sf of suffixes) result.push(`${n}-${sf}`);
    for (let n = 2; n <= 30; n += 2) for (const sf of suffixes) result.push(`${n}-${sf}`);
    return result;
  }

  // ── Upload presign (no-op in demo) ─────────────────────────────────────────
  if (method === 'POST' && path === '/upload/presign') {
    return { url: 'https://example.com/demo-upload', key: 'demo/placeholder.jpg' };
  }

  console.warn('[demo] Unhandled request:', method, path, body);
  return null;
}
