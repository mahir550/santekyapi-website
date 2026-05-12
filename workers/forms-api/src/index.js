export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://www.santekyapi.com.tr',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdmin(request, url, env);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Geçersiz istek.' }), 400);
    }

    if (url.pathname === '/api/contact') {
      return handleContact(body, env);
    }

    if (url.pathname === '/api/bayilik') {
      return handleBayilik(body, env);
    }

    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  }
};

// ── Admin ────────────────────────────────────────────────────────────────────

async function handleAdmin(request, url, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { pathname } = url;
  const method = request.method;

  // GET /api/admin/contact
  if (pathname === '/api/admin/contact' && method === 'GET') {
    const page  = Math.max(1, parseInt(url.searchParams.get('page')  || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('q') || '';

    let rows, countRow;
    if (search) {
      const like = `%${search}%`;
      [rows, countRow] = await Promise.all([
        env.DB.prepare(
          `SELECT * FROM contact_submissions WHERE ad LIKE ? OR soyad LIKE ? OR eposta LIKE ? OR sirket LIKE ? OR mesaj LIKE ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(like, like, like, like, like, limit, offset).all(),
        env.DB.prepare(
          `SELECT COUNT(*) as total FROM contact_submissions WHERE ad LIKE ? OR soyad LIKE ? OR eposta LIKE ? OR sirket LIKE ? OR mesaj LIKE ?`
        ).bind(like, like, like, like, like).first()
      ]);
    } else {
      [rows, countRow] = await Promise.all([
        env.DB.prepare(`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all(),
        env.DB.prepare(`SELECT COUNT(*) as total FROM contact_submissions`).first()
      ]);
    }

    return jsonResponse({ data: rows.results, total: countRow.total, page, limit });
  }

  // GET /api/admin/bayilik
  if (pathname === '/api/admin/bayilik' && method === 'GET') {
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  || '1'));
    const limit  = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
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
      env.DB.prepare(`SELECT * FROM dealership_applications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...baseParams, limit, offset).all(),
      env.DB.prepare(`SELECT COUNT(*) as total FROM dealership_applications ${where}`).bind(...baseParams).first()
    ]);

    return jsonResponse({ data: rows.results, total: countRow.total, page, limit });
  }

  // PATCH /api/admin/bayilik/:id
  const bayilikMatch = pathname.match(/^\/api\/admin\/bayilik\/(\d+)$/);
  if (bayilikMatch && method === 'PATCH') {
    let body;
    try { body = await request.json(); } catch {
      return jsonResponse({ error: 'Invalid body' }, 400);
    }
    const { status } = body;
    if (!['new', 'reviewing', 'approved', 'rejected'].includes(status)) {
      return jsonResponse({ error: 'Invalid status' }, 400);
    }
    await env.DB.prepare('UPDATE dealership_applications SET status = ? WHERE id = ?')
      .bind(status, parseInt(bayilikMatch[1])).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ── Form handlers ────────────────────────────────────────────────────────────

async function handleContact(body, env) {
  const { ad = '', soyad = '', sirket = '', eposta = '', konu = '', mesaj = '' } = body;

  if (!ad.trim() || !eposta.trim() || !mesaj.trim()) {
    return corsResponse(JSON.stringify({ error: 'Ad, e-posta ve mesaj alanları zorunludur.' }), 400);
  }
  if (!isValidEmail(eposta)) {
    return corsResponse(JSON.stringify({ error: 'Geçersiz e-posta adresi.' }), 400);
  }
  if (mesaj.length > 2000) {
    return corsResponse(JSON.stringify({ error: 'Mesaj çok uzun (max 2000 karakter).' }), 400);
  }

  await env.DB.prepare(
    `INSERT INTO contact_submissions (ad, soyad, sirket, eposta, konu, mesaj, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(ad.trim(), soyad.trim(), sirket.trim(), eposta.trim(), konu, mesaj.trim()).run();

  return corsResponse(JSON.stringify({ success: true }), 200);
}

async function handleBayilik(body, env) {
  const { ad = '', soyad = '', sirket = '', eposta = '', telefon = '', sehir = '', faaliyet_alani = '', mesaj = '' } = body;

  if (!ad.trim() || !eposta.trim() || !sirket.trim()) {
    return corsResponse(JSON.stringify({ error: 'Ad, e-posta ve şirket alanları zorunludur.' }), 400);
  }
  if (!isValidEmail(eposta)) {
    return corsResponse(JSON.stringify({ error: 'Geçersiz e-posta adresi.' }), 400);
  }

  await env.DB.prepare(
    `INSERT INTO dealership_applications (ad, soyad, sirket, eposta, telefon, sehir, faaliyet_alani, mesaj, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(ad.trim(), soyad.trim(), sirket.trim(), eposta.trim(), telefon, sehir, faaliyet_alani, mesaj.trim()).run();

  return corsResponse(JSON.stringify({ success: true }), 200);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsResponse(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://www.santekyapi.com.tr',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://www.santekyapi.com.tr',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
