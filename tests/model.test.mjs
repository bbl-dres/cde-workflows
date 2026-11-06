// Unit tests of the view model and the routing tables (no browser, no server):
//   node --test
// Loads data/*.json the way js/data.js does and computes the view model for the detailed project.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = p => import(pathToFileURL(join(ROOT, p)).href);
const FILES = ['project', 'projects', 'users', 'notifications', 'navigation', 'ilp', 'tasks', 'templates', 'ebkp', 'sia416', 'portfolio', 'screens', 'study', 'documents', 'loin', 'plans', 'forms', 'thg'];
const data = Object.fromEntries(FILES.map(f => [f, JSON.parse(readFileSync(join(ROOT, 'data', f + '.json'), 'utf8'))]));

const { initialState } = await mod('js/model/state.js');
const { compute } = await mod('js/model/index.js');
const { matchRoute, parseHash, routeOverrides } = await mod('js/router.js');
const { LEGACY, screenIdFor, defaultDeliveryTab, FORM_TABS, link } = await mod('js/links.js');
const { TASK_COLUMNS, DEFAULT_TASK_COLS } = await mod('js/model/columns.js');
const { planLists, withUsage, donutOf, planModel, ebfOf } = await mod('js/model/plan.js');
const { wholeShares } = await mod('js/format.js');
const { planForm } = await mod('js/model/form.js');
const { searchModel } = await mod('js/model/search.js');
const { needsQty } = await mod('js/model/mock.js');

const detailed = data.projects.projects.find(p => p.detailed);
const userOf = key => data.users.users.find(u => u.key === key);
const ctxData = project => ({ ...data, project: { ...data.project, ...project } });
const vmFor = (state, project = detailed, user = userOf(state.user)) => compute(state, ctxData(project), project, user);
const base = initialState(data);
const vm = vmFor(base);

test('data files are consistent', () => {
  assert.ok(data.users.users.some(u => u.key === data.users.defaultUser), 'default user exists');
  assert.equal(data.projects.projects.filter(p => p.detailed).length, 1, 'exactly one detailed project');
  for (const p of data.projects.projects) {
    assert.ok(p.location && Number.isFinite(p.location.lng) && Number.isFinite(p.location.lat), `${p.id} has coordinates`);
    assert.ok(Array.isArray(p.members) && p.members.length, `${p.id} has members`);
    for (const m of p.members) assert.ok(userOf(m), `${p.id}: member ${m} is a user`);
    assert.ok(p.image && existsSync(join(ROOT, p.image)) && p.imageCredit, `${p.id} has a hero photo with credit`);
  }
  for (const n of data.notifications) assert.ok(data.projects.projects.some(p => p.id === n.project), `notification ${n.id} points to a project`);
  for (const r of data.portfolio.rows) if (r.project) assert.ok(data.projects.projects.some(p => p.id === r.project), `portfolio row ${r.name} project exists`);
  for (const r of [...data.tasks.rows, ...data.ilp.rows]) assert.ok(!r.statusKey || ['kv', 'ks', 'thg'].includes(r.statusKey), `status key ${r.statusKey} of «${r.name}» is known`);
  assert.ok(!data.ilp.rows.some(r => r.code === 'FV-32') && !data.tasks.rows.some(r => r.delivery === 'FV-32'), 'FV-32 entfällt (Flächen aus den Grundrissen)');
  for (const [kind, T] of Object.entries(data.forms.kinds)) for (const g of (T.detailDefault || [])) assert.ok((kind === 'thg' ? Object.keys(data.thg.eg) : data.ebkp.ebkp.map(x => x.code)).includes(g), `${kind}: detailed group ${g} exists`);
  for (const g of data.ebkp.ebkp) for (const k of g.kids) assert.ok(/^[A-Z]\d{2}$/.test(k.code) && (data.ebkp.elements[g.code] || []).some(e => e[0] === k.code), `${k.code} is an eBKP-H element group of ${g.code}`);
  const ids = data.thg.sources.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'source ids are unique');
  for (const s of data.thg.sources) assert.ok(data.thg.eg[s.grp] && s.q > 0 && s.kw >= 0 && s.unit && s.quelle && /^(Bauteil |KBOB )/.test(s.quelle), `source ${s.id} is complete`);
  assert.ok(data.thg.sources.some(s => s.id === data.thg.pv.kWpId && s.unit === 'kWp'), 'the PV source of the Betrieb exists in the Erstellung');
  for (const [kat, rw] of Object.entries(data.thg.richtwerte)) assert.ok(data.thg.head.find(h => h[0] === 'kat')[3].includes(kat) && rw.erst.length === 2 && (!rw.zus || (rw.betr.length === 2 && rw.zus.length === 2)), `Richtwerte ${kat}`);
  for (const [pid, inst] of Object.entries(data.forms.byProject)) for (const [kind, I] of Object.entries(inst)) {
    for (const spec of (I.missing || [])) {
      const [k, c, field] = spec.split(':');
      if (k === 'thg') assert.ok(ids.includes(c) && ['q', 'kw'].includes(field), `${pid}: missing spec ${spec}`);
      else if (k === 'thgB') assert.ok(/^(b\d_(n|a|eta)|pv_y|pv_ev)$/.test(c), `${pid}: missing spec ${spec}`);
      else assert.ok(['kvQ', 'kvV', 'ksQ', 'ksV'].includes(k) && data.ebkp.ebkp.flatMap(g => g.kids).some(x => x.code === c), `${pid}: missing spec ${spec}`);
    }
    assert.equal(I.dates.length, I.step + 1, `${pid}/${kind}: one date per step reached`);
  }
  for (const s of data.thg.sources) assert.ok(data.thg.eg[s.grp].some(x => x[0] === s.code), `${s.id}: element group ${s.code} of ${s.grp}`);
  for (const [kind, T] of Object.entries(data.forms.kinds)) {
    const tpl = data.templates.templates[kind === 'ks' ? 'kv' : kind];
    assert.ok(tpl && T.vorlage.endsWith('Version ' + tpl.ver), `${kind}: Vorlage «${T.vorlage}» carries the template version ${tpl.ver}`);
  }
  for (const n of data.notifications) {
    if (n.tab) assert.ok(FORM_TABS.includes(n.tab), `notification ${n.id}: tab ${n.tab}`);
    if (n.delivery) assert.ok(data.ilp.rows.some(r => r.code === n.delivery) || (data.projects.projects.find(p => p.id === n.project).deliveries || []).some(d => d.code === n.delivery), `notification ${n.id}: delivery ${n.delivery}`);
  }
  for (const t of data.tasks.rows) if (t.delivery) assert.ok(data.ilp.rows.some(r => r.code === t.delivery), `task «${t.name}»: delivery ${t.delivery} is an ILP row`);
  // Wording of the first prototype versions must not come back (the design study texts in screens/study are historical).
  const STALE = /FV-32|Anleitung TP2|nach TP2|Betrag je Hauptgruppe|Weitere Angaben|Summe Positionen/;
  for (const f of FILES) if (!['screens', 'study'].includes(f)) assert.ok(!STALE.test(JSON.stringify(data[f], (k, v) => (k === 'note' ? undefined : v))), `${f}.json has no stale wording`);
  const KIND = { 'KV-32': 'kv', 'KS-31': 'ks', 'THG-32': 'thg' };
  for (const [pid, inst] of Object.entries(data.forms.byProject)) {
    assert.ok(data.projects.projects.some(p => p.id === pid), `forms for project ${pid}`);
    for (const [kind, I] of Object.entries(inst)) {
      assert.ok(data.forms.kinds[kind], `${pid}: kind ${kind}`);
      assert.ok(data.forms.people[I.lead], `${pid}/${kind}: lead ${I.lead}`);
      for (const [, , who] of (I.history || [])) assert.ok(data.forms.people[who], `${pid}/${kind}: history person ${who}`);
      for (const [ini] of (I.people || [])) assert.ok(data.forms.people[ini], `${pid}/${kind}: participant ${ini}`);
    }
  }
  for (const p of data.projects.projects) {
    assert.ok(data.forms.reviewers[p.responsible], `${p.id}: reviewer ${p.responsible}`);
    for (const d of (p.deliveries || [])) if (d.isForm) assert.ok((data.forms.byProject[p.id] || {})[KIND[d.code]], `${p.id}: Datenformular ${d.code} has an instance`);
  }
});

