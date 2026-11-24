import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { parse, stringify } from 'yaml';
import { env, EDIT_COOKIE as COOKIE, makeSession as newSession, validSession } from '../../lib/edit-session';

// Quick edits for store staff (/edit). One shared password, no personal accounts.
// Each save is committed to GitHub, and Vercel republishes the site in about a minute.
//
// Vercel > Settings > Environment Variables:
//   EDIT_PASSWORD       the shared staff password (at least 8 characters)
//   GITHUB_TOKEN        fine-grained GitHub token: only the hiddentreasures repo, Contents: Read and write
//   PUBLIC_GITHUB_REPO  owner/name, for example jonathanreesk/hiddentreasures
//   EDIT_SECRET         optional, any long random text (falls back to KEYSTATIC_SECRET)
export const prerender = false;

const PASSWORD = () => env('EDIT_PASSWORD');
const TOKEN = () => env('GITHUB_TOKEN');
const REPO = () => env('PUBLIC_GITHUB_REPO');
const BRANCH = () => env('EDIT_BRANCH') || 'main';
const API = () => env('GITHUB_API_URL') || 'https://api.github.com';
const SESSION_DAYS = 7;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const fail = (error: string, status = 400) => json({ ok: false, error }, status);

// ---------------------------------------------------------------- sessions
const makeSession = () => newSession(SESSION_DAYS);
const sameText = (a: string, b: string) => {
  const ha = createHmac('sha256', 'cmp').update(a).digest(), hb = createHmac('sha256', 'cmp').update(b).digest();
  return timingSafeEqual(ha, hb);
};

// Lockout: 5 wrong passwords from one address locks it for 15 minutes
const tries = new Map<string, { n: number; until: number }>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- GitHub
async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API()}/repos/${REPO()}/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN()}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'hidden-treasures-quick-edits',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  return res;
}
async function getFile(path: string) {
  const res = await gh(`contents/${path}?ref=${BRANCH()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const j = await res.json();
  return { sha: j.sha as string, text: Buffer.from(j.content, 'base64').toString('utf8') };
}
async function putFile(path: string, content: string | Buffer, message: string, sha?: string) {
  const res = await gh(`contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), branch: BRANCH(), ...(sha ? { sha } : {}), committer: { name: 'Hidden Treasures staff', email: 'hello@hiddentreasuresmn.org' } }),
  });
  if (res.status === 409 || res.status === 422) throw new Error('Someone else just saved this. Reload the page and try again.');
  if (!res.ok) throw new Error(`GitHub save failed (${res.status})`);
}
async function deleteFile(path: string, sha: string, message: string) {
  const res = await gh(`contents/${path}`, { method: 'DELETE', body: JSON.stringify({ message, sha, branch: BRANCH() }) });
  if (!res.ok) throw new Error(`GitHub delete failed (${res.status})`);
}
const readYaml = async (path: string) => {
  const f = await getFile(path);
  return { sha: f?.sha, data: (f ? parse(f.text) : {}) ?? {} };
};
const writeYaml = (path: string, data: unknown, message: string, sha?: string) =>
  putFile(path, stringify(data, { schema: 'yaml-1.1', lineWidth: 0, indentSeq: false, singleQuote: true }), message, sha);

// ---------------------------------------------------------------- cleaning input
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strOrNull = (v: unknown, max = 2000) => str(v, max) || null;
const bool = (v: unknown) => v === true || v === 'true' || v === 'on';
const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const url = (v: unknown) => {
  const s = str(v, 500);
  return /^https?:\/\//i.test(s) ? s : null;
};
const link = (v: unknown) => {
  const s = str(v, 500);
  return /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(s) ? s : s ? '/' + s.replace(/^\/+/, '') : '';
};
// Uploaded videos live in /public/videos (older ones) or in Vercel Blob storage
const videoPath = (v: unknown) => {
  const s = str(v, 400);
  return /^\/videos\/[\w\-.]+$/.test(s) || /^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\/[\w\-./%]+$/.test(s) ? s : null;
};
const imagePath = (v: unknown) => {
  const s = str(v, 300);
  return /^\/images\/[\w\-./]+$/.test(s) ? s : null;
};
const hour = (v: unknown, def: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 24 ? n : def;
};
const rows = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((r) => ({ days: str(r?.days, 60), hours: str(r?.hours, 60) }))
    .filter((r) => r.days || r.hours)
    .slice(0, 12);
const TAG_COLORS = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'pink', 'white'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 70) || 'post';

