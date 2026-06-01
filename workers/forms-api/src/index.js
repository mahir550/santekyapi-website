import { EmailMessage } from 'cloudflare:email';

const ALLOWED_ORIGINS = [
  'https://www.santekyapi.com.tr',
  'https://santekyapi.com.tr',
  'https://shop.santekyapi.com.tr',
  'https://santekyapi.pages.dev',
];

// Lead bildirimi alıcısı (ekip)
const LEAD_NOTIFY_TO = 'dijitalsatis@santekyapi.com.tr';
// Gizli kopya (BCC)
const LEAD_NOTIFY_BCC = 'santek@mert.fyi';
// Resend gönderici — doğrulanmış subdomain üzerinden (mail.santekyapi.com.tr)
const RESEND_FROM = 'Santek Bildirim <bildirim@mail.santekyapi.com.tr>';
// Email Routing fallback göndericisi (Resend yokken)
const LEAD_NOTIFY_FROM = 'noreply@santekyapi.com.tr';

// UTF-8 → base64 (Türkçe karakterler için — Email Routing fallback'inde kullanılır)
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function encodeSubject(s) {
  return '=?UTF-8?B?' + b64utf8(s) + '?=';
}

// Lead bildirim mailinin konusu + HTML gövdesini üretir
function buildLeadEmail(lead) {
  const adSoyad = [lead.ad, lead.soyad].filter(Boolean).join(' ');
  const subject = `🔔 Yeni Lead: ${adSoyad || lead.eposta} (${lead.kaynak || 'web'})`;
  const rows = [
    ['Ad Soyad', adSoyad || '—'],
    ['E-posta', lead.eposta || '—'],
    ['Telefon', lead.telefon || '—'],
    ['Şirket', lead.sirket || '—'],
    ['İlgili Seri', lead.konu || '—'],
    ['Miktar', lead.miktar || '—'],
    ['Kaynak', lead.kaynak || '—'],
    ['Kampanya', lead.utm_campaign || '—'],
    ['UTM Source', lead.utm_source || '—'],
    ['Mesaj', lead.mesaj || '—'],
  ];
  const rowsHtml = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px;font-weight:600;color:#4A5568;border-bottom:1px solid #eee;white-space:nowrap">${k}</td><td style="padding:6px 12px;color:#0A2540;border-bottom:1px solid #eee">${String(v).replace(/</g, '&lt;')}</td></tr>`
  ).join('');
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f8fa;padding:24px;margin:0">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0B2348;padding:20px 24px;color:#fff">
        <div style="font-size:18px;font-weight:700">🔔 Yeni Lead Bildirimi</div>
        <div style="font-size:13px;color:#7FE3F0;margin-top:4px">Santek — Qbrick Landing Page</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rowsHtml}</table>
      <div style="padding:16px 24px;background:#FAFCFD">
        <a href="https://www.santekyapi.com.tr/admin" style="display:inline-block;background:#00BCD4;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:8px;font-size:14px">Admin Panelinde Aç →</a>
      </div>
    </div>
  </body></html>`;
  return { subject, html };
}

// Lead bildirimini gönderir.
// 1. Tercih: Resend (RESEND_API_KEY secret'i varsa) — herhangi bir adrese, doğrulama gerekmez
// 2. Fallback: Cloudflare Email Routing binding (env.SEB) — alıcı doğrulanmış olmalı
async function sendLeadEmail(env, lead, toOverride) {
  const TO = toOverride || LEAD_NOTIFY_TO;
  const { subject, html } = buildLeadEmail(lead);

  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [TO],
        ...(LEAD_NOTIFY_BCC ? { bcc: [LEAD_NOTIFY_BCC] } : {}),
        ...(lead.eposta ? { reply_to: lead.eposta } : {}),
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Resend ${res.status}: ${t.slice(0, 400)}`);
    }
    return;
  }

  if (env.SEB) {
    const raw =
      `From: Santek Bildirim <${LEAD_NOTIFY_FROM}>\r\n` +
      `To: ${TO}\r\n` +
      (lead.eposta ? `Reply-To: ${lead.eposta}\r\n` : '') +
      `Subject: ${encodeSubject(subject)}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `\r\n` +
      b64utf8(html).replace(/(.{76})/g, '$1\r\n');
    const message = new EmailMessage(LEAD_NOTIFY_FROM, TO, raw);
    await env.SEB.send(message);
    return;
  }

  throw new Error('Mail gönderim yöntemi yok (RESEND_API_KEY veya SEB binding gerekli)');
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function corsResponse(body, status, request) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
  });
}

function jsonResponse(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(request ? getCorsHeaders(request) : {}) },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdmin(request, url, env);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Geçersiz istek.' }), 400, request);
    }

    if (url.pathname === '/api/contact') return handleContact(body, env, request, ctx);
    if (url.pathname === '/api/bayilik') return handleBayilik(body, env, request);

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404, request);
  },
};

async function handleContact(body, env, request, ctx) {
  const {
    ad = '', soyad = '', sirket = '', eposta = '',
    telefon = '', konu = '', mesaj = '',
    kaynak = '', miktar = '',
    utm_source = '', utm_medium = '', utm_campaign = '',
    utm_term = '', utm_content = '',
    gclid = '', fbclid = '',
  } = body;

  if (!ad.trim() || !eposta.trim()) {
    return corsResponse(JSON.stringify({ error: 'Ad ve e-posta zorunludur.' }), 400, request);
  }
  if (!isValidEmail(eposta)) {
    return corsResponse(JSON.stringify({ error: 'Geçersiz e-posta adresi.' }), 400, request);
  }
  if (mesaj.length > 2000) {
    return corsResponse(JSON.stringify({ error: 'Mesaj çok uzun (max 2000 karakter).' }), 400, request);
  }

  const finalMesaj = mesaj.trim() || `Toplu alım teklifi talebi — Miktar: ${miktar || 'belirtilmedi'}`;

  await env.DB.prepare(
    `INSERT INTO contact_submissions
       (ad, soyad, sirket, eposta, telefon, konu, mesaj, kaynak, miktar,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, fbclid,
        created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    ad.trim(), soyad.trim(), sirket.trim(), eposta.trim(),
    telefon.trim(), konu, finalMesaj, kaynak, miktar,
    String(utm_source).slice(0, 200), String(utm_medium).slice(0, 200),
    String(utm_campaign).slice(0, 200), String(utm_term).slice(0, 200),
    String(utm_content).slice(0, 200),
    String(gclid).slice(0, 500), String(fbclid).slice(0, 500),
  ).run();

  // Ekibe lead bildirimi gönder (arka planda — form yanıtını bloklamaz, hata yutulur)
  const lead = {
    ad: ad.trim(), soyad: soyad.trim(), sirket: sirket.trim(), eposta: eposta.trim(),
    telefon: telefon.trim(), konu, mesaj: finalMesaj, kaynak, miktar,
    utm_source, utm_campaign,
  };
  const mailJob = sendLeadEmail(env, lead).catch((e) => console.error('lead email error:', e.message));
  if (ctx && ctx.waitUntil) ctx.waitUntil(mailJob);

  return corsResponse(JSON.stringify({ success: true }), 200, request);
}

