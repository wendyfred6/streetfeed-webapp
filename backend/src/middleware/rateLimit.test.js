import { describe, it, expect } from 'vitest';
import { clientIp } from './rateLimit.js';

// FRE-346: without this, the rate limiter's default req.ip-based keying
// resolves to the frontend nginx container's address for every visitor in
// production (behind Cloudflare Tunnel), turning a per-visitor limit into
// one shared bucket for the whole site.
describe('clientIp', () => {
  it('prefers cf-connecting-ip when Cloudflare sets it', () => {
    const req = { headers: { 'cf-connecting-ip': '203.0.113.7' }, ip: '10.0.0.5' };
    expect(clientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to req.ip when there is no Cloudflare in front (local dev)', () => {
    const req = { headers: {}, ip: '127.0.0.1' };
    expect(clientIp(req)).toBe('127.0.0.1');
  });

  it('treats two different Cloudflare-reported clients as distinct keys', () => {
    const a = { headers: { 'cf-connecting-ip': '203.0.113.7' }, ip: '10.0.0.5' };
    const b = { headers: { 'cf-connecting-ip': '198.51.100.2' }, ip: '10.0.0.5' };
    expect(clientIp(a)).not.toBe(clientIp(b));
  });
});
