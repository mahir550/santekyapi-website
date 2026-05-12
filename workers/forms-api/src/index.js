export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
