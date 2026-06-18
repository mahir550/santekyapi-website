(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────
  var PHONE = '905427280728';
  var MSG   = 'Merhaba, Qbrick System hakkında bilgi almak istiyorum.';
  var WA    = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(MSG);

  if (document.getElementById('stk-wa-root')) return;

  // ── Styles ────────────────────────────────────────────────────────────
  var css =
    '#stk-wa-root{position:fixed;bottom:24px;right:24px;z-index:2147483647;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'display:flex;flex-direction:column;align-items:flex-end;gap:10px;' +
    'opacity:0;transform:translateY(20px);transition:opacity .35s,transform .35s;}' +

    '#stk-wa-root.stk-rdy{opacity:1;transform:none;}' +

    '#stk-wa-root *{box-sizing:border-box;margin:0;padding:0;line-height:1.4;}' +

    '#stk-wa-chat{background:#fff;border-radius:16px 16px 4px 16px;' +
    'box-shadow:0 8px 40px rgba(0,0,0,.2);width:290px;overflow:hidden;' +
    'opacity:0;transform:translateY(16px) scale(.94);pointer-events:none;' +
    'transition:opacity .22s,transform .22s;}' +

    '#stk-wa-chat.stk-open{opacity:1;transform:none;pointer-events:all;}' +

    '#stk-wa-hd{background:#075E54;padding:14px 16px;display:flex;' +
    'align-items:center;gap:10px;position:relative;}' +

    '#stk-wa-av{width:42px;height:42px;border-radius:50%;background:#128C7E;' +
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +

    '#stk-wa-hd-name{color:#fff;font-weight:700;font-size:14px;}' +

    '#stk-wa-hd-sub{color:rgba(255,255,255,.8);font-size:11px;margin-top:3px;' +
    'display:flex;align-items:center;gap:5px;}' +

    '#stk-wa-hd-sub::before{content:"";width:7px;height:7px;border-radius:50%;' +
    'background:#25D366;flex-shrink:0;}' +

    '#stk-wa-x{position:absolute;top:10px;right:12px;background:none;border:none;' +
    'color:rgba(255,255,255,.8);cursor:pointer;font-size:22px;line-height:1;padding:0 4px;}' +

    '#stk-wa-x:hover{color:#fff;}' +

    '#stk-wa-body{background:#ECE5DD;padding:16px;}' +

    '#stk-wa-msg{background:#fff;border-radius:0 8px 8px 8px;' +
    'padding:10px 12px;font-size:13px;color:#222;' +
    'box-shadow:0 1px 2px rgba(0,0,0,.08);}' +

    '#stk-wa-ts{text-align:right;font-size:10px;color:#aaa;margin-top:5px;}' +

    '#stk-wa-cta{display:flex;align-items:center;justify-content:center;gap:8px;' +
    'background:#25D366;color:#fff;text-decoration:none;font-size:14px;' +
    'font-weight:600;padding:13px;transition:background .15s;}' +

    '#stk-wa-cta:hover{background:#22c55e;color:#fff;}' +

    '#stk-wa-btn{position:relative;width:56px;height:56px;background:#25D366;' +
    'border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;' +
    'justify-content:center;box-shadow:0 4px 20px rgba(37,211,102,.5);' +
    'transition:transform .15s,box-shadow .15s;}' +

    '#stk-wa-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(37,211,102,.6);}' +

    '#stk-wa-btn .stk-ico-x{display:none;}' +

    '#stk-wa-btn.stk-open .stk-ico-wa{display:none;}' +
    '#stk-wa-btn.stk-open .stk-ico-x{display:flex;}' +

    '#stk-wa-dot{position:absolute;top:3px;right:3px;width:12px;height:12px;' +
    'background:#f44336;border:2px solid #fff;border-radius:50%;' +
    'animation:stk-pulse 1.8s ease infinite;}' +

    '@keyframes stk-pulse{0%,100%{transform:scale(1)}60%{transform:scale(1.35)}}' +

    '@media(max-width:480px){' +
    '#stk-wa-root{bottom:16px;right:16px;}' +
    '#stk-wa-chat{width:calc(100vw - 32px);max-width:300px;}' +
    '}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // ── SVG icons ─────────────────────────────────────────────────────────
  var ICO_WA =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' +
    '<path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46' +
    ' 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.78 1.21h.01c5.46 0 9.91-4.45' +
    ' 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02zM12.04 20.13h-.01c-1.52 0-3.01-.41-4.3-1.18' +
    'l-.31-.18-3.2.84.85-3.12-.2-.32a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24' +
    ' 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24' +
    ' 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81' +
    '-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38' +
    '-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04' +
    '-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48' +
    '-.01-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75' +
    ' 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67' +
    '-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/>' +
    '</svg>';

  var ICO_X =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">' +
    '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41' +
    ' 17.59 19 19 17.59 13.41 12z"/>' +
    '</svg>';

  // ── DOM ───────────────────────────────────────────────────────────────
  var root = document.createElement('div');
  root.id = 'stk-wa-root';
  root.innerHTML =
    '<div id="stk-wa-chat" role="dialog" aria-label="WhatsApp iletişim" aria-hidden="true">' +
      '<div id="stk-wa-hd">' +
        '<div id="stk-wa-av">' + ICO_WA + '</div>' +
        '<div>' +
          '<div id="stk-wa-hd-name">Santek Yapı</div>' +
          '<div id="stk-wa-hd-sub">Genellikle hemen yanıtlar</div>' +
        '</div>' +
        '<button id="stk-wa-x" aria-label="Kapat">&#215;</button>' +
      '</div>' +
      '<div id="stk-wa-body">' +
        '<div id="stk-wa-msg">' +
          'Merhaba! 👋 Qbrick System ve diğer \xfcr\xfcnlerimiz hakkında sorularınız i\xE7in buradayız.' +
          '<div id="stk-wa-ts">Şimdi ✓✓</div>' +
        '</div>' +
      '</div>' +
      '<a id="stk-wa-cta" href="' + WA + '" target="_blank" rel="noopener noreferrer">' +
        ICO_WA + 'Konuşmaya Başla' +
      '</a>' +
    '</div>' +
    '<button id="stk-wa-btn" aria-label="WhatsApp ile iletişime geç" aria-expanded="false">' +
      '<span class="stk-ico-wa">' + ICO_WA + '</span>' +
      '<span class="stk-ico-x">' + ICO_X + '</span>' +
      '<span id="stk-wa-dot"></span>' +
    '</button>';

  document.body.appendChild(root);

  // ── Refs ──────────────────────────────────────────────────────────────
  var btn    = document.getElementById('stk-wa-btn');
  var chat   = document.getElementById('stk-wa-chat');
  var closeX = document.getElementById('stk-wa-x');
  var cta    = document.getElementById('stk-wa-cta');
  var dot    = document.getElementById('stk-wa-dot');
  var opened = false;

  function push(ev) {
    (window.dataLayer = window.dataLayer || []).push({ event: ev });
  }

  function openChat() {
    opened = true;
    chat.classList.add('stk-open');
    chat.setAttribute('aria-hidden', 'false');
    btn.classList.add('stk-open');
    btn.setAttribute('aria-expanded', 'true');
    dot.style.display = 'none';
    push('whatsapp_widget_open');
  }

  function closeChat() {
    opened = false;
    chat.classList.remove('stk-open');
    chat.setAttribute('aria-hidden', 'true');
    btn.classList.remove('stk-open');
    btn.setAttribute('aria-expanded', 'false');
    push('whatsapp_widget_close');
  }

  btn.addEventListener('click', function () { opened ? closeChat() : openChat(); });
  closeX.addEventListener('click', function (e) { e.stopPropagation(); closeChat(); });
  cta.addEventListener('click', function () { push('whatsapp_widget_cta_click'); });

  // ── Init: 2 s sonra slide-in ──────────────────────────────────────────
  setTimeout(function () {
    root.classList.add('stk-rdy');
    push('whatsapp_widget_impression');
  }, 2000);

}());
