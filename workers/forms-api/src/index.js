const ALLOWED_ORIGINS = [
  'https://www.santekyapi.com.tr',
  'https://santekyapi.com.tr',
  'https://shop.santekyapi.com.tr',
  'https://santekyapi.pages.dev',
];

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
  async fetch(request, env) {
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

    if (url.pathname === '/api/contact') return handleContact(body, env, request);
    if (url.pathname === '/api/bayilik') return handleBayilik(body, env, request);

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404, request);
  },
};

async function handleContact(body, env, request) {
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
