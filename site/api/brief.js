// POST /api/brief  - function-brief view / download tracking (Vercel Node function), site v8 (25-Nov-2026); v8.1 adds ceo_oem
// The brief is NOT gated: /brief/<fn> shows it to anyone. This endpoint only records WHO looked at it, so the
// sender can follow up the same day.
//   event=view      sent by the page after the reader has had it open and visible for 4 seconds
//   event=download  sent when the reader presses "Download the PDF"
// The link in the cold email is signed exactly like the one-click guide link: k = first 24 hex of
// HMAC-SHA256(GUIDE_LINK_SECRET, "lid|m|email|brief-<fn>|name") - the same secret the email builder uses
// (Code/.guide_link_secret). Unsigned or bad-signature hits (forwards, direct visits) are logged to the console
// only and never alert anyone. Corporate link scanners do not keep a page open and visible for 4 seconds, and the
// server drops anything faster as a second guard.
// For each verified event the sender's mailbox gets one alert ("Brief opened: ..." / "Brief download: ...") ending
// with a BRIEF_EVENT_JSON line; Code/scripts/guide_downloads_sync.py reads those into Code/data/brief_events.csv.
// Env: RESEND_API_KEY, GUIDE_LINK_SECRET (both already set for v7), LOG_EMAIL (optional extra copy)

import { createHmac, timingSafeEqual } from 'node:crypto';

const SITE = process.env.SITE_URL || 'https://go.greymetre.com';

const SENDERS = {
  anadi: { name: 'Anadi Shrivastava', email: 'anadi@greymetre.com' },
  asit: { name: 'Asit Shrivastava', email: 'asit@greymetre.com' },
  subodh: { name: 'Subodh Shrivastava', email: 'subodh@greymetre.com' },
};

export const BRIEFS = {
  supply: { label: 'Supply chain', pdf: 'Greymetre_Brief_Supply_Chain.pdf' },
  plant: { label: 'Plant and operations', pdf: 'Greymetre_Brief_Plant_Operations.pdf' },
  sales: { label: 'Sales and channel', pdf: 'Greymetre_Brief_Sales_Channel.pdf' },
  marketing: { label: 'Marketing and loyalty', pdf: 'Greymetre_Brief_Marketing_Loyalty.pdf' },
  ceo: { label: 'MD / CEO', pdf: 'Greymetre_Brief_MD_CEO.pdf' },
  ceo_oem: { label: 'MD / CEO (OEM and B2B)', pdf: 'Greymetre_Brief_MD_CEO_OEM_B2B.pdf' },
  it: { label: 'IT and digital', pdf: 'Greymetre_Brief_IT_Digital.pdf' },
};

const MIN_MS = { view: 3000, download: 1500 };

const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const tagSafe = (v) => clean(v, 80).replace(/[^A-Za-z0-9_-]/g, '_') || 'none';

function senderFor(m) {
  const key = clean(m, 40).toLowerCase().replace(/_main$/, '');
  return { key: SENDERS[key] ? key : 'anadi', ...(SENDERS[key] || SENDERS.anadi) };
}

export function verify(b, fn, secret = process.env.GUIDE_LINK_SECRET) {
  if (!secret) return null;
  const lid = clean(b.lid, 40), m = clean(b.m, 40), n = clean(b.n, 60);
  let email = '';
  try { email = clean(Buffer.from(String(b.e || ''), 'base64url').toString('utf8'), 160).toLowerCase(); } catch (e) { return null; }
  const k = clean(b.k, 64).toLowerCase();
  if (!lid || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !/^[0-9a-f]{24}$/.test(k)) return null;
  const want = createHmac('sha256', secret).update(`${lid}|${m}|${email}|brief-${fn}|${n}`).digest('hex').slice(0, 24);
  if (!timingSafeEqual(Buffer.from(want), Buffer.from(k))) return null;
  return { lid, m, email, name: n };
}

async function resend(path, payload) {
  const r = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${path} ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch (e) { b = {}; } }

  const fn = clean(b.fn, 20).toLowerCase();
  const event = clean(b.event, 20).toLowerCase();
  const brief = BRIEFS[fn];
  if (!brief || !MIN_MS[event]) return res.status(400).json({ error: 'bad request' });

  const v = verify(b, fn);
  const ts = new Date().toISOString();
  if (!v) {
    console.log('BRIEF_EVENT_UNSIGNED', JSON.stringify({ ts, fn, event, ref: clean(b.ref, 300) }));
    return res.status(200).json({ ok: true, tracked: false });
  }
  if (Number(b.elapsed_ms) > 0 && Number(b.elapsed_ms) < MIN_MS[event]) return res.status(200).json({ ok: true, tracked: false });

  const s = senderFor(v.m);
  const row = {
    ts, event, fn, lid: v.lid, name: v.name, email: v.email, mailbox: s.key, sender: s.email,
    elapsed_ms: Number(b.elapsed_ms) || '', ref: clean(b.ref, 300), ua: clean(req.headers && req.headers['user-agent'], 160),
  };
  const who = v.name || v.email;
  const verb = event === 'download' ? 'downloaded' : 'opened';
  const lines = [
    `${who} ${verb} the ${brief.label} brief from your email.`,
    ``,
    `Email: ${v.email}`,
    `Lead ID: ${v.lid}`,
    `Came from your mailbox: ${s.email}`,
    `Brief: ${SITE}/briefs/${brief.pdf}`,
    ``,
    `Next step: send your personal follow-up today, referencing the brief, and ask for 30 minutes.`,
    ``,
    `BRIEF_EVENT_JSON: ${JSON.stringify(row)}`,
  ];
  try {
    const to = [s.email];
    if (process.env.LOG_EMAIL && process.env.LOG_EMAIL !== s.email) to.push(process.env.LOG_EMAIL);
    await resend('/emails', {
      from: 'Greymetre Briefs <guides@greymetre.com>',
      to,
      reply_to: v.email,
      subject: `Brief ${event === 'download' ? 'download' : 'opened'}: ${who} (${fn})`,
      text: lines.join('\n'),
      tags: [{ name: 'type', value: 'brief_alert' }, { name: 'brief', value: fn }, { name: 'event', value: event },
             { name: 'lid', value: tagSafe(v.lid) }, { name: 'mailbox', value: s.key }],
    });
  } catch (e) {
    console.error('brief alert failed', e.message, JSON.stringify(row));
  }
  console.log('BRIEF_EVENT', JSON.stringify(row));
  return res.status(200).json({ ok: true, tracked: true });
}
