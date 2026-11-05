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
const { planLists } = await mod('js/model/plan.js');
const { searchModel } = await mod('js/model/search.js');

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
      else assert.ok(['kvQ', 'kvV', 'ksQ', 'ksV'].includes(k) && [...data.ebkp.ebkp.flatMap(g => g.kids), ...data.ebkp.extra].some(x => x.code === c), `${pid}: missing spec ${spec}`);
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
  assert.equal(kv.total, 19100000); assert.equal(kv.bw, 18000000, 'Erstellungskosten B–W incl. J');
  assert.equal(kv.fields, 27, '11 direct groups (A … Y without D, G) + 2 detailed groups × 4 positions × (Menge + Kosten)');
  assert.equal(kv.missing, 1, 'D08 Menge fehlt'); assert.equal(kv.bar.canSubmit, false);
  assert.deepEqual(kv.badges.erfassung, { n: 1, bg: '#fff1f0', fg: '#9b2c44' });
  const rows = kv.erf.rows;
  assert.equal(rows.filter(r => r.isGroupRow).length, 13); assert.equal(rows.filter(r => r.isPos).length, 8);
  assert.equal(rows.filter(r => r.isAdd).length, 2, '«Kostenelement hinzufügen» under each opened group');
  assert.ok(rows.find(r => r.code === 'D').canToggle && !rows.find(r => r.code === 'D').direct && rows.find(r => r.code === 'V').direct && rows.find(r => r.code === 'V').canToggle);
  assert.equal(rows.find(r => r.code === 'B').bez, "4'200", 'Bezugsmenge GSF from sia416');
  assert.equal(kv.subtotals.find(u => u.code === 'B–W').cur, "18'000'000");
  assert.equal(kv.subtotals.find(u => u.code === 'A–Z').prev, '–', 'no KS-31 for Anlagekosten');
  assert.ok(!kv.erf.foot, 'no footer text (design)');
  // Filling the missing quantity enables the submit button; the filter shows only missing rows.
  const filled = structuredClone(base);
  for (const c of data.ebkp.missingInitially || []) filled.projects.musterhausen.kvQ[c] = 1;
  let v = vmFor(filled);
  assert.equal(v.forms.kv.missing, 0); assert.equal(v.forms.kv.bar.canSubmit, true); assert.equal(v.forms.kv.badges.erfassung, null);
  const only = structuredClone(base); only.projects.musterhausen.forms.kv.missingOnly = true;
  v = vmFor(only);
  assert.deepEqual(v.forms.kv.erf.rows.map(r => r.code), ['D', 'D08']);
  // «Aufschlüsseln» of C adds its four positions (Menge + Kosten) and drops the direct field.
  const det = structuredClone(base); det.projects.musterhausen.forms.kv.modes.C = 'detail';
  v = vmFor(det);
  assert.equal(v.forms.kv.fields, 34); assert.equal(v.forms.kv.erf.rows.filter(r => r.isPos).length, 12);
  assert.equal(v.forms.kv.total, 19100000, 'sum of positions equals the direct amount');
  // A missing direct amount counts as missing.
  const empty = structuredClone(base); empty.projects.musterhausen.forms.kv.gvals.B = '';
  v = vmFor(empty);
  assert.equal(v.forms.kv.missing, 2); assert.match(v.forms.kv.bar.reason, /alle Werte/);
  // Positions can be removed and Kostenelemente added (eBKP-H element groups of the Hauptgruppe not yet in the table).
  const ed = structuredClone(base); ed.projects.musterhausen.kvQ.D08 = 6480;
  ed.projects.musterhausen.forms.kv.removed = { D08: true };
  ed.projects.musterhausen.forms.kv.added = [{ id: 'kn1', grp: 'G', code: '', q: '', v: '' }];
  v = vmFor(ed);
  assert.equal(v.forms.kv.erf.rows.filter(r => r.isPos).length, 7); assert.equal(v.forms.kv.fields, 27 - 2 + 2, 'D08 gone, new row counts code + Kosten (Menge once the element group has a unit)');
  assert.equal(v.forms.kv.missing, 2);
  const nr = v.forms.kv.erf.rows.find(r => r.isNewPos);
  assert.ok(nr && nr.opts.length === 2 && nr.opts.map(o => o.v).join() === 'G05,G06', 'only element groups not yet in G');
  ed.projects.musterhausen.forms.kv.added[0] = { id: 'kn1', grp: 'G', code: 'G05', q: '120', v: '240000' };
  v = vmFor(ed);
  assert.equal(v.forms.kv.missing, 0); assert.equal(v.forms.kv.fields, 28); assert.equal(v.forms.kv.total, 19100000 - 540000 + 240000);
  assert.equal(v.forms.kv.erf.rows.find(r => r.isNewPos).name, 'Einbauten, Schutzeinrichtung zu Ausbau');
  // Opening a group without positions (V Planungskosten) shows only the add row; its amount stays in the value map.
  ed.projects.musterhausen.forms.kv.modes.V = 'detail';
  v = vmFor(ed);
  assert.equal(v.forms.kv.erf.rows.filter(r => r.isAdd).length, 3); assert.equal(v.forms.kv.groups.find(g => g.code === 'V').sum, 2950000, 'the Pauschalbetrag stays in the total');
  assert.ok(v.forms.kv.erf.rows.some(r => r.pauschal && r.code === 'V' && !r.canDel), 'Pauschalbetrag row, not removable');
});

