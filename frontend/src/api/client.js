import { demoRequest } from '../demo/client.js';

export const isDemoMode = new URLSearchParams(window.location.search).has('demo');

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(method, path, body) {
  if (isDemoMode) return demoRequest(method, path, body);

  const isFormData = body instanceof FormData;

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    // FormData sets its own multipart Content-Type (with boundary) — let
    // fetch handle that itself rather than overriding it with JSON.
    headers: (body && !isFormData) ? { 'Content-Type': 'application/json' } : {},
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
};