test('KV-32: Hauptgruppen, totals and completeness', () => {
  const kv = vm.forms.kv;
  assert.equal(kv.kind, 'data'); assert.equal(kv.status, 'In Bearbeitung'); assert.equal(kv.step, 1);
  assert.equal(kv.total, 20647100, 'Anlagekosten A–Z, with Z Mehrwertsteuer'); assert.equal(kv.bw, 18000000, 'Erstellungskosten B–W incl. J');
  assert.equal(kv.fields, 55, '31 Elementgruppen: 24 with Menge + Kosten, 7 with Kosten only (CHF as Berechnungsbezug or no Bezugsgrösse)');
  assert.equal(kv.missing, 1, 'D08 Menge fehlt'); assert.equal(kv.bar.canSubmit, false);
  assert.equal(kv.badges, undefined, 'the tabs carry no numbers');
  const rows = kv.erf.rows;
  assert.equal(rows.filter(r => r.isGroupRow).length, 14); assert.equal(rows.filter(r => r.isPos).length, 31);
  assert.equal(rows.filter(r => r.isAdd).length, 14, '«Kostenelement hinzufügen» under every Hauptgruppe');
  assert.ok(rows.filter(r => r.isGroupRow).every(r => r.canToggle && !r.direct), 'every Hauptgruppe is broken down by default');
  assert.ok(!rows.some(r => r.pauschal || r.name === 'Pauschalbetrag'), 'no lump-sum rows: every amount belongs to an Elementgruppe');
  assert.deepEqual(rows.filter(r => r.isPos && r.code[0] === 'W').map(r => r.code), ['W01', 'W02', 'W04', 'W05']); assert.equal(kv.groups.find(g => g.code === 'V').sum, 2950000);
  assert.equal(rows.find(r => r.code === 'B').bez, "4'200", 'Bezugsmenge GSF from sia416');
  assert.equal(kv.subtotals.find(u => u.code === 'B–W').cur, "18'000'000");
  assert.equal(kv.ovList.subs.find(u => u.code === 'A–Z').d, '+1.1', 'Anlagekosten against KS-31'); assert.equal(kv.ovList.subs.find(u => u.code === 'A–Z').prevText, 'KS-31: 19.6 Mio');
  assert.ok(!kv.erf.foot, 'no footer text (design)');
  // Filling the missing quantity enables the submit button; the filter shows only missing rows.
  const filled = structuredClone(base);
  for (const c of data.ebkp.missingInitially || []) filled.projects.musterhausen.kvQ[c] = 1;
  let v = vmFor(filled);
  assert.equal(v.forms.kv.missing, 0); assert.equal(v.forms.kv.bar.canSubmit, true);
  const only = structuredClone(base); only.projects.musterhausen.forms.kv.missingOnly = true;
  v = vmFor(only);
  assert.deepEqual(v.forms.kv.erf.rows.map(r => r.code), ['D', 'D08']);
  // «Zusammenfassen» of C replaces its four positions (Menge + Kosten) by one amount.
  const det = structuredClone(base); det.projects.musterhausen.forms.kv.modes.C = 'direct';
  v = vmFor(det);
  assert.equal(v.forms.kv.fields, 55 - 8 + 1); assert.equal(v.forms.kv.erf.rows.filter(r => r.isPos).length, 27);
  assert.equal(v.forms.kv.total, 20647100, 'the direct amount equals the sum of the positions');
  // A missing direct amount counts as missing; H has no element, its direct amount is 0.
  const empty = structuredClone(base); empty.projects.musterhausen.forms.kv.modes.B = 'direct'; empty.projects.musterhausen.forms.kv.gvals.B = ''; empty.projects.musterhausen.forms.kv.modes.H = 'direct';
  v = vmFor(empty);
  assert.equal(v.forms.kv.missing, 2); assert.match(v.forms.kv.bar.reason, /alle Werte/); assert.equal(base.projects.musterhausen.forms.kv.gvals.H, 0);
  // Positions can be removed and Kostenelemente added (eBKP-H element groups of the Hauptgruppe not yet in the table).
  const ed = structuredClone(base); ed.projects.musterhausen.kvQ.D08 = 6480;
  ed.projects.musterhausen.forms.kv.removed = { D08: true };
  ed.projects.musterhausen.forms.kv.added = [{ id: 'kn1', grp: 'G', code: '', q: '', v: '' }];
  v = vmFor(ed);
  assert.equal(v.forms.kv.erf.rows.filter(r => r.isPos).length, 30); assert.equal(v.forms.kv.fields, 55 - 2 + 2, 'D08 gone, new row counts code + Kosten (Menge once the element group has a unit)');
  assert.equal(v.forms.kv.missing, 2);
  const nr = v.forms.kv.erf.rows.find(r => r.isNewPos);
  assert.ok(nr && nr.opts.length === 2 && nr.opts.map(o => o.v).join() === 'G05,G06', 'only element groups not yet in G');
  ed.projects.musterhausen.forms.kv.added[0] = { id: 'kn1', grp: 'G', code: 'G05', q: '120', v: '240000' };
  v = vmFor(ed);
  assert.equal(v.forms.kv.missing, 0); assert.equal(v.forms.kv.fields, 56); assert.equal(v.forms.kv.total, 20647100 - 540000 + 240000);
  assert.equal(v.forms.kv.erf.rows.find(r => r.isNewPos).name, 'Einbauten, Schutzeinrichtung zu Ausbau');
  // Einheit from the dropdown: the Bezugsgrösse of the norm is preselected, «pauschal» needs no Menge, a unit asks for one.
  const pos = code => v.forms.kv.erf.rows.find(r => r.code === code);
  assert.equal(pos('C01').unit, 'm²'); assert.ok(pos('C01').hasQty && pos('C01').unitOpts.find(o => o.sel).v === 'm²' && pos('C01').unitOpts.some(o => o.v === 'pauschal'));
  assert.equal(pos('V01').unit, 'CHF'); assert.ok(!pos('V01').hasQty && !pos('V01').miss, 'CHF is a Berechnungsbezug of the norm: no Menge');
  assert.equal(pos('W05').unit, 'pauschal'); assert.ok(!pos('W05').hasQty, 'no sourced Bezugsgrösse: «pauschal»');
  assert.deepEqual(pos('C01').unitOpts.map(o => o.v), ['pauschal', 'm²', 'm³', 'm', 'St', 'm³/h', 'CHF'], 'the units of the Bezugsgrössen of the norm, and «pauschal»');
  assert.equal(pos('D05').unitTip, 'Bezugsgrösse der Norm (eBKP-H 2020, System A): m² HRA · Energiebezugsfläche (EBF) Wärme'); assert.equal(pos('Z01').unitTip, 'Bezugsgrösse der Norm (eBKP-H 2020, System A): CHF PSBY · Summe aller Hauptgruppen B bis Y · Berechnungsbezug (Kostensumme), keine Menge'); assert.ok(pos('Y01').unitTip.startsWith('Keine Bezugsgrösse der Norm belegt'));
  ed.projects.musterhausen.forms.kv.units = { V01: 'm²', C01: 'pauschal' };
  v = vmFor(ed);
  assert.ok(pos('V01').hasQty && pos('V01').miss, 'a unit asks for the Menge'); assert.ok(!pos('C01').hasQty && !pos('C01').miss); assert.equal(v.forms.kv.fields, 56, 'one Menge more, one less'); assert.equal(v.forms.kv.missing, 1);
  // Kennwert CHF/m² GF: derived from the costs and the GF of the Grundrisse; an own value replaces it, for an element or a Hauptgruppe.
  assert.equal(pos('D01').kw, '191'); assert.ok(!pos('D01').kwOwn && pos('D01').kwTip.startsWith('Berechnet'));
  ed.projects.musterhausen.forms.kv.kws = { D01: 250, D: 600, D05: '' };
  v = vmFor(ed);
  assert.equal(pos('D01').kw, '250'); assert.ok(pos('D01').kwOwn && pos('D01').kwTip.startsWith('Eigener Wert, berechnet 191')); assert.equal(pos('D').kw, '600'); assert.ok(!pos('D05').kwOwn, 'an emptied field is derived again');
  const noGF = structuredClone(ed); noGF.projects.musterhausen.sia.GF = 0;
  v = vmFor(noGF);
  assert.equal(pos('D07').kw, '', 'without a Geschossfläche the Kennwert is entered'); assert.ok(pos('D07').kwTip.startsWith('Keine Geschossfläche')); assert.equal(pos('D01').kw, '250');
});

test('KV-32: Übersicht and Prüfung figures', () => {
  const kv = vm.forms.kv;
  assert.equal(kv.kpis[0].v, '18.0'); assert.equal(kv.kpis[1].v, "2'778");
  assert.equal(kv.chart.targets.length, 3); assert.equal(kv.chart.targets[0].val, 'CHF 17.00 Mio'); assert.equal(kv.chart.targets[0].delta, '+5.9 %');
  assert.equal(kv.chart.band, '15.30–18.70 Mio'); assert.ok(kv.chart.hasBand);
  assert.equal(kv.ovList.prevText, 'KS-31: 19.6 Mio', 'Anlagekosten A–Z of the Vorphase'); assert.equal(kv.ovList.tot, '20.6'); assert.equal(kv.ovList.totShare, '100 %'); assert.ok(kv.kpis.every(k => k.tip) && kv.comp.tip && kv.chart.istTip && kv.subtotals.every(u => u.tip), 'the key figures explain themselves on hover');
  assert.deepEqual(kv.ovList.rows.map(r => r.code).join(''), 'ABCDEFGHIJVWYZ', 'the whole eBKP-H: also A Grundstück and H without costs and Z Mehrwertsteuer'); assert.equal(kv.ovList.rows[0].cur, '0.0'); assert.equal(kv.ovList.rows[0].share, '0 %');
  const zRow = kv.ovList.rows.at(-1); assert.equal(zRow.name, 'Mehrwertsteuer'); assert.equal(zRow.cur, '1.5', 'the sample project carries 8.1 % of B–Y (19.1 Mio)'); assert.equal(zRow.share, '7 %'); assert.ok(zRow.tx && zRow.tip.startsWith('KS-31: 1.5 Mio'));
  assert.equal(kv.ovList.shareLabel, 'Anteil A–Z'); assert.equal(kv.ovList.dUnit, 'Δ KS-31'); assert.deepEqual(kv.ovList.subs.map(u => `${u.code} ${u.share}`), ['C–G 63 %', 'B–W 87 %', 'A–Z 100 %']);
  const z01 = kv.erf.rows.find(r => r.code === 'Z01'); assert.ok(z01.isPos && z01.vStr === "1'547'100" && !z01.hasQty, 'Z01 Mehrwertsteuer is an amount the delivery team enters'); assert.equal(kv.erf.totalStr, "20'647'100", 'Total of the Erfassung = Anlagekosten A–Z'); assert.equal(kv.subtotals.find(u => u.code === 'A–Z').cur, kv.erf.totalStr); assert.equal(kv.ovList.subs.length, 3); assert.equal(kv.ovList.unit, 'Mio CHF'); assert.ok(kv.ovList.rows.every(r => r.icon.startsWith('assets/ebkp/')));
  // Prüfung: Zusammenfassung (Prüfpunkt, value of the Lieferung, result); the requirement is the hover text
  const S = (F, key) => F.summ.find(r => r.key === key);
  assert.deepEqual(kv.summ.map(r => r.key), ['voll', 'ziel', 'dach', 'prev', 'kw']); assert.ok(kv.summ.every(r => r.tip && r.res));
  assert.equal(S(kv, 'voll').val, '1 Wert fehlt'); assert.equal(S(kv, 'voll').res, 'nicht erfüllt'); assert.equal(S(kv, 'ziel').val, 'CHF 18.00 Mio (+5.9 %)'); assert.equal(S(kv, 'ziel').res, 'prüfen', 'above the Kostenziel, inside the accuracy');
  assert.equal(S(kv, 'dach').st, 'ok'); assert.ok(S(kv, 'prev').val.startsWith('ab 10 % bei ') && S(kv, 'prev').val.includes('D'), S(kv, 'prev').val); assert.equal(S(kv, 'prev').st, 'warn'); assert.equal(S(kv, 'kw').val, "2'778 CHF/m² GF"); assert.equal(S(kv, 'kw').st, 'ok');
  assert.equal(kv.lock, '', 'an open Erfassung is not veiled'); assert.equal(vm.forms.ks.lock, 'An ePPM übertragen am 10.03.2026. Änderungen sind nicht mehr möglich.'); assert.equal(vm.forms.ks.lockTip, 'Gesperrt'); assert.equal(vm.forms.ks.bar.locked, true); assert.equal(vm.forms.ks.bar.lockedText, 'Abgeschlossen. Die Erfassung ist gesperrt.');
  assert.equal(kv.manual.length, 2); assert.equal(kv.erf.importItems[0][0], 'vorlage'); assert.equal(kv.erf.importItems.length, 3);
  assert.equal(kv.rv.canReview, false); assert.equal(kv.rv.reason, 'Erst nach der Einreichung möglich');
  assert.equal(kv.steps.length, 6); assert.equal(kv.steps[1].sub, 'aktuell'); assert.equal(kv.steps[0].sub, '12.03.2027');
  assert.equal(kv.next.btn, 'Erfassung fortsetzen');
  assert.equal(kv.hist.length, 6); assert.equal(kv.hist[0].t, 'Dokument hochgeladen', 'newest first');
  assert.equal(kv.meta.find(m => m.k === 'Lieferverantwortlich').v, 'Gian Muster, Generalplaner Beispiel AG');
});