const FILES = {
  announcement: 'content/announcement.yaml',
  homeVideo: 'content/home-video.yaml',
  tagSale: 'content/tag-sale.yaml',
  settings: 'content/settings.yaml',
  gallery: 'content/gallery.yaml',
};
const EVENTS = 'content/events';

// ---------------------------------------------------------------- handler
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (request.headers.get('x-ht-edit') !== '1') return fail('Bad request', 400);
  if (!PASSWORD() || !TOKEN() || !REPO()) return fail('Quick edits are not set up yet. Ask Jonathan to add EDIT_PASSWORD and GITHUB_TOKEN in Vercel.', 503);
  if (PASSWORD().length < 8) return fail('The staff password in Vercel must be at least 8 characters.', 503);

  let body: any;
  try { body = await request.json(); } catch { return fail('Bad request'); }
  const action = String(body?.action || '');

  // ---- login / logout
  if (action === 'login') {
    const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
    const t = tries.get(ip);
    if (t && t.until > Date.now()) return fail(`Too many wrong tries. Please wait ${Math.ceil((t.until - Date.now()) / 60000)} minutes.`, 429);
    if (!sameText(String(body.password ?? ''), PASSWORD())) {
      const n = (t && t.until > Date.now() - 900000 ? t.n : 0) + 1;
      tries.set(ip, { n, until: n >= 5 ? Date.now() + 15 * 60000 : 0 });
      await sleep(900);
      return fail(n >= 5 ? 'Too many wrong tries. Please wait 15 minutes.' : 'That password is not right. Please try again.', 401);
    }
    tries.delete(ip);
    cookies.set(COOKIE, makeSession(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: SESSION_DAYS * 86400 });
    return json({ ok: true });
  }
  if (action === 'logout') {
    cookies.delete(COOKIE, { path: '/' });
    return json({ ok: true });
  }
  if (action === 'check') return json({ ok: validSession(cookies.get(COOKIE)?.value) });

  if (!validSession(cookies.get(COOKIE)?.value)) return fail('Please log in again.', 401);

  try {
    // ---- load everything
    if (action === 'load') {
      const [announcement, homeVideo, tagSale, settings, gallery] = await Promise.all(Object.values(FILES).map((p) => readYaml(p).then((r) => r.data)));
      const dir = await gh(`contents/${EVENTS}?ref=${BRANCH()}`);
      const list: { name: string }[] = dir.ok ? await dir.json() : [];
      const events = await Promise.all(
        list.filter((f) => f.name.endsWith('.yaml')).map(async (f) => {
          const r = await readYaml(`${EVENTS}/${f.name}`);
          return { slug: f.name.replace(/\.yaml$/, ''), ...r.data };
        })
      );
      events.sort((a: any, b: any) => String(a.startDate ?? '').localeCompare(String(b.startDate ?? '')));
      return json({ ok: true, announcement, homeVideo, tagSale, settings, gallery, events });
    }

    // ---- top ribbon
    if (action === 'saveAnnouncement') {
      const d = body.data ?? {};
      const cur = await readYaml(FILES.announcement);
      const next = { ...cur.data, enabled: bool(d.enabled), label: str(d.label, 40), message: str(d.message, 300), linkText: str(d.linkText, 40), linkUrl: link(d.linkUrl) };
      await writeYaml(FILES.announcement, next, 'Quick edit: top ribbon', cur.sha);
      return json({ ok: true });
    }

    // ---- homepage video
    if (action === 'saveVideo') {
      const d = body.data ?? {};
      const cur = await readYaml(FILES.homeVideo);
      const next = { ...cur.data, show: bool(d.show), youtube: url(d.youtube), title: str(d.title, 120), text: str(d.text, 600), cover: imagePath(d.cover), buttonText: str(d.buttonText, 40), buttonLink: link(d.buttonLink) };
      if (d.removeUpload) next.video = null;
      if (videoPath(d.video)) next.video = videoPath(d.video);
      await writeYaml(FILES.homeVideo, next, 'Quick edit: homepage video', cur.sha);
      return json({ ok: true });
    }

    // ---- tag sale
    if (action === 'saveTagSale') {
      const d = body.data ?? {};
      const cur = await readYaml(FILES.tagSale);
      const weeks = (Array.isArray(d.weeks) ? d.weeks : [])
        .map((w: any) => ({ start: date(w?.start), end: date(w?.end), color: TAG_COLORS.includes(w?.color) ? w.color : 'blue', discount: str(w?.discount, 40) }))
        .filter((w: any) => w.start && w.end)
        .sort((a: any, b: any) => a.start.localeCompare(b.start))
        .slice(-60);
      await writeYaml(FILES.tagSale, { ...cur.data, enabled: bool(d.enabled), weeks }, 'Quick edit: color tag sale', cur.sha);
      return json({ ok: true });
    }

    // ---- hours and contact
    if (action === 'saveHours') {
      const d = body.data ?? {};
      const cur = await readYaml(FILES.settings);
      const next = {
        ...cur.data,
        phone: str(d.phone, 40),
        email: str(d.email, 120),
        shopHours: rows(d.shopHours),
        donateHours: rows(d.donateHours),
        openDays: (Array.isArray(d.openDays) ? d.openDays : []).filter((x: string) => DAYS.includes(x)),
        openHour: hour(d.openHour, 10),
        closeHour: hour(d.closeHour, 19),
      };
      await writeYaml(FILES.settings, next, 'Quick edit: hours and contact', cur.sha);
      return json({ ok: true });
    }

    // ---- photo and video gallery
    if (action === 'saveGallery') {
      const d = body.data ?? {};
      const cur = await readYaml(FILES.gallery);
      const items = (Array.isArray(d.items) ? d.items : [])
        .map((i: any) => {
          const videoUrl = url(i?.videoUrl), videoUpload = videoPath(i?.videoUpload);
          return {
            kind: videoUrl || videoUpload ? 'video' : 'photo',
            image: imagePath(i?.image),
            videoUrl,
            videoUpload,
            caption: str(i?.caption, 140),
            altText: str(i?.altText, 300) || str(i?.caption, 140),
            featured: bool(i?.featured) && !!imagePath(i?.image),
          };
        })
        .filter((i: any) => i.image || i.videoUrl || i.videoUpload)
        .slice(0, 200);
      await writeYaml(FILES.gallery, { ...cur.data, items }, 'Quick edit: photo and video gallery', cur.sha);
      return json({ ok: true });
    }

    // ---- events
    if (action === 'saveEvent') {
      const d = body.data ?? {};
      const title = str(d.title, 140);
      const startDate = date(d.startDate);
      if (!title) return fail('Please add a title.');
      if (!startDate) return fail('Please pick a date.');
      const kind = String(d.kind || 'event');
      const type = kind === 'sale' ? 'sale' : kind === 'event' ? 'event' : 'news';
      let slug = str(body.slug, 80);
      let cur: { sha?: string; data: any } = { data: {} };
      if (slug) {
        if (!/^[\w-]+$/.test(slug)) return fail('Bad request');
        cur = await readYaml(`${EVENTS}/${slug}.yaml`);
      } else {
        const base = slugify(title);
        slug = base;
        for (let i = 2; (await getFile(`${EVENTS}/${slug}.yaml`)) && i < 50; i++) slug = `${base}-${i}`;
      }
      const endDate = date(d.endDate);
      const next = {
        ...cur.data,
        title,
        type,
        startDate,
        endDate: endDate && endDate > startDate ? endDate : null,
        timeText: str(d.timeText, 120),
        location: str(d.location, 120) || 'Main store',
        badge: kind === 'closed' ? 'Closed' : cur.data.badge === 'Closed' ? '' : cur.data.badge ?? '',
        summary: str(d.summary, 300),
        body: str(d.body, 5000),
        image: imagePath(d.image),
        videoUrl: url(d.videoUrl),
        pinned: bool(d.pinned),
      };
      await writeYaml(`${EVENTS}/${slug}.yaml`, next, `Quick edit: ${cur.sha ? 'update' : 'add'} "${title}"`, cur.sha);
      return json({ ok: true, slug });
    }
    if (action === 'deleteEvent') {
      const slug = str(body.slug, 80);
      if (!/^[\w-]+$/.test(slug)) return fail('Bad request');
      const f = await getFile(`${EVENTS}/${slug}.yaml`);
      if (f) await deleteFile(`${EVENTS}/${slug}.yaml`, f.sha, `Quick edit: remove "${slug}"`);
      return json({ ok: true });
    }

    // ---- photo upload (already resized in the browser)
    if (action === 'upload') {
      const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(body.data || ''));
      if (!m) return fail('Please choose a JPG, PNG or WebP photo.');
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 3_000_000) return fail('That photo is too large. Please try a smaller one.');
      const name = `${slugify(str(body.name, 60).replace(/\.\w+$/, '')) || 'photo'}-${Date.now().toString(36)}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
      await putFile(`public/images/uploads/${name}`, buf, `Quick edit: upload photo ${name} [photo upload]`);
      return json({ ok: true, path: `/images/uploads/${name}` });
    }

    return fail('Unknown action');
  } catch (e: any) {
    console.error('Quick edit failed:', e?.message || e);
    return fail(e?.message || 'Something went wrong. Please try again.', 500);
  }
};
