import { z } from 'zod';

// Current CategoryPicker top-level keys (frontend/src/utils/categories.js).
// Legacy category strings ('package', 'works', 'incident', ...) only ever
// exist on posts created before the M2 rename migration — new posts can't
// be created with them, so create-time validation doesn't need to tolerate
// them the way edit/read paths do.
const CURRENT_CATEGORIES = ['bezorging', 'straatzaken', 'melding', 'lostandfound', 'evenement', 'algemeen'];

export const createPostSchema = z.object({
  category: z.enum(CURRENT_CATEGORIES),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  subType: z.string().max(50).optional(),
  startHouse: z.string().max(20).optional(),
  endHouse: z.string().max(20).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  startTime: z.string().max(16).optional(),
  endTime: z.string().max(16).optional(),
  eventDate: z.string().max(32).optional(),
  eventTime: z.string().max(16).optional(),
  bringList: z.array(z.string().max(100)).max(50).optional(),
  photoKey: z.string().max(500).optional(),
  link: z.string().max(500).optional(),
  allowJoin: z.boolean().optional(),
});

// Edit allows omitting a field (keep existing value) or sending an empty
// string (explicitly clear it) — see posts/crud.js's `!== undefined ? ... :
// post.x` pattern. Only `title` can't be blanked, matching the frontend's
// submit button (disabled until title.trim()).
export const editPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  link: z.string().max(500).optional(),
  startHouse: z.string().max(20).optional(),
  endHouse: z.string().max(20).optional(),
  startDate: z.string().max(32).optional(),
  endDate: z.string().max(32).optional(),
  startTime: z.string().max(16).optional(),
  endTime: z.string().max(16).optional(),
  eventDate: z.string().max(32).optional(),
  eventTime: z.string().max(16).optional(),
  subType: z.string().max(50).optional(),
  bringList: z.array(z.string().max(100)).max(50).optional(),
  photoKey: z.string().max(500).optional(),
});

export const pinPostSchema = z.object({
  pinned: z.boolean(),
  endDate: z.string().max(32).optional(),
});

export const resolvePostSchema = z.object({
  resolved: z.boolean(),
});

export const rsvpSchema = z.object({
  type: z.enum(['yes', 'maybe', 'no']),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
