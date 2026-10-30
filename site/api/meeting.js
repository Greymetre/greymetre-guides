// POST /api/meeting - demo / order-replay request handler (Vercel Node function), added 27-Oct-2026
// Same pattern as api/guide.js: validate -> confirmation email to the prospect (with the Calendly link)
// -> alert to the owner mailbox with a MEETING_REQUEST_JSON line that scripts/guide_downloads_sync.py picks up.
// Env: RESEND_API_KEY (required), LOG_EMAIL (optional extra copy of every alert)

const CALENDLY = 'https://calendly.com/anadi-greymetre/30min';
const SENDERS = {
  anadi: { name: 'Anadi Shrivastava', email: 'anadi@greymetre.com', title: 'Co-Founder', linkedin: 'https://www.linkedin.com/in/anadi-shrivastava-1163a6a8', phone: '9131678419' },
  asit: { name: 'Asit Shrivastava', email: 'asit@greymetre.com', title: 'Co-Founder', linkedin: 'https://www.linkedin.com/in/asit-shrivastava-78916715a', phone: '9131678419' },
  subodh: { name: 'Subodh Shrivastava', email: 'subodh@greymetre.com', title: 'Founder Director', linkedin: 'https://linkedin.com/in/subodhshrivastava', phone: '9131678419' },
};
const OFFERS = {
  demo: { label: '30-minute RARE OS demo', short: 'demo' },
  replay: { label: '30-minute order replay', short: 'order replay' },
};

const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const tagSafe = (v) => clean(v, 80).replace(/[^A-Za-z0-9_-]/g, '_') || 'none';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function senderFor(m) {
  const key = clean(m, 40).toLowerCase().replace(/_main$/, '');
  return { key: SENDERS[key] ? key : 'anadi', ...(SENDERS[key] || SENDERS.anadi) };
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
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const offerKey = clean(b.offer, 20).toLowerCase();
  const offer = OFFERS[offerKey];
  const d = {
    offer: offerKey,
    lever: clean(b.lever, 20).toLowerCase() || 'availability',
    note: clean(b.note, 200),
    lid: clean(b.lid, 40),
    mailbox: senderFor(b.m).key,
    name: clean(b.name, 120),
    email: clean(b.email, 160).toLowerCase(),
    company: clean(b.company, 160),
    role: clean(b.role, 80),
    phone: clean(b.phone, 30),
    consent: b.consent === true || b.consent === 'true' || b.consent === 'on',
    utm_source: clean(b.utm_source, 60),
    ref: clean(b.ref, 300),
    ts: new Date().toISOString(),
  };
  if (!offer) return res.status(400).json({ error: 'Unknown request type', field: 'offer' });
  if (!d.name) return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return res.status(400).json({ error: 'Please enter a valid work email.', field: 'email' });
  if (!d.company) return res.status(400).json({ error: 'Please enter your company.', field: 'company' });
  if (d.phone && (d.phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '')).length !== 10) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.', field: 'phone' });
  if (!d.consent) return res.status(400).json({ error: 'Please tick the consent box.', field: 'consent' });
  if (Number(b.elapsed_ms) > 0 && Number(b.elapsed_ms) < 2000) return res.status(200).json({ ok: true });

  const s = senderFor(b.m);
  const first = d.name.split(/\s+/)[0];
  const book = `${CALENDLY}?utm_source=${encodeURIComponent(d.utm_source || 'direct')}&utm_campaign=${offerKey}&name=${encodeURIComponent(d.name)}&email=${encodeURIComponent(d.email)}`;
  const result = { confirm: null, alert: null };

  const text = [
    `Hi ${first},`, ``,
    `Thank you for requesting a ${offer.label}. ${d.phone ? `I will call you on ${d.phone}` : 'I will write to you'} within one working day to fix a time that suits you.`, ``,
    `If you would rather pick a slot now, here is my calendar:`, book, ``,
    offerKey === 'replay' ? `If you can, keep the details of the order that went wrong handy (dates, quantity, what slipped). No data upload is needed to start.` : `We will run a new order, a supplier delay and a demand spike through a sample plant, live.`, ``,
    `Warm regards,`, s.name, `${s.title} | Greymetre`, `LinkedIn: ${s.linkedin} | ${s.phone}`,
  ].join('\n');
  const F = 'font-family:Arial,Helvetica,sans-serif;';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#E9EDEB"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" style="width:100%;max-width:600px;background:#fff;border-radius:6px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px 32px;${F}font-size:15px;line-height:1.6;color:#14232E">