async function handleBayilik(body, env, request) {
  const {
    ad = '', soyad = '', sirket = '', eposta = '',
    telefon = '', sehir = '', faaliyet_alani = '', mesaj = '',
  } = body;

  if (!ad.trim() || !eposta.trim() || !sirket.trim()) {
    return corsResponse(JSON.stringify({ error: 'Ad, e-posta ve şirket zorunludur.' }), 400, request);
  }
  if (!isValidEmail(eposta)) {
    return corsResponse(JSON.stringify({ error: 'Geçersiz e-posta adresi.' }), 400, request);
  }

  await env.DB.prepare(
    `INSERT INTO dealership_applications
       (ad, soyad, sirket, eposta, telefon, sehir, faaliyet_alani, mesaj, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    ad.trim(), soyad.trim(), sirket.trim(), eposta.trim(),
    telefon, sehir, faaliyet_alani, mesaj.trim(),
  ).run();

  return corsResponse(JSON.stringify({ success: true }), 200, request);
}

async function handleAdmin(request, url, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { pathname } = url;
  const method = request.method;

  if (pathname === '/api/admin/contact' && method === 'GET') {
    const page  = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('q') || '';
    const kaynak = url.searchParams.get('kaynak') || '';
    const status = url.searchParams.get('status') || '';

    const conditions = [];
    const baseParams = [];

    if (search) {
      const like = `%${search}%`;
      conditions.push('(ad LIKE ? OR soyad LIKE ? OR eposta LIKE ? OR sirket LIKE ? OR mesaj LIKE ?)');
      baseParams.push(like, like, like, like, like);
    }
    if (kaynak) {
      conditions.push('kaynak = ?');
      baseParams.push(kaynak);
    }
    if (status) {
      conditions.push("COALESCE(NULLIF(status,''), 'new') = ?");
      baseParams.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, countRow] = await Promise.all([
      env.DB.prepare(`SELECT * FROM contact_submissions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .bind(...baseParams, limit, offset).all(),
      env.DB.prepare(`SELECT COUNT(*) as total FROM contact_submissions ${where}`)
        .bind(...baseParams).first(),
    ]);
    return jsonResponse({ data: rows.results, total: countRow.total, page, limit });
  }

  if (pathname === '/api/admin/bayilik' && method === 'GET') {
    const page  = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status') || '';
    const search = url.searchParams.get('q') || '';

    const conditions = [];
    const baseParams = [];
    if (status) { conditions.push('status = ?'); baseParams.push(status); }
    if (search) {
      const like = `%${search}%`;
      conditions.push('(ad LIKE ? OR soyad LIKE ? OR eposta LIKE ? OR sirket LIKE ? OR sehir LIKE ?)');
      baseParams.push(like, like, like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows, countRow] = await Promise.all([
      env.DB.prepare(`SELECT * FROM dealership_applications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .bind(...baseParams, limit, offset).all(),
      env.DB.prepare(`SELECT COUNT(*) as total FROM dealership_applications ${where}`)
        .bind(...baseParams).first(),
    ]);
    return jsonResponse({ data: rows.results, total: countRow.total, page, limit });
  }

  const bayilikMatch = pathname.match(/^\/api\/admin\/bayilik\/(\d+)$/);
  if (bayilikMatch && method === 'PATCH') {
    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid body' }, 400); }
    const { status } = body;
    if (!['new', 'reviewing', 'approved', 'rejected'].includes(status)) {
      return jsonResponse({ error: 'Invalid status' }, 400);
    }
    await env.DB.prepare('UPDATE dealership_applications SET status = ? WHERE id = ?')
      .bind(status, parseInt(bayilikMatch[1])).run();
    return jsonResponse({ success: true });
  }

  // PATCH /api/admin/contact/:id — update status and/or notes
  const contactMatch = pathname.match(/^\/api\/admin\/contact\/(\d+)$/);
  if (contactMatch && method === 'PATCH') {
    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid body' }, 400); }
    const { status, notes } = body;
    const allowedStatuses = ['new', 'contacted', 'quoted', 'won', 'lost'];
    const updates = [];
    const params = [];
    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) return jsonResponse({ error: 'Invalid status' }, 400);
      updates.push('status = ?'); params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?'); params.push(String(notes).slice(0, 5000));
    }
    if (!updates.length) return jsonResponse({ error: 'No fields to update' }, 400);
    updates.push("updated_at = datetime('now')");
    params.push(parseInt(contactMatch[1]));
    await env.DB.prepare(`UPDATE contact_submissions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params).run();
    return jsonResponse({ success: true });
  }

  // GET /api/admin/stats — dashboard counts
  if (pathname === '/api/admin/stats' && method === 'GET') {
    const [today, week, month, total, bySource, byStatus, last7d, bayilikTotal] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as c FROM contact_submissions WHERE created_at >= datetime('now','-1 day')").first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM contact_submissions WHERE created_at >= datetime('now','-7 days')").first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM contact_submissions WHERE created_at >= datetime('now','-30 days')").first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM contact_submissions").first(),
      env.DB.prepare(`SELECT COALESCE(NULLIF(kaynak,''), '(direct)') as kaynak, COUNT(*) as c
                       FROM contact_submissions
                       GROUP BY kaynak ORDER BY c DESC LIMIT 20`).all(),
      env.DB.prepare(`SELECT COALESCE(NULLIF(status,''), 'new') as status, COUNT(*) as c
                       FROM contact_submissions GROUP BY status`).all(),
      env.DB.prepare(`SELECT date(created_at) as d, COUNT(*) as c
                       FROM contact_submissions
                       WHERE created_at >= datetime('now','-7 days')
                       GROUP BY date(created_at) ORDER BY d`).all(),
      env.DB.prepare("SELECT COUNT(*) as c FROM dealership_applications").first(),
    ]);
    return jsonResponse({
      contact: { today: today.c, week: week.c, month: month.c, total: total.c },
      bayilik: { total: bayilikTotal.c },
      bySource: bySource.results,
      byStatus: byStatus.results,
      last7d: last7d.results,
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
