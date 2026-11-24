import { createHmac, timingSafeEqual } from 'node:crypto';

// Signed login cookie for staff Quick edits (/edit)
export const env = (k: string) => (import.meta.env[k] as string | undefined) || process.env[k] || '';
export const EDIT_COOKIE = 'ht_edit';
const secret = () => env('EDIT_SECRET') || env('KEYSTATIC_SECRET') || 'ht:' + env('EDIT_PASSWORD');
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url');

export const makeSession = (days: number) => {
  const v = String(Date.now() + days * 86400000);
  return `${v}.${sign(v)}`;
};
export const validSession = (cookie?: string) => {
  if (!cookie) return false;
  const [v, s] = cookie.split('.');
  if (!v || !s) return false;
  const a = Buffer.from(sign(v)), b = Buffer.from(s);
  return a.length === b.length && timingSafeEqual(a, b) && Number(v) > Date.now();
};
