// End-to-end smoke test of the prototype: drives a headless Chromium browser via the DevTools protocol
// (no dependencies, Node 22+). Start the static server first (python -m http.server 8080), then:
//   node tests/e2e.mjs
// Environment: BROWSER (path to msedge/chrome/brave), BASE_URL (default http://127.0.0.1:8080/).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
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
const PORT = 9333;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const SHOTS = mkdtempSync(join(tmpdir(), 'cde-e2e-shots-')) + '/';
const profile = mkdtempSync(join(tmpdir(), 'cde-e2e-'));
const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1536,1000', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json`); const list = await r.json(); const page = list.find(t => t.type === 'page'); if (page) return page.webSocketDebuggerUrl; } catch {}
    await sleep(100);
  }
  throw new Error('devtools not reachable');
}

let ws, seq = 0; const pending = new Map(); const consoleErrors = [];
function send(method, params = {}) {
  return new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const settle = () => sleep(70);
async function go(path) { await evaluate(`location.hash = ${JSON.stringify('#' + path)}`); await settle(); }
async function click(sel) { const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`); if (!ok) throw new Error('not found: ' + sel); await settle(); }
async function clickText(sel, text) {
  const ok = await evaluate(`(() => { const els = [...document.querySelectorAll(${JSON.stringify(sel)})]; const el = els.find(e => e.textContent.trim().includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`not found: ${sel} with text "${text}"`); await settle();
}
async function setInput(sel, value) {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.focus(); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  if (!ok) throw new Error('input not found: ' + sel); await settle();
}
const text = sel => evaluate(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').replace(/\\s+/g, ' ').trim()`);
const count = sel => evaluate(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
const state = () => evaluate('JSON.parse(JSON.stringify(window.cde.state))');
const hash = () => evaluate('location.hash');
const bodyText = () => evaluate(`document.body.innerText.replace(/\\s+/g, ' ')`);
const noError = async () => (await count('.boot-error')) === 0;
const disabled = sel => evaluate(`!!document.querySelector(${JSON.stringify(sel)})?.disabled`);
const enabled = sel => evaluate(`document.querySelector(${JSON.stringify(sel)})?.disabled === false`);
const rowPill = code => evaluate(`(() => { const r = [...document.querySelectorAll('.table-row')].find(r => r.textContent.includes(${JSON.stringify(code)})); return r ? (r.querySelector('.pill')?.textContent || '').trim() : ''; })()`);
const tile = key => evaluate(`Number(document.querySelector('.tile-${key} .tile-value')?.textContent)`);

let pass = 0, fail = 0;
function check(name, cond, info = '') { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, info); } }
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(SHOTS + name + '.png', Buffer.from(r.data, 'base64')); }

try {
  const url = await waitForDevtools();
  ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: BASE + '#/' });
  for (let i = 0; i < 100 && !(await evaluate('!!window.cde && !!document.querySelector(".app-frame")')); i++) await sleep(100);
  await sleep(400);

  // 1. Dashboard → Projekte → Projekt → Informationslieferplan → Erstellen-Drawer
  check('dashboard greets the user', (await text('.dash-hello')).startsWith('Hallo Paula'));
  check('dashboard lists my projects', (await count('.dash-project')) >= 4);
  await clickText('.dash-section-head a', 'Alle anzeigen'); check('→ Projekte (cards)', (await hash()) === '#/projects/all' && (await count('.project-card')) === 8);
  await clickText('a', 'Verwaltungszentrum Musterhausen'); check('→ Überblick', (await hash()) === '#/projects/musterhausen/overview');
  await click('[data-action="toggleNav"][data-key="im"]'); check('sidebar group expands', (await count('.nav-item.is-sub')) >= 3);
  await click('a[data-nav="/projects/musterhausen/delivery-plan"]'); check('sidebar → ILP', (await hash()).endsWith('/delivery-plan') && (await count('.table-row')) === 11);
  await click('[data-action="openDialog"][data-arg="order"]'); check('Erstellen drawer opens', (await count('.drawer-wide')) === 1 && (await state()).ui.dialog === 'order');
  await evaluate(`(() => { const s = document.querySelector('[data-change="setOrderType"]'); s.value = 'kv'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await settle();
  check('template dropdown sets orderType=kv', (await state()).orderType === 'kv' && (await bodyText()).includes('ePPM (Leitsystem Baukosten)'));
  await evaluate(`(() => { const s = document.querySelector('[data-change="orderReqType"]'); s.value = 'doc'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await settle();
  check('requirement type Dokument shows file fields', (await bodyText()).includes('Ablageort'));
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await settle();
  check('Escape closes drawer', (await state()).ui.dialog === null && (await count('.drawer')) === 0);
  await click('[data-action="openDialog"][data-arg="order"]'); await clickText('button', 'Erstellen'); check('Erstellen closes with toast', (await state()).ui.dialog === null && (await count('.toast')) === 1);

  // 2. Persona switch + notifications
  await click('[data-action="toggleUserMenu"]'); check('user menu opens', (await count('.user-menu')) === 1);
  await click('[data-action="setUser"][data-key="AB"]'); check('switch to Alex', (await state()).user === 'AB' && (await text('.topbar-username')) === 'Alex Beispiel');
  await go('/'); check('dashboard as Alex', (await text('.dash-hello')).startsWith('Hallo Alex'));
  await click('[data-action="toggleNotif"]'); check('notification drawer', (await count('.drawer .notif-row')) >= 2);
  await click('.notif-row [data-action="notifOpen"]'); check('Anzeigen navigates to the tab of the delivery + closes', (await state()).ui.notif === false && (await hash()).endsWith('/deliveries/kv-32/erfassung'));

  // 3. KV-32 as Alex: Übersicht, Erfassung with Hauptgruppen, missing values, Aufschlüsseln, Excel import, submit
  await go('/projects/musterhausen/deliveries/kv-32'); await sleep(100);
  check('delivery lands on Übersicht', (await hash()) === '#/projects/musterhausen/deliveries/kv-32/uebersicht' && (await text('.tab.is-active')).startsWith('Übersicht'));
  check('Übersicht: KPIs, Hauptgruppen table, Kostenziel, Verlauf steps, Beteiligte', (await count('.kpi')) === 3 && (await bodyText()).includes('Kosten nach Hauptgruppen') && (await count('.tgt-dot')) === 3 && (await count('.st-row')) === 6 && (await count('.pp-row')) === 4);
  check('tab badges: 1 missing value, 2 documents', (await text('.tab-badge')) === '1' && (await count('.tab-badge')) === 2);
  await shot('e2e-kv-uebersicht');
  await clickText('.tab', 'Erfassung');
  check('Erfassung: 13 Hauptgruppen A–Y, D and G detailed', (await hash()).endsWith('/erfassung') && (await count('.ent-group')) === 13 && (await count('.ent-pos')) === 8);
  check('submit disabled while D08 missing', (await disabled('[data-action="formSubmit"]')) && (await bodyText()).includes('Einreichen erst, wenn alle Werte erfasst sind'));
  await click('[data-action="formToggleMissing"]'); check('filter shows only missing rows', (await count('.ent-pos')) === 1 && (await count('.ent-group')) === 1 && (await count('.ent-add')) === 0 && (await state()).projects.musterhausen.forms.kv.missingOnly === true);
  await click('[data-action="formToggleMissing"]');
  await setInput('[data-fid="kvQ-D08"]', '6480');
  check('D08 filled → complete', /Alle 27 Werte erfasst/.test(await bodyText()) && (await count('.tab-badge')) === 1 && (await enabled('[data-action="formSubmit"]')));
  check('focus restored', await evaluate(`document.activeElement?.dataset?.fid === 'kvQ-D08'`));
  await click('.ent-toggle[data-group="C"]'); check('Aufschlüsseln opens the positions of C', (await state()).projects.musterhausen.forms.kv.modes.C === 'detail' && (await count('.ent-pos')) === 12 && (await count('.ent-add')) === 3);
  await click('.ent-toggle[data-group="C"]'); check('Zusammenfassen keeps the sum as the group amount', (await state()).projects.musterhausen.forms.kv.modes.C === 'direct' && Number((await state()).projects.musterhausen.forms.kv.gvals.C) === 3970000 && (await count('.ent-pos')) === 8);
  await click('[data-fid="kv-g-B"]'); check('click into the amount field does not toggle the group', (await state()).projects.musterhausen.forms.kv.modes.B === 'direct');
  await click('.ent-group[data-group="B"]'); check('click on the group row opens its positions', (await state()).projects.musterhausen.forms.kv.modes.B === 'detail' && (await count('.ent-pos')) === 10);
  await click('.ent-group[data-group="B"]'); check('second click closes with the sum', (await state()).projects.musterhausen.forms.kv.modes.B === 'direct' && Number((await state()).projects.musterhausen.forms.kv.gvals.B) === 530000);
  await setInput('[data-fid="kv-g-B"]', '600000'); check('direct group amount editable', String((await state()).projects.musterhausen.forms.kv.gvals.B) === '600000');
  check('no footer text, no Aufschlüsseln links', !(await bodyText()).includes('Werte fiktiv') && (await count('.ent-name a')) === 0);
  await click('[data-action="toggleImportMenu"]'); check('import menu opens', (await count('.dd-menu')) === 1 && (await count('.dd-item')) === 3);
  await click('[data-action="importItem"][data-arg="excel"]'); check('import dialog step 1', (await count('.dialog')) === 1 && (await state()).imp.step === 1 && (await state()).ui.importMenu === false);
  await clickText('button', 'Weiter'); check('import step 2', (await state()).imp.step === 2);
  await clickText('button', 'Übernehmen'); const st3 = await state();
  check('apply writes C02/G02 and opens C in detail', st3.imp.done && Number(st3.projects.musterhausen.kvV.C02) === 1285000 && Number(st3.projects.musterhausen.kvV.G02) === 742000 && st3.projects.musterhausen.forms.kv.modes.C === 'detail');
  await clickText('button', 'Schliessen'); check('close import', (await state()).ui.dialog === null && (await count('.ent-pos')) === 12);
  await shot('e2e-kv-erfassung');
  await click('[data-action="formSubmit"]'); check('KV submitted → Eingereicht, Erfassung locked', (await state()).projects.musterhausen.forms.kv.step === 3 && (await text('.page-title')).includes('Eingereicht') && (await bodyText()).includes('Die Erfassung ist gesperrt') && (await count('.ent-input:not([readonly])')) === 0);
  await clickText('.tab', 'Übersicht'); check('Übersicht shows the next step', (await bodyText()).includes('Paula Muster prüft die Lieferung'));
  await clickText('.tab', 'Verlauf'); check('Verlauf lists import and submission', (await bodyText()).includes('Zur Prüfung eingereicht') && (await bodyText()).includes('Excel importiert') && (await count('.hist-row')) >= 8);
  await go('/projects/musterhausen/delivery-plan'); check('ILP shows KV-32 Eingereicht', (await rowPill('KV-32')) === 'Eingereicht', await rowPill('KV-32'));

  // 4. Reviews as Paula: THG-32 (Prüfung → Freigeben → Übertragen), KV-32 (review starts, reject)
  await go('/'); await click('[data-action="toggleUserMenu"]'); await click('[data-action="setUser"][data-key="PM"]');
  await go('/projects/musterhausen/deliveries/thg-32'); await sleep(100); check('THG lands on Übersicht as PM', (await hash()).endsWith('/thg-32/uebersicht') && (await count('.tgt-dot')) === 5 && (await bodyText()).includes('Erstellung über 60 Jahre'));
  await go('/projects/musterhausen/deliveries/thg-32/erfassung');
  check('THG-32 In Bearbeitung: head selects enabled, add rows, complete → Einreichen enabled', (await count('.thg-head select:not([disabled])')) === 6 && (await count('.ent-add')) === 2 && (await count('.ent-input[readonly]')) < 10 && await enabled('[data-action="formSubmit"]'));
  await click('.ent-add [data-action="thgAdd"], [data-action="thgAdd"]'); check('new Emissionsquelle offers every Elementgruppe and Element of its Hauptgruppe', await evaluate(`(() => { const s = document.querySelector('.ent-select[data-field="code"]'); return !!s && s.options.length > 20 && [...s.options].some(o => /^C02\.01 /.test(o.textContent)); })()`));
  await click('[data-action="thgRemove"][title="Neue Zeile verwerfen"]'); await shot('e2e-thg-erfassung-offen');
  await click('[data-action="formSubmit"]'); check('THG submitted → Eingereicht', (await state()).projects.musterhausen.forms.thg.step === 3 && (await text('.page-title')).includes('Eingereicht'));
  await go('/projects/musterhausen/deliveries/thg-32/pruefung');
  check('Prüfung: comparison, checks, Freigeben disabled', (await count('.fm-tr')) >= 6 && (await disabled('[data-action="formApprove"]')) && (await bodyText()).includes('Erst alle Prüfpunkte bestätigen') && (await bodyText()).includes('Alle 25 Emissionsquellen'));
  for (const k of ['t1', 't2', 't3', 't4']) await click(`[data-action="formToggleCheck"][data-key="${k}"]`);
  check('checklist enables Freigeben', await enabled('[data-action="formApprove"]'));
  await shot('e2e-thg-pruefung');
  await click('[data-action="formApprove"]'); check('THG freigegeben', (await state()).projects.musterhausen.forms.thg.step === 5 && (await bodyText()).includes('Freigegeben durch Paula Muster') && (await count('[data-action="formTransfer"]')) === 1);
  await click('[data-action="formTransfer"]'); check('THG transferred → Abgeschlossen', (await state()).projects.musterhausen.forms.thg.step === 6 && (await text('.page-title')).includes('Abgeschlossen'));
  await go('/tasks/all?type=thg'); check('portfolio reflects transfer', (await bodyText()).includes('übertragen') && (await bodyText()).includes('7.6'));
  await go('/projects/musterhausen/deliveries/kv-32/pruefung');
  await setInput('[data-fid="kv-comment"]', 'Bitte D begründen.');
  await click('[data-action="formToggleCheck"][data-key="k1"]'); check('first check starts the review → In Prüfung', (await state()).projects.musterhausen.forms.kv.step === 4 && (await text('.page-title')).includes('In Prüfung') && (await state()).projects.musterhausen.forms.kv.dates[4] === 'heute');
  check('review comment survives the re-render', (await evaluate(`document.querySelector('[data-fid="kv-comment"]').value`)) === 'Bitte D begründen.' && (await state()).projects.musterhausen.forms.kv.comment === 'Bitte D begründen.');
  await evaluate(`document.querySelector('[data-action="formToggleCheck"][data-key="k2"]').focus()`); await click('[data-action="formToggleCheck"][data-key="k2"]');
  check('focus stays on the activated check after the re-render', await evaluate(`document.activeElement?.dataset?.key === 'k2'`) && (await state()).projects.musterhausen.forms.kv.checks.k2 === true);
  await click('[data-action="formToggleCheck"][data-key="k2"]');
  await click('[data-action="formReject"]'); check('KV rejected → open again', (await state()).projects.musterhausen.forms.kv.step === 1 && (await state()).projects.musterhausen.forms.kv.rejected === true && (await bodyText()).includes('Zurückgewiesen durch Paula Muster'));
  await go('/projects/musterhausen/delivery-plan'); check('ILP shows KV-32 Zurückgewiesen', (await rowPill('KV-32')) === 'Zurückgewiesen');

  // 5. Templates; locked THG Erfassung; Beteiligte and Dokumente tabs
  await go('/projects/musterhausen/settings/information-requirements'); await clickText('[data-action="tplSelect"]', 'Ökobilanz'); check('template selected', (await state()).tplSel === 'thg');
  await go('/projects/musterhausen/deliveries/thg-32/erfassung');
  check('THG Erfassung locked after transfer', (await count('.ent-input[readonly]')) >= 30 && (await count('.thg-head select[disabled]')) === 6 && (await bodyText()).includes('Grundlagen der Ökobilanz') && (await count('[data-action="formSubmit"]')) === 0 && (await count('.ent-add')) === 0 && (await count('[data-action="toggleImportMenu"]')) === 0 && (await count('.ent-toggle[data-action]')) === 0);
  check('THG table: Emissionsquellen of C and E, totals and derived rows', (await count('.ent-src')) === 14 && (await count('.ent-group')) === 6 && (await bodyText()).includes('Total B–G') && (await bodyText()).includes('Erstellung absolut, 60 Jahre inkl. Ersatz') && (await count('.hs-box.is-on')) === 2);
  await clickText('.tab', 'Verlauf'); check('Verlauf has no duplicated generated rows after the transfer', await evaluate(`(() => { const t = [...document.querySelectorAll('.hist-row .fw-500')].map(e => e.textContent.trim()); return t.filter(x => x === 'Freigegeben').length === 1 && t.filter(x => x.startsWith('An SUS')).length === 1 && t.filter(x => x === 'Zur Prüfung eingereicht').length === 1; })()`), await evaluate(`[...document.querySelectorAll('.hist-row .fw-500')].map(e => e.textContent.trim()).join(' | ')`));
  await go('/projects/musterhausen/deliveries/thg-32/beteiligte'); check('Beteiligte table', (await count('.fm-tr')) === 3 && (await bodyText()).includes('Lieferverantwortlich'));
  await go('/projects/musterhausen/deliveries/thg-32/dokumente'); check('Dokumente with Pflicht column', (await bodyText()).includes('Pflicht') && (await bodyText()).includes('Oekobilanz_Bericht') && (await bodyText()).includes('Oekobilanz_Toolexport'));
  // THG-32 of another project: missing values, Tool-Export import, new Emissionsquelle, Hersteller flag, removal, submission
  await go('/projects/eigerplatz/deliveries/thg-32/erfassung');
  check('eigerplatz THG: 3 missing values, groups C and E open', (await text('.tab-badge')) === '3' && (await count('.ent-group')) === 6 && (await count('.ent-add')) === 2 && (await disabled('[data-action="formSubmit"]')));
  await click('.ent-group[data-group="G"]'); check('group row opens G', (await state()).projects.eigerplatz.forms.thg.modes.G === 'detail' && (await count('.ent-add')) === 3);
  await click('[data-action="formToggleMissing"]'); check('filter: only the three rows with missing values', (await count('.ent-src')) === 3 && (await count('.ent-add')) === 0);
  await click('[data-action="formToggleMissing"]');
  await click('[data-action="toggleImportMenu"]'); check('THG import menu has the Tool-Export', (await count('.dd-item')) === 4 && (await bodyText()).includes('Tool-Export importieren'));
  await click('[data-action="importItem"][data-arg="tool"]'); check('Tool-Export fills the missing values', (await count('.tab-badge')) === 1 && /Alle 75 Werte erfasst/.test(await bodyText()) && (await enabled('[data-action="formSubmit"]')) && (await count('.toast')) === 1);
  await click('[data-action="thgAdd"][data-group="C"]'); check('new Emissionsquelle row', (await count('.ent-new')) === 1 && (await disabled('[data-action="formSubmit"]')) && (await state()).projects.eigerplatz.thgSrc.some(s => s.isNew));
  await setInput('[data-fid="thg-n1-code"]', 'C03'); check('element group sets unit and amortisation', (await state()).projects.eigerplatz.thgSrc.find(s => s.id === 'n1').code === 'C03' && (await text('.ent-new')).includes('60 a') && (await text('.ent-new')).includes(' m '));
  await setInput('[data-fid="thg-n1-kbob"]', 'KBOB 06.012 Stahlprofil, blank'); await setInput('[data-fid="thg-n1-q"]', '18000'); await setInput('[data-fid="thg-n1-h"]', '13.3'); await setInput('[data-fid="thg-n1-e"]', '0.1');
  check('new row complete → submit enabled again', (await enabled('[data-action="formSubmit"]')) && /Alle 80 Werte erfasst/.test(await bodyText()));
  await click('[data-action="thgToggleHs"][data-id="n1"]'); check('Hersteller flag toggles', (await state()).projects.eigerplatz.thgSrc.find(s => s.id === 'n1').hs === true && (await count('.ent-new .hs-box.is-on')) === 1);
  await click('[data-action="thgRemove"][data-id="C01-3"]'); check('Emissionsquelle removed with Verlauf entry', !(await state()).projects.eigerplatz.thgSrc.some(s => s.id === 'C01-3') && (await state()).projects.eigerplatz.forms.thg.events.some(e => e[3] === 'Emissionsquelle entfernt'));
  await click('[data-action="thgRemove"][data-id="n1"]'); check('new row dropped without event', (await count('.ent-new')) === 0 && (await state()).projects.eigerplatz.forms.thg.events.filter(e => e[3] === 'Emissionsquelle entfernt').length === 1);
  await evaluate(`(() => { const s = document.querySelector('[data-fid="thg-head-tool"]'); s.value = 'Lesosai'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await settle();
  check('Grundlagen editable', (await state()).projects.eigerplatz.thgHead.tool === 'Lesosai');
  await click('[data-action="formSubmit"]'); check('eigerplatz THG submitted', (await state()).projects.eigerplatz.forms.thg.step === 3 && (await text('.page-title')).includes('Eingereicht') && (await count('.ent-input:not([readonly])')) === 0);
  await go('/projects/botschaft-wien/deliveries/thg-32/erfassung');
  check('open THG without Emissionsquellen', (await bodyText()).includes('Noch keine Emissionsquellen erfasst') && (await count('.ent-src')) === 0 && (await count('.ent-group')) === 6 && (await bodyText()).includes('Einreichen erst, wenn Emissionsquellen erfasst sind'));
  await click('[data-action="toggleImportMenu"]'); await click('[data-action="importItem"][data-arg="tool"]');
  check('Tool-Export brings the 25 Emissionsquellen', (await state()).projects['botschaft-wien'].thgSrc.length === 25 && /Alle 75 Werte erfasst/.test(await bodyText()));
  await clickText('.tab', 'Verlauf'); check('Verlauf lists the Tool-Export', (await bodyText()).includes('Tool-Export importiert') && (await bodyText()).includes('25 Emissionsquellen übernommen'));

  // 6. Tasks pages, favorites, sections
  await go('/tasks/all'); check('my tasks', (await count('.grid-row')) >= 5);
  await go('/tasks/everything'); check('all tasks', (await count('.grid-row')) >= 12);
  await go('/projects/all?view=card'); check('card view with hero photos', (await count('.project-card')) === 8 && (await count('.project-card-img')) === 8 && await evaluate(`[...document.querySelectorAll('.project-card-img')].every(i => i.complete && i.naturalWidth > 0)`));
  await click('.project-card [data-action="toggleFavorite"][data-id="eigerplatz"]'); check('favorite toggled', (await state()).favorites.includes('eigerplatz'));
  await go('/projects/favorites?view=list'); check('favorites page', (await count('.table-row')) === 2);
  await go('/projects/all'); check('card view is default', (await count('.project-card')) === 8);
  for (const p of ['/projects/musterhausen/timeline', '/projects/musterhausen/files', '/projects/musterhausen/members', '/projects/musterhausen/master-data', '/projects/musterhausen/model', '/projects/eigerplatz/overview', '/projects/eigerplatz/deliveries/thg-32', '/projects/prangins/delivery-plan', '/projects/musterhausen/tasks']) {
    await go(p); check(`route ${p}`, await noError());
  }

  await go('/projects/eigerplatz/deliveries/thg-32'); await sleep(100);
  check('other project: THG-32 form with mock data (Eingereicht after the flow above)', (await hash()).endsWith('/eigerplatz/deliveries/thg-32/uebersicht') && (await text('.page-title')).includes('Eingereicht') && (await count('.st-row')) === 6 && (await count('.pp-row')) === 2);
  await go('/projects/agroscope-posieux/deliveries/kv-32/erfassung'); check('other project: KV-32 Abgeschlossen, locked, no Musterhausen note', (await text('.page-title')).includes('Abgeschlossen') && (await count('.ent-group')) === 13 && (await count('.ent-input:not([readonly])')) === 0 && (await count('.ent-del')) === 0 && !(await bodyText()).includes('nur für das Projekt'));
  await go('/projects/zollanlage-brig/deliveries/ks-31/pruefung'); check('other project: KS-31 Prüfung compares with SIA 21', (await count('.fm-tr')) >= 7 && (await bodyText()).includes('SIA 21') && (await bodyText()).includes('Freigegeben und an ePPM übertragen'));
  await go('/projects/tenero/deliveries/kv-32/erfassung'); await setInput('[data-fid="kvV-Y"]', '25000'); check('other project: values are stored per project', String((await state()).projects.tenero.kvV.Y) === '25000' && (await state()).projects.musterhausen.kvV.Y !== '25000');
  // Kostenelemente: add a row to G, pick an element group, remove a position
  const nPos = await count('.ent-pos');
  await click('[data-action="formAddPos"][data-group="G"]'); check('Kostenelement hinzufügen adds a row', (await count('.ent-new')) === 1 && (await count('.ent-pos')) === nPos + 1);
  await setInput('[data-fid="kv-new-kn1-code"]', 'G05'); check('element group chosen → name and unit', (await text('.ent-new')).includes('Einbauten, Schutzeinrichtung zu Ausbau') && (await state()).projects.tenero.forms.kv.added[0].code === 'G05');
  await setInput('[data-fid="kv-new-kn1-q"]', '120'); await setInput('[data-fid="kv-new-kn1-v"]', '240000');
  check('new Kostenelement counts in the group, value formatted', Number((await state()).projects.tenero.forms.kv.added[0].v) === 240000 && (await evaluate(`document.querySelector('[data-fid="kv-new-kn1-v"]').value`)) === (240000).toLocaleString('de-CH') && (await text('.ent-group[data-group="G"]')).includes("'"));
  await evaluate(`(() => { const s = document.querySelector('[data-change="formPosCode"][data-code="G01"]'); s.value = 'G06'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await settle();
  check('changing the code of a position keeps its values under the new element group', (await state()).projects.tenero.forms.kv.removed.G01 === true && (await state()).projects.tenero.forms.kv.added.some(a => a.code === 'G06' && Number(a.v) > 0) && (await count('.ent-code-select')) >= 3);
  await click('[data-action="formRemovePos"][data-code="G03"]'); check('position removed with Verlauf entry', (await state()).projects.tenero.forms.kv.removed.G03 === true && (await count('.ent-pos')) === nPos && (await state()).projects.tenero.forms.kv.events.some(e => e[3] === 'Kostenelement entfernt'));
  await click('[data-action="formDropNew"][data-id="kn1"]'); check('new row dropped, the recoded G06 row stays', (await count('.ent-new')) === 1 && (await state()).projects.tenero.forms.kv.added.length === 1 && (await state()).projects.tenero.forms.kv.added[0].code === 'G06');
  const totalBefore = await text('.ent-total');
  await click('.ent-group[data-group="V"]'); check('group without positions opens with its Pauschalbetrag, total unchanged', (await count('.ent-pauschal')) === 1 && (await text('.ent-total')) === totalBefore && (await count('[data-action="formRemovePos"][data-code="V"]')) === 0);
  await click('.ent-group[data-group="V"]'); check('closes again', (await count('.ent-pauschal')) === 0 && (await text('.ent-total')) === totalBefore);
  await go('/projects/musterhausen/timeline/logs'); await click('.pager .pager-btn[data-nav]'); check('log pages are links', (await hash()).includes('page=2') && (await count('.ant-table-striped .ant-row')) >= 1);
  await go('/projects/musterhausen/overview?favorites=1'); await sleep(120); check('a deep link cannot replace an array by a number', Array.isArray((await state()).favorites) && await noError());
  await go('/projects/musterhausen/overview?__proto__.detailed=true'); await sleep(120); check('prototype keys in deep links are ignored', await evaluate('({}).detailed === undefined') && await noError());
  await go('/projects/prangins/deliveries/kv-32'); check('project without KV-32 → not found page', (await bodyText()).includes('keine Lieferung') && await noError());
  await go('/projects/agroscope-posieux/deliveries/ifc-arc'); check('classic delivery keeps the generic page', (await bodyText()).includes('Klassische Lieferung') && !(await bodyText()).includes('nur für das Projekt'));

  // 7. Study layer: panel, screen switch with persona, legacy hash
  await click('[data-action="toggleUserMenu"]'); await click('.user-menu [data-action="toggleStudy"]'); check('study panel opens', (await count('.study-panel')) === 1);
  await click('.study-panel [data-study="s05"]'); const st7 = await state();
  check('study s05 → Paula + THG Prüfung', st7.user === 'PM' && (await hash()).endsWith('/thg-32/pruefung') && (await text('.study-current .study-code')) === '05');
  await click('.study-panel [data-study="s03"]'); check('study s03 → Alex + KV Erfassung', (await state()).user === 'AB' && (await hash()).endsWith('/kv-32/erfassung'));
  await click('.study-panel [data-study="s03b"]'); check('study s03b → KV Übersicht', (await hash()).endsWith('/kv-32/uebersicht') && (await text('.study-current .study-code')) === '03b');
  await click('.study-panel [data-study="s11"]'); check('study B2 → DWG-EG Erfassung', (await hash()).endsWith('/dwg-eg/erfassung'));
  await click('.study-panel [data-study="s02"]'); check('study s02 → drawer open', (await state()).ui.dialog === 'order' && (await count('.drawer-wide')) === 1);
  await evaluate(`location.hash = '#s06'`); await sleep(150); check('legacy #s06 → Fiona + portfolio', (await state()).user === 'FM' && (await hash()) === '#/tasks/all?type=thg');
  await evaluate(`location.hash = '#home'`); await sleep(150); check('legacy #home → study cover', (await hash()) === '#/study' && (await count('.screen-card')) >= 17);
  await click('[data-action="toggleStudy"]'); check('study panel closed', (await state()).ui.studyOpen === false);
  await go('/study/review'); check('review page', await noError()); await go('/study/qs'); check('qs page', await noError()); await go('/study/variant-b'); check('variant-b page', await noError());

  // 8. Code review: map lifecycle, task table (columns, row actions), canonical URLs, robustness
  await go('/'); let mapOk = false;
  for (let i = 0; i < 60 && !mapOk; i++) { await sleep(250); mapOk = await evaluate(`(() => { const m = document.querySelector('#dash-map')?.__map; return !!(m && m.loaded()); })()`); }
  const mapInfo = await evaluate(`(() => { const h = document.querySelector('#dash-map'); const c = h.querySelector('.dash-map-canvas'); const cv = h.querySelector('canvas'); return { host: h.clientHeight, container: c && c.clientHeight, canvas: cv && cv.clientHeight, pins: document.querySelectorAll('.map-pin').length, fallback: !!h.querySelector('.dash-map-fallback') }; })()`);
  check('map style loaded', mapOk, JSON.stringify(mapInfo));
  check('map fills its box', mapInfo.container > 300 && Math.abs(mapInfo.canvas - mapInfo.host) <= 2, JSON.stringify(mapInfo));
  check('map pins + fallback removed', mapInfo.pins >= 1 && mapInfo.fallback === false, JSON.stringify(mapInfo));
  await shot('e2e-dashboard-map');
  await go('/projects/all'); await go('/'); await sleep(300); await go('/projects/all'); await go('/'); await sleep(300);
  check('one map canvas after re-visits', (await count('canvas')) === 1, String(await count('canvas')));
  await go('/projects/all'); check('map removed when leaving', (await count('canvas')) === 0);

  await go('/tasks/everything'); const nAll = await count('.task-row');
  await go('/tasks/everything?type=xyz'); check('unknown ?type falls back', (await noError()) && (await count('.task-row')) === nAll && nAll > 0, String(nAll));
  await evaluate(`location.hash = '#s99'`); await sleep(150); check('unknown legacy id → start page', (await hash()) === '#/' && (await noError()));
  await go('/projects/musterhausen/deliveries/kv-32'); await sleep(100); check('canonical delivery URL (Übersicht)', (await hash()) === '#/projects/musterhausen/deliveries/kv-32/uebersicht', await hash());
  await go('/projects/musterhausen/deliveries/kv-32/nope'); check('unknown tab falls back to Übersicht without error', (await noError()) && (await text('.tab.is-active')).startsWith('Übersicht'));
  await go('/projects/musterhausen/deliveries/fv-32'); check('FV-32 entfällt → not found page without error', (await noError()) && (await bodyText()).includes('keine Lieferung'));
  await go('/projects/musterhausen/overview'); check('no undefined links', (await count('a[href*="undefined"]')) === 0);
  await go('/projects/musterhausen/timeline'); check('activity links resolve', (await count('a[href*="undefined"]')) === 0 && (await count('.act-row a, .act-row[data-nav]')) + (await count('[data-nav]')) > 0);

  await click('[data-action="toggleUserMenu"]'); await click('[data-action="setUser"][data-key="AB"]');
  await go('/tasks/all');
  check('row actions always visible', (await count('.task-row .row-actions')) >= 5 && (await evaluate(`getComputedStyle(document.querySelector('.task-row .row-actions')).opacity`)) === '1');
  const sticky = await evaluate(`(() => { const t = document.querySelector('.task-table'); const a = t.querySelector('.task-row .row-actions'); const h = t.querySelector('.row-actions-head'); return { pos: getComputedStyle(a).position, headPos: getComputedStyle(h).position, right: Math.round(t.getBoundingClientRect().right - a.getBoundingClientRect().right) }; })()`);
  check('row actions are a sticky right column', sticky.pos === 'sticky' && sticky.headPos === 'sticky' && sticky.right <= 1, JSON.stringify(sticky));
  check('row actions reachable by keyboard', await evaluate(`(() => { const b = document.querySelectorAll('.task-row')[2].querySelector('.row-actions .btn-icon'); b.focus(); return document.activeElement === b; })()`));
  await shot('e2e-tasks');
  await click('[data-action="openColumns"]');
  check('columns dialog opens', (await count('.cols-dialog')) === 1 && (await count('.cols-row')) === 19);
  check('focus moves into dialog', await evaluate(`!!document.activeElement.closest('[role="dialog"]')`));
  await click('.cols-row [data-action="colToggle"][data-key="desc"]'); await click('.cols-row [data-action="colToggle"][data-key="kat"]');
  await shot('e2e-columns-dialog');
  await click('[data-action="colOk"]');
  const cols = (await state()).taskCols;
  check('columns hidden', !cols.includes('desc') && !cols.includes('kat') && cols.includes('name') && (await count('.cols-dialog')) === 0);
  check('table reflects columns', !(await text('.task-table .grid-head')).includes('Beschreibung') && (await text('.task-table .grid-head')).includes('Status'));
  await go('/projects/musterhausen/tasks'); check('project tasks share the table', (await count('.task-row')) >= 5 && !(await text('.task-table .grid-head')).includes('Beschreibung') && !(await text('.task-table .grid-head')).includes('Projekt'));
  await click('[data-action="openColumns"]'); await click('[data-action="colAll"]'); await click('[data-action="colCancel"]');
  check('cancel keeps columns', !(await state()).taskCols.includes('desc'));
  await click('[data-action="openColumns"]'); await click('[data-action="colAll"]'); await click('[data-action="colOk"]');
  check('select all restores columns', (await state()).taskCols.includes('desc') && (await text('.task-table .grid-head')).includes('Beschreibung'));
  await click('[data-action="openColumns"]'); await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await settle();
  check('Escape closes dialog', (await state()).ui.dialog === null);
  check('columns persist in sessionStorage', JSON.parse(await evaluate(`sessionStorage.getItem(Object.keys(sessionStorage).find(k => /cde/i.test(k)) || '')`) || '{}').taskCols?.length >= 10);

  // 9. Gap analysis: banner, real paths, new project pages, settings, members, hover states, responsive sidebar
  check('prototype banner', (await text('.proto-banner')).includes('Prototyp, fiktive oder öffentlich verfügbare Inhalte'));
  check('no floating study button', (await count('.study-fab')) === 0);
  await go('/projects/musterhausen/info-management/delivery-plan'); await sleep(120); check('old path redirects', (await hash()) === '#/projects/musterhausen/delivery-plan', await hash());
  await go('/projects/musterhausen/activities'); await sleep(120); check('activities → timeline', (await hash()) === '#/projects/musterhausen/timeline');
  await go('/projects/musterhausen/documents'); check('documents page', (await count('.two-pane .ant-row')) >= 5 && (await text('.pane-head')).includes('Dokumente'));
  await click('.tree-item[data-nav$="group=aia"]'); check('documents filter by group', (await count('.two-pane .ant-row')) === 2);
  await go('/projects/musterhausen/loin'); check('loin page', (await count('.two-pane .ant-row')) === 7 && (await text('.tab.is-active')) === 'Alle Informationsschlüssel');
  await go('/projects/musterhausen/loin/elements'); check('loin elements tab', (await count('.two-pane .ant-row')) === 5);
  await go('/projects/eigerplatz/loin'); check('loin empty for other projects', (await count('.ant-empty')) === 1);
  await go('/projects/musterhausen/timeline/logs'); check('logs table', (await count('.ant-table-striped .ant-row')) === 10 && (await text('.pager-info')).startsWith('1-10 von'));
  await go('/projects/musterhausen/timeline'); check('activities tab', (await count('.act-row')) >= 5);
  await go('/projects/musterhausen/overview'); check('overview has Projektbild (with credit) and Standort cards', (await count('#ov-map')) === 1 && (await count('.ov-img')) === 1 && (await bodyText()).includes('Standort'));
  await go('/projects/all'); await go('/projects/musterhausen/overview'); await go('/projects/all'); check('project map removed when leaving', (await count('#ov-map')) === 0 && (await count('canvas')) === 0);
  await go('/projects/musterhausen/settings'); check('settings general form', (await bodyText()).includes('Projektdaten') && (await bodyText()).includes('Geo Koordinaten') && (await count('.form-control')) >= 8);
  await go('/projects/musterhausen/settings/danger-zone'); check('settings placeholder', (await bodyText()).includes('Gefahrenzone'));
  await go('/projects/musterhausen/members'); check('members table', (await count('.ant-table-striped .ant-row')) >= 3 && (await count('.btn-icon-danger')) >= 3);
  await go('/projects/musterhausen/delivery-plan'); await click('[data-action="openDialog"][data-arg="order"]'); check('no draft button in Erstellen', !(await bodyText()).includes('Als Entwurf speichern') && (await count('.drawer-wide')) === 1); await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await settle();
  await go('/projects/musterhausen/deliveries/kv-32/erfassung'); check('KV notes removed', !(await bodyText()).includes('importiert am') && !(await bodyText()).includes('Nach dem Einreichen'));
  // hover states from the CDE theme: primary button → #0b2538, link → #4cb5ab, nav item → gray-200
  await go('/projects/musterhausen/delivery-plan');
  const hov = async (sel) => { const r = await evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; })()`); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r[0], y: r[1] }); await sleep(400); };
  await hov('.toolbar .btn-primary'); check('primary button hover', (await evaluate(`getComputedStyle(document.querySelector('.toolbar .btn-primary')).backgroundColor`)) === 'rgb(11, 37, 56)');
  await hov('.nav-item:not(.is-active)'); check('nav item hover', (await evaluate(`getComputedStyle(document.querySelector('.nav-item:not(.is-active)')).backgroundColor`)) === 'rgb(229, 231, 235)');
  await hov('.table-row a'); check('table link hover', (await evaluate(`const a = document.querySelector('.table-row a'); getComputedStyle(a).color + ' ' + getComputedStyle(a).textDecorationLine`)) === 'rgb(76, 181, 171) underline');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  // responsive: below 1024 px the sidebar is off-canvas and opens from the topbar toggle; the Datenformular wraps
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(400);
  check('sidebar off-canvas at 900px', (await evaluate(`getComputedStyle(document.querySelector('.sidebar')).transform`)) !== 'none' && (await evaluate(`getComputedStyle(document.querySelector('.side-toggle')).display`)) !== 'none', await evaluate(`innerWidth + ' ' + getComputedStyle(document.querySelector('.sidebar')).transform + ' ' + getComputedStyle(document.querySelector('.side-toggle')).display`));
  await click('.side-toggle'); await sleep(300); check('sidebar opens', (await state()).ui.sideOpen === true && (await evaluate(`getComputedStyle(document.querySelector('.sidebar')).transform`)) === 'none');
  await click('.sidebar a[data-nav$="/documents"]'); await sleep(120); check('sidebar closes after navigation', (await state()).ui.sideOpen === false && (await hash()).endsWith('/documents'));
  check('two panes stack at 900px', (await evaluate(`getComputedStyle(document.querySelector('.two-pane')).gridTemplateColumns.split(' ').length`)) === 1);
  await send('Emulation.setDeviceMetricsOverride', { width: 760, height: 900, deviceScaleFactor: 1, mobile: false });
  await go('/projects/musterhausen/deliveries/kv-32/uebersicht'); await sleep(300);
  check('Datenformular Übersicht wraps at 760px', await evaluate(`(() => { const m = document.querySelector('.fm-main'), s = document.querySelector('.fm-side'); return s.getBoundingClientRect().top >= m.getBoundingClientRect().bottom - 1 && document.documentElement.scrollWidth <= innerWidth; })()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 900, deviceScaleFactor: 1, mobile: false }); await go('/'); await sleep(150);
  check('dashboard single column at 600px', (await evaluate(`getComputedStyle(document.querySelector('.dash-projects')).gridTemplateColumns.split(' ').length`)) === 1 && (await evaluate(`getComputedStyle(document.querySelector('.topbar-username')).display`)) === 'none');
  await send('Emulation.clearDeviceMetricsOverride'); await sleep(150);

  // 10. Planlieferungen (DWG): one delivery per floor plan, DWG checked locally with the plan-check engine (LibreDWG WASM)
  const waitFor = async (expr, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await evaluate(expr)) return true; await sleep(100); } return false; };
  await go('/'); await click('[data-action="toggleUserMenu"]'); await click('[data-action="setUser"][data-key="AB"]');
  await go('/projects/musterhausen/delivery-plan');
  const ilpBody = await bodyText();
  check('ILP lists the five DWG deliveries', (await count('.table-row')) === 11 && ['DWG-UG', 'DWG-EG', 'DWG-OG1', 'DWG-OG2', 'DWG-DG'].every(c => ilpBody.includes(c)) && ilpBody.includes('Grundriss DG (DWG)'));
  check('ILP statuses per floor', (await rowPill('DWG-UG')) === 'Abgeschlossen' && (await rowPill('DWG-EG')) === 'In Bearbeitung' && (await rowPill('DWG-OG2')) === 'In Prüfung' && (await rowPill('DWG-DG')) === 'Offen', [await rowPill('DWG-UG'), await rowPill('DWG-EG'), await rowPill('DWG-OG2'), await rowPill('DWG-DG')].join(','));
  check('ILP tiles count the plans', (await tile('total')) === 11 && (await tile('check')) >= 1 && (await tile('done')) >= 4, `${await tile('total')} ${await tile('check')} ${await tile('done')}`);
  await go('/projects/musterhausen/deliveries/dwg-eg'); await sleep(100);
  check('DWG canonical URL (Übersicht)', (await hash()) === '#/projects/musterhausen/deliveries/dwg-eg/uebersicht', await hash());
  check('DWG Übersicht: Flächen SIA 416, Prüfregeln nach Kategorie, 3 errors badge', (await count('.sia-row')) === 8 && (await count('.cat-row')) === 10 && (await count('.kpi')) === 3 && (await text('.tab-badge')) === '3');
  await shot('e2e-dwg-uebersicht');
  await go('/projects/musterhausen/deliveries/dwg-eg/erfassung');
  check('EG: failed rules listed, submit locked', (await count('.plan-list .plan-row')) === 40 && (await bodyText()).includes('LAYER_001') && (await disabled('[data-action="planSubmit"]')) && (await bodyText()).includes('Einreichen erst, wenn der Plan keine Fehler hat'));
  check('EG: result strip shows 3 errors', /Fehler\s*3/.test(await text('.plan-result')), await text('.plan-result'));
  const egReady = await waitFor(`document.querySelector('.plan-viewer')?.dataset.planStatus === 'ready'`);
  check('viewer parsed the uploaded DWG with LibreDWG WASM', egReady, await evaluate(`(document.querySelector('.plan-viewer')?.dataset.planStatus || '') + ' ' + (document.querySelector('.plan-state-sub')?.textContent || '')`));
  check('viewer canvas sized', await evaluate(`(() => { const c = document.querySelector('.plan-viewer canvas'); return !!c && c.width > 100 && c.height > 100; })()`));
  await shot('e2e-plan-erfassung-fehler');
  await click('[data-action="planTab"][data-arg="issues"]'); check('Fehlermeldungen tab', (await count('.plan-list [data-plan-locate]')) >= 10 && (await state()).ui.planTab === 'issues');
  await click('.plan-list .plan-row.is-locatable'); check('issue row locates in the viewer', (await count('.plan-list .plan-row.is-selected')) === 1);
  await click('[data-action="planTab"][data-arg="layers"]'); check('Layer tab lists unknown layers', (await count('.plan-list input[data-plan-layer]')) >= 30);
  check('spinner hidden after the start', await evaluate(`document.getElementById('spin').hidden === true`));
  await click('[data-action="planLoadSample"][data-key="EG"]');
  check('global spinner while the plan is parsed', await evaluate(`(() => { const s = document.getElementById('spin'); return s.hidden === false && /geprüft/.test(s.textContent); })()`));
  const egChecked = await waitFor(`window.cde.state.plans.EG.result?.file?.name === 'CAD.V01-CAFM-Plan-DE.dwg' && !window.cde.state.plans.EG.busy`);
  const egPlan = (await state()).plans.EG;
  check('Musterplan checked by the engine (38/40, 0 errors, 30 rooms)', egChecked && egPlan.result.summary.errorCount === 0 && egPlan.result.summary.passedRules === 38 && egPlan.result.rooms.length === 30, JSON.stringify(egPlan.result && egPlan.result.summary));
  check('submit enabled once no errors remain', await enabled('[data-action="planSubmit"]'));
  check('viewer switched to the new drawing', await waitFor(`document.querySelector('.plan-viewer')?.dataset.planStatus === 'ready' && document.querySelector('.plan-viewer')?.dataset.planViewer.startsWith('upload:EG:')`));
  await click('[data-action="planTab"][data-arg="kpi"]'); check('Kennzahlen SIA 416 without the viewer', (await bodyText()).includes('Nettogeschossfläche') && /517/.test(await text('.plan-kpi-dash')) && (await count('.plan-viewer')) === 0 && (await count('.plan-kpi-donut svg')) === 1 && /flächen din 277/i.test(await bodyText()) && /objektübersicht/i.test(await bodyText()));
  check('Prüfbericht button, no log line, no footer text', (await count('[data-action="planReport"][data-key="EG"]')) === 1 && (await count('.plan-log')) === 0 && !(await bodyText()).includes('Ein Grundriss pro Lieferung'));
  const pdfSize = await evaluate(`window.cde.actions.planReport({ key: 'EG' }, null, null, { save: false }).then(b => b ? b.size : 0).catch(e => 'ERR ' + e.message)`);
  check('Prüfbericht PDF is built (jsPDF from the CDN, drawing images from the viewer)', typeof pdfSize === 'number' && pdfSize > 20000, String(pdfSize));
  await click('[data-action="planTab"][data-arg="rooms"]'); check('Räume tab lists 30 rooms', (await count('.plan-list [data-plan-room]')) === 30 && (await count('.plan-viewer')) === 1);
  await click('.plan-list [data-plan-room]'); check('room row selects in viewer', (await count('.plan-list .plan-row.is-selected')) === 1);
  await click('[data-action="planTab"][data-arg="areas"]'); check('Geschossflächen tab lists the floor-area polygon', (await count('.plan-list [data-plan-area]')) === 1 && (await bodyText()).includes('Bruttogeschossfläche') && (await count('[data-plan-overlay]')) === 0);
  await click('.plan-list [data-plan-area]'); check('area row selects in viewer', (await count('.plan-list .plan-row.is-selected')) === 1);
  // List toolbar (search, toggle-all) and the status filter, as in the Prüfplattform plan-check
  check('status filter right of the sub tabs, toggle-all only on viewer tabs', (await count('.plan-filter [data-action="planFilter"]')) === 3 && (await count('[data-plan-toggle-all]')) === 1 && (await count('.plan-search')) === 1);
  await click('[data-plan-toggle-all]'); check('toggle-all hides the listed floor area', (await count('.plan-list .plan-row.is-hidden')) === 1 && await evaluate(`!document.querySelector('[data-plan-toggle-all]').checked && !document.querySelector('.plan-list input[data-plan-vis]').checked`));
  await click('[data-plan-toggle-all]'); check('toggle-all shows it again', (await count('.plan-list .plan-row.is-hidden')) === 0);
  await click('[data-action="planTab"][data-arg="rooms"]');
  await evaluate(`(() => { const el = document.querySelector('.plan-search'); el.focus(); el.value = '05.00'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await settle();
  const roomHits = await count('.plan-list [data-plan-room]');
  check('search narrows the room list and keeps the focus', roomHits > 0 && roomHits < 30 && (await state()).ui.planSearch === '05.00' && await evaluate(`document.activeElement === document.querySelector('.plan-search') && document.querySelector('.plan-search').value === '05.00'`), String(roomHits));
  await click('.plan-list [data-plan-room] input[data-plan-vis]'); check('row checkbox hides the room, toggle-all becomes indeterminate', (await count('.plan-list .plan-row.is-hidden')) === 1 && await evaluate(`document.querySelector('[data-plan-toggle-all]').indeterminate`));
  await click('.plan-list .plan-row.is-hidden'); check('locating a hidden room shows it again', (await count('.plan-list .plan-row.is-hidden')) === 0 && (await count('.plan-list .plan-row.is-selected')) === 1);
  await click('[data-action="planTab"][data-arg="rules"]'); check('tab switch resets the search, rules have no toggle-all', (await state()).ui.planSearch === '' && (await count('[data-plan-toggle-all]')) === 0 && (await count('.plan-list .plan-row')) === 40);
  await click('[data-action="planFilter"][data-arg="warnings"]'); check('Warnungen: only the failed warning rules, tab counts follow the filter', (await count('.plan-list .plan-row')) === 2 && await evaluate(`document.querySelector('[data-action="planFilter"][data-arg="warnings"]').getAttribute('aria-pressed') === 'true'`) && (await text('[data-action="planTab"][data-arg="issues"] .plan-tab-count')) === '3' && (await text('[data-action="planTab"][data-arg="layers"] .plan-tab-count')) === '0');
  await click('[data-action="planFilter"][data-arg="errors"]'); check('Fehler on a clean plan: empty rules list with a note, issue count 0', (await count('.plan-list .plan-row')) === 0 && (await bodyText()).includes('Keine Einträge mit Fehlern') && (await text('[data-action="planTab"][data-arg="issues"] .plan-tab-count')) === '0');
  await click('[data-action="planTab"][data-arg="issues"]'); check('Fehler filter applies to the Fehlermeldungen tab too', (await count('.plan-list [data-plan-locate]')) === 0 && (await state()).ui.planFilter === 'errors');
  await click('[data-action="planFilter"][data-arg="all"]'); check('Alle restores the 3 warnings', (await count('.plan-list [data-plan-locate]')) === 3);
  await shot('e2e-plan-toolbar');
  await shot('e2e-plan-erfassung-ok');
  await click('[data-action="planSubmit"][data-key="EG"]');
  check('EG submitted → Eingereicht, erfassung locked', (await state()).plans.EG.status === 'eingereicht' && (await text('.page-title')).includes('Eingereicht') && (await count('[data-change="planFile"]')) === 0 && (await count('.toast')) === 1);
  await clickText('.tab', 'Verlauf'); check('Verlauf lists upload, check and submission', (await bodyText()).includes('Zur Prüfung eingereicht') && (await bodyText()).includes('Plan geprüft') && (await bodyText()).includes('DWG hochgeladen'));
  await clickText('.tab', 'Dokumente'); check('Dokumente lists the DWG as Pflicht', (await bodyText()).includes('CAD.V01-CAFM-Plan-DE.dwg') && (await bodyText()).includes('Pflicht'));
  await go('/projects/musterhausen/delivery-plan'); check('ILP shows DWG-EG Eingereicht', (await rowPill('DWG-EG')) === 'Eingereicht', await rowPill('DWG-EG'));
  // Upload through the real file input (DOM.setFileInputFiles) on the open floor DG
  await go('/projects/musterhausen/deliveries/dwg-dg/erfassung'); check('DG: upload zone, no result', (await count('.plan-drop')) === 1 && (await count('.plan-viewer')) === 0 && (await state()).plans.DG.status === 'offen');
  const { fileURLToPath } = await import('node:url');
  const dwgPath = fileURLToPath(new URL('../assets/plans/CAD.V01-CAFM-Plan-DE.dwg', import.meta.url));
  const docNode = await send('DOM.getDocument', { depth: 1 });
  const inputNode = await send('DOM.querySelector', { nodeId: docNode.root.nodeId, selector: 'input[data-change="planFile"][data-key="DG"]' });
  await send('DOM.setFileInputFiles', { nodeId: inputNode.nodeId, files: [dwgPath] });
  await sleep(300);
  if (!(await state()).plans.DG.busy && !(await state()).plans.DG.result) await evaluate(`document.querySelector('input[data-change="planFile"][data-key="DG"]').dispatchEvent(new Event('change', { bubbles: true }))`);
  const dgDone = await waitFor(`!!window.cde.state.plans.DG.result && !window.cde.state.plans.DG.busy`);
  check('file input upload → checked, DG In Bearbeitung', dgDone && (await state()).plans.DG.status === 'bearbeitung' && (await state()).plans.DG.result.rooms.length === 30, JSON.stringify((await state()).plans.DG.result && (await state()).plans.DG.result.summary));
  check('DG viewer shows the uploaded drawing', await waitFor(`document.querySelector('.plan-viewer')?.dataset.planStatus === 'ready'`));
  // Review as Paula (BBL): result, checklist, Freigeben, Übertragen; reject OG2
  await click('[data-action="toggleUserMenu"]'); await click('[data-action="setUser"][data-key="PM"]');
  await go('/projects/musterhausen/deliveries/dwg-eg'); await sleep(100);
  check('DWG canonical URL for PM (Übersicht)', (await hash()) === '#/projects/musterhausen/deliveries/dwg-eg/uebersicht', await hash());
  await go('/projects/musterhausen/deliveries/dwg-eg/pruefung');
  check('Prüfung: result, warnings, Freigeben disabled, no upload', (await count('.res-row')) === 1 && (await text('.res-title')) === 'Keine Fehler' && (await count('.res-issue')) >= 1 && (await disabled('[data-action="planApprove"]')) && (await count('[data-change="planFile"]')) === 0);
  await click('[data-action="planToggleCheck"][data-key="c1"]'); await click('[data-action="planToggleCheck"][data-key="c2"]');
  check('checklist enables Freigeben', (await enabled('[data-action="planApprove"]')) && (await state()).plans.EG.status === 'pruefung');
  await shot('e2e-plan-pruefung');
  await click('[data-action="planApprove"]'); check('EG freigegeben', (await state()).plans.EG.status === 'freigegeben' && (await bodyText()).includes('Freigegeben durch Paula Muster'));
  await click('[data-action="planTransfer"]'); check('EG an CAFM übertragen → Abgeschlossen', (await state()).plans.EG.status === 'uebertragen' && (await text('.page-title')).includes('Abgeschlossen'));
  await go('/projects/musterhausen/deliveries/dwg-og2/pruefung'); await click('[data-action="planReject"]');
  check('OG2 zurückgewiesen', (await state()).plans.OG2.status === 'zurueck' && (await bodyText()).includes('Zurückgewiesen'));
  await go('/projects/musterhausen/delivery-plan'); check('ILP reflects review', (await rowPill('DWG-EG')) === 'Abgeschlossen' && (await rowPill('DWG-OG2')) === 'Zurückgewiesen' && (await rowPill('DWG-DG')) === 'In Bearbeitung');
  await go('/projects/musterhausen/deliveries/dwg-dg/pruefung'); check('not submitted plan shows no result to BBL', (await bodyText()).includes('noch nicht eingereicht') && (await count('[data-action="planApprove"]:not([disabled])')) === 0);
  await click('[data-action="toggleUserMenu"]'); await click('[data-action="setUser"][data-key="AB"]');
  await go('/projects/musterhausen/deliveries/dwg-og2/erfassung'); check('rejected plan is open again for the supplier', (await bodyText()).includes('Zurückgewiesen durch Paula Muster') && (await enabled('[data-action="planSubmit"]')) && (await count('[data-change="planFile"]')) >= 1);
  await go('/projects/musterhausen/tasks'); check('plan tasks in the project task list', (await bodyText()).includes('Grundriss EG (DWG)') && (await bodyText()).includes('Grundriss DG (DWG)'));
  await go('/projects/musterhausen/deliveries/dwg-eg/beteiligte'); check('Beteiligte tab', (await bodyText()).includes('Lieferverantwortlich') && (await count('canvas')) === 0);
  // Responsive: phone width — no horizontal page overflow, off-canvas sidebar, short banner, footer and plan toolbar usable
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  for (const [name, path] of [['Startseite', '/'], ['Projekte', '/projects/all?view=card'], ['Überblick', '/projects/musterhausen/overview'], ['Dokumente', '/projects/musterhausen/documents'], ['Lieferplan', '/projects/musterhausen/delivery-plan'], ['Aufgaben', '/tasks/all'], ['KV Erfassung', '/projects/musterhausen/deliveries/kv-32/erfassung'], ['Lieferung Übersicht', '/projects/musterhausen/deliveries/kv-32'], ['DWG Erfassung', '/projects/musterhausen/deliveries/dwg-eg/erfassung']]) {
    await go(path); await sleep(250);
    const w = await evaluate('[document.documentElement.scrollWidth, innerWidth]');
    check(`375 px: ${name} without horizontal page overflow`, w[0] <= w[1] + 1, JSON.stringify(w));
  }
  check('375 px: plan status filter and search inside the viewport', await evaluate(`(() => { const f = document.querySelector('.plan-filter'), s = document.querySelector('.plan-search'); if (!f || !s) return false; const r = f.getBoundingClientRect(), q = s.getBoundingClientRect(); return r.right <= innerWidth && r.left >= 0 && r.width > 100 && q.width > 150; })()`));
  check('375 px: short banner, footer not clipped, search as icon', await evaluate(`(() => { const f = document.querySelector('.app-footer'); return f.scrollHeight <= f.clientHeight + 1 && getComputedStyle(document.querySelector('.proto-banner-short')).display !== 'none' && getComputedStyle(document.querySelector('.topbar-search-input')).display === 'none'; })()`));
  check('375 px: hamburger shown, sidebar off-canvas', await evaluate(`getComputedStyle(document.querySelector('.side-toggle')).display !== 'none' && document.querySelector('.sidebar').getBoundingClientRect().right <= 0`));
  await click('.side-toggle'); check('375 px: sidebar opens with backdrop and locked page scroll', await evaluate(`document.body.classList.contains('side-open') && document.querySelector('.sidebar').getBoundingClientRect().left === 0 && getComputedStyle(document.body).overflow === 'hidden'`));
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await settle(); check('375 px: Escape closes the sidebar', !(await state()).ui.sideOpen);
  await go('/projects/musterhausen/overview'); check('375 px: Projektaufgaben table scrolls instead of collapsing its columns', await evaluate(`(() => { const s = document.querySelector('.overview .scroll-x'); return !!s && s.scrollWidth > s.clientWidth + 50; })()`));
  const ovMapOk = await waitFor(`(() => { const m = document.querySelector('#ov-map')?.__map; return !!(m && m.loaded()); })()`);
  const ovMapSize = () => evaluate(`(() => { const h = document.querySelector('#ov-map'); const c = h && h.querySelector('canvas'); return { box: h ? h.clientWidth : 0, canvas: c ? c.clientWidth : 0 }; })()`);
  let ms = await ovMapSize(); check('375 px: project map canvas fills its box', ovMapOk && Math.abs(ms.canvas - ms.box) <= 2 && ms.box > 300, JSON.stringify(ms));
  await evaluate(`document.querySelector('#ov-map').style.width = '300px'`); await sleep(300);
  ms = await ovMapSize(); check('project map follows its box without a window resize (ResizeObserver)', Math.abs(ms.canvas - 300) <= 2, JSON.stringify(ms));
  await evaluate(`document.querySelector('#ov-map').style.width = ''`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false }); await go('/projects/musterhausen/overview'); await sleep(200);
  check('1100 px: Projektbild and Projektdaten side by side, Verknüpfungen full width, map 340 px', await evaluate(`(() => { const s = document.querySelector('.overview-side'); const c = s.querySelectorAll(':scope > .card'); const r = i => c[i].getBoundingClientRect(); return getComputedStyle(s).display === 'grid' && Math.abs(r(0).top - r(1).top) < 2 && r(2).width > r(0).width * 1.8 && document.querySelector('#ov-map').clientHeight === 340; })()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 2000, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(200);
  check('2000 px: full page width as in the CDE Bund, topbar icons at the right edge', await evaluate(`(() => { const u = document.querySelector('.topbar-user').getBoundingClientRect(), o = document.querySelector('.overview').getBoundingClientRect(); return u.right > innerWidth - 40 && o.right > innerWidth - 60; })()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 1536, height: 1000, deviceScaleFactor: 1, mobile: false });
  await go('/projects/eigerplatz/deliveries/dwg-eg'); check('DWG code on another project → generic page without error', await noError());

  await go('/'); await shot('e2e-final');
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 800));
} catch (e) {
  fail++; console.log('ERROR', e.message);
} finally {
  console.log(`\n${pass} passed, ${fail} failed · Screenshots: ${SHOTS}`);
  process.exitCode = fail ? 1 : 0;
  try { ws && ws.close(); } catch {}
  proc.kill();
}