test('KV-32: Übersicht and Prüfung figures', () => {
  const kv = vm.forms.kv;
  assert.equal(kv.kpis[0].v, '18.0'); assert.equal(kv.kpis[1].v, "2'778");
  assert.equal(kv.chart.targets.length, 3); assert.equal(kv.chart.targets[0].val, 'CHF 17.00 Mio'); assert.equal(kv.chart.targets[0].delta, '+5.9 %');
  assert.equal(kv.chart.band, '15.30–18.70 Mio'); assert.ok(kv.chart.hasBand);
  assert.equal(kv.costRows.length, 13); assert.equal(kv.totalRow.prev, "18'090'000");
  const d = kv.cmp.find(c => c.code === 'D');
  assert.equal(d.delta, '+19.0 %'); assert.equal(d.hi, true, 'deviation ≥ 10 % is highlighted');
  assert.equal(kv.cmpT.delta, '+5.6 %');
  assert.equal(kv.autoChecks.find(c => /KS-31/.test(c.label)).ok, false);
  assert.equal(kv.autoChecks.find(c => /Kennwert/.test(c.label)).ok, true);
  assert.equal(kv.rv.canReview, false); assert.equal(kv.rv.reason, 'Erst nach der Einreichung möglich');
  assert.equal(kv.steps.length, 6); assert.equal(kv.steps[1].sub, 'aktuell'); assert.equal(kv.steps[0].sub, '12.03.2027');
  assert.equal(kv.next.btn, 'Erfassung fortsetzen');
  assert.equal(kv.hist.length, 6); assert.equal(kv.hist[0].t, 'Dokument hochgeladen', 'newest first');
  assert.equal(kv.meta.find(m => m.k === 'Lieferverantwortlich').v, 'Gian Muster, Generalplaner Beispiel AG');
});

