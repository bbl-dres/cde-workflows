// Reference comparison: screenshots of the prototype at the window sizes of the reference screenshots in
// docs/reference/cde-r/, written next to them as side-by-side images (reference | prototype) in docs/reference/compare/.
// Needs the static server (python -m http.server 8080) and Python with Pillow for the composite images.
//   node tests/refshots.mjs            → docs/reference/compare/compare-*.png + ours-*.png
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'reference', 'compare');
const REF = join(ROOT, 'docs', 'reference', 'cde-r');
mkdirSync(OUT, { recursive: true });
const CANDIDATES = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'].filter(Boolean);
const BROWSER = CANDIDATES.find(p => existsSync(p));
if (!BROWSER) { console.error('Kein Chromium-Browser gefunden. BROWSER=<pfad> setzen.'); process.exit(2); }
const PORT = 9335;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080/';

// [name, route, width, height, persona, reference file (optional), extra setup]
const SHOTS = [
  ['dashboard', '/', 1528, 1138, 'PM', 'dashboard-1528.png'],
  ['tasks', '/tasks/all', 1537, 487, 'AB', 'tasks-all-row-actions-1537.png'],
  ['delivery-plan', '/projects/agroscope-posieux/delivery-plan', 1534, 1137, 'PM', 'project-delivery-plan-1534.png'],
  ['projects', '/projects/all', 1534, 1137, 'PM'],
  ['overview', '/projects/musterhausen/overview', 1534, 1137, 'PM'],
  ['documents', '/projects/musterhausen/documents', 1520, 1144, 'PM'],
  ['loin', '/projects/musterhausen/loin', 1526, 1140, 'PM'],
  ['timeline-logs', '/projects/musterhausen/timeline/logs', 1525, 900, 'PM'],
  ['kv-uebersicht', '/projects/musterhausen/deliveries/kv-32/uebersicht', 1534, 1137, 'GM'],
  ['kv-erfassung', '/projects/musterhausen/deliveries/kv-32/erfassung', 1534, 1137, 'GM'],
  ['kv-pruefung', '/projects/musterhausen/deliveries/kv-32/pruefung', 1534, 1137, 'PM'],
  ['thg-pruefung', '/projects/musterhausen/deliveries/thg-32/pruefung', 1534, 1137, 'PM'],
  ['dwg-uebersicht', '/projects/musterhausen/deliveries/dwg-eg/uebersicht', 1534, 1137, 'AB'],
  ['dwg-erfassung', '/projects/musterhausen/deliveries/dwg-eg/erfassung', 1534, 1137, 'AB'],
  ['dwg-pruefung', '/projects/musterhausen/deliveries/dwg-og2/pruefung', 1534, 1137, 'PM'],
  ['responsive-900', '/projects/musterhausen/delivery-plan', 900, 900, 'PM'],
  ['responsive-640', '/', 640, 1000, 'PM'],
];

const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'cde-ref-'))}`, '--window-size=1600,1200', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let url; for (let i = 0; i < 100 && !url; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); url = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} await sleep(100); }
const ws = new WebSocket(url); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '#/' }); await sleep(1500);

const written = [];
for (const [name, route, w, h, persona, ref] of SHOTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await ev(`window.cde.store.set({ user: ${JSON.stringify(persona)} }); location.hash = ${JSON.stringify('#' + route)}; true`);
  await sleep(route === '/' ? 6000 : route.includes('/dwg-') ? 4000 : 500);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const ours = join(OUT, `ours-${name}.png`);
  writeFileSync(ours, Buffer.from(r.data, 'base64'));
  written.push([name, ours, ref ? join(REF, ref) : null]);
  console.log('shot', name, `${w}x${h}`);
}
ws.close(); proc.kill();

// Composite (reference | prototype) with Pillow; the reference may include the browser chrome, which is cropped at the topbar.
const py = `
import sys, os
from PIL import Image
pairs = ${JSON.stringify(written.map(([n, o, r]) => [n, o, r])).replace(/null/g, 'None')}
TOP = (52, 66, 85)
def crop_chrome(im):
    for y in range(0, min(140, im.height)):
        c = im.getpixel((200, y))
        if all(abs(c[i] - TOP[i]) <= 10 for i in range(3)): return im.crop((0, y, im.width, im.height))
    return im
for name, ours, ref in pairs:
    b = Image.open(ours).convert('RGB')
    if ref and os.path.exists(ref):
        a = crop_chrome(Image.open(ref).convert('RGB'))
        h = max(a.height, b.height)
        out = Image.new('RGB', (a.width + b.width + 8, h), (255, 0, 0))
        out.paste(a, (0, 0)); out.paste(b, (a.width + 8, 0))
        out.save(os.path.join(${JSON.stringify(OUT)}, 'compare-' + name + '.png'))
        print('compare', name, a.size, b.size)
`;
const res = spawnSync('python', ['-I', '-c', py], { encoding: 'utf8' });
process.stdout.write(res.stdout || ''); if (res.status) console.error(res.stderr);
console.log('Ergebnis:', OUT);