const E_TIPS = F => F.erf.derived.every(u => u.tip && u.kTip) && F.betr.subs.every(u => u.tip);
test('THG-32: Emissionsquellen (Erstellung), Betrieb, Zielwerte SIA 390/1 and the review flow', () => {
  const thg = vm.forms.thg, S = data.thg.sources, EBF = data.sia416.initial.EBF, TH = data.thg;
  const erst = S.reduce((a, s) => a + s.kw, 0);
  assert.equal(thg.status, 'In Bearbeitung'); assert.equal(thg.step, 1); assert.equal(thg.locked, false, 'the demo project keeps its Ökobilanz open');
  assert.equal(thg.nSrc, 22); assert.equal(thg.fields, 44 + TH.betrieb.length * 3 + 2, 'two values per Emissionsquelle, three per Energiedienstleistung, PV yield and self-consumption'); assert.equal(thg.missing, 0);
  assert.ok(Math.abs(thg.total - erst * EBF * 60) < 1, 'Erstellung über 60 Jahre = Σ kw × EBF × 60');
  assert.equal(thg.endwertStr, '8.7', 'THGE Erstellung = Σ kw (kg CO₂-eq/m² EBF·a)');
  assert.equal(thg.kpis[0].k, 'Erstellung'); assert.equal(thg.kpis[0].v, '8.7'); assert.equal(thg.kpis[1].k, 'Betrieb'); assert.equal(thg.kpis[1].v, '0.5', 'Betrieb with Wasserkraft and PV self-consumption');
  assert.equal(thg.betr.subs[1].v, '9.2');
  assert.ok(thg.kpis.every(k => k.tip) && thg.comp.tip && thg.tz.rows.every(r => r.tip.includes('kg CO₂-eq')) && thg.ovList.totTip && thg.ovBetr.foot.includes('keine Vorphase') && E_TIPS(thg), 'hover texts for the key figures');
  // Zielwerte SIA 390/1: three rows, marks Basis/ambitioniert (Verwaltung: assumed Betrieb values), Minergie-ECO GW1, Vorphase
  assert.equal(thg.chart, null); assert.equal(thg.tz.rows.length, 3); assert.deepEqual(thg.tz.ist, ['8.7', '0.5', '9.2']);
  assert.deepEqual(thg.tz.rows.map(r => r.marks.map(m => m.n).join('')), ['AMVB', 'AB', 'AB']);
  assert.equal(thg.tz.legend.length, 4); assert.deepEqual(thg.tz.legend[0].cells.map(c => c.v), ['9.0', '2.0', '11.0']); assert.equal(thg.tz.legend[1].cells[2].over, undefined, 'the legend carries no status colours');
  assert.ok(thg.tz.hint.includes('Verwaltung') && thg.tz.hint.includes('Annahme'), 'Betrieb and Zusatzanforderung of Verwaltung are assumptions');
  const T = key => thg.summ.find(r => r.key === key);
  assert.deepEqual(thg.summ.map(r => r.key), ['voll', 'zus', 'prev', 'basis', 'ebf', 'strom', 'anteile']); assert.equal(thg.devPct, 15);
  assert.ok(thg.summ.filter(r => r.key !== 'prev').every(r => r.ok), thg.summ.filter(r => !r.ok).map(r => r.label).join(' | '));
  assert.equal(T('voll').val, 'Alle Werte erfasst'); assert.equal(T('zus').val, '9.2 kg CO₂-eq/m² EBF·a'); assert.ok(T('zus').tip.startsWith('Höchstens 11.0'));
  assert.equal(T('basis').val, 'KBOB Version 9.0 · SIA 2032:2020'); assert.equal(T('strom').val, 'Wasserkraft 100 % (Pflichtenheft BBL)'); assert.equal(T('anteile').val, '100 %'); assert.ok(T('ebf').val.endsWith(' m²'));
  // Übersicht lists (design 05.11.2026) and the flagged deviation in the Zusammenfassung
  assert.equal(thg.ovList.rows.length, 6); assert.deepEqual(thg.ovList.rows.map(r => r.code), ['B', 'C', 'D', 'E', 'F', 'G']); assert.equal(thg.ovList.rows[2].d, '+0.4'); assert.ok(thg.ovList.rows.every(r => r.dw === undefined && r.dfg === undefined), 'plain values: no conditional colour or weight'); assert.equal(thg.ovList.tot, '8.7'); assert.equal(thg.ovList.dTot, '+0.5'); assert.ok(thg.ovList.rows[2].tx && thg.ovList.rows[0].icon === 'assets/ebkp/B.svg');
  assert.equal(thg.ovBetr.rows.length, 9); assert.equal(thg.ovBetr.rows[8].name, 'Photovoltaik (Gutschrift)'); assert.ok(thg.ovBetr.rows[8].cur.startsWith('−') && thg.ovBetr.rows[8].bc === 'var(--bar-credit)'); assert.equal(thg.ovBetr.rows[1].name, 'Warmwasser'); assert.equal(thg.ovBetr.rows[1].cur, '0.15', 'both Warmwasser carriers add up'); assert.equal(thg.ovBetr.tot, '0.52');
  assert.equal(T('prev').val, 'ab 15 % bei D', 'Technik deviates 18 % from SIA 31, above the 15 % threshold of the Ökobilanz'); assert.equal(T('prev').res, 'prüfen', 'a deviation is for the reviewer to judge'); assert.equal(T('prev').begr, undefined, 'plain rows only');
  // Betrieb rows on one line; Endenergie and Koeffizient are derived and can be replaced by an own value
  assert.equal(thg.betr.rows[0].label, 'Raumwärme'); assert.equal(thg.betr.rows[1].label, 'Warmwasser · Wärmepumpe Sole/Wasser'); assert.ok(!thg.betr.rows[0].endOwn && thg.betr.rows[0].endStr === '5.5' && thg.betr.rows[0].kStr === '0.012');
  assert.deepEqual(thg.betr.importItems.map(i => i[0]), ['vorlage', 'excel', 'rechenhilfe']); assert.deepEqual(thg.erf.importItems.map(i => i[0]), ['vorlage', 'excel', 'tool']);
  assert.equal(thg.rv.notSubmitted, true);
  assert.equal(thg.manual.length, 2); assert.equal(thg.docs.length, 3); assert.equal(thg.target, 'Wüest Dimensions');
  assert.equal(thg.rv.canReview, false); assert.equal(thg.rv.canApprove, false); assert.equal(thg.bar.canSubmit, true, 'complete → Einreichen possible');
  assert.equal(thg.handover.value, 'Erstellung 8.7, Betrieb 0.5 kg CO₂-eq/m² EBF·a');
  // Erfassung Erstellung rows: all Hauptgruppen opened, derived rows, Grundlagen split between Übersicht, Erstellung and Betrieb
  const E = thg.erf;
  assert.ok(E.isTHG && E.rows.filter(r => r.isGroupRow).length === 6 && E.rows.filter(r => r.isSrc).length === 22 && E.rows.filter(r => r.isAdd).length === 6 && E.rows.filter(r => r.isGroupRow).every(r => r.canToggle && !r.direct), 'all groups are open and get «Emissionsquelle hinzufügen»');
  assert.equal(E.rows.find(r => r.isGroupRow && r.code === 'C').kw, '3.5'); assert.equal(E.rows.find(r => r.isGroupRow && r.code === 'C').share, '41 %');
  assert.equal(E.rows.find(r => r.id === 'C04.01-1').dataset, 'Gd01 Geschossdecke Beton 28 cm, zirkulit® NPK A', 'one line: the Ökobilanzdaten are the hover text'); assert.equal(E.rows.find(r => r.id === 'C04.01-1').quelle, 'Bauteil Lesosai · herstellerspezifisch'); assert.equal(E.rows.find(r => r.id === 'C04.01-1').share, '16 %');
  assert.equal(E.head.length, 5); assert.ok(E.head.every(h => !h.ro) && E.head.find(h => h.key === 'gw1').isText, 'Erstellung: Systemgrenze, Ökobilanzdaten, Tool, Minergie-ECO GW1 (text), Datenqualität');
  assert.equal(thg.headShared.length, 5); assert.equal(thg.headShared.find(h => h.key === 'EBF').val, "5'600 m²"); assert.ok(thg.headShared.filter(h => h.ro).length === 2 && thg.headShared.find(h => h.key === 'stand').isText, 'only EBF and GF read-only');
  assert.equal(E.derived[0].kw, '8.7'); assert.equal(E.derived[0].v, '48.6'); assert.equal(E.tot.kw, '8.7'); assert.equal(E.tot.share, '100 %');
  // Erfassung Betrieb: Energiedienstleistungen with the Projektwert flag (ticked = exception, like «Hersteller»), PV rows, totals
  const Bt = thg.betr;
  assert.equal(Bt.head.length, 3); assert.equal(Bt.rows.filter(r => r.isRow).length, 9); assert.equal(Bt.rows.filter(r => r.isPv).length, 2);
  assert.equal(Bt.rows[0].end, '5.5'); assert.equal(Bt.rows[0].kE, '0.012'); assert.equal(Bt.rows[2].kE, '0.049'); assert.equal(Bt.rows[0].proj, true); assert.equal(Bt.rows[1].proj, false, 'Warmwasser uses the Standardwert of the Rechenhilfe');
  assert.equal(Bt.end, '34.5'); assert.equal(Bt.thg, '0.52'); assert.equal(Bt.subs[1].v, '9.2'); assert.ok(Bt.pv[0].val.startsWith('62 kWp'));
  assert.equal(vm.ilpRows.find(r => r.code === 'THG-32').status, 'In Bearbeitung');
  assert.equal(vm.auRows.find(t => t.delivery === 'THG-32').status, 'In Bearbeitung');
  const st = structuredClone(base);
  st.projects.musterhausen.forms.thg.step = 4; st.projects.musterhausen.forms.thg.dates = ['12.03.2027', '15.03.2027', null, '03.05.2027', '04.05.2027'];
  let v0 = vmFor(st); assert.equal(v0.forms.thg.status, 'In Prüfung'); assert.equal(v0.forms.thg.locked, true); assert.equal(v0.forms.thg.rv.canReview, true); assert.equal(v0.forms.thg.erf.rows.filter(r => r.isAdd).length, 0, 'locked: no add rows'); assert.ok(v0.forms.thg.erf.rows.filter(r => r.isGroupRow).every(r => !r.canToggle), 'locked: the table lies under the veil'); assert.ok(/^Eingereicht( heute| am \d\d\.\d\d\.\d{4})?\. Änderungen erst nach Rückweisung\.$/.test(v0.forms.thg.lock), v0.forms.thg.lock); assert.equal(v0.forms.thg.lockTip, 'Gesperrt bis zur Rückweisung'); assert.equal(v0.forms.thg.bar.lockedText, 'Eingereicht. Die Erfassung ist gesperrt, Paula Muster prüft die Lieferung.');
  const ext = vmFor(st, detailed, userOf('AB')); assert.equal(ext.forms.thg.rv.canReview, false); assert.equal(ext.forms.thg.rv.decide, false); assert.ok(ext.forms.thg.manual.every(m => m.disabled), 'an external user cannot review');
  st.projects.musterhausen.forms.thg.checks = { t1: true, t2: true, t3: true, t4: true, t5: true };
  let v = vmFor(st);
  assert.equal(v.forms.thg.rv.canApprove, true);
  st.projects.musterhausen.forms.thg.step = 5;
  v = vmFor(st);
  assert.equal(v.forms.thg.status, 'Freigegeben'); assert.equal(v.forms.thg.canTransfer, true); assert.equal(v.forms.thg.handover.status, 'Bereit zur Übertragung');
  st.projects.musterhausen.forms.thg.step = 6;
  v = vmFor(st);
  assert.equal(v.forms.thg.status, 'Abgeschlossen'); assert.equal(v.pfRows[0].sus, 'übertragen'); assert.equal(v.pfRows[0].ew, '8.7');
  assert.ok(v.forms.thg.steps.slice(0, 5).every(s => s.sym === '✓'));
  st.projects.musterhausen.forms.thg.step = 1; st.projects.musterhausen.forms.thg.rejected = true;
  v = vmFor(st);
  assert.equal(v.forms.thg.status, 'Zurückgewiesen'); assert.equal(v.forms.thg.pill.label, 'Zurückgewiesen'); assert.equal(v.forms.thg.locked, false);
  assert.equal(v.ilpRows.find(r => r.code === 'THG-32').status, 'Zurückgewiesen');
  assert.equal(v.forms.thg.erf.rows.filter(r => r.isAdd).length, 6, 'open groups get «Emissionsquelle hinzufügen»');
  // A missing value blocks the submission (badge per tab); without any Emissionsquelle the form cannot be submitted.
  st.projects.musterhausen.forms.thg.rejected = false; st.projects.musterhausen.thgSrc[0].kw = ''; st.projects.musterhausen.thgBetr.b3_eta = '';
  v = vmFor(st);
  assert.equal(v.forms.thg.missing, 2); assert.equal(v.forms.thg.bar.canSubmit, false); assert.equal(v.forms.thg.missE, 1); assert.equal(v.forms.thg.missB, 1);
  assert.equal(v.forms.thg.betr.rows[3].end, '–');
  st.projects.musterhausen.thgBetr.b3_eta = 0; v = vmFor(st); assert.equal(v.forms.thg.missB, 1, 'a Nutzungsgrad of 0 counts as missing');
  st.projects.musterhausen.forms.thg.missingOnly = true;
  v = vmFor(st);
  assert.deepEqual(v.forms.thg.erf.rows.map(r => r.code), ['B', 'B06.01'], 'filter shows the group and the row with the missing value');
  assert.deepEqual(v.forms.thg.betr.rows.map(r => r.name), ['Raumkälte'], 'Betrieb filter shows the row with the missing value');
  st.projects.musterhausen.forms.thg.missingOnly = false; st.projects.musterhausen.thgBetr.b3_eta = 5; st.projects.musterhausen.thgSrc = [];
  v = vmFor(st);
  assert.equal(v.forms.thg.nSrc, 0); assert.equal(v.forms.thg.missE, 0); assert.equal(v.forms.thg.bar.canSubmit, false); assert.equal(v.forms.thg.bar.reason, 'Einreichen erst, wenn Emissionsquellen erfasst sind');
  assert.equal(v.forms.thg.kpis[0].v, '–'); assert.equal(v.forms.thg.next.btn, 'Erfassung öffnen'); assert.equal(v.forms.thg.tz.rows[0].ist, '–'); assert.equal(v.forms.thg.summ[0].val, 'Keine Emissionsquellen erfasst'); assert.equal(v.forms.thg.summ[0].res, 'nicht erfüllt'); assert.equal(v.forms.thg.summ.find(r => r.key === 'prev'), undefined, 'no comparison without Emissionsquellen');
  // A new Emissionsquelle needs element group, Bauteil, Referenzgrösse and Kennwert; the unit comes from the element group.
  st.projects.musterhausen.thgSrc = [{ id: 'n1', grp: 'D', isNew: true, code: '', tcode: '', name: '', quelle: '', unit: '', q: '', kw: '', hs: false }];
  v = vmFor(st);
  assert.equal(v.forms.thg.missE, 4);
  st.projects.musterhausen.thgSrc = [{ id: 'n1', grp: 'D', isNew: true, code: 'D01', tcode: '', name: 'Elektroanlage', quelle: 'KBOB 34.002', unit: 'm² EBF', q: 5600, kw: 1.2, hs: false }];   // as thgVal stores it
  st.projects.musterhausen.forms.thg.modes.D = 'detail';
  v = vmFor(st);
  assert.equal(v.forms.thg.missing, 0); assert.equal(v.forms.thg.endwertStr, '1.2'); assert.equal(v.forms.thg.erf.rows.find(r => r.isNew).share, '100 %');
  st.projects.musterhausen.thgHead.kbob = 'KBOB/ecobau-Liste 2022, Version 8.02';
  v = vmFor(st);
  assert.equal(v.forms.thg.summ.find(r => r.key === 'basis').res, 'prüfen', 'other KBOB list version is flagged');
  // Betrieb: the Stromprodukt changes the coefficient, the surplus rule credits the export; a category without Richtwerte asks for a Vergleichskategorie
  st.projects.musterhausen.thgSrc = structuredClone(base.projects.musterhausen.thgSrc); st.projects.musterhausen.thgHead = { ...base.projects.musterhausen.thgHead, strom: 'CH-Verbrauchermix', pvRule: 'Gutschrift CH-Verbrauchermix' };
  v = vmFor(st);
  assert.equal(v.forms.thg.betr.rows[0].kE, '0.125'); assert.equal(v.forms.thg.betr.rows[10].kE, '0.125'); assert.ok(v.forms.thg.betr.rows[10].thg.startsWith('−'), 'PV export credited');
  st.projects.musterhausen.thgHead = { ...base.projects.musterhausen.thgHead, kat: 'Sonstige' };
  v = vmFor(st);
  assert.equal(v.forms.thg.summ[1].st, 'warn'); assert.ok(v.forms.thg.summ[1].tip.includes('Vergleichskategorie')); assert.deepEqual(v.forms.thg.tz.rows[1].marks, []); assert.equal(v.forms.thg.tz.legend[0].cells[1].v, '–');
});

