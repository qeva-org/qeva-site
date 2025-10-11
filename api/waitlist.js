// api/waitlist.js
// Node serverless function for Vercel (CJS). No external deps.
// Requires: set RESEND_API_KEY in Vercel (Project → Settings → Environment Variables).

const RESEND_API = 'https://api.resend.com/emails';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseForm(body, contentType='') {
  if (contentType.includes('application/json')) {
    try { return JSON.parse(body); } catch { return {}; }
  }
  // default: urlencoded / multipart handled via URLSearchParams best-effort
  try {
    const p = new URLSearchParams(body);
    const obj = {};
    for (const [k,v] of p.entries()) obj[k]=v;
    return obj;
  } catch { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method Not Allowed' });
  }
  const raw = await readBody(req);
  const body = parseForm(raw, req.headers['content-type'] || '');
  const { email='', company='' } = body;

  // simple honeypot: bots fill hidden 'company'
  if (company) return res.status(200).json({ ok:true });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) return res.status(400).json({ ok:false, error:'Invalid email' });

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ ok:false, error:'Missing RESEND_API_KEY' });
  }

  // Send a notification to hello@qeva.org
  const payload = {
    from: 'Qeva <hello@qeva.org>',   // must be a verified domain in Resend
    to: ['hello@qeva.org'],
    subject: 'New waitlist signup',
    text: `New subscriber: ${email}`,
    html: `<p>New subscriber: <strong>${email.replace(/[<>&]/g,'')}</strong></p>`
  };

  const r = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    const e = await r.text().catch(()=> '');
    return res.status(502).json({ ok:false, error:'Email provider error', detail:e });
  }
  return res.status(200).json({ ok:true });
};