<p style="margin:0 0 6px;${F}font-size:20px;font-weight:bold">greymetre</p>
<p>Hi ${esc(first)},</p>
<p>Thank you for requesting a ${esc(offer.label)}. ${d.phone ? `I will call you on ${esc(d.phone)}` : 'I will write to you'} within one working day to fix a time that suits you.</p>
<p>If you would rather pick a slot now:</p>
<p><a href="${esc(book)}" style="display:inline-block;background:#0E6E5C;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Choose a time</a></p>
<p>${offerKey === 'replay' ? 'If you can, keep the details of the order that went wrong handy (dates, quantity, what slipped). No data upload is needed to start.' : 'We will run a new order, a supplier delay and a demand spike through a sample plant, live.'}</p>
<p style="margin-top:24px">Warm regards,<br><strong>${esc(s.name)}</strong><br><span style="color:#4A5A64;font-size:14px">${esc(s.title)} | <a href="https://greymetre.io" style="color:#0E6E5C">Greymetre</a><br><a href="${s.linkedin}" style="color:#0E6E5C">LinkedIn</a> | ${s.phone}</span></p>
</td></tr></table></td></tr></table></body></html>`;
  const tags = [{ name: 'type', value: 'meeting_request' }, { name: 'offer', value: offerKey }, { name: 'source', value: tagSafe(d.utm_source) }, { name: 'mailbox', value: s.key }];
  try {
    result.confirm = await resend('/emails', { from: `${s.name} <${s.email}>`, to: [d.email], reply_to: s.email, subject: `Your ${offer.label}: next step`, text, html, tags });
  } catch (e) { console.error('confirm email failed', e.message); }

  const row = { ...d, sender: s.email, confirm_email_id: result.confirm && result.confirm.id };
  try {
    const lines = [
      `${d.name} (${d.role || 'role not given'}) at ${d.company} asked for a ${offer.label}.`, ``,
      (d.phone ? `Mobile: ${d.phone}   <- call within one working day to book` : `Mobile: not given   <- email them within one working day to book`),
      `Email: ${d.email}`,
      `Their note: ${d.note || '(none)'}`,
      `Source: ${d.utm_source || (d.lid ? 'cold email' : 'direct')}`,
      `Lead ID: ${d.lid || 'none'}`,
      `Confirmation email sent: ${result.confirm ? 'yes (includes your Calendly link)' : 'NO - send the Calendly link manually'}`, ``,
      `MEETING_REQUEST_JSON: ${JSON.stringify(row)}`,
    ];
    const to = [s.email];
    if (process.env.LOG_EMAIL && process.env.LOG_EMAIL !== s.email) to.push(process.env.LOG_EMAIL);
    result.alert = await resend('/emails', {
      from: 'Greymetre Requests <guides@greymetre.com>', to, reply_to: d.email,
      subject: `Meeting request: ${d.name}, ${d.company} (${offerKey})`,
      text: lines.join('\n'),
      tags: [{ name: 'type', value: 'meeting_alert' }, { name: 'offer', value: offerKey }, { name: 'source', value: tagSafe(d.utm_source) }, { name: 'mailbox', value: s.key }],
    });
  } catch (e) { console.error('alert email failed', e.message, JSON.stringify(row)); }

  console.log('MEETING_REQUEST', JSON.stringify(row));
  return res.status(200).json({ ok: true, emailed: Boolean(result.confirm) });
}
