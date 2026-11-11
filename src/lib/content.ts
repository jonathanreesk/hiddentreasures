import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

export const reader = createReader(process.cwd(), keystaticConfig);

export const img = (src?: string | null) => {
  if (!src) return '';
  if (src.startsWith('/') || src.startsWith('http')) return src;
  return `/images/uploads/${src}`;
};

export const paragraphs = (text?: string | null) =>
  (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return { y, m, day };
};
export const monthShort = (d: string) => MONTHS[parse(d).m - 1].toUpperCase();
export const dayNum = (d: string) => String(parse(d).day);
export const dateLong = (d: string) => {
  const { y, m, day } = parse(d);
  return `${MONTHS[m - 1]} ${day}, ${y}`;
};
export const dateRange = (start: string, end?: string | null) => {
  if (!end || end === start) return dateLong(start);
  const a = parse(start);
  const b = parse(end);
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m - 1]} ${a.day} to ${b.day}, ${a.y}`;
  return `${dateLong(start)} to ${dateLong(end)}`;
};

export type Post = Awaited<ReturnType<typeof getPosts>>[number];

export async function getPosts() {
  const all = await reader.collections.events.all();
  return all
    .map(({ slug, entry }) => ({ slug, ...entry, image: img(entry.image) }))
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
}

export async function getStories() {
  const all = await reader.collections.stories.all();
  return all
    .map(({ slug, entry }) => ({ slug, ...entry, photo: img(entry.photo) }))
    .sort((a, b) => (a.order ?? 10) - (b.order ?? 10));
}

export const typeLabel: Record<string, string> = { event: 'Event', sale: 'Sale', news: 'News' };

/** Turn a YouTube or Vimeo link into an embeddable player URL. */
export function videoEmbed(url?: string | null) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return '';
}