test('every project: complete, plausible Datenformulare', () => {
  const KIND = { 'KV-32': 'kv', 'KS-31': 'ks', 'THG-32': 'thg' };
  const KNOWN = new Set(['Offen', 'In Bearbeitung', 'Eingereicht', 'In Prüfung', 'Freigegeben', 'Abgeschlossen', 'Zurückgewiesen', 'Überfällig']);
  for (const p of data.projects.projects) {
    const v = vmFor(base, p);
    const inst = data.forms.byProject[p.id] || {};
    assert.deepEqual(Object.keys(v.forms).sort(), Object.keys(inst).sort(), `${p.id}: forms`);
    for (const [kind, F] of Object.entries(v.forms)) {
      assert.ok(KNOWN.has(F.status), `${p.id}/${kind}: status ${F.status}`);
      assert.ok((F.fields > 0 || (kind === 'thg' && F.step === 0)) && F.steps.length === 6 && F.hist.length >= 1 && F.peopleRows.length >= 2 && F.kpis.length === 2, `${p.id}/${kind}: shape`);
      if (F.step >= 3) assert.equal(F.missing, 0, `${p.id}/${kind}: complete once submitted`);
      if (F.step === 0) assert.equal(F.missing, F.fields - (kind === 'thg' ? 0 : 1), `${p.id}/${kind}: Offen has no values (A01 Grundstück keeps its 0)`);
      if (F.step === 1 && !inst[kind].missing && !p.detailed) assert.equal(F.missing, 0, `${p.id}/${kind}: complete unless values are marked missing`);
      if (F.step >= 1) assert.ok(F.docs.length >= 1, `${p.id}/${kind}: documents`);
      assert.ok((kind === 'thg' ? F.tz.rows.length === 3 && F.tz.legend.length === 4 : F.chart.targets.length === 3) && F.ovList.rows.length >= 6 && F.kpis.every(k => k.tip), `${p.id}/${kind}: Übersicht`);
      if (kind === 'thg' && F.step >= 1) assert.ok(F.nSrc === data.thg.sources.length && F.endwert > 4 && F.endwert < 14, `${p.id}/thg: plausible Endwert ${F.endwertStr}`);
      if (kind === 'thg' && F.step === 0) assert.equal(F.nSrc, 0, `${p.id}/thg: open form without Emissionsquellen`);
      assert.ok(!/undefined|NaN/.test(JSON.stringify([F.kpis, F.meta, F.hist, F.handover, F.next])), `${p.id}/${kind}: no undefined/NaN`);
    }
    for (const d of (p.deliveries || [])) {
      const F = v.forms[KIND[d.code]];
      const row = v.ilpRows.find(r => r.code === d.code);
      if (F) { assert.equal(row.status, F.status, `${p.id}: ILP row ${d.code} follows the form`); assert.equal(v.formByCode(d.code), F); }
      else assert.equal(row.status, d.status, `${p.id}: classic delivery ${d.code} keeps its status`);
    }
    for (const t of (p.tasks || [])) if (t.delivery && v.forms[KIND[t.delivery]]) assert.equal(v.auRows.find(r => r.delivery === t.delivery).status, v.forms[KIND[t.delivery]].status, `${p.id}: task ${t.delivery}`);
  }
  const eiger = vmFor(base, data.projects.projects.find(p => p.id === 'eigerplatz'));
  assert.equal(eiger.forms.thg.status, 'Überfällig'); assert.equal(eiger.forms.thg.missing, 3, 'three fields of three Emissionsquellen'); assert.equal(eiger.forms.kv.status, 'Offen'); assert.equal(eiger.forms.kv.kpis[0].v, '–');
  const agro = vmFor(base, data.projects.projects.find(p => p.id === 'agroscope-posieux'));
  assert.equal(agro.forms.thg.status, 'Abgeschlossen'); assert.equal(agro.forms.thg.endwertStr, '11.4', 'calibrated to the Endwert of the instance'); assert.equal(agro.forms.kv.locked, true); assert.equal(agro.forms.thg.reviewer, 'Reto Muster');
  assert.equal(agro.forms.thg.erf.head.find(h => h.key === 'tool').val, 'Lesosai'); assert.equal(agro.forms.thg.summ[1].res, 'erfüllt', 'Restaurant: 11.4 + Betrieb is below the Zusatzanforderung 16'); assert.ok(agro.forms.thg.tz.legend[0].cells[0].v === '9.0' && agro.forms.thg.tz.hint.includes('Restaurant') && !agro.forms.thg.tz.hint.includes('Annahme'));
  assert.equal(vm.pfRows.find(r => r.project === 'agroscope-posieux').ew, '11.4'); assert.equal(vm.pfRows.find(r => r.project === 'eigerplatz').status, 'Überfällig'); assert.equal(vm.pfRows.find(r => r.project === 'zollikofen').status, 'Nicht bestellt');
  assert.equal(vmFor(base, data.projects.projects.find(p => p.id === 'prangins')).formByCode('kv-32'), null, 'no KV-32 in Prangins');
  assert.equal(vm.forms.ks.status, 'Abgeschlossen'); assert.equal(vm.forms.ks.summ.find(r => r.key === 'prev').label, 'Abweichung zur Vorphase SIA 21');
});

