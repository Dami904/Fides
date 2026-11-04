/* Shared helpers for the mockups. Everything that comes from data is written as text, never as markup.
   The only markup built from strings is the SVG for seals, made from hex digits and fixed shapes. */
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- small DOM builder ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const short = (s, n = 8) => (s ? String(s).slice(0, n) : '');
  const shortAddr = (s) => (s && s.length > 20 ? s.slice(0, 8) + '…' + s.slice(-4) : s || '');
  const usd = (n) => Number(n).toFixed(2);

  // ---------- theme ----------
  function getTheme() { try { return localStorage.getItem('fides-theme') || 'dark'; } catch { return 'dark'; } }
  function setTheme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('fides-theme', t); } catch { /* private window */ } }
  document.documentElement.dataset.theme = getTheme(); // applied, not saved: only a toggle saves a choice

  // ---------- hash glyph and seal ----------
  // A five by five mirrored grid drawn from the hash: the same hash always looks the same, a different one never does.
  function glyphCells(hex) {
    const cells = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      const on = (parseInt(hex[(r * 3 + c) % hex.length] || '0', 16) & 1) === 1;
      if (on) { cells.push([c, r]); if (c < 2) cells.push([4 - c, r]); }
    }
    return cells;
  }
  /** status: verified | rejected | pending */
  function seal(hex, status = 'verified', size = 30) {
    const col = status === 'rejected' ? 'var(--red)' : status === 'pending' ? 'var(--ochre)' : 'var(--green)';
    const g = glyphCells(hex || '0000000000000000').map(([c, r]) => `<rect x="${9.2 + c * 4.3}" y="${9.2 + r * 4.3}" width="3.5" height="3.5"/>`).join('');
    const hex6 = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${(20 + Math.cos(a) * 18).toFixed(2)},${(20 + Math.sin(a) * 18).toFixed(2)}`; }).join(' ');
    const strike = status === 'rejected' ? '<path d="M5 35 L35 5" stroke="var(--red)" stroke-width="2.6" stroke-linecap="square"/>' : '';
    const dash = status === 'pending' ? 'stroke-dasharray="3 2.5"' : '';
    const wrap = document.createElement('span');
    wrap.className = 'seal'; wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', `${status} record ${short(hex)}`);
    wrap.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><polygon points="${hex6}" fill="color-mix(in srgb, ${col} 12%, var(--surface))" stroke="${col}" stroke-width="1.8" ${dash}/><g fill="${col}">${g}</g>${strike}</svg>`;
    return wrap;
  }  function evidenceChip(id, status = 'verified', href) {
    return h(href ? 'a' : 'span', { class: 'chip ' + (status === 'rejected' ? 'rejected' : ''), href, title: id }, seal(id, status, 22), short(id));
  }

  // ---------- stamp ----------
  const STAMP = { PAY: ['pay', 'Pay'], PAY_CAPPED: ['capped', 'Pay, capped'], ASK: ['ask', 'Ask'], REFUSE: ['refuse', 'Refuse'] };
  function stamp(decision, opts = {}) {
    const [cls, label] = STAMP[decision] || ['ask', decision];
    const el = h('span', { class: `stamp ${cls}${opts.big ? ' big' : ''}`, role: 'img', 'aria-label': `verdict: ${label}` }, label, opts.sub ? h('small', { text: opts.sub }) : null);
    if (opts.press) requestAnimationFrame(() => el.classList.add('press'));
    return el;
  }
  const flagOf = (d) => (d === 'REFUSE' ? 'flag-red' : d === 'ASK' ? 'flag-ochre' : 'flag-green');

  function meter(conf) {
    const on = Math.round(conf * 10);
    return h('span', { class: 'meter', role: 'img', 'aria-label': `confidence ${Math.round(conf * 100)} percent` }, Array.from({ length: 10 }, (_, i) => h('i', { class: i < on ? 'on' : '' })));
  }

  // ---------- page frame ----------
  const NAV = [['feed.html', 'Decision feed'], ['split.html', 'A / B split'], ['merchant.html', 'Merchant record'], ['sim.html', 'Simulation']];
  function frame(active, honesty) {
    const root = document.getElementById('chrome');
    const defs = document.createElementNS(SVGNS, 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true'); defs.style.position = 'absolute';
    defs.innerHTML = '<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter>';
    const mark = seal('fides1234567890ab', 'verified', 30);
    const themeBtn = h('button', { class: 'theme', type: 'button', 'aria-label': 'Switch between the dark and light themes' }, getTheme() === 'dark' ? 'Light' : 'Dark');
    themeBtn.addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(t); themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark'; });
    const nav = h('nav', { class: 'nav', 'aria-label': 'Screens' }, NAV.map(([href, label]) => h('a', { href, 'aria-current': href === active ? 'page' : false }, label)));
    const top = h('header', { class: 'top' }, h('a', { class: 'brand', href: 'index.html' }, mark, h('span', null, 'Fides ', h('small', { text: ' credit bureau for machine payments' }))), nav, themeBtn);
    const hon = h('div', { class: 'honesty', role: 'note', 'aria-label': 'What is real on this screen' }, h('span', { class: 'lead', text: 'On this screen' }),
      (honesty || []).map(([k, v, real]) => h('span', null, h('span', { class: 'dot' + (real ? ' real' : '') }), k + ' ', h('b', { text: v }))));
    root.replaceChildren(defs, top, hon);
  }

  // ---------- re-verify animation ----------
  // steps: [{name, ok, detail}]. They appear one by one, the way a clerk ticks a ledger.
  function reverify(listEl, steps, done) {
    listEl.replaceChildren();
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    const next = () => {
      if (i >= steps.length) { done && done(steps.every((s) => s.ok) && steps.length === 5); return; }
      const s = steps[i++];
      const li = h('li', { class: s.ok ? 'pass' : 'fail' }, h('span', { class: 'mark', 'aria-hidden': 'true', text: s.ok ? '✓' : '✕' }), h('span', { class: 'nm', text: s.name }), h('span', { class: 'dt', text: s.detail }));
      li.setAttribute('aria-label', `${s.name}: ${s.ok ? 'passed' : 'failed'}`);
      listEl.append(li);
      requestAnimationFrame(() => li.classList.add('in'));
      setTimeout(next, reduce ? 0 : 380);
    };
    next();
  }

  // ---------- data: turn the recorded events into one record per attempt ----------
  function attempts(events) {
    const out = [];
    let cur = null;
    for (const e of events) {
      if (e.type === 'challenge') { cur = { agent: e.agent, host: e.host, amount: e.amount, recipient: e.recipient, events: [e] }; out.push(cur); continue; }
      if (!cur) continue;
      cur.events.push(e);
      if (e.type === 'check') cur.check = e;
      if (e.type === 'asked') cur.asked = e;
      if (e.type === 'paid') cur.paid = e;
      if (e.type === 'response') cur.response = e;
      if (e.type === 'reported') cur.reported = e;
      if (e.type === 'skipped') cur.skipped = e;
    }
    return out;
  }

  window.Fides = { h, short, shortAddr, usd, seal, evidenceChip, stamp, flagOf, meter, frame, reverify, attempts, glyphCells, setTheme };
})();