test('THG-32: Emissionsquellen (Erstellung), Betrieb, Zielwerte SIA 390/1 and the review flow', () => {
  const thg = vm.forms.thg, S = data.thg.sources, EBF = data.sia416.initial.EBF, TH = data.thg;
  const erst = S.reduce((a, s) => a + s.kw, 0);
  assert.equal(thg.status, 'In Bearbeitung'); assert.equal(thg.step, 1); assert.equal(thg.locked, false, 'the demo project keeps its Ökobilanz open');
  assert.equal(thg.nSrc, 22); assert.equal(thg.fields, 44 + TH.betrieb.length * 3 + 2, 'two values per Emissionsquelle, three per Energiedienstleistung, PV yield and self-consumption'); assert.equal(thg.missing, 0);
  assert.ok(Math.abs(thg.total - erst * EBF * 60) < 1, 'Erstellung über 60 Jahre = Σ kw × EBF × 60');
  assert.equal(thg.endwertStr, '8.7', 'THGE Erstellung = Σ kw (kg CO₂-eq/m² EBF·a)');
  assert.equal(thg.kpis[0].k, 'Erstellung'); assert.equal(thg.kpis[0].v, '8.7'); assert.equal(thg.kpis[1].k, 'Betrieb'); assert.equal(thg.kpis[1].v, '0.5', 'Betrieb with Wasserkraft and PV self-consumption');
  assert.equal(thg.subtotals.length, 2); assert.equal(thg.subtotals[1].kw, '9.2'); assert.equal(thg.cmpSubs.length, 0, 'the Prüfung compares the Hauptgruppen only');
  // Zielwerte SIA 390/1: three rows, marks Basis/ambitioniert (Verwaltung: assumed Betrieb values), Minergie-ECO GW1, Vorphase
  assert.equal(thg.chart, null); assert.equal(thg.tz.rows.length, 3); assert.deepEqual(thg.tz.ist, ['8.7', '0.5', '9.2']);
  assert.deepEqual(thg.tz.rows.map(r => r.marks.map(m => m.n).join('')), ['AMVB', 'AB', 'AB']);
  assert.equal(thg.tz.legend.length, 4); assert.deepEqual(thg.tz.legend[0].cells.map(c => c.v), ['9.0', '2.0', '11.0']); assert.equal(thg.tz.legend[0].cells[2].over, false);
  assert.ok(thg.tz.hint.includes('Richtwerte Verwaltung') && thg.tz.hint.includes('Annahme'), 'Betrieb and Zusatzanforderung of Verwaltung are assumptions');
  assert.equal(thg.autoChecks.length, 9); assert.equal(thg.devPct, 15);
  assert.ok(thg.autoChecks.filter(c => !c.info).every(c => c.ok), thg.autoChecks.filter(c => !c.ok).map(c => c.label).join(' | '));
  assert.equal(thg.autoChecks[0].label, 'Alle 22 Emissionsquellen mit Elementgruppe, Referenzgrösse und Kennwert');
  assert.ok(thg.autoChecks[4].label.startsWith('Zusatzanforderung B eingehalten: Erstellung + Betrieb 9.2, Grenze 11.0'));
  assert.ok(thg.autoChecks[5].info && thg.autoChecks[5].label.includes('Erstellung 8.7 zu 9.0, Betrieb 0.5 zu 2.0'));
  assert.ok(thg.autoChecks[7].label.includes('62 kWp') && thg.autoChecks[7].label.includes("55'800 kWh/a"));
  assert.equal(thg.cmp.find(c => c.code === 'D').hi, false, 'Technik deviates 9 % from SIA 31, below the 15 % threshold of the Ökobilanz');
  assert.equal(thg.rv.notSubmitted, true);
  assert.equal(thg.manual.length, 5); assert.equal(thg.docs.length, 3);
  assert.equal(thg.rv.canReview, false); assert.equal(thg.rv.canApprove, false); assert.equal(thg.bar.canSubmit, true, 'complete → Einreichen possible');
  assert.equal(thg.handover.value, 'Erstellung 8.7, Betrieb 0.5 kg CO₂-eq/m² EBF·a');
  // Erfassung Erstellung rows: C and E opened, derived rows, Grundlagen split between Übersicht, Erstellung and Betrieb
  const E = thg.erf;
  assert.ok(E.isTHG && E.rows.filter(r => r.isGroupRow).length === 6 && E.rows.filter(r => r.isSrc).length === 9 && E.rows.filter(r => r.isAdd).length === 2, 'open groups C and E get «Emissionsquelle hinzufügen»');
  assert.equal(E.rows.find(r => r.isGroupRow && r.code === 'C').kw, '3.5'); assert.equal(E.rows.find(r => r.isGroupRow && r.code === 'C').share, '41 %');
  assert.equal(E.rows.find(r => r.id === 'C04.01-1').dataset, 'Gd01 Geschossdecke Beton 28 cm, zirkulit® NPK A · Bauteil Lesosai · herstellerspezifisch'); assert.equal(E.rows.find(r => r.id === 'C04.01-1').share, '16 %');
  assert.equal(E.head.length, 5); assert.ok(E.head.every(h => !h.ro) && E.head.find(h => h.key === 'gw1').isText, 'Erstellung: Systemgrenze, Ökobilanzdaten, Tool, Minergie-ECO GW1 (text), Datenqualität');
  assert.equal(thg.headShared.length, 5); assert.equal(thg.headShared.find(h => h.key === 'EBF').val, "5'600 m²"); assert.ok(thg.headShared.filter(h => h.ro).length === 2 && thg.headShared.find(h => h.key === 'stand').isText, 'only EBF and GF read-only');
  assert.equal(E.derived[0].kw, '8.7'); assert.equal(E.derived[0].v, '48.6'); assert.equal(E.tot.kw, '8.7'); assert.equal(E.tot.share, '100 %');
  // Erfassung Betrieb: Energiedienstleistungen with Standardwert flag, PV rows, totals
  const Bt = thg.betr;
  assert.equal(Bt.head.length, 3); assert.equal(Bt.rows.filter(r => r.isRow).length, 9); assert.equal(Bt.rows.filter(r => r.isPv).length, 2);
  assert.equal(Bt.rows[0].end, '5.5'); assert.equal(Bt.rows[0].kE, '0.012'); assert.equal(Bt.rows[2].kE, '0.049'); assert.equal(Bt.rows[1].std, true);
  assert.equal(Bt.end, '34.5'); assert.equal(Bt.thg, '0.52'); assert.equal(Bt.subs[1].v, '9.2'); assert.ok(Bt.pv[0].val.startsWith('62 kWp'));
  assert.equal(vm.ilpRows.find(r => r.code === 'THG-32').status, 'In Bearbeitung');
  assert.equal(vm.auRows.find(t => t.delivery === 'THG-32').status, 'In Bearbeitung');
  const st = structuredClone(base);
  st.projects.musterhausen.forms.thg.step = 4; st.projects.musterhausen.forms.thg.dates = ['12.03.2027', '15.03.2027', null, '03.05.2027', '04.05.2027'];
  let v0 = vmFor(st); assert.equal(v0.forms.thg.status, 'In Prüfung'); assert.equal(v0.forms.thg.locked, true); assert.equal(v0.forms.thg.rv.canReview, true); assert.equal(v0.forms.thg.erf.rows.filter(r => r.isAdd).length, 0, 'locked: no add rows');
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
  assert.equal(v.forms.thg.erf.rows.filter(r => r.isAdd).length, 2, 'open groups get «Emissionsquelle hinzufügen»');
  // A missing value blocks the submission (badge per tab); without any Emissionsquelle the form cannot be submitted.
  st.projects.musterhausen.forms.thg.rejected = false; st.projects.musterhausen.thgSrc[0].kw = ''; st.projects.musterhausen.thgBetr.b3_eta = '';
  v = vmFor(st);
  assert.equal(v.forms.thg.missing, 2); assert.equal(v.forms.thg.bar.canSubmit, false); assert.equal(v.forms.thg.badges.erfassung.n, 1); assert.equal(v.forms.thg.badges.betrieb.n, 1);
  assert.equal(v.forms.thg.betr.rows[3].end, '–');
  st.projects.musterhausen.forms.thg.missingOnly = true;
  v = vmFor(st);
  assert.deepEqual(v.forms.thg.erf.rows.map(r => r.code), ['B', 'B06.01'], 'filter shows the group and the row with the missing value');
  assert.deepEqual(v.forms.thg.betr.rows.map(r => r.name), ['Raumkälte'], 'Betrieb filter shows the row with the missing value');
  st.projects.musterhausen.forms.thg.missingOnly = false; st.projects.musterhausen.thgBetr.b3_eta = 5; st.projects.musterhausen.thgSrc = [];
  v = vmFor(st);
  assert.equal(v.forms.thg.nSrc, 0); assert.equal(v.forms.thg.missE, 0); assert.equal(v.forms.thg.bar.canSubmit, false); assert.equal(v.forms.thg.bar.reason, 'Einreichen erst, wenn Emissionsquellen erfasst sind');
  assert.equal(v.forms.thg.kpis[0].v, '–'); assert.equal(v.forms.thg.next.btn, 'Erfassung öffnen'); assert.equal(v.forms.thg.tz.rows[0].ist, '–'); assert.equal(v.forms.thg.autoChecks[7].ok, false, 'no PV source in the Erstellung');
  // A new Emissionsquelle needs element group, Bauteil, Referenzgrösse and Kennwert; the unit comes from the element group.
  st.projects.musterhausen.thgSrc = [{ id: 'n1', grp: 'D', isNew: true, code: '', tcode: '', name: '', quelle: '', unit: '', q: '', kw: '', hs: false }];
  v = vmFor(st);
  assert.equal(v.forms.thg.missE, 4); assert.equal(v.forms.thg.badges.erfassung.n, 4);
  st.projects.musterhausen.thgSrc = [{ id: 'n1', grp: 'D', isNew: true, code: 'D01', tcode: '', name: 'Elektroanlage', quelle: 'KBOB 34.002', unit: 'm² EBF', q: 5600, kw: 1.2, hs: false }];   // as thgVal stores it
  st.projects.musterhausen.forms.thg.modes.D = 'detail';
  v = vmFor(st);
  assert.equal(v.forms.thg.missing, 0); assert.equal(v.forms.thg.endwertStr, '1.2'); assert.equal(v.forms.thg.erf.rows.find(r => r.isNew).share, '100 %');
  st.projects.musterhausen.thgHead.kbob = 'KBOB/ecobau-Liste 2022, Version 8.02';
  v = vmFor(st);
  assert.equal(v.forms.thg.autoChecks[2].ok, false, 'other KBOB list version is flagged');
  // Betrieb: the Stromprodukt changes the coefficient, the surplus rule credits the export; a category without Richtwerte asks for a Vergleichskategorie
  st.projects.musterhausen.thgSrc = structuredClone(base.projects.musterhausen.thgSrc); st.projects.musterhausen.thgHead = { ...base.projects.musterhausen.thgHead, strom: 'CH-Verbrauchermix', pvRule: 'Gutschrift CH-Verbrauchermix' };
  v = vmFor(st);
  assert.equal(v.forms.thg.betr.rows[0].kE, '0.125'); assert.equal(v.forms.thg.betr.rows[10].kE, '0.125'); assert.ok(v.forms.thg.betr.rows[10].thg.startsWith('−'), 'PV export credited');
  st.projects.musterhausen.thgHead = { ...base.projects.musterhausen.thgHead, kat: 'Sonstige' };
  v = vmFor(st);
  assert.equal(v.forms.thg.autoChecks[4].ok, false); assert.ok(v.forms.thg.autoChecks[4].label.includes('Vergleichskategorie')); assert.deepEqual(v.forms.thg.tz.rows[1].marks, []); assert.equal(v.forms.thg.tz.legend[0].cells[1].v, '–');
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
      if (F.step === 0) assert.equal(F.missing, F.fields, `${p.id}/${kind}: Offen has no values`);
      if (F.step === 1 && !inst[kind].missing && !p.detailed) assert.equal(F.missing, 0, `${p.id}/${kind}: complete unless values are marked missing`);
      if (F.step >= 1) assert.ok(F.docs.length >= 1, `${p.id}/${kind}: documents`);
      assert.ok((kind === 'thg' ? F.tz.rows.length === 3 && F.tz.legend.length === 4 : F.chart.targets.length === 3) && F.costRows.length >= 6, `${p.id}/${kind}: Übersicht`);
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
  assert.equal(agro.forms.thg.erf.head.find(h => h.key === 'tool').val, 'Lesosai'); assert.equal(agro.forms.thg.autoChecks[4].ok, true, 'Restaurant: 11.4 + Betrieb is below the Zusatzanforderung 16'); assert.ok(agro.forms.thg.autoChecks[5].label.includes('Erstellung 11.4 zu 9.0') && agro.forms.thg.tz.hint.includes('Richtwerte Restaurant') && !agro.forms.thg.tz.hint.includes('Annahme'));
  assert.equal(vm.pfRows.find(r => r.project === 'agroscope-posieux').ew, '11.4'); assert.equal(vm.pfRows.find(r => r.project === 'eigerplatz').status, 'Überfällig'); assert.equal(vm.pfRows.find(r => r.project === 'zollikofen').status, 'Nicht bestellt');
  assert.equal(vmFor(base, data.projects.projects.find(p => p.id === 'prangins')).formByCode('kv-32'), null, 'no KV-32 in Prangins');
  assert.equal(vm.forms.ks.status, 'Abgeschlossen'); assert.equal(vm.forms.ks.cmpPrevLabel, 'SIA 21');
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
  const formGroups = [...data.ebkp.ebkp, ...data.ebkp.extra].map(g => g.code);
  for (const g of formGroups) assert.ok(el[g] && el[g].length, `dropdown of ${g} has options`);
  assert.ok(formGroups.includes('A') && formGroups.includes('H'), 'A Grundstück and H Nutzungsspezifische Anlage are Hauptgruppen of the form');
  assert.equal(data.ebkp.extra.find(g => g.code === 'W').name, 'Nebenkosten zu Erstellung');
  assert.equal(data.ebkp.elements.W.find(x => x[0] === 'W04')[1], 'Bewirtung, Öffentlichkeitsarbeit, Entschädigung');
  const kv = vm.forms.kv;
  assert.deepEqual(kv.groups.map(g => g.code), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'V', 'W', 'Y'], 'cost form groups A … Y in the order of the norm');
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
  assert.equal(data.thg.eg.D.find(x => x[0] === 'D12.01')[2], 'Stk.'); assert.equal(data.thg.eg.C.find(x => x[0] === 'C04.08')[3], 40);
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
  assert.equal(eg.steps.length, 6); assert.equal(eg.planOv.cats.length, 10); assert.equal(eg.planOv.sia.length, 9, 'SIA 416 areas plus EBF (SIA 416/1)');
  assert.equal(eg.comp.pct, '27 / 40'); assert.equal(eg.res.title, '3 Fehler'); assert.ok(eg.reviewIssues.length >= 10);
  assert.equal(eg.planOv.cats[0].ratio, '0/8', 'all Layer rules fail for the office layer structure');
  assert.equal(eg.badges.erfassung.n, 3); assert.equal(eg.rv.notSubmitted, true); assert.match(eg.bar.reason, /keine Fehler/);
  assert.equal(ug.status, 'Abgeschlossen'); assert.equal(ug.step, 6); assert.equal(ug.kpis[0].v, '30'); assert.equal(ug.kpis[1].v, '572.3');
  assert.ok(ug.steps.slice(0, 5).every(s => s.sym === '✓')); assert.equal(ug.docs[0].name, '9999.AA.U1_CAFM.dwg'); assert.equal(ug.docs[0].req, 'Pflicht');
  assert.ok(ug.hist.some(h => h.t === 'An SAP RE-FX übertragen') && ug.hist[0].t === 'An SAP RE-FX übertragen', 'newest first');
  assert.equal(dg.comp.pct, '–'); assert.equal(dg.res.title, 'Kein Prüfergebnis'); assert.equal(dg.peopleRows[0].scope, 'Grundriss DG (DWG)');
});