test('application model: tasks, projects, dashboard', () => {
  assert.equal(vm.projects.length, data.projects.projects.length);
  assert.ok(vm.myProjects.length >= 1 && vm.myProjects.length <= vm.projects.length);
  assert.ok(vm.taskRows.all.length <= vm.taskRows.everything.length);
  assert.ok(vm.taskRows.assigned.length <= vm.taskRows.all.length);
  assert.equal(vm.dash.open, vm.dash.onTrack + vm.dash.late, 'open = on track + late');
  for (const t of [...vm.allTasks, ...vm.auRows]) assert.ok(t.href && t.href.startsWith('/'), `task «${t.name}» has an href`);
  for (const r of vm.ilpRows) assert.notEqual(matchRoute(r.href).name, 'notfound', `ilp row ${r.code} links to a route`);
  for (const n of vm.notifs) assert.notEqual(matchRoute(n.href).name, 'notfound', `notification ${n.id} links to a route`);
  assert.ok(vm.notifs.some(n => n.href.endsWith('/deliveries/thg-32/pruefung')), 'notifications open the tab of the delivery');
  assert.ok(vmFor({ ...base, user: 'AB' }).notifs.some(n => n.href.endsWith('/deliveries/kv-32/erfassung')), 'supplier notifications open the Erfassung');
  for (const a of vm.activities) assert.ok(a.href && !a.href.includes('undefined'), 'activity links resolve');
});

test('application model: documents, LOIN, logs', () => {
  assert.ok(vm.documents.rows.length >= 5 && vm.documents.rows.every(r => r.pill && r.href));
  assert.equal(vm.loin.keys.length, 7);
  assert.ok(vm.logs.length >= 10 && vm.logs.every(l => /^[0-9a-f]{8}-/.test(l.id) && l.projectId));
  const other = vmFor({ ...base }, data.projects.projects.find(p => !p.detailed));
  assert.equal(other.documents.rows.length, 2, 'default document set: AIA and CAD-Richtlinie BBL'); assert.ok(other.documents.rows.some(r => r.name.startsWith('CAD-Richtlinie BBL')), 'CAD-Richtlinie in every project');
  assert.equal(other.loin.keys.length, 0, 'LOIN empty as in the CDE Bund');
});

test('application model: a project without detailed deliveries', () => {
  const p = data.projects.projects.find(x => !x.detailed && (x.deliveries || []).length);
  const v = vmFor({ ...base }, p);
  assert.ok(v.ilpRows.length >= 1);
  assert.ok(v.deliveryByCode(v.ilpRows[0].code));
  assert.equal(v.deliveryByCode('nope'), null);
});

test('router: patterns, query parsing, overrides', () => {
  assert.equal(matchRoute('/').name, 'home');
  assert.equal(matchRoute('/projects/all').name, 'projects');
  assert.deepEqual(matchRoute('/projects/x/deliveries/kv-32/erfassung').params, { pid: 'x', code: 'kv-32', tab: 'erfassung' });
  assert.equal(matchRoute('/projects/x/delivery-plan').name, 'ilp');
  assert.equal(matchRoute('/projects/x/documents').name, 'documents');
  assert.deepEqual(matchRoute('/projects/x/loin/elements').params, { pid: 'x', tab: 'elements' });
  assert.equal(matchRoute('/projects/x/timeline/logs').name, 'timeline');
  assert.deepEqual(matchRoute('/projects/x/master-data/delivery-objects').params, { pid: 'x', section: 'master-data', sub: 'delivery-objects' });
  assert.equal(matchRoute('/projects/x/info-management/delivery-plan').name, 'section', 'old path is a generic section until app.js redirects it');
  assert.equal(matchRoute('/nope/x/y/z/w').name, 'notfound');
  assert.deepEqual(parseHash('#/tasks/all?type=thg&endwert=9.5&ui.studyOpen=false').query, { type: 'thg', endwert: '9.5', 'ui.studyOpen': 'false' });
  assert.equal(parseHash('#/x?a=b=c').query.a, 'b=c', 'a query value may contain «=»');
  assert.deepEqual(routeOverrides({ type: 'thg', endwert: '9.5', 'ui.studyOpen': 'false', n: '3' }), { endwert: 9.5, 'ui.studyOpen': false, n: 3 });
  assert.equal(routeOverrides({ view: 'card' }), null);
  assert.doesNotThrow(() => parseHash('#/projects/%E0%A4%A/overview?q=%'), 'malformed percent-encoding does not throw');
});

test('study screens: every legacy id round-trips to its screen', () => {
  const pid = detailed.id;
  for (const [id, L] of Object.entries(LEGACY)) {
    const path = L.path(pid);
    const route = { ...matchRoute(path), path, query: parseHash('#' + path).query };
    assert.notEqual(route.name, 'notfound', `${id} → ${path}`);
    if (L.study) continue;
    const st = structuredClone(base);
    for (const [k, v] of Object.entries(L.patch || {})) { const ks = k.split('.'); let t = st; for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]]; t[ks.at(-1)] = v; }
    assert.equal(screenIdFor(route, st), id, `${id} ↔ ${path}`);
  }
  for (const s of data.screens) if (s.id !== 'home' && !['review', 'qs', 'varb'].includes(s.id)) assert.ok(LEGACY[s.id], `screens.json id ${s.id} has a route`);
});

test('deliveries: six tabs, Übersicht is the landing tab', () => {
  assert.deepEqual(FORM_TABS, ['uebersicht', 'erfassung', 'pruefung', 'beteiligte', 'dokumente', 'verlauf']);
  assert.equal(defaultDeliveryTab('kv-32', userOf('AB')), 'uebersicht');
  assert.equal(defaultDeliveryTab('KV-32', userOf('PM')), 'uebersicht');
  assert.equal(defaultDeliveryTab('thg-32'), 'uebersicht'); assert.equal(defaultDeliveryTab('ks-31'), 'uebersicht');
  assert.equal(defaultDeliveryTab('fv-32'), null, 'FV-32 entfällt');
  assert.equal(defaultDeliveryTab('xx-99', userOf('PM')), null);
  assert.equal(link.delivery('p', 'KV-32', 'erfassung'), '/projects/p/deliveries/kv-32/erfassung');
  assert.equal(vm.formByCode('KV-32').code, 'KV-32'); assert.equal(vm.formByCode('nope'), null);
});

test('task table columns', () => {
  assert.ok(TASK_COLUMNS.find(c => c.key === 'name').fixed);
  assert.ok(DEFAULT_TASK_COLS.includes('name') && !DEFAULT_TASK_COLS.includes('bereich'));
  assert.deepEqual(base.taskCols, DEFAULT_TASK_COLS);
  const keys = TASK_COLUMNS.map(c => c.key);
  assert.equal(new Set(keys).size, keys.length, 'column keys are unique');
});

// ---- Planlieferungen DWG für das Flächenmanagement (SAP RE-FX) (one floor plan = one delivery, checked by js/plancheck) ----
// ---- Topbar search ----
test('search: groups by topic, limits, ranking and links', () => {
  assert.deepEqual(searchModel('', data).groups, []); assert.equal(searchModel('  ', data).total, 0);
  const e = searchModel('eiger', data);
  assert.equal(e.groups[0].key, 'projects'); assert.equal(e.groups[0].label, 'Projekte'); assert.equal(e.groups[0].items[0].label, 'Bern, Eigerplatz 1'); assert.equal(e.groups[0].items[0].href, '/projects/eigerplatz/overview');
  const kv = searchModel('kv-32', data);
  const del = kv.groups.find(g => g.key === 'deliveries');
  assert.ok(del && del.items.length <= 5 && del.items.every(it => /^KV-32 · /.test(it.label) && /\/deliveries\/kv-32$/.test(it.href)), 'deliveries of every project, 5 at most');
  assert.ok(kv.groups.find(g => g.key === 'tasks'), 'tasks mention KV-32 in their description');
  assert.ok(kv.total <= 12 && kv.items.length === kv.total && kv.items.every((it, i) => it.idx === i), '12 in total, flat index for the keyboard');
  const a = searchModel('ökobilanz', data), b = searchModel('Okobilanz', data);
  assert.ok(a.total > 0 && a.total === b.total, 'diacritics-insensitive');
  const m = searchModel('muster', data);
  assert.ok(m.groups[0].items[0].label.toLowerCase().startsWith('muster') || m.groups[0].items[0].label.includes('Musterhausen'), 'prefix hits first');
  assert.equal(searchModel('xyzxyz', data).total, 0);
});

