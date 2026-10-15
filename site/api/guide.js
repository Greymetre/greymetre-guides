// POST /api/guide  - guide download form handler (Vercel Node function)
// 1. validates the form   2. emails the guide link to the prospect FROM the mailbox that sent the cold email
// 3. alerts that sender with the lead's details (+ a machine-readable JSON line for the nightly reconcile)
// Env: RESEND_API_KEY (required), SITE_URL (default https://go.greymetre.com),
//      LOG_EMAIL (optional: extra copy of every alert), RESEND_AUDIENCE_ID (optional: add contact to a Resend audience)

const SITE = process.env.SITE_URL || 'https://go.greymetre.com';
const CALENDLY = 'https://calendly.com/anadi-greymetre/30min';

const SENDERS = {
  anadi: { name: 'Anadi Shrivastava', email: 'anadi@greymetre.com', title: 'Co-Founder', linkedin: 'https://www.linkedin.com/in/anadi-shrivastava-1163a6a8', phone: '9131678419' },
  asit: { name: 'Asit Shrivastava', email: 'asit@greymetre.com', title: 'Co-Founder', linkedin: 'https://www.linkedin.com/in/asit-shrivastava-78916715a', phone: '9131678419' },
  subodh: { name: 'Subodh Shrivastava', email: 'subodh@greymetre.com', title: 'Founder Director', linkedin: 'https://linkedin.com/in/subodhshrivastava', phone: '9131678419' },
};

const GUIDES = {
  availability: {
    title: 'Five Signs Your Inventory Planning Is Costing You Working Capital', file: 'Five_Signs_Inventory_Planning_Greymetre.pdf', check: 'planning health check',
    sub: "Why forecast-driven MRP struggles in today's market, and what to do instead",
    bullets: ['Five warning signs your planning method is tying up cash', 'How demand-driven planning (DDMRP) breaks the shortage-and-excess cycle', 'A 10-point scorecard to see where your business stands'],
  },
  range: {
    title: 'Five Signs Your Product Range Is Leaking Market Share', file: 'Five_Signs_Product_Range_Greymetre.pdf', check: 'range health check',
    sub: "Why a narrow range on the dealer's shelf caps your share, and what to do instead",
    bullets: ['Five warning signs your range is capping share at the counter', 'How channel signals turn range into a daily list of what to place, where', 'A 10-point scorecard to see where your business stands'],
  },
  reach: {
    title: 'Five Signs Your Sales Team Is Not Reaching the Market You Think It Is', file: 'Five_Signs_Sales_Reach_Greymetre.pdf', check: 'reach health check',
    sub: 'Why distributor coverage is not market coverage, and what changes when the field works from one daily list',
    bullets: ['Five warning signs your reach stops at the distributor', 'How one daily list per rep turns visits into orders', 'A 10-point scorecard to see where your business stands'],
  },
  engagement: {
    title: 'Five Signs Your Channel Is Quietly Choosing Someone Else', file: 'Five_Signs_Channel_Engagement_Greymetre.pdf', check: 'channel engagement health check',
    sub: 'Why dealers, retailers and mechanics drift away, and what changes when loyalty is run as a lever, not a cost',
    bullets: ['Five warning signs your channel is drifting to rivals', 'How to turn loyalty spend into a measured lever', 'A 10-point scorecard to see where your channel stands'],
  },
};

// Email-safe version of the finalised promo-email design: header + stripe, dark hero with amber button,
// "Inside the guide" bullets, health-check CTA, signature, footer. Tables + inline styles + bgcolor only.
function guideEmailHtml({ first, guide, pdfUrl, book, s }) {
  const F = "font-family:Arial,Helvetica,sans-serif;";
  const dots = ['#C8442F', '#E3A72F', '#2E8B57'];
  const bullets = guide.bullets.map((b, i) => `<tr><td valign="top" width="22" style="padding:6px 0 0"><span style="${F}font-size:14px;line-height:1;color:${dots[i]}">&#9679;</span></td><td style="${F}font-size:15px;line-height:1.55;color:#14232E;padding:3px 0">${esc(b)}</td></tr>`).join('');
  const bar = (c) => `<td width="22" height="5" bgcolor="${c}" style="background-color:${c};font-size:0;line-height:0;border-radius:3px">&nbsp;</td><td width="3" style="font-size:0">&nbsp;</td>`;
  const btn = (href, label, bg, fg) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="background-color:${bg};border-radius:6px"><a href="${href}" target="_blank" style="display:block;padding:14px 28px;${F}font-size:16px;font-weight:bold;color:${fg};text-decoration:none;border-radius:6px"><span style="color:${fg}">${label}</span></a></td></tr></table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(guide.title)}</title></head>
