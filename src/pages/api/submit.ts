import type { APIRoute } from 'astro';

// Runs on Vercel as a server function. Every form on the site posts here.
// Emails are sent with SendGrid. Set these in Vercel > Settings > Environment Variables:
//   SENDGRID_API_KEY   your SendGrid API key
//   FORM_TO_EMAIL      where submissions go (for example hello@hiddentreasuresmn.org)
//   FORM_FROM_EMAIL    a sender address verified in SendGrid
export const prerender = false;

const FORM_NAMES: Record<string, string> = {
  newsletter: 'Newsletter signup',
  pickup: 'Pickup request',
  bulk: 'Business or bulk donation',
  apply: 'Employment expression of interest',
  refer: 'Referral',
  volunteer: 'Volunteer application',
  story: 'Shared story',
  contact: 'Contact message',
  loyalty: 'Treasure Hunters profile',
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export const POST: APIRoute = async ({ request, redirect }) => {
  const data = await request.formData();
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const done = (ok: boolean, status = 200) =>
    wantsJson
      ? new Response(JSON.stringify({ ok }), { status, headers: { 'content-type': 'application/json' } })
      : redirect(ok ? '/thanks' : '/thanks?error=1', 303);

  // Spam trap: real people never fill this hidden field.
  if (String(data.get('company_website') || '').trim() !== '') return done(true);

  const form = String(data.get('form') || 'contact');
  const title = FORM_NAMES[form] || 'Website form';
  const rows: string[] = [];
  const replyTo = String(data.get('email') || data.get('Email address') || '').trim();

  const answers = new Map<string, string[]>();
  for (const [key, value] of data.entries()) {
    if (key === 'form' || key === 'company_website' || typeof value !== 'string' || value.trim() === '') continue;
    answers.set(key, [...(answers.get(key) ?? []), value]);
  }
  for (const [key, values] of answers) {
    rows.push(`<tr><td style="padding:8px 12px;font-weight:bold;vertical-align:top;border-bottom:1px solid #eee;width:40%">${esc(key)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${values.map((v) => esc(v).replace(/\n/g, '<br>')).join('<br>')}</td></tr>`);
  }

  const key = import.meta.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY;
  const to = import.meta.env.FORM_TO_EMAIL || process.env.FORM_TO_EMAIL;
  const from = import.meta.env.FORM_FROM_EMAIL || process.env.FORM_FROM_EMAIL;
  if (!key || !to || !from) {
    console.error('Form not sent: SENDGRID_API_KEY, FORM_TO_EMAIL or FORM_FROM_EMAIL is missing');
    return done(false, 500);
  }

  const body = {
    personalizations: [{ to: String(to).split(',').map((email) => ({ email: email.trim() })) }],
    from: { email: from, name: 'Hidden Treasures website' },
    ...(replyTo.includes('@') ? { reply_to: { email: replyTo } } : {}),
    subject: `Website: ${title}`,
    content: [{ type: 'text/html', value: `<h2>${esc(title)}</h2><table>${rows.join('')}</table>` }],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error('SendGrid error', res.status, await res.text());
  return done(res.ok, res.ok ? 200 : 502);
};