// ---- eBKP-H directory (SN 506 511:2020) — docs/reference/sources/eBKP-H_2020_Verzeichnis.md ----
test('ebkp: every Hauptgruppe A–Z with all its Elementgruppen; A and H are groups of the cost form', () => {
  const EXPECT = { A: 2, B: 9, C: 5, D: 12, E: 3, F: 2, G: 6, H: 9, I: 6, J: 4, V: 3, W: 7, Y: 2, Z: 1 };
  const el = data.ebkp.elements;
  assert.deepEqual(Object.keys(el), Object.keys(EXPECT), 'Hauptgruppen in the order of the norm');
  for (const [g, n] of Object.entries(EXPECT)) {
    assert.equal(el[g].length, n, `${g}: ${n} Elementgruppen`);
    for (const [c, name, unit] of el[g]) assert.ok(c.startsWith(g) && /^[A-Z]\d{2}$/.test(c) && name.length > 2 && typeof unit === 'string', `${c} ${name}`);
    assert.deepEqual(el[g].map(x => x[0]), [...el[g].map(x => x[0])].sort(), `${g} sorted by code`);
  }
  assert.equal(Object.values(el).flat().length, 71);
  // Bezugsgrösse A of the norm per Elementgruppe (docs/research/2026-11-05-ebkp-h-bezugsgroessen.md): unit, abbreviation, name; 54 of 71 are publicly documented
  const UNITS = data.forms.kinds.kv.units, sourced = Object.values(el).flat().filter(e => e[3]);
  assert.deepEqual(UNITS, ['pauschal', 'm²', 'm³', 'm', 'St', 'm³/h', 'CHF']); assert.deepEqual(data.forms.kinds.ks.units, UNITS);
  assert.equal(sourced.length, 54); assert.ok(sourced.every(e => UNITS.includes(e[2]) && e[2] !== 'pauschal' && /^[A-Z0-9]+$/.test(e[3]) && typeof e[4] === 'string'), 'sourced: a unit of the norm and an abbreviation');
  assert.ok(Object.values(el).flat().filter(e => !e[3]).every(e => e[2] === '' && e.length === 3), 'not sourced: no unit, «pauschal» in the form');
  assert.deepEqual(el.D.find(e => e[0] === 'D08').slice(2), ['St', 'WCP', 'Anzahl Apparate']); assert.deepEqual(el.Z[0].slice(2), ['CHF', 'PSBY', 'Summe aller Hauptgruppen B bis Y']);
  assert.ok(data.ebkp.ebkp.flatMap(g => g.kids).every(k => !k.unit || UNITS.includes(k.unit)), 'every unit of the sample rows is in the dropdown');
  const formGroups = data.ebkp.ebkp.map(g => g.code);
  assert.equal(data.ebkp.extra, undefined, 'no Hauptgruppen with a lump sum');
  assert.deepEqual(formGroups, Object.keys(EXPECT), 'the form has every Hauptgruppe A–Z');
  for (const g of data.ebkp.ebkp) {
    assert.ok(el[g.code] && el[g.code].length, `dropdown of ${g.code} has options`);
    for (const k of g.kids) { const e = el[g.code].find(x => x[0] === k.code); assert.ok(e && e[1] === k.name && (e[3] ? e[2] === k.unit : true) && (needsQty(k.unit || 'pauschal') ? k.qty > 0 : k.qty == null), `${k.code} is an Elementgruppe of the norm with its Bezugsgrösse`); }
  }
  assert.deepEqual(data.ebkp.ebkp.filter(g => !g.kids.length).map(g => g.code), ['H'], 'only H has no element in an office building');
  assert.equal(data.ebkp.ebkp.find(g => g.code === 'W').name, 'Nebenkosten zu Erstellung');
  assert.equal(data.ebkp.elements.W.find(x => x[0] === 'W04')[1], 'Bewirtung, Öffentlichkeitsarbeit, Entschädigung');
  const kv = vm.forms.kv;
  assert.deepEqual(kv.groups.map(g => g.code), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'V', 'W', 'Y', 'Z'], 'cost form groups A … Z in the order of the norm');
  assert.equal(kv.groups.find(g => g.code === 'A').sum, 0); assert.equal(kv.groups.find(g => g.code === 'H').sum, 0); assert.equal(kv.missing, 1, 'a zero amount is a value, not a gap: only D08 is missing');
});

test('thg: Elementgruppen and Elemente B–G complete, each with unit and amortisation', () => {
  const EXPECT = { B: [9, 45], C: [5, 19], D: [12, 74], E: [3, 14], F: [2, 7], G: [6, 23] };
  for (const [g, [l2, l3]] of Object.entries(EXPECT)) {
    const list = data.thg.eg[g], codes = list.map(x => x[0]);
    assert.equal(list.filter(x => !x[0].includes('.')).length, l2, `${g}: ${l2} Elementgruppen`);
    assert.equal(list.filter(x => x[0].includes('.')).length, l3, `${g}: ${l3} Elemente`);
    for (const [c, name, unit, a] of list) assert.ok(c.startsWith(g) && name.length > 2 && typeof unit === 'string' && [20, 30, 40, 60].includes(a), `${c} ${name} ${unit} ${a}`);
    assert.deepEqual(codes, [...codes].sort(), `${g} sorted by code`);
    for (const c of codes.filter(c => c.includes('.'))) assert.ok(codes.includes(c.slice(0, 3)), `${c} has its Elementgruppe`);
  }
  assert.equal(data.thg.eg.D.find(x => x[0] === 'D05.01')[1], 'Wärmequelle, -senke, Brennstofflager');
  assert.equal(data.thg.eg.D.find(x => x[0] === 'D12.01')[2], 'St'); assert.equal(data.thg.eg.C.find(x => x[0] === 'C04.08')[3], 40);
});

test('plans: data, ILP rows, tasks and statuses per floor', () => {
  const P = data.plans;
  assert.equal(P.floors.length, 5);
  assert.deepEqual(P.floors.map(f => f.code), ['DWG-UG', 'DWG-EG', 'DWG-OG1', 'DWG-OG2', 'DWG-DG']);
  for (const f of P.floors) {
    assert.ok(data.ilp.rows.find(r => r.plan === f.key && r.code === f.code), `ILP row for ${f.code}`);
    assert.ok(data.tasks.rows.find(r => r.plan === f.key && r.delivery === f.code), `task for ${f.code}`);
    if (f.seed) assert.ok(P.seeds[f.seed] && P.samples[f.seed], `${f.code} seed ${f.seed} exists`);
  }
  assert.ok(base.plans.EG && base.plans.EG.status === 'bearbeitung' && base.plans.EG.result === null);
  const byCode = Object.fromEntries(vm.ilpRows.map(r => [r.code, r.status]));
  assert.deepEqual([byCode['DWG-UG'], byCode['DWG-EG'], byCode['DWG-OG1'], byCode['DWG-OG2'], byCode['DWG-DG']], ['Abgeschlossen', 'In Bearbeitung', 'Abgeschlossen', 'In Prüfung', 'Offen']);
  assert.equal(vm.ilpRows.length, 11);
  assert.equal(vm.ilpTiles.find(t => t.key === 'total').value, 11);
  assert.ok(vm.ilpTiles.find(t => t.key === 'check').value >= 1, 'In Prüfung tile counts DWG-OG2');
  assert.ok(vm.auRows.find(t => t.delivery === 'DWG-EG').status === 'In Bearbeitung');
  assert.equal(vm.planByCode('DWG-EG').code, 'DWG-EG');
  assert.equal(vm.planByCode('dwg-eg').name, 'Grundriss EG (DWG)');
  assert.equal(vm.planByCode('xx'), null);
  for (const c of ['dwg-ug', 'dwg-eg', 'dwg-og1', 'dwg-og2', 'dwg-dg']) {
    assert.equal(defaultDeliveryTab(c, userOf('AB')), 'uebersicht');
    assert.equal(matchRoute(link.delivery('musterhausen', c, 'erfassung')).name, 'delivery');
  }
});

test('plans: Datenformular shape (Übersicht, Prüfung) of a floor plan', () => {
  const eg = vm.formByCode('dwg-eg'), ug = vm.formByCode('dwg-ug'), dg = vm.formByCode('dwg-dg');
  assert.equal(eg.kind, 'plan'); assert.equal(eg.status, 'In Bearbeitung'); assert.equal(eg.step, 1);
  assert.equal(eg.steps.length, 6); assert.equal(eg.planOv.cats.length, 10); assert.deepEqual(eg.planOv.sia.map(a => a.ab), ['GF', 'KF', 'NGF', 'VF', 'FF', 'NF', 'HNF', 'NNF'], 'from the whole to its parts');
  assert.equal(eg.comp.pct, '26 / 40'); assert.deepEqual(eg.summ.map(r => r.key), ['err', 'warn', 'aoid', 'ebf', 'sia']); assert.equal(eg.summ[0].val, '4'); assert.equal(eg.summ[0].res, 'nicht erfüllt'); assert.equal(eg.summ[1].res, 'prüfen');
  assert.equal(eg.planOv.cats[0].ratio, '0 / 8', 'all Layer rules fail for the office layer structure'); assert.equal(eg.planOv.catTot.ratio, '26 / 40'); assert.equal(Number(eg.planOv.catTot.w) + Number(eg.planOv.catTot.e), 14, 'fourteen rules fired');
  assert.equal(dg.planOv.catTot.ratio, '– / 40'); assert.equal(dg.planOv.catTot.e, '–', 'no result: no counts');
  assert.equal(eg.comp.text, '4 Fehler · 44 Warnungen'); assert.equal(vm.formByCode('dwg-eg').lock, ''); assert.ok(vm.formByCode('dwg-ug').lock.startsWith('An SAP RE-FX übertragen'), vm.formByCode('dwg-ug').lock); assert.equal(eg.rv.notSubmitted, true); assert.match(eg.bar.reason, /keine Fehler/);
  assert.equal(ug.status, 'Abgeschlossen'); assert.equal(ug.step, 6); assert.equal(ug.kpis[0].v, '30'); assert.equal(ug.kpis[1].v, '572.3');
  assert.ok(ug.steps.slice(0, 5).every(s => s.sym === '✓')); assert.equal(ug.docs[0].name, '9999.AA.U1_CAFM.dwg'); assert.equal(ug.docs[0].req, 'Pflicht');
  assert.ok(ug.hist.some(h => h.t === 'An SAP RE-FX übertragen') && ug.hist[0].t === 'An SAP RE-FX übertragen', 'newest first');
  assert.equal(dg.comp.pct, '–'); assert.equal(dg.summ.length, 0); assert.equal(dg.summNote, 'Noch kein Plan geprüft.'); assert.ok(ug.summ.every(r => r.ok || r.key === 'warn') && /^\d+ von \d+$/.test(ug.summ[2].val) && ug.summ[3].key === 'ebf' && ug.summ[4].tip.startsWith('NGF '), ug.summ.map(r => `${r.key}:${r.val}:${r.st}`).join(' | ')); assert.equal(dg.peopleRows[0].scope, 'Grundriss DG (DWG)');
});

