// The public lookup page. Plain on purpose: it works, it is safe, and the designed UI replaces its look later.
// Everything that comes from the registry, and so from strangers, goes in through textContent, never as HTML.
// The script is served as a separate file so the Content-Security-Policy can forbid inline script.

export const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fides lookup</title>
<style>
  :root { color-scheme: light dark; --bg: #faf8f3; --fg: #1d1b16; --muted: #6b665a; --line: #d9d3c4; --ok: #1d6b3a; --bad: #9b2226; --warn: #8a5a00; }
  @media (prefers-color-scheme: dark) { :root { --bg: #17160f; --fg: #eee9da; --muted: #a39d8b; --line: #3a372c; --ok: #6cc18a; --bad: #e07a7e; --warn: #e0b45a; } }
  body { margin: 0 auto; max-width: 52rem; padding: 1.5rem 1rem 4rem; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; } p.sub { margin: 0 0 1.25rem; color: var(--muted); }
  form { display: flex; gap: .5rem; margin-bottom: 1.25rem; } input { flex: 1; min-width: 0; padding: .55rem .7rem; font: inherit; border: 1px solid var(--line); background: transparent; color: inherit; border-radius: 6px; }
  button { padding: .5rem .9rem; font: inherit; border: 1px solid var(--fg); background: var(--fg); color: var(--bg); border-radius: 6px; cursor: pointer; } button.small { padding: .2rem .55rem; font-size: .85rem; background: transparent; color: var(--fg); }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: .8rem 1rem; margin: .75rem 0; } .row { display: flex; flex-wrap: wrap; gap: .4rem 1rem; align-items: baseline; }
  .tag { font-weight: 600; } .burned, .fail { color: var(--bad); } .clean, .pass { color: var(--ok); } .rejected { color: var(--warn); } .muted { color: var(--muted); font-size: .9rem; }
  code { font: .85rem ui-monospace, monospace; word-break: break-all; } ol.steps { list-style: none; padding: 0; margin: .6rem 0 0; } ol.steps li { padding: .15rem 0; }
  .notice { border-left: 4px solid var(--warn); padding: .4rem .8rem; margin: .75rem 0; }
</style>
</head>
<body>
<h1>Fides lookup</h1>
<p class="sub">What the shared record says about a merchant, with every report checked again here against Sui and Tatum. Reports that fail a check are shown, with the reason, and never counted.</p>
<form id="f"><input id="host" placeholder="merchant host, for example flaky.example" autocomplete="off" spellcheck="false" aria-label="merchant host"><button>Look up</button></form>
<div id="out" aria-live="polite"></div>
<script src="/app.js"></script>
</body>
</html>
`;

export const PAGE_JS = `'use strict';
const out = document.getElementById('out');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const short = (s) => (s && s.length > 20 ? s.slice(0, 10) + '...' + s.slice(-6) : s || '');

async function api(path) {
  const r = await fetch(path);
  const body = await r.json().catch(() => ({ error: 'the registry answered with something that is not JSON' }));
  if (!r.ok) throw new Error(body.error || ('HTTP ' + r.status));
  return body;
}

function showError(msg) { out.replaceChildren(el('div', 'card fail', msg)); }

function evidenceCard(e) {
  const card = el('div', 'card');
  const head = el('div', 'row');
  head.append(el('span', 'tag ' + e.verdict, e.verdict === 'burned' ? 'burned (' + e.burnKind + ')' : 'clean'));
  head.append(el('span', e.status === 'verified' ? 'pass' : 'rejected', e.status));
  head.append(el('span', 'muted', e.issuedAt));
  card.append(head);
  card.append(el('div', 'muted', 'reporter ' + short(e.reporter) + '   payment ' + short(e.paymentTx) + (e.anchorTx ? '   anchor ' + short(e.anchorTx) : '')));
  const id = el('div', 'muted'); id.append('record '); id.append(el('code', '', e.evidenceId)); card.append(id);
  if (e.rejectReason) card.append(el('div', 'rejected', 'rejected: ' + e.rejectReason));
  const steps = el('ol', 'steps');
  const btn = el('button', 'small', 'Re-verify');
  const raw = el('a', 'muted', ' view the signed record'); raw.href = '/v1/evidence/' + e.evidenceId; raw.target = '_blank'; raw.rel = 'noopener';
  btn.addEventListener('click', async () => {
    btn.disabled = true; steps.replaceChildren(el('li', 'muted', 'checking...'));
    try {
      const v = await api('/v1/evidence/' + e.evidenceId + '/verify');
      steps.replaceChildren();
      for (const s of v.steps) {
        await new Promise((r) => setTimeout(r, 350));
        const li = el('li', s.ok ? 'pass' : 'fail', (s.ok ? 'ok    ' : 'FAIL  ') + s.name + ': ' + s.detail);
        steps.append(li);
      }
      steps.append(el('li', 'tag ' + (v.ok ? 'pass' : 'fail'), v.ok ? 'This record passes every check.' : 'This record does not pass: it is not counted.'));
    } catch (err) { steps.replaceChildren(el('li', 'fail', String(err.message || err))); }
    btn.disabled = false;
  });
  const actions = el('div', 'row'); actions.append(btn, raw); card.append(actions, steps);
  return card;
}

async function lookup(host) {
  out.replaceChildren(el('div', 'muted', 'looking up ' + host + '...'));
  let m;
  try { m = await api('/v1/merchants/' + encodeURIComponent(host)); } catch (err) { return showError(String(err.message || err)); }
  const frag = document.createDocumentFragment();
  const top = el('div', 'card');
  const row = el('div', 'row');
  row.append(el('span', 'tag', m.host), el('span', 'tag', 'tier: ' + m.assessment.tier));
  if (m.assessment.cannotSay) row.append(el('span', 'rejected', 'cannot say: not enough history'));
  top.append(row);
  top.append(el('div', 'muted', m.assessment.cleanCount + ' clean and ' + m.assessment.burnCount + ' burned verified reports in the last 30 days.'));
  if (m.knownPayTo) { const p = el('div', 'muted'); p.append('paid at '); p.append(el('code', '', m.knownPayTo)); top.append(p); }
  frag.append(top);
  if (m.stale) frag.append(el('div', 'notice', 'The shared record could not be reached just now. This is an older answer, not an empty record.'));
  if (m.refresh && m.refresh.pending > 0) frag.append(el('div', 'notice', m.refresh.pending + ' report(s) could not be checked yet and are not counted.'));
  const an = m.refresh && m.refresh.anchors;
  if (an && an.notRecalled.length > 0) {
    const card = el('div', 'notice', an.notRecalled.length + ' report(s) are anchored on Sui for this merchant, but their signed records were not returned by the shared record. They are listed, not counted: without the record, the signature and the payment cannot be checked.');
    for (const a of an.notRecalled) { const p = el('div', 'muted'); p.append(a.verdict + ' by ' + a.reporter.slice(0, 10) + '..., anchor '); p.append(el('code', '', a.anchorTx)); card.append(p); }
    frag.append(card);
  }
  if (an && an.state === 'failed') frag.append(el('div', 'muted', 'The anchors on Sui could not be read just now, so reports the shared record missed may not be shown.'));
  if (m.refresh && m.refresh.malformed > 0) frag.append(el('div', 'muted', m.refresh.malformed + ' memory(ies) in the shared record were not Fides reports and were ignored.'));
  if (m.evidence.length === 0) frag.append(el('div', 'card', 'No reports for this merchant yet.'));
  for (const e of m.evidence) frag.append(evidenceCard(e));
  out.replaceChildren(frag);
}

document.getElementById('f').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const host = document.getElementById('host').value.trim();
  if (host) { location.hash = host; lookup(host); }
});
if (location.hash.length > 1) { const h = decodeURIComponent(location.hash.slice(1)); document.getElementById('host').value = h; lookup(h); }
`;