test('plans: status filter and search of the sub-tab lists (planLists, as in plan-check)', () => {
  const eg = vm.plans.EG;   // office seed: 3 errors + 43 warnings in 13 rules, 32 layers (30 unknown), no rooms
  const all = planLists(eg, { planFilter: 'all', planSearch: '' });
  assert.equal(all.rules.failed.length + all.rules.passed.length, 40); assert.equal(all.issues.length, 46); assert.equal(all.layers.length, 32);
  assert.deepEqual([all.counts.rules, all.counts.issues, all.counts.layers, all.counts.rooms], ['13 offen', '46', '32', '0']);
  assert.equal(all.issues[0].it.severity, 'error', 'errors first');
  const errRules = [...eg.rules.failed, ...eg.rules.passed].filter(r => r.severity === 'error').length;
  const err = planLists(eg, { planFilter: 'errors' });
  assert.ok(err.rules.failed.length >= 1 && err.rules.failed.every(r => r.severity === 'error')); assert.equal(err.rules.passed.length, 0, 'passed rules only without filter');
  assert.equal(err.rules.total, errRules); assert.equal(err.issues.length, 3); assert.ok(err.issues.every(x => x.it.severity === 'error'));
  assert.equal(err.layers.length, 0, 'layers never carry errors'); assert.equal(err.counts.issues, '3');
  const warn = planLists(eg, { planFilter: 'warnings' });
  assert.equal(warn.layers.length, 30, 'unknown layers are the warnings of the Layer tab'); assert.equal(warn.issues.length, 43); assert.ok(warn.rules.failed.every(r => r.severity === 'warning'));
  const q = planLists(eg, { planFilter: 'all', planSearch: 'layer_00' });
  const qRules = [...q.rules.failed, ...q.rules.passed];
  assert.equal(qRules.length, 8); assert.ok(qRules.every(r => r.code.startsWith('LAYER_00')));
  assert.equal(q.counts.rules, all.counts.rules, 'tab counts follow the filter, not the search');
  assert.ok(planLists(eg, { planSearch: 'Pflicht-Layer' }).rules.failed.length >= 1, 'search matches the rule text');
  const ln = eg.result.layers[3].name; assert.ok(planLists(eg, { planSearch: ln.toLowerCase() }).layers.some(l => l.name === ln), 'layer search is case-insensitive');
  const ug = vm.plans.UG;   // Musterplan: 30 rooms (ok), 1 floor area «UV», 3 warnings
  const rooms = planLists(ug, { planSearch: '05.00' });
  assert.ok(rooms.rooms.length > 0 && rooms.rooms.length < 30 && rooms.rooms.every(r => r.aoid.includes('05.00')));
  assert.equal(planLists(ug, { planFilter: 'errors' }).rooms.length, 0); assert.equal(planLists(ug, { planFilter: 'errors' }).counts.rooms, '0');
  assert.equal(planLists(ug, { planFilter: 'all' }).areas.length, 1); assert.equal(planLists(ug, { planSearch: 'brutto' }).areas.length, 1, 'the floor area matches «Bruttogeschossfläche» too');
  assert.equal(planLists(ug, { planFilter: 'warnings' }).rules.failed.length, 2); assert.equal(planLists(ug, { planFilter: 'warnings' }).rules.total, 40 - errRules);
  const dg = vm.plans.DG;   // no result yet
  assert.deepEqual(planLists(dg, {}).counts, { rules: 'alle', issues: '0', rooms: '0', areas: '0', layers: '0', kpi: '' });
});

test('plans: submit gate (no errors), locking and review flow', () => {
  const eg = vm.plans.EG, ug = vm.plans.UG, og2 = vm.plans.OG2, dg = vm.plans.DG;
  assert.equal(eg.errors, 3, 'EG seed (office layer structure) has 3 errors');
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
  }
});