test('plans: status filter and search of the sub-tab lists (planLists, as in plan-check)', () => {
  const eg = vm.plans.EG;   // office seed: 4 errors + 44 warnings in 14 rules (GEOM_003 counts the splines inside blocks), 32 layers (30 unknown), no rooms
  const all = planLists(eg, { planFilter: 'all', planSearch: '' });
  assert.equal(all.rules.failed.length + all.rules.passed.length, 40); assert.equal(all.issues.length, 48); assert.equal(all.layers.length, 32);
  assert.equal(all.counts, undefined, 'the sub-tabs carry no counts');
  assert.equal(all.issues[0].it.severity, 'error', 'errors first');
  const errRules = [...eg.rules.failed, ...eg.rules.passed].filter(r => r.severity === 'error').length;
  const err = planLists(eg, { planFilter: 'errors' });
  assert.ok(err.rules.failed.length >= 1 && err.rules.failed.every(r => r.severity === 'error')); assert.equal(err.rules.passed.length, 0, 'passed rules only without filter');
  assert.equal(err.rules.total, errRules); assert.equal(err.issues.length, 4); assert.ok(err.issues.every(x => x.it.severity === 'error'));
  assert.equal(err.layers.length, 0, 'layers never carry errors');
  const warn = planLists(eg, { planFilter: 'warnings' });
  assert.equal(warn.layers.length, 30, 'unknown layers are the warnings of the Layer tab'); assert.equal(warn.issues.length, 44); assert.ok(warn.rules.failed.every(r => r.severity === 'warning'));
  const q = planLists(eg, { planFilter: 'all', planSearch: 'layer_00' });
  const qRules = [...q.rules.failed, ...q.rules.passed];
  assert.equal(qRules.length, 8); assert.ok(qRules.every(r => r.code.startsWith('LAYER_00')));
  assert.ok(planLists(eg, { planSearch: 'Pflicht-Layer' }).rules.failed.length >= 1, 'search matches the rule text');
  const ln = eg.result.layers[3].name; assert.ok(planLists(eg, { planSearch: ln.toLowerCase() }).layers.some(l => l.name === ln), 'layer search is case-insensitive');
  const ug = vm.plans.UG;   // Musterplan: 30 rooms (ok), 1 floor area «UV», 3 warnings
  const rooms = planLists(ug, { planSearch: '05.00' });
  assert.ok(rooms.rooms.length > 0 && rooms.rooms.length < 30 && rooms.rooms.every(r => r.aoid.includes('05.00')));
  assert.equal(planLists(ug, { planFilter: 'errors' }).rooms.length, 0);
  assert.equal(planLists(ug, { planFilter: 'all' }).areas.length, 1); assert.equal(planLists(ug, { planSearch: 'brutto' }).areas.length, 1, 'the floor area matches «Bruttogeschossfläche» too');
  assert.equal(planLists(ug, { planFilter: 'warnings' }).rules.failed.length, 2); assert.equal(planLists(ug, { planFilter: 'warnings' }).rules.total, 40 - errRules);
  const dg = vm.plans.DG;   // no result yet
  assert.equal(planLists(dg, {}).issues.length, 0); assert.equal(planLists(dg, {}).rules.failed.length, 0);
});

test('plans: Nutzungsart of the rooms (mock of the Raumtabelle CAD.A01), DIN 277, Flächenkennzahlen and the ring', () => {
  const ug = vm.plans.UG, eg = vm.plans.EG, k = ug.kpiRaw;
  // the usage table of data/plans.json splits the 30 rooms of the Musterplan; the parts add up to the NGF, GF and KF stay
  assert.deepEqual([k.hnf, k.nnf, k.vf, k.ff, k.nf, k.ngf, k.kf, k.gf], [368.89, 40.87, 90.02, 17.28, 409.76, 517.06, 55.26, 572.32]);
  assert.ok(Math.abs(k.hnf + k.nnf + k.vf + k.ff - k.ngf) < 0.011 && Math.abs(k.ngf + k.kf - k.gf) < 0.011);
  assert.deepEqual(k.din277, { 'HNF 1': 22.48, 'HNF 2': 271.66, 'HNF 4': 39.08, 'HNF 5': 35.67, 'NNF 7': 40.87, 'FF 8': 17.28, 'VF 9': 90.02 });
  assert.equal(Object.keys(data.plans.usage).length, 30); assert.ok(Object.values(data.plans.usage).every(g => /^(HNF [1-6]|NNF 7|FF 8|VF 9)$/.test(g)));
  // withUsage: a room without an entry counts as HNF, duplicates do not count, no match leaves the figures as they are
  const k0 = { hnf: 10, nnf: 0, vf: 0, ff: 0, nf: 10, ngf: 10 };
  const mixed = withUsage(k0, [{ aoid: 'a', area: 6 }, { aoid: 'b', area: 4 }, { aoid: 'a', area: 6, duplicate: true }], { a: 'VF 9' });
  assert.deepEqual([mixed.hnf, mixed.vf, mixed.nf, mixed.ngf], [4, 6, 4, 10]); assert.deepEqual(mixed.din277, { 'VF 9': 6 });
  assert.equal(withUsage(k0, [{ aoid: 'x', area: 10 }], { a: 'VF 9' }), k0); assert.equal(withUsage(null, [], {}), null);
  // Übersicht: one decimal, share of the GF
  const F = vm.formByCode('dwg-ug');
  assert.deepEqual(F.planOv.sia.map(a => `${a.ab} ${a.val} ${a.share}`), ['GF 572.3 m² 100.0 %', 'KF 55.3 m² 9.7 %', 'NGF 517.1 m² 90.3 %', 'VF 90.0 m² 15.7 %', 'FF 17.3 m² 3.0 %', 'NF 409.8 m² 71.6 %', 'HNF 368.9 m² 64.5 %', 'NNF 40.9 m² 7.1 %'], 'one decimal: HNF + NNF = NF, VF + FF + NF = NGF, KF + NGF = GF');
  assert.deepEqual(F.planOv.sia.filter(a => a.fw === 600).map(a => a.ab), ['GF', 'NGF', 'NF']); assert.equal(F.planOv.catTot.ratio, '38 / 40'); assert.equal(F.planOv.catTot.e, '0');
  // Kennzahlen: the SIA 416 areas, parts first; the Energiebezugsfläche (SIA 380/1) in its own table; DIN 277 groups without rooms read «–»
  const d = ug.kpiDash;
  assert.deepEqual(d.areas.map(r => r.abbr), ['HNF', 'NNF', 'NF', 'VF', 'FF', 'NGF', 'KF', 'GF']); assert.deepEqual(d.ebf.map(r => `${r.abbr} ${r.value} ${r.share}`), ['EBF 0.0 m² 0.0 %'], 'the UG lies outside the thermal envelope');
  // EBF from the Flächenart of the rooms (decision tree of data/plans.json › ebf): FF does not count, the Konstruktionsfläche is added in proportion
  const og = vm.plans.OG1, kOg = og.kpiRaw;
  assert.equal(kOg.ebf, Math.round(572.32 * (517.06 - 17.28) / 517.06 * 100) / 100); assert.equal(og.ebf, '553 m²'); assert.equal(og.ebfRow.value, '553.2 m²'); assert.equal(og.ebfRow.share, '96.7 %'); assert.equal(og.ebfKnown, true);
  assert.equal(ebfOf({ gf: 100 }, [{ id: 1, aoid: 'a', area: 40 }, { id: 2, aoid: 'b', area: 40 }], { a: 'HNF 2', b: 'FF 8' }, data.plans.ebf), 50); assert.equal(ebfOf({ gf: 100 }, [{ id: 1, aoid: 'x', area: 40 }], {}, data.plans.ebf), 100, 'a room without Flächenart counts');
  assert.equal(ebfOf({ gf: 100 }, [{ id: 1, aoid: 'a', area: 40 }], { a: 'HNF 2' }, data.plans.ebf, false), 0); assert.equal(ebfOf({ gf: null }, [{ id: 1, aoid: 'a', area: 40 }], {}, data.plans.ebf), null); assert.equal(ebfOf({ gf: 100 }, [], {}, data.plans.ebf), null);
  // a required figure: Prüfpunkt, part of the hand-over, and the plan cannot be submitted without it
  const fOg = vm.formByCode('dwg-og1'), fEg = vm.formByCode('dwg-eg');
  assert.deepEqual(fOg.summ.filter(r => r.key === 'ebf').map(r => [r.label, r.val, r.res]), [['Energiebezugsfläche EBF (SIA 380/1)', '553.2 m²', 'erfüllt']]); assert.ok(fOg.handover.value.endsWith('EBF 553 m²')); assert.equal(fOg.kpis[2].k, 'Energiebezugsfläche EBF'); assert.equal(fOg.planOv.ebf.value, '553.2 m²');
  assert.deepEqual(fEg.summ.filter(r => r.key === 'ebf').map(r => [r.val, r.res]), [['fehlt', 'nicht erfüllt']]); assert.equal(vm.plans.EG.ebfKnown, false);
  const noGf = structuredClone(base); noGf.plans.DG = { ...noGf.plans.DG, result: { ...data.plans.seeds.cadv01, areas: [], kpi: { ...data.plans.seeds.cadv01.kpi, gf: null, kf: null } } };
  const dgNo = planModel(noGf, data).plans.DG;
  assert.equal(dgNo.errors, 0); assert.equal(dgNo.canSubmit, false, 'no errors, but no Energiebezugsfläche'); assert.equal(planForm(dgNo, data).bar.reason, 'Einreichen erst, wenn die Energiebezugsfläche EBF vorliegt (Raumpolygone und Geschosspolygon)');
  assert.deepEqual(d.areas.map(r => r.abbr).length, 8); assert.equal(d.areas[0].value, '368.9 m²'); assert.equal(d.areas[0].share, '64.5 %');
  assert.deepEqual(d.areas.filter(r => r.sum).map(r => r.abbr), ['NF', 'NGF', 'GF']); assert.equal(d.volume, undefined); assert.equal(d.entities, undefined);
  assert.equal(d.din277.length, 10); assert.equal(d.din277.find(r => r.abbr === 'HNF 2').value, '271.7 m²'); assert.equal(d.din277.find(r => r.abbr === 'HNF 3').value, '–'); assert.equal(d.din277.find(r => r.abbr === 'HNF 3').share, '–');
  assert.deepEqual(d.economy.map(r => `${r.abbr} ${r.value}`), ['NGF / GF 0.90', 'KF / GF 0.10', 'NF / NGF 0.79', 'HNF / NGF 0.71']);
  // ring: one label per segment, the labels of one side keep 18 px distance and stay inside the box
  const c = d.donut.callouts;
  assert.deepEqual(c.map(x => x.label), ['HNF', 'NNF', 'VF', 'FF', 'KF']); assert.equal(c[0].pct, '64 %'); assert.ok(d.donut.gradient.startsWith('conic-gradient(var(--sia-hnf) 0.00% ') && d.donut.label.includes('HNF 64 %'));
  for (const side of [true, false]) { const ys = c.filter(x => x.right === side).map(x => x.yPx).sort((p, q) => p - q); assert.ok(ys.every((y, i) => y >= 8 && y <= 192 && (!i || y - ys[i - 1] >= 18 - 1e-9)), `labels ${side ? 'right' : 'left'}: ${ys.join(', ')}`); }
  assert.equal(donutOf([]), null); assert.equal(donutOf([['HNF', 5]]).callouts[0].pct, '100 %');
  // the labels of the ring are whole percentages that add up to 100 (largest remainder)
  assert.deepEqual(c.map(x => x.pct), ['64 %', '7 %', '16 %', '3 %', '10 %']); assert.deepEqual(wholeShares([37.5, 62.5]), [38, 62]); assert.deepEqual(wholeShares([1, 1, 1]), [34, 33, 33]);
  assert.equal(wholeShares([0.4, 0.4, 0.4, 0.4, 98.4]).reduce((x, y) => x + y, 0), 100); assert.deepEqual(wholeShares([0, 0]), [0, 0]);
  // an AOID text named like a property of Object.prototype must not reach it (the page broke on every route)
  const odd = withUsage({ hnf: 30, nnf: 0, vf: 0, ff: 0, nf: 30, ngf: 30 }, [{ id: 1, aoid: 'toString', area: 10 }, { id: 2, aoid: 'constructor', area: 10 }, { id: 3, aoid: '9999.AA.U1.001', area: 10 }], data.plans.usage);
  assert.equal(odd.hnf + odd.nnf + odd.vf + odd.ff, 30);
  // «Raumpolygone mit eindeutiger AOID»: a room without an AOID text (AOID_001) or with a repeated AOID (AOID_002) does not count
  const seed = data.plans.seeds.cadv01, res = structuredClone(seed);
  res.issues.push({ code: 'AOID_001', severity: 'error', category: 'AOID', message: 'Raum R1: kein AOID-Text', roomId: res.rooms[0].id }, { code: 'AOID_002', severity: 'error', category: 'AOID', message: 'AOID nicht eindeutig', roomId: res.rooms[1].id }, { code: 'AOID_002', severity: 'error', category: 'AOID', message: 'AOID nicht eindeutig', roomId: res.rooms[2].id });
  const st = structuredClone(base); st.plans.EG = { ...st.plans.EG, result: res };
  const pm = planModel(st, data).plans.EG, row = pm.summary.find(x => x[0] === 'aoid');
  assert.equal(row[2], '27 von 30'); assert.equal(row[4], 'err'); assert.equal(pm.aoidCount, 27); assert.equal(planModel(base, data).plans.UG.aoidCount, 30);
  assert.equal(pm.summary.find(x => x[0] === 'sia')[3], 'NGF 517.06 m² + KF 55.26 m² = GF 572.32 m²', 'the hover adds up at two decimals');
  assert.equal(eg.kpiDash.donut, null, 'office seed: no rooms, no ring'); assert.ok(eg.kpiDash.areas.every(r => r.value === '–'));
});