<body style="margin:0;padding:0;background-color:#E9EDEB">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your copy of ${esc(guide.title)}, plus a 10-point scorecard to see where you stand.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#E9EDEB" style="background-color:#E9EDEB"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:6px 6px 0 0;padding:22px 32px;border-bottom:1px solid #E3E8E6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="${F}font-size:20px;font-weight:bold;color:#14232E;letter-spacing:-0.3px">greymetre</td>
  <td align="right"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${bar('#C8442F')}${bar('#E3A72F')}${bar('#2E8B57')}</tr></table></td>
  </tr></table>
</td></tr>
<tr><td bgcolor="#14232E" align="center" style="background-color:#14232E;padding:40px 32px 44px">
  <div style="${F}font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#9FD3C4">Your free guide</div>
  <div style="${F}font-size:28px;line-height:1.2;font-weight:bold;color:#FFFFFF;margin:14px 0 12px">${esc(guide.title)}</div>
  <div style="${F}font-size:16px;line-height:1.5;color:#C9D6DB;margin:0 0 24px">${esc(guide.sub)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td>${btn(pdfUrl, 'Open the guide (PDF)', '#E3A72F', '#14232E')}</td></tr></table>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;padding:32px 32px 8px;${F}font-size:15px;line-height:1.6;color:#14232E">
  <p style="margin:0 0 14px">Hi ${esc(first)},</p>
  <p style="margin:0 0 18px">Thank you for downloading the guide. It is a 10-minute read, and the scorecard on page 9 is the quickest place to start: tick what is true for your business today.</p>
  <p style="margin:0 0 6px;font-weight:bold">Inside the guide:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px">${bullets}</table>
  <p style="margin:0 0 16px">If three or more signs sound familiar, book a free 30-minute ${esc(guide.check)}. We will show you where the gap is costing you most.</p>
  ${btn(esc(book), 'Book a health check', '#0E6E5C', '#FFFFFF')}
  <p style="margin:18px 0 22px">Or simply reply to this email.</p>
  <p style="margin:0 0 28px">Warm regards,<br><strong>${esc(s.name)}</strong><br><span style="color:#4A5A64;font-size:14px">${esc(s.title)} | <a href="https://greymetre.io" style="color:#0E6E5C">Greymetre</a><br><a href="${s.linkedin}" style="color:#0E6E5C">LinkedIn</a> | <a href="tel:+91${s.phone}" style="color:#4A5A64;text-decoration:none">${s.phone}</a></span></p>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border-radius:0 0 6px 6px;padding:0 32px 24px;${F}font-size:12px;line-height:1.5;color:#4A5A64">
  Button not working? Open the guide here: <a href="${pdfUrl}" style="color:#0E6E5C;word-break:break-all">${pdfUrl}</a>
</td></tr>
<tr><td align="center" style="padding:16px 32px;${F}font-size:12px;line-height:1.5;color:#4A5A64">Greymetre · greymetre.io<br>You are receiving this because you requested this guide at go.greymetre.com.</td></tr>
</table></td></tr></table></body></html>`;
}

const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const tagSafe = (v) => clean(v, 80).replace(/[^A-Za-z0-9_-]/g, '_') || 'none';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

  const lever = clean(b.lever, 20).toLowerCase();
  const guide = GUIDES[lever];
  const d = {
    lever,
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

  if (!guide) return res.status(400).json({ error: 'Unknown guide', field: 'lever' });
  if (!d.name) return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return res.status(400).json({ error: 'Please enter a valid work email.', field: 'email' });
  if (!d.company) return res.status(400).json({ error: 'Please enter your company.', field: 'company' });
  if (!d.consent) return res.status(400).json({ error: 'Please tick the consent box to receive the guide.', field: 'consent' });
  // bots: honeypot is handled client-side; also drop sub-2-second submits silently
  if (Number(b.elapsed_ms) > 0 && Number(b.elapsed_ms) < 2000) return res.status(200).json({ ok: true });

  const s = senderFor(b.m);
  const first = d.name.split(/\s+/)[0];
  const pdfUrl = `${SITE}/guides/${guide.file}`;
  const book = `${CALENDLY}?utm_source=guide_email&utm_campaign=${lever}`;
  const tags = [
    { name: 'type', value: 'guide_download' },
    { name: 'lever', value: lever },
    { name: 'lid', value: tagSafe(d.lid) },
    { name: 'mailbox', value: s.key },
  ];

  const text = [
    `Hi ${first},`,
    ``,
    `Thank you for downloading the guide. Here is your copy of "${guide.title}":`,
    pdfUrl,
    ``,
    `It is a 10-minute read. The scorecard on page 9 is the quickest place to start: tick what is true for your business today.`,
    ``,
    `If three or more signs sound familiar, book a free 30-minute ${guide.check} and we will show you where the gap is costing you most:`,
    book,
    ``,
    `Or simply reply to this email.`,
    ``,
    `Warm regards,`,
    s.name,
    `${s.title} | Greymetre (https://greymetre.io)`,
    `LinkedIn: ${s.linkedin} | ${s.phone}`,
  ].join('\n');

  const htmlBody = guideEmailHtml({ first, guide, pdfUrl, book, s });

  const result = { guide: null, alert: null };
  try {
    result.guide = await resend('/emails', {
      from: `${s.name} <${s.email}>`,
      to: [d.email],
      reply_to: s.email,
      subject: `Your guide: ${guide.title}`,
      text,
      html: htmlBody,
      tags,
    });
  } catch (e) {
    console.error('guide email failed', e.message);
  }

  const row = { ...d, sender: s.email, guide_email_id: result.guide && result.guide.id };
  try {
    const lines = [
      `${d.name} (${d.role || 'role not given'}) at ${d.company} downloaded the ${lever} guide.`,
      ``,
      `Email: ${d.email}`,
      `Mobile: ${d.phone || 'not given'}`,
      `Lead ID: ${d.lid || 'none (forwarded or direct visit)'}`,
      `Came from your mailbox: ${s.email}`,
      `Guide email sent: ${result.guide ? 'yes' : 'NO - send the PDF manually: ' + pdfUrl}`,
      ``,
      `Next step: send your personal follow-up today, referencing the guide.`,
      ``,
      `GUIDE_DOWNLOAD_JSON: ${JSON.stringify(row)}`,
    ];
    const to = [s.email];
    if (process.env.LOG_EMAIL && process.env.LOG_EMAIL !== s.email) to.push(process.env.LOG_EMAIL);
    result.alert = await resend('/emails', {
      from: `Greymetre Guides <guides@greymetre.com>`,
      to,
      reply_to: d.email,
      subject: `Guide download: ${d.name}, ${d.company} (${lever})`,
      text: lines.join('\n'),
      tags: [{ name: 'type', value: 'guide_alert' }, { name: 'lever', value: lever }, { name: 'lid', value: tagSafe(d.lid) }, { name: 'mailbox', value: s.key }],
    });
  } catch (e) {
    console.error('alert email failed', e.message, JSON.stringify(row));
  }

  if (process.env.RESEND_AUDIENCE_ID) {
    const [firstName, ...rest] = d.name.split(/\s+/);
    await resend(`/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`, {
      email: d.email, first_name: firstName, last_name: rest.join(' '), unsubscribed: false,
    }).catch((e) => console.error('audience add failed', e.message));
  }

  console.log('GUIDE_DOWNLOAD', JSON.stringify(row));
  return res.status(200).json({ ok: true, pdf: `/guides/${guide.file}`, emailed: Boolean(result.guide) });
}
