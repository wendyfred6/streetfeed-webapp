import { describe, it, expect } from 'vitest';
import { getPublicUrl } from './storage.js';

describe('getPublicUrl', () => {
  it('builds the local-disk upload URL for a given key', () => {
    expect(getPublicUrl('abc123.jpg')).toBe('/api/uploads/abc123.jpg');
  });
});
