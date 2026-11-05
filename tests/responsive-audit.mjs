// Responsive audit: screenshots and measurements of the main pages at phone, tablet and small-laptop widths.
// Needs the static server (python -m http.server 8080) and a Chromium browser (BROWSER=<path> or Edge/Chrome/Brave).
// Usage: node tests/responsive-audit.mjs [outDir] [m375,t768,l1024] [key=/path,key=/path]
// Output: <outDir>/<viewport>-<page>.png and report.json (horizontal overflow, overflowing elements, targets < 24 px,
// text < 11 px, fields < 16 px). Review: docs/reviews/2026-11-04-design-review-responsive.md
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
].filter(Boolean);
const BROWSER = CANDIDATES.find(p => existsSync(p));
if (!BROWSER) { console.error('Kein Chromium-Browser gefunden. BROWSER=<pfad> setzen.'); process.exit(2); }
const PORT = 9351, BASE = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const OUT = process.argv[2] || join(tmpdir(), 'cde-responsive-audit');
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
mkdirSync(OUT, { recursive: true });
const VIEWPORTS = { m375: { width: 375, height: 812, mobile: true }, t768: { width: 768, height: 1024, mobile: true }, l1024: { width: 1024, height: 768, mobile: false } };
const PAGES = process.argv[4] ? Object.fromEntries(process.argv[4].split(',').map(s => s.split('='))) : {
  start: '/', projekte: '/projects/all?view=card', projektliste: '/projects/all', aufgaben: '/tasks/all', ueberblick: '/projects/musterhausen/overview',
  lieferplan: '/projects/musterhausen/delivery-plan', kv: '/projects/musterhausen/deliveries/kv-32/erfassung', thg: '/projects/musterhausen/deliveries/thg-32/erfassung',
  kvpruef: '/projects/musterhausen/deliveries/kv-32/pruefung', lieferung: '/projects/musterhausen/deliveries/kv-32', dwg: '/projects/musterhausen/deliveries/dwg-eg/erfassung',
  mitglieder: '/projects/musterhausen/members', dokumente: '/projects/musterhausen/documents', loin: '/projects/musterhausen/loin', settings: '/projects/musterhausen/settings',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cde-audit-'))}`, '--window-size=1400,1000', 'about:blank'], { stdio: 'ignore' });
let url; for (let i = 0; i < 100 && !url; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); url = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* not up yet */ } await sleep(100); }
if (!url) { console.error('Browser antwortet nicht.'); proc.kill(); process.exit(2); }
const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map(); const errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '#/' }); await sleep(1500);

const METRICS = `(() => {
  const W = innerWidth, sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const all = [...document.querySelectorAll('body *')].filter(vis);
  const over = all.filter(el => el.getBoundingClientRect().right > W + 1 && !el.closest('.plan-viewer, canvas'));
  const overTop = [...new Map(over.map(el => [sel(el), Math.round(el.getBoundingClientRect().right - W)])).entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [data-action], [data-nav]')].filter(vis);
  const small = targets.filter(el => { const r = el.getBoundingClientRect(); return r.height < 24 || r.width < 24; });
  const smallTop = [...new Map(small.map(el => [sel(el), [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)]])).entries()].slice(0, 8);
  const tiny = all.filter(el => el.children.length === 0 && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 11);
  const fields = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')].filter(vis);
  const zoomFields = fields.filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).length;
  return { innerWidth: W, scrollWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight, hOverflow: document.documentElement.scrollWidth > W + 1, overflowing: overTop, targets: targets.length, smallTargets: small.length, smallTop, tiny: tiny.length, fields: fields.length, zoomFields, sideToggle: !!document.querySelector('.side-toggle') && getComputedStyle(document.querySelector('.side-toggle')).display !== 'none', title: document.title };
})()`;

const report = {};
for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
  if (ONLY && !ONLY.includes(vpKey)) continue;
  await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  if (vp.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  for (const [pKey, path] of Object.entries(PAGES)) {
    await ev(`location.hash = ${JSON.stringify('#' + path)}`); await sleep(pKey === 'start' || pKey === 'ueberblick' ? 2500 : 700);
    await ev('scrollTo(0, 0)');
    const m = await ev(METRICS);
    report[`${vpKey}-${pKey}`] = m;
    const h = Math.min(m.pageHeight, 2600);
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: Math.max(vp.height, h), deviceScaleFactor: 1, mobile: vp.mobile }); await sleep(250);
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: vp.width, height: h, scale: 1 }, captureBeyondViewport: true });
    writeFileSync(join(OUT, `${vpKey}-${pKey}.png`), Buffer.from(shot.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    console.log(vpKey, pKey, 'h', m.pageHeight, 'scrollW', m.scrollWidth, m.hOverflow ? 'H-OVERFLOW ' + JSON.stringify(m.overflowing.slice(0, 3)) : '', 'small', m.smallTargets + '/' + m.targets, 'tiny', m.tiny, 'fields<16px', m.zoomFields + '/' + m.fields);
  }
  if (vp.mobile && !process.argv[4]) {   // sidebar open and the notification drawer on the phone / tablet
    await ev(`location.hash = '#/projects/musterhausen/overview'`); await sleep(800);
    await ev(`document.querySelector('.side-toggle')?.click()`); await sleep(400);
    writeFileSync(join(OUT, `${vpKey}-sidebar.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 } })).data, 'base64'));
    report[`${vpKey}-sidebar`] = await ev(`(() => { const s = document.querySelector('.sidebar'); const r = s.getBoundingClientRect(); return { open: document.body.classList.contains('side-open'), left: r.left, width: r.width }; })()`);
    await ev(`document.querySelector('.side-backdrop')?.click()`); await sleep(300);
    await ev(`document.querySelector('[data-action="toggleNotif"]')?.click()`); await sleep(400);
    writeFileSync(join(OUT, `${vpKey}-notif.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 } })).data, 'base64'));
    await ev(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(300);
    await ev(`location.hash = '#/'`); await sleep(500);
  }
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const over = Object.entries(report).filter(([, v]) => v.hOverflow).map(([k]) => k);
console.log(`\nScreenshots und report.json: ${OUT}\nSeiten mit horizontalem Überlauf: ${over.length ? over.join(', ') : 'keine'}`);
if (errors.length) console.log('Browser-Fehler:', errors.join(' | ').slice(0, 500));
try { await Promise.race([send('Browser.close'), new Promise(r => setTimeout(r, 1500))]); } catch { /* already gone */ }   // proc.kill() alone leaves the browser running on Windows
ws.close(); proc.kill();
process.exit(over.length ? 1 : 0);