test('plans: submit gate (no errors), locking and review flow', () => {
  const eg = vm.plans.EG, ug = vm.plans.UG, og2 = vm.plans.OG2, dg = vm.plans.DG;
  assert.equal(eg.errors, 4, 'EG seed (office layer structure) has 4 errors');
  assert.equal(eg.canSubmit, false);
  assert.equal(eg.rules.failed.length + eg.rules.passed.length, 40);
  assert.ok(eg.rules.failed.some(r => r.code === 'LAYER_001' && r.status === 'fail'));
  assert.equal(dg.result, null); assert.equal(dg.canSubmit, false); assert.equal(dg.statusLabel, 'Offen');
  assert.equal(ug.errors, 0); assert.equal(ug.warnings, 3); assert.equal(ug.roomCount, 30); assert.equal(ug.locked, true); assert.equal(ug.isUeber, true);
  assert.equal(og2.isReviewable, true); assert.equal(og2.approveDisabled, true);
  assert.ok(ug.siaRows.find(r => r.abbr === 'NGF').value.startsWith('517'), 'NGF of the sample plan');
  assert.ok(ug.steps.length === 6 && ug.steps.every(s => s.done), 'all steps done for Abgeschlossen');
  // A checked plan without errors can be submitted; afterwards the delivery is locked and listed as Eingereicht.
  const seed = data.plans.seeds.cadv01;
  const st = structuredClone(base);
  st.plans.EG = { ...st.plans.EG, result: { ...seed } };
  let v = vmFor(st);
  assert.equal(v.plans.EG.canSubmit, true); assert.equal(v.plans.EG.own, true); assert.equal(v.plans.EG.errors, 0);
  assert.equal(v.formByCode('dwg-eg').bar.canSubmit, true);
  st.plans.EG.status = 'eingereicht';
  v = vmFor(st);
  assert.equal(v.plans.EG.locked, true); assert.equal(v.plans.EG.canSubmit, false); assert.equal(v.plans.EG.statusLabel, 'Eingereicht');
  assert.ok(v.ilpRows.find(r => r.code === 'DWG-EG').status === 'Eingereicht');
  assert.ok(v.plans.EG.history.some(h => h.t === 'Zur Prüfung eingereicht'));
  assert.equal(v.formByCode('dwg-eg').step, 3); assert.equal(v.formByCode('dwg-eg').rv.canReview, true);
  st.plans.EG.checks = { c1: true, c2: true };
  v = vmFor(st);
  assert.equal(v.plans.EG.approveDisabled, false); assert.equal(v.formByCode('dwg-eg').rv.canApprove, true);
  st.plans.EG.status = 'zurueck';
  v = vmFor(st);
  assert.equal(v.plans.EG.isZurueck, true); assert.equal(v.plans.EG.locked, false); assert.equal(v.plans.EG.canSubmit, true, 'rejected plan can be resubmitted');
  assert.equal(v.formByCode('dwg-eg').rejected, true);
  st.plans.EG.status = 'uebertragen';
  assert.equal(vmFor(st).ilpRows.find(r => r.code === 'DWG-EG').status, 'Abgeschlossen');
});

test('plans: Prüfbericht model from a seed result', async () => {
  const { buildReportModel } = await mod('js/plancheck/report.js');
  const seed = data.plans.seeds.cadv01;
  const m = buildReportModel(seed, { project: 'Verwaltungszentrum Musterhausen', code: 'DWG-EG', name: 'Grundriss EG (DWG)', floor: 'Erdgeschoss', status: 'In Bearbeitung', reviewer: 'Paula Muster, BBL', due: '30.04.2027', guideline: 'CAD-Richtlinie BBL V1.0', uploadedAt: 'heute' });
  assert.equal(m.fileName, seed.file.name); assert.ok(m.baseName && !m.baseName.includes('.dwg'));
  assert.equal(m.rules.passed.length + m.rules.failed.length, 40); assert.equal(m.summary.passedRules, 38);
  assert.equal(m.rooms.length, 30); assert.ok(m.kpi.areas.length === 9 && m.kpi.areas[1].abbr === 'EBF' && m.kpi.economy.length === 4 && m.kpi.din277.length === 10 && m.kpi.volume.length === 1);
  assert.ok(m.entities.length > 0 && typeof m.entities[0].layers === 'string');
  assert.ok(m.info.some(([k, v]) => k === 'Projekt' && v === 'Verwaltungszentrum Musterhausen') && m.info.some(([k]) => k === 'DWG-Version'));
  assert.ok(!JSON.stringify(m.info).includes('undefined'));
});

test('plans: seeds match the plan-check engine (LibreDWG WebAssembly under Node)', async () => {
  const { checkDwg, RULES } = await mod('js/plancheck/index.js');
  assert.equal(RULES.length, 40);
  for (const [id, sample] of Object.entries(data.plans.samples)) {
    const buf = readFileSync(join(ROOT, sample.src));
    const { result, drawing } = await checkDwg(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { name: sample.name, size: buf.length });
    const seed = data.plans.seeds[id];
    assert.ok(drawing.renderList.length > 1000, `${id}: drawing has render items`);
    assert.deepEqual(result.summary, seed.summary, `${id}: summary`);
    assert.deepEqual(result.issues.map(i => i.code), seed.issues.map(i => i.code), `${id}: fired rules`);
    assert.equal(result.rooms.length, seed.rooms.length, `${id}: rooms`);
    assert.deepEqual(result.kpi, seed.kpi, `${id}: SIA 416 figures`);
    const plain = r => { const { elapsed, src, checkedAt, ...rest } = JSON.parse(JSON.stringify(r)); return rest; };
    assert.deepEqual(plain(result), plain(seed), `${id}: the whole result (issues, rooms, areas, layers, entities)`);
  }
  // engine edge cases (review 06.11.): a polygon without extent in one direction, a floor polygon drawn twice
  const { visualCenter } = await mod('js/plancheck/geometry.js');
  const { computeKpis } = await mod('js/plancheck/kpi.js');
  assert.deepEqual(visualCenter([{ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 0, y: 5 }]), { x: 5, y: 5 }, 'a line drawn there and back: no endless loop');
  assert.deepEqual(visualCenter([{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 0 }, { x: 0, y: 0 }]), { x: 4, y: 0 }); assert.deepEqual(visualCenter([{ x: 2, y: 0 }, { x: 2, y: 6 }, { x: 2, y: 0 }]), { x: 2, y: 3 });
  const sq = visualCenter([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }]); assert.ok(Math.abs(sq.x - 2) < 0.1 && Math.abs(sq.y - 2) < 0.1);
  const kd = computeKpis([{ area: 25, siaCategory: 'HNF' }], [{ area: 200 }, { area: 200, isDuplicate: true }]);
  assert.equal(kd.gf, 200, 'a duplicated Geschosspolygon counts once'); assert.equal(kd.kf, 175); assert.equal(computeKpis([], [{ area: 120 }, { area: 80 }]).gf, 200, 'two different floor polygons add up');
  // a failed check of a file with the same name keeps the drawing of the valid result (a corrected file keeps its name)
  const { planSession } = await mod('js/plansession.js');
  const good = readFileSync(join(ROOT, data.plans.samples.cadv01.src)), fileOf = (bytes, name) => ({ name, size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  const first = await planSession.checkFile('T', fileOf(good, 'plan.dwg'));
  assert.equal(planSession.get(first.key).status, 'ready');
  await assert.rejects(planSession.checkFile('T', fileOf(Buffer.from('kein DWG, nur Text'.repeat(20)), 'plan.dwg')));
  assert.equal(planSession.get(first.key), first.entry, 'the readable drawing is still in the session'); assert.equal(planSession.get(first.key).status, 'ready');
  await assert.rejects(planSession.checkFile('T', fileOf(Buffer.from('kein DWG'.repeat(40)), 'anderer.dwg'))); assert.equal(planSession.get('upload:T:anderer.dwg'), null, 'a failed first check leaves no entry');
});

test('design tokens: the form surfaces use tokens only, every token they use exists', () => {
  const FORM_FILES = ['css/form.css', 'css/plan.css', 'css/views-b.css', 'css/views-c.css', 'js/views/form.js', 'js/views/plan.js', 'js/views/s03c.js', 'js/views/s03d.js', 'js/model/form.js', 'js/model/plan.js', 'js/model/import.js'];
  const tokens = readFileSync(join(ROOT, 'css/tokens.css'), 'utf8'), defined = new Set([...tokens.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  for (const f of FORM_FILES) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    assert.deepEqual([...src.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map(m => m[0]).filter(h => h !== '#000'), [], `${f}: a colour literal that should be a token (css/tokens.css)`);
    const used = [...src.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]).filter(v => !/^--(x|y|w|h|n|fid)$/.test(v));
    const missing = [...new Set(used)].filter(v => !defined.has(v) && !new RegExp(`${v}\s*:`).test(src));   // a custom property set in the file itself (--x of the bars) is fine
    assert.deepEqual(missing, [], `${f}: tokens that are not defined`);
  }
});
