// Unit tests of the user actions (js/actions.js) against the real store (sessionStorage is absent under Node, so the
// store simply does not persist), plus the formatters and the dotted-path patching of the store:
//   node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = p => import(pathToFileURL(join(ROOT, p)).href);
const FILES = ['project', 'projects', 'users', 'notifications', 'navigation', 'ilp', 'tasks', 'templates', 'ebkp', 'sia416', 'portfolio', 'screens', 'study', 'documents', 'loin', 'plans', 'forms', 'thg'];
const data = Object.fromEntries(FILES.map(f => [f, JSON.parse(readFileSync(join(ROOT, 'data', f + '.json'), 'utf8'))]));
data.project = { ...data.project, ...data.projects.projects.find(p => p.detailed) };

const { initialState, STATE_VERSION } = await mod('js/model/state.js');
const { createStore, patchDotted } = await mod('js/store.js');
const { makeActions } = await mod('js/actions.js');
const { formModel, LOCKED_FROM } = await mod('js/model/form.js');
const { mockProject, groupAmount, mergeToolExport, mergeBetr, thgErst } = await mod('js/model/mock.js');
const { FMT, FMT1, FMT2, num, disp, disp1, mio } = await mod('js/format.js');
const searchMod = await mod('js/model/search.js');
const { planModel, planLists } = await mod('js/model/plan.js');
const { planForm } = await mod('js/model/form.js');

/** A fresh store + actions acting on project `pid`; `nav` records navigations. */
function setup(pid = 'musterhausen') {
  const store = createStore(initialState(data));
  const nav = { navigate: p => nav.last = p, studyPid: () => 'musterhausen', currentPid: () => setup.pid, last: null };
  setup.pid = pid;
  const actions = makeActions(store, data, nav);
  const P = () => store.get().projects[setup.pid];
  const F = kind => formModel(store.get(), data, data.projects.projects.find(p => p.id === setup.pid), data.users.users.find(u => u.key === store.get().user))[kind];   // as the app: the signed-in user decides who may review
  const el = value => ({ value });
  return { store, actions, nav, P, F, el, toast: () => (store.get().ui.toast || {}).text || '' };
}
const eventTitles = f => f.events.map(e => e[3]);

test('actions: topbar search (type, move, open, clear)', () => {
  const { actions, nav, store, el } = setup();
  const ui = () => store.get().ui;
  actions.searchType({}, el('eiger')); assert.equal(ui().search, 'eiger'); assert.equal(ui().searchOpen, true); assert.equal(ui().searchIdx, -1);
  actions.searchMove({ dir: 1 }); assert.equal(ui().searchIdx, 0);
  actions.searchMove({ dir: -1 }); assert.ok(ui().searchIdx >= 0, 'wraps around');
  actions.searchGo(); assert.equal(nav.last, '/projects/eigerplatz/overview'); assert.equal(ui().search, ''); assert.equal(ui().searchOpen, false);
  actions.searchType({}, el('xyzxyz')); actions.searchGo(); assert.equal(nav.last, '/projects/eigerplatz/overview', 'no hit: stays'); assert.equal(ui().searchOpen, true);
  actions.searchClear(); assert.equal(ui().search, ''); assert.equal(ui().searchOpen, false);
  actions.searchType({}, el('kv')); actions.closeMenus(); assert.equal(ui().searchOpen, false, 'closeMenus closes the suggestions');
});

test('actions: THG Emissionsquelle input splits tool code, Bezeichnung and Ökobilanzdaten; a code change keeps the Bauteil of an existing row', () => {
  const { actions, P, el } = setup('eigerplatz');
  const id = P().thgSrc[0].id;
  actions.thgVal({ id, field: 'dataset' }, el('Ba02 Bodenplatte neu · Bauteil Lesosai'));
  assert.deepEqual([P().thgSrc[0].tcode, P().thgSrc[0].name, P().thgSrc[0].quelle], ['Ba02', 'Bodenplatte neu', 'Bauteil Lesosai']);
  actions.thgVal({ id, field: 'dataset' }, el('Recyclingbeton'));
  assert.deepEqual([P().thgSrc[0].tcode, P().thgSrc[0].name, P().thgSrc[0].quelle], ['', 'Recyclingbeton', 'Bauteil Lesosai'], 'without Ökobilanzdaten the existing ones stay');
  actions.thgVal({ id, field: 'dataset' }, el('Recyclingbeton · KBOB 01.004'));
  assert.equal(P().thgSrc[0].quelle, 'KBOB 01.004');
  actions.thgVal({ id, field: 'code' }, el('C02.02'));
  assert.equal(P().thgSrc[0].code, 'C02.02'); assert.equal(P().thgSrc[0].name, 'Recyclingbeton', 'existing row keeps its Bauteil'); assert.equal(P().thgSrc[0].unit, 'm²');
});

test('actions: Hauptgruppen toggle and sums (KV-32)', () => {
  const { actions, P, F, store } = setup();
  // every Hauptgruppe is broken down by default; «Zusammenfassen» keeps the sum as the group amount, «Aufschlüsseln» shows the positions again
  assert.ok(Object.values(P().forms.kv.modes).every(m => m === 'detail'));
  actions.formMode({ form: 'kv', group: 'C' });
  const sum = data.ebkp.ebkp.find(g => g.code === 'C').kids.reduce((a, k) => a + num(P().kvV[k.code]), 0);
  assert.equal(P().forms.kv.modes.C, 'direct'); assert.equal(P().forms.kv.gvals.C, sum, 'Zusammenfassen keeps the sum as the group amount');
  actions.formMode({ form: 'kv', group: 'C' });
  assert.equal(P().forms.kv.modes.C, 'detail');
  // A group whose positions are all empty closes with an empty amount, not 0.
  actions.setMap({ key: 'kvQ', code: 'D01' }, { value: '' });
  ['D01', 'D05', 'D07', 'D08'].forEach(c => actions.setMap({ key: 'kvV', code: c }, { value: '' }));
  actions.formMode({ form: 'kv', group: 'D' });
  assert.equal(P().forms.kv.gvals.D, ''); assert.ok(F('kv').missing >= 1);
  // A Hauptgruppe without any element (H) closes with 0, not with a gap.
  actions.formMode({ form: 'kv', group: 'H' });
  assert.equal(P().forms.kv.gvals.H, 0); assert.equal(F('kv').groups.find(g => g.code === 'H').sum, 0);
  actions.formMode({ form: 'kv', group: 'H' });
  // V Planungskosten adds up its elements; a Kostenelement added counts and stays when the group is closed.
  const v0 = F('kv').groups.find(g => g.code === 'V').sum;
  assert.equal(v0, num(P().kvV.V01) + num(P().kvV.V03));
  actions.formAddPos({ form: 'kv', group: 'V' });
  const id = P().forms.kv.added[0].id;
  actions.formNewVal({ form: 'kv', id, field: 'code' }, { value: 'V02' });
  actions.formNewVal({ form: 'kv', id, field: 'v' }, { value: '100000' });
  assert.equal(F('kv').groups.find(g => g.code === 'V').sum, v0 + 100000);
  actions.formMode({ form: 'kv', group: 'V' });
  assert.equal(P().forms.kv.gvals.V, v0 + 100000); assert.equal(P().forms.kv.added.length, 1); assert.equal(F('kv').groups.find(g => g.code === 'V').sum, v0 + 100000);
  // Einheit and Kennwert of a Kostenelement: own values, cleared again; nothing on a locked form
  actions.formUnit({ form: 'kv', code: 'V01' }, { value: 'm²' });
  actions.formKw({ form: 'kv', code: 'C01' }, { value: "1'250" });
  assert.equal(P().forms.kv.units.V01, 'm²'); assert.equal(P().forms.kv.kws.C01, 1250); assert.equal(F('kv').erf.rows.find(r => r.code === 'C01').kw, "1'250");
  actions.formKw({ form: 'kv', code: 'C01' }, { value: '' });
  assert.ok(!F('kv').erf.rows.find(r => r.code === 'C01').kwOwn, 'cleared: derived again');
  actions.formUnit({ form: 'ks', code: 'C01' }, { value: 'pauschal' }); actions.formKw({ form: 'ks', code: 'C01' }, { value: '9' });
  assert.deepEqual([P().forms.ks.units, P().forms.ks.kws], [{}, {}], 'KS-31 is Abgeschlossen: no change');
  // THG: formMode only opens and closes the group (all open by default); a form in review ignores the toggle, reopening restores it
  assert.deepEqual(Object.values(P().forms.thg.modes), ['detail', 'detail', 'detail', 'detail', 'detail', 'detail']);
  store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, thg: { ...P().forms.thg, step: 4 } } } });
  actions.formMode({ form: 'thg', group: 'C' });
  assert.equal(P().forms.thg.modes.C, 'detail', 'locked form: no toggle');
  actions.formReopen({ key: 'thg' });
  actions.formMode({ form: 'thg', group: 'C' });
  assert.equal(P().forms.thg.modes.C, 'direct');
  actions.formMode({ form: 'thg', group: 'C' });
  assert.equal(P().forms.thg.modes.C, 'detail');
});

test('actions: Kostenelemente add, edit, remove; nothing on a locked form', () => {
  const { actions, P, F, store } = setup();
  actions.formAddPos({ form: 'kv', group: 'G' });
  assert.deepEqual(P().forms.kv.added, [{ id: 'kn1', grp: 'G', code: '', q: '', v: '' }]);
  actions.formNewVal({ form: 'kv', id: 'kn1', field: 'code' }, { value: 'G05' });
  actions.formNewVal({ form: 'kv', id: 'kn1', field: 'q' }, { value: '120' });
  assert.equal(P().forms.kv.added[0].code, 'G05'); assert.equal(P().forms.kv.added[0].q, 120);
  // the code of a base position is a dropdown too: another element group replaces the position, values stay
  actions.formPosCode({ form: 'kv', code: 'G02', group: 'G' }, { value: 'G06' });
  assert.equal(P().forms.kv.removed.G02, true); assert.ok(P().forms.kv.added.some(a => a.code === 'G06' && a.v === P().kvV.G02));
  assert.ok(F('kv').erf.rows.find(r => r.isPos && r.code === 'G01').opts.some(o => o.v === 'G02'), 'the freed code is offered again'); assert.equal(F('kv').erf.rows.find(r => r.isNewPos).name, 'Einbauten, Schutzeinrichtung zu Ausbau');
  actions.formRemovePos({ form: 'kv', code: 'G03' });
  assert.equal(P().forms.kv.removed.G03, true); assert.ok(eventTitles(P().forms.kv).includes('Kostenelement entfernt'));
  actions.formRemovePos({ form: 'kv', code: 'XX' });
  assert.equal(Object.keys(P().forms.kv.removed).length, 2, 'unknown code ignored (G02 recoded, G03 removed)');
  actions.formDropNew({ form: 'kv', id: 'kn1' });
  assert.equal(P().forms.kv.added.length, 1, 'only the recoded G06 row stays');
  store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, kv: { ...P().forms.kv, step: LOCKED_FROM } } } });
  const before = JSON.stringify(P());
  actions.formAddPos({ form: 'kv', group: 'G' }); actions.formRemovePos({ form: 'kv', code: 'G01' }); actions.formMode({ form: 'kv', group: 'B' });
  assert.equal(JSON.stringify(P()), before, 'locked form: add, remove and toggle are no-ops');
});

test('actions: Emissionsquellen (THG-32) add, edit, flag, remove, Grundlagen; locked after submission', () => {
  const { actions, P, F, store } = setup('eigerplatz');
  actions.thgAdd({ group: 'C' });
  const n1 = P().thgSrc.find(s => s.isNew);
  assert.ok(n1 && n1.id === 'n1' && n1.grp === 'C'); assert.equal(P().forms.thg.nNew, 1);
  actions.thgVal({ id: 'n1', field: 'code' }, { value: 'C03' });
  assert.deepEqual([n1.code, P().thgSrc.find(s => s.id === 'n1').name, P().thgSrc.find(s => s.id === 'n1').unit], ['', 'Stützenkonstruktion', 'm']);
  actions.thgVal({ id: 'n1', field: 'kw' }, { value: '0,127' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').kw, 0.13, 'typed numbers are stored as numbers, two decimals for the Kennwert');
  actions.thgVal({ id: 'n1', field: 'q' }, { value: "1'234.6" });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').q, 1235);
  actions.thgVal({ id: 'n1', field: 'q' }, { value: 'abc' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').q, 'abc', 'unparsable text stays as typed (and counts as missing)');
  actions.thgToggleHs({ id: 'n1' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').hs, true);
  actions.thgRemove({ id: 'C02.02-2' });
  assert.ok(!P().thgSrc.some(s => s.id === 'C02.02-2')); assert.ok(eventTitles(P().forms.thg).includes('Emissionsquelle entfernt'));
  actions.thgBetr({ key: 'b0_n' }, { value: '24,5' }); actions.thgBetrFlag({ key: 'b0_proj' });
  assert.equal(P().thgBetr.b0_n, 24.5); assert.equal(P().thgBetr.b0_proj, false, 'Raumwärme is a project value by default; the flag toggles'); assert.equal(F('thg').betr.rows[0].end, '6.1', 'Betrieb values are live: 24.5 / 4');
  actions.thgRemove({ id: 'n1' });
  assert.ok(!P().thgSrc.some(s => s.id === 'n1')); assert.equal(eventTitles(P().forms.thg).filter(t => t === 'Emissionsquelle entfernt').length, 1, 'dropping a new row is no event');
  actions.thgHead({ key: 'tool' }, { value: 'Lesosai' });
  assert.equal(P().thgHead.tool, 'Lesosai'); assert.equal(F('thg').erf.head.find(h => h.key === 'tool').val, 'Lesosai');
  store.setIn('projects', { eigerplatz: { ...P(), forms: { ...P().forms, thg: { ...P().forms.thg, step: 4 } } } });
  const before = JSON.stringify(P());
  actions.thgAdd({ group: 'C' }); actions.thgRemove({ id: 'C01.03-1' }); actions.thgToggleHs({ id: 'C01.03-1' }); actions.thgBetr({ key: 'b0_n' }, { value: '1' }); actions.thgBetrFlag({ key: 'b1_proj' });
  assert.equal(JSON.stringify(P()), before, 'locked: no changes');
});

test('actions: Importieren (Tool-Export, Excel, others)', () => {
  const { actions, P, F, store, toast } = setup('eigerplatz');
  assert.equal(F('thg').missing, 3);
  actions.importItem({ arg: 'tool', form: 'thg' });
  assert.equal(F('thg').missing, 0); assert.match(toast(), /3 Werte ergänzt/); assert.ok(eventTitles(P().forms.thg).includes('Tool-Export importiert'));
  actions.importItem({ arg: 'tool', form: 'thg' });
  assert.match(toast(), /keine neuen Werte/);
  actions.importItem({ arg: 'ifc', form: 'thg' });
  assert.match(toast(), /ohne Funktion/);
  // an open THG-32 gets all sources
  setup.pid = 'botschaft-wien';
  assert.equal(P().thgSrc.length, 0);
  actions.importItem({ arg: 'tool', form: 'thg' });
  assert.equal(P().thgSrc.length, data.thg.sources.length); assert.match(toast(), /22 Emissionsquellen übernommen/);
  assert.equal(F('thg').missing, 29, 'the Betrieb of an open form is still empty'); assert.equal(F('thg').next.tab, 'betrieb');
  actions.importItem({ arg: 'rechenhilfe', form: 'thg' });
  assert.equal(F('thg').missing, 0); assert.match(toast(), /29 Werte übernommen/); assert.ok(eventTitles(P().forms.thg).includes('Rechenhilfe SIA 390/1 importiert')); assert.equal(F('thg').bar.canSubmit, true);
  assert.equal(F('thg').docs.length, 2, 'Tool-Export and Rechenhilfe appear under Dokumente'); assert.ok(F('thg').summ[0].tip.includes('Oekobilanz_Bericht') && F('thg').summ[0].val === 'Alle Werte erfasst · 1 Pflichtdokument fehlt' && !F('thg').summ[0].ok, 'the report is still missing');
  actions.importItem({ arg: 'rechenhilfe', form: 'thg' });
  assert.match(toast(), /keine neuen Werte/);
  // Excel: form-aware dialog; locked forms refuse every import
  setup.pid = 'musterhausen';
  actions.importItem({ arg: 'excel', form: 'ks' });
  assert.equal(store.get().ui.dialog, null, 'KS-31 of Musterhausen is Abgeschlossen → locked'); assert.match(toast(), /gesperrt/);
  actions.importItem({ arg: 'excel', form: 'kv' });
  assert.equal(store.get().ui.dialog, 'import'); assert.equal(store.get().imp.form, 'kv');
  actions.impApply();
  assert.equal(num(P().kvV.C02), data.ebkp.import.changes.C02); assert.equal(P().forms.kv.modes.C, 'detail'); assert.equal(store.get().imp.done, true);
  actions.impReset();
  assert.equal(num(P().kvV.C02), mockProject(data.projects.projects.find(p => p.id === 'musterhausen'), data).kvV.C02);
  setup.pid = 'agroscope-posieux';
  const before = JSON.stringify(P());
  actions.importItem({ arg: 'tool', form: 'thg' }); actions.importItem({ arg: 'excel', form: 'kv' });
  assert.equal(JSON.stringify(P()), before); assert.match(toast(), /gesperrt/);
});

test('actions: workflow transitions (submit, review, reject, approve, transfer, reset)', () => {
  const { actions, P, F, store, nav } = setup();
  actions.formSubmit({ key: 'kv' });
  assert.equal(P().forms.kv.step, 1, 'not submittable while D08 is missing');
  actions.setMap({ key: 'kvQ', code: 'D08' }, { value: '6480' });
  actions.formSubmit({ key: 'kv' });
  assert.equal(P().forms.kv.step, 3); assert.equal(P().forms.kv.dates[3], 'heute'); assert.ok(P().forms.kv.dates[2] == null, 'the unused step 2 gets no date');
  assert.ok(eventTitles(P().forms.kv).includes('Zur Prüfung eingereicht')); assert.equal(F('kv').locked, true); assert.equal(F('kv').rv.notSubmitted, false);
  assert.equal(F('kv').hist.filter(h => h.t === 'Zur Prüfung eingereicht').length, 1, 'no duplicate from the generated history');
  actions.formToggleCheck({ arg: 'kv', key: 'k1' });
  assert.equal(P().forms.kv.step, 4); assert.equal(P().forms.kv.dates[4], 'heute'); assert.equal(P().forms.kv.checks.k1, true);
  actions.formApprove({ key: 'kv' });
  assert.equal(P().forms.kv.step, 4, 'approve needs every manual check');
  actions.formComment({ key: 'kv' }, { value: 'Bitte D begründen' });
  assert.equal(F('kv').rv.comment, 'Bitte D begründen');
  actions.formReject({ key: 'kv' });
  assert.equal(P().forms.kv.step, 1); assert.equal(P().forms.kv.rejected, true); assert.deepEqual(P().forms.kv.checks, {}); assert.equal(F('kv').status, 'Zurückgewiesen');
  actions.formSubmit({ key: 'kv' }); actions.formToggleCheck({ arg: 'kv', key: 'k1' }); actions.formToggleCheck({ arg: 'kv', key: 'k2' });
  actions.formTransfer({ key: 'kv' });
  assert.equal(P().forms.kv.step, 4, 'transfer only after approval');
  actions.formApprove({ key: 'kv' });
  assert.equal(P().forms.kv.step, 5); assert.equal(F('kv').canTransfer, true);
  actions.formTransfer({ key: 'kv' });
  assert.equal(P().forms.kv.step, 6); assert.equal(F('kv').status, 'Abgeschlossen'); assert.equal(P().forms.kv.events.at(-1)[2], 'SYS');
  actions.formReopen({ key: 'kv' });
  assert.equal(P().forms.kv.step, 1); assert.equal(P().forms.kv.rejected, false);
  actions.formReopen({ key: 'kv' });
  assert.equal(eventTitles(P().forms.kv).filter(t => t === 'Erfassung wieder geöffnet').length, 1, 'reopen only when locked');
  // THG reset restores the mock sources and head
  setup.pid = 'musterhausen';
  actions.thgHead({ key: 'tool' }, { value: 'GREG' }); store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, thg: { ...P().forms.thg, step: 1 } } } });
  actions.thgRemove({ id: 'C01.03-1' }); actions.thgBetr({ key: 'pv_y' }, { value: '1' });
  actions.formResetReview({ key: 'thg' });
  assert.equal(P().thgSrc.length, data.thg.sources.length); assert.equal(P().thgHead.tool, data.forms.byProject.musterhausen.thg.head.tool); assert.equal(P().thgBetr.pv_y, data.thg.pv.y); assert.equal(P().forms.thg.step, 1, 'reset restores the instance step of the data (In Bearbeitung for the demo project)');
  // study screen: persona + patch + navigation
  actions.studyGo({ study: 's05' });
  assert.equal(store.get().user, 'PM'); assert.equal(nav.last, '/projects/musterhausen/deliveries/thg-32/pruefung');
  actions.studyGo({ study: 's02' });
  assert.equal(store.get().ui.dialog, 'order');
});

test('actions: plan review follows the plan model gates', () => {
  const { actions, store } = setup();
  const plans = () => store.get().plans;
  actions.planApprove({ key: 'OG2' });
  assert.equal(plans().OG2.status, 'pruefung', 'not approvable without the checks');
  actions.planToggleCheck({ arg: 'OG2', key: 'c1' }); actions.planToggleCheck({ arg: 'OG2', key: 'c2' });
  actions.planComment({ key: 'OG2' }, { value: 'Layer prüfen' });
  assert.equal(plans().OG2.comment, 'Layer prüfen', 'the reviewer comments while the plan is in review');
  actions.planApprove({ key: 'OG2' });
  assert.equal(plans().OG2.status, 'freigegeben');
  actions.planTransfer({ key: 'OG2' });
  assert.equal(plans().OG2.status, 'uebertragen');
  actions.planSubmit({ key: 'EG' });
  assert.equal(plans().EG.status, 'bearbeitung', 'EG has errors → not submittable');
  actions.planComment({ key: 'EG' }, { value: 'Layer prüfen' });
  assert.equal(plans().EG.comment || '', '', 'no comment on a plan that is not in review');
  actions.planResetReview({ key: 'OG2' });
  assert.equal(plans().OG2.status, data.plans.floors.find(f => f.key === 'OG2').status);
});

test('mock: deterministic, scaled, calibrated; group amounts; Tool-Export merge', () => {
  const projects = data.projects.projects;
  for (const p of projects) assert.deepEqual(mockProject(p, data), mockProject(p, data), `${p.id}: deterministic`);
  const agro = mockProject(projects.find(p => p.id === 'agroscope-posieux'), data);
  assert.ok(Math.abs(thgErst(agro.thgSrc) - 11.4) < 0.05, 'calibrated to the Endwert of the instance');
  for (const p of projects) {
    const M = mockProject(p, data, { complete: true });
    const zero = new Set(data.ebkp.ebkp.flatMap(g => g.kids.filter(k => !k.cost).map(k => k.code)));   // A01 Grundstück
    assert.ok(Object.entries(M.kvV).every(([c, v]) => (zero.has(c) ? v === 0 : v >= 1000)) && Object.values(M.kvQ).every(q => q == null || q >= 10), `${p.id}: scaled values`);
    const net = Object.entries(M.kvV).reduce((a, [c, v]) => a + (/^[AZ]/.test(c) ? 0 : v), 0);
    assert.ok(Math.abs(M.kvV.Z01 - net * 0.081) <= 50 && Math.abs(M.prev.kv.Z - (Object.entries(M.prev.kv).reduce((a, [c, v]) => a + (/^[AZ]/.test(c) ? 0 : v), 0)) * 0.081) <= 50, `${p.id}: Z Mehrwertsteuer of the sample is 8.1 % of B–Y`);
    assert.ok(M.thgSrc.length === data.thg.sources.length && M.thgSrc.every(s => s.q != null && s.kw != null), `${p.id}: complete sources`);
    assert.ok(Object.keys(M.thgBetr).length === data.thg.betrieb.length * 4 + 2 && M.thgBetr.pv_y > 0, `${p.id}: complete Betrieb`);
  }
  const g = data.ebkp.ebkp.find(x => x.code === 'C');
  assert.equal(groupAmount(g, { C01: '', C02: null }), null); assert.equal(groupAmount(g, { C01: 10, C02: '20' }), 30);
  assert.equal(groupAmount(g, { C01: 10, C02: 20 }, { C02: true }, [{ v: '5' }]), 15);
  const full = data.thg.sources.map(s => ({ ...s }));
  const cur = full.slice(0, 3).map(s => ({ ...s, kw: null }));
  const m = mergeToolExport(cur, full);
  assert.equal(m.filled, 3); assert.equal(m.added, full.length - 3); assert.equal(m.next.length, full.length);
  assert.deepEqual(mergeToolExport(full, full), { next: full, added: 0, filled: 0 });
  const mb = mergeBetr({ b0_n: 30, b1_n: '', b0_proj: false }, { b0_n: 22, b1_n: 7, b0_proj: true, pv_y: 55800 });
  assert.deepEqual(mb, { next: { b0_n: 30, b1_n: 7, b0_proj: false, pv_y: 55800 }, filled: 2 }, 'entered values and flags stay, blanks are filled');
});

test('store: version check, transient fields, dotted patches', () => {
  const saved = [];
  globalThis.sessionStorage = { getItem: () => saved[0] || null, setItem: (k, v) => { saved[0] = v; }, removeItem: () => { saved.length = 0; } };
  try {
    const s1 = createStore({ __v: 7, ui: { a: 1, toast: null }, plans: { EG: { busy: 'x' } }, list: [1] });
    s1.set({ list: [1, 2] });
    assert.ok(saved[0].includes('"list":[1,2]')); assert.ok(!saved[0].includes('"busy":"x"'), 'busy is not persisted');
    const s2 = createStore({ __v: 7, ui: { a: 1, b: 2, toast: null }, plans: {}, list: [] });
    assert.deepEqual(s2.get().list, [1, 2], 'same version → restored'); assert.equal(s2.get().ui.b, 2, 'new ui keys get their defaults');
    const s3 = createStore({ __v: 8, ui: {}, list: [] });
    assert.deepEqual(s3.get().list, [], 'other version → fresh state');
  } finally { delete globalThis.sessionStorage; }
  const st = { __v: STATE_VERSION, favorites: ['a'], ui: { dialog: null }, projects: { x: { forms: { kv: { step: 1 } } } } };
  assert.equal(patchDotted(st, { 'projects.x.forms.kv.step': 5, 'ui.dialog': 'order' }, { typed: true }).projects.x.forms.kv.step, 5);
  assert.equal(patchDotted(st, { 'ui.dialog': 'order' }, { typed: true }).ui.dialog, 'order', 'null may be replaced');
  assert.deepEqual(patchDotted(st, { favorites: 1 }, { typed: true }).favorites, ['a'], 'an array is not replaced by a number');
  assert.equal(patchDotted(st, { '__proto__.detailed': true }, { typed: true }).detailed, undefined, 'prototype segments are rejected');
  assert.equal(({}).detailed, undefined);
  assert.deepEqual(patchDotted(st, { 'ui.notif': true }).ui, { dialog: null, notif: true }, 'untyped patch adds keys');
  assert.deepEqual(st.ui, { dialog: null }, 'the input is not mutated');
});

test('format: de-CH numbers', () => {
  assert.equal(FMT(1234567.4), (1234567).toLocaleString('de-CH')); assert.equal(FMT(null), ''); assert.equal(FMT(NaN), ''); assert.equal(FMT('12'), '');
  assert.equal(FMT1(7.56), '7.6'); assert.equal(FMT1(Infinity), ''); assert.equal(FMT2(15.3), '15.30');
  for (const [i, o] of [['1’234', 1234], ["1'234", 1234], ['1 234', 1234], ['1234,5', 1234.5], ['', null], [null, null], ['abc', null], [12, 12], [Infinity, null]]) assert.equal(num(i), o, `num(${i})`);
  assert.equal(disp(1234), (1234).toLocaleString('de-CH')); assert.equal(disp('x'), 'x'); assert.equal(disp(null), ''); assert.equal(disp1(7.56), '7.6');
  assert.equal(mio(17e6), 'CHF 17.00 Mio'); assert.equal(mio(17e6, 1), 'CHF 17.0 Mio');
});

test('actions: only BBL users review (checklist, Freigeben, Zurückweisen)', () => {
  const { actions, P, F, store } = setup('musterhausen');
  store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, thg: { ...P().forms.thg, step: 3 } } } });
  store.set({ user: 'AB' });
  actions.formToggleCheck({ arg: 'thg', key: 't1' }); actions.formReject({ key: 'thg' });
  assert.equal(P().forms.thg.step, 3); assert.deepEqual(P().forms.thg.checks, {}); assert.equal(F('thg').rv.decide, false);
  store.set({ user: 'PM' });
  actions.formToggleCheck({ arg: 'thg', key: 't1' });
  assert.equal(P().forms.thg.step, 4); assert.equal(P().forms.thg.checks.t1, true); assert.equal(F('thg').rv.decide, true);
});

test('review 05.11.: strict numbers, no «-0», persisted slices merge per key, A–Z incl. A, import mode «leer», documents of imports, locked inputs', () => {
  assert.equal(num('12abc'), null); assert.equal(num('5 %'), null); assert.equal(num('0x10'), null); assert.equal(num("1'234.5"), 1234.5); assert.equal(num('13,27'), 13.27); assert.equal(num('−2'), -2); assert.equal(FMT(-0.4), '0');
  const saved = [];
  globalThis.sessionStorage = { getItem: () => saved[0] || null, setItem: (k, v) => { saved[0] = v; }, removeItem: () => { saved.length = 0; } };
  try {
    const s1 = createStore({ __v: 1, ui: { a: 1, search: 'x' }, projects: { p1: { v: 1 } } }); s1.set({ x: 1 });
    const s2 = createStore({ __v: 1, ui: { a: 1, search: '' }, projects: { p1: { v: 0 }, p2: { v: 2 } } });
    assert.deepEqual(s2.get().projects, { p1: { v: 1 }, p2: { v: 2 } }, 'a project added to the data keeps its defaults'); assert.equal(s2.get().ui.search, '', 'transient keys are dropped, not saved as null');
  } finally { delete globalThis.sessionStorage; }
  const { actions, P, F, store } = setup('musterhausen');
  const azBefore = num(F('kv').subtotals.find(u => u.code === 'A–Z').cur), bwBefore = num(F('kv').subtotals.find(u => u.code === 'B–W').cur);
  actions.setMap({ key: 'kvV', code: 'A01' }, { value: '2000000' });
  assert.equal(num(F('kv').subtotals.find(u => u.code === 'A–Z').cur), azBefore + 2000000, 'A–Z includes A Grundstück'); assert.equal(num(F('kv').subtotals.find(u => u.code === 'B–W').cur), bwBefore, 'B–W does not');
  actions.setMap({ key: 'kvV', code: 'C02' }, { value: '' }); store.setIn('imp', { form: 'kv', mode: 'leer', step: 2 });
  actions.impApply();
  assert.equal(P().kvV.C02, data.ebkp.import.changes.C02, '«Nur leere Felder füllen» fills the empty field'); assert.notEqual(P().kvV.G02, data.ebkp.import.changes.G02, 'filled fields stay'); assert.ok(F('kv').docs.some(d => d.name === data.ebkp.import.file), 'the imported file is a document');
  store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, kv: { ...P().forms.kv, step: 4 } } } });
  const before = JSON.stringify(P());
  actions.setMap({ key: 'kvV', code: 'C02' }, { value: '1' }); actions.formGroupVal({ form: 'kv', group: 'B' }, { value: '1' }); actions.formNewVal({ form: 'kv', id: 'kn1', field: 'v' }, { value: '1' }); actions.formDropNew({ form: 'kv', id: 'kn1' });
  assert.equal(JSON.stringify(P()), before, 'locked: no changes');
});

test('Excel round trip (js/excel.js): export → edit → import of KV-32 and THG-32, template, foreign file, undo', async () => {
  const X = await mod('js/excel.js');
  const { actions, P, F, store, toast } = setup('musterhausen');
  const asFile = sheets => Object.fromEntries(sheets.map(s => [s.name, s.rows.map(r => [...r])]));   // what SheetJS reads back: { sheet name: rows }
  const plan = (kind, file, mode) => X.planImport(kind, X.readWorkbook(kind, file, data), P(), data, mode);
  const pick = (file, sheet, key) => file[sheet].find(r => r[0] === key);

  // KV-32: one sheet, a heading row per Hauptgruppe and a row per Kostenelement
  const kv = X.sheetsOf('kv', P(), data);
  assert.deepEqual(kv.map(s => s.name), ['KV-32']); assert.deepEqual(kv[0].rows[0], X.COST_HEAD); assert.equal(kv[0].rows.length, 1 + 14 + 31);
  assert.deepEqual(pick(asFile(kv), 'KV-32', 'C02').slice(0, 5), ['C02', 'Wandkonstruktion', 5240, 'm²', 1310000]);
  assert.deepEqual(pick(asFile(kv), 'KV-32', 'V01').slice(2, 4), ['', 'CHF'], 'a Berechnungsbezug in CHF carries no Menge'); assert.deepEqual(pick(asFile(kv), 'KV-32', 'W05').slice(2, 4), ['', 'pauschal'], 'neither does «pauschal»');
  assert.equal(X.fileNameOf('kv', { id: 'musterhausen' }, data, false), 'KV-32_musterhausen.xlsx'); assert.equal(X.fileNameOf('kv', { id: 'musterhausen' }, data, true), 'KV-32_Vorlage.xlsx');
  const tpl = X.sheetsOf('kv', P(), data, { empty: true })[0].rows;
  assert.equal(tpl.length, 46); assert.ok(tpl.slice(1).every(r => r[2] === '' && r[4] === '' && r[5] === ''), 'the template has the rows, no values'); assert.equal(tpl.find(r => r[0] === 'C02')[3], 'm²', 'and the units');

  // an unchanged file changes nothing; the Menge the form misses is a hint
  let p = plan('kv', asFile(kv));
  assert.equal(p.values, 0); assert.equal(p.changed, 0); assert.equal(p.rows.length, 31);
  assert.deepEqual(p.rows.filter(r => r.st !== 'Unverändert').map(r => [r.code, r.st, r.note]), [['D08', 'Hinweis', 'Menge fehlt in Datei']]);

  // the edited file: cost, Menge as text, the missing Menge, a unit (written «m2 GF») with its Menge, an own Kennwert, an unknown unit,
  // an emptied cell, a Kostenelement of the norm the form does not have yet, an unknown code; the columns in another order
  const file = asFile(kv), R = c => pick(file, 'KV-32', c);
  R('C02')[4] = 1500000; R('C01')[2] = "1'700"; R('D08')[2] = 480; R('V01')[3] = 'm2 GF'; R('V01')[2] = 6000; R('E02')[5] = 250; R('G02')[3] = 'Fuder'; R('C04')[4] = '';
  file['KV-32'].push(['E01', '', 900, '', 45000, ''], ['X9', 'Diverses', '', '', 85000, '']);
  file['KV-32'] = [['Kostenvoranschlag, Stand heute'], ...file['KV-32']].map(r => (r.length === 6 ? [r[0], r[4], r[1], r[2], r[3], r[5]] : r));   // a title row above, «Kosten CHF» moved to column B
  p = plan('kv', file);
  const note = Object.fromEntries(p.rows.map(r => [r.code, `${r.st}: ${r.note}`]));
  assert.equal(note.C02, "Geändert: bisher 1'310'000"); assert.equal(note.C01, "Geändert: Menge bisher 1'620"); assert.equal(note.D08, 'Geändert: Menge neu');
  assert.equal(note.V01, 'Geändert: Menge neu, Einheit bisher CHF'); assert.equal(note.E02, 'Geändert: Kennwert neu'); assert.equal(note.G02, 'Hinweis: Einheit «Fuder» unbekannt');
  assert.equal(note.C04, 'Hinweis: Kosten fehlen in Datei', 'an empty cell does not clear the value'); assert.equal(note.E01, 'Geändert: neues Kostenelement'); assert.equal(note.X9, 'Ignoriert: Code nicht in eBKP-H');
  assert.equal(p.changed, 6); assert.equal(p.values, 8); assert.equal(p.hints, 3);
  assert.equal(plan('kv', file, 'leer').values, 4, '«nur leere Felder»: the missing Menge of D08, the Kennwert and the new Kostenelement (Menge, Kosten); filled fields and the unit stay');

  // the dialog applies the file that was read (state.imp.file), logs it and lists it under Dokumente
  actions.importItem({ arg: 'excel', form: 'kv' });
  assert.equal(store.get().ui.dialog, 'import'); assert.equal(store.get().imp.file, null);
  store.setIn('imp', { file: { name: 'KV-32_musterhausen.xlsx', size: 20480, payload: X.readWorkbook('kv', file, data) } });
  const before = JSON.stringify(X.importScope('kv', P()));
  actions.impApply();
  const f = P().forms.kv, e01 = f.added.find(a => a.code === 'E01');
  assert.equal(P().kvV.C02, 1500000); assert.equal(P().kvQ.C01, 1700); assert.equal(P().kvQ.D08, 480); assert.equal(P().kvQ.V01, 6000); assert.equal(f.units.V01, 'm²', 'spellings of practice and of earlier exports are read («m2 GF» → «m²»)'); assert.equal(f.kws.E02, 250);
  assert.equal(P().kvV.C04, 2010000); assert.equal(f.units.G02, undefined); assert.deepEqual([e01.grp, e01.q, e01.v], ['E', 900, 45000]); assert.equal(f.modes.E, 'detail');
  assert.equal(store.get().imp.done, true); assert.equal(store.get().imp.applied, 8);
  assert.deepEqual(f.events.at(-1).slice(3), ['Excel importiert', 'KV-32_musterhausen.xlsx · 8 Werte übernommen']); assert.ok(F('kv').docs.some(d => d.name === 'KV-32_musterhausen.xlsx'));
  assert.equal(F('kv').missing, 0, 'the import filled the missing Menge');
  // a second export is what the form shows now, and importing it again changes nothing
  const kv2 = X.sheetsOf('kv', P(), data);
  assert.deepEqual(pick(asFile(kv2), 'KV-32', 'E01'), ['E01', 'Äussere Wandbekleidung unter Terrain', 900, 'm²', 45000, '']); assert.equal(plan('kv', asFile(kv2)).values, 0);
  actions.impReset();
  assert.equal(JSON.stringify(X.importScope('kv', P())), before, '«Import zurücksetzen»: values and rows as before the import'); assert.equal(P().forms.kv.events.at(-1)[3], 'Excel-Import zurückgesetzt'); assert.equal(store.get().imp.undo, null);

  // a Hauptgruppe that is «zusammengefasst» is one row with its amount
  actions.formMode({ form: 'kv', group: 'C' });
  const kv3 = asFile(X.sheetsOf('kv', P(), data));
  assert.equal(kv3['KV-32'].length, 46 - 4); assert.deepEqual(pick(kv3, 'KV-32', 'C').slice(0, 5), ['C', 'Konstruktion Gebäude', '', '', 3970000]);
  pick(kv3, 'KV-32', 'C')[4] = 4000000; pick(kv3, 'KV-32', 'D')[4] = 1;
  p = plan('kv', kv3);
  assert.deepEqual(p.rows.filter(r => r.code.length === 1).map(r => [r.code, r.st, r.note]), [['C', 'Geändert', "bisher 3'970'000"], ['D', 'Hinweis', 'Betrag ergibt sich aus den Kostenelementen']]); assert.deepEqual(p.patch.gvals, { C: 4000000 });

  // foreign files are refused with the reason
  assert.throws(() => X.readWorkbook('kv', { Tabelle1: [['Name', 'Wert'], ['a', 1]] }, data), /Kein Blatt mit der Kopfzeile/);
  assert.throws(() => X.readWorkbook('thg', asFile(kv), data), /Keines der Blätter/);

  // THG-32: three sheets (Grundlagen, Erstellung, Betrieb)
  const thg = X.sheetsOf('thg', P(), data);
  assert.deepEqual(thg.map(s => s.name), ['Grundlagen', 'Erstellung', 'Betrieb']); assert.deepEqual(thg.map(s => s.rows.length), [14, 1 + P().thgSrc.length, 10]);
  assert.equal(plan('thg', asFile(thg)).values, 0, 'an unchanged file changes nothing');
  const tf = asFile(thg), src = P().thgSrc[0];
  pick(tf, 'Grundlagen', 'tool')[2] = 'Thermo'; pick(tf, 'Grundlagen', 'kat')[2] = 'Hochhaus'; pick(tf, 'Grundlagen', 'pv_y')[2] = 70000;
  pick(tf, 'Erstellung', src.id)[8] = 0.09; pick(tf, 'Erstellung', src.id)[5] = 'x';
  tf.Erstellung.push(['', 'C02.01', 'Wa09', 'Aussenwand Holz', 'KBOB 07.010', '', 800, '', 0.4], ['', 'Q99', '', 'Unbekannt', '', '', 1, '', 1]);
  pick(tf, 'Betrieb', 1)[4] = 20; pick(tf, 'Betrieb', 1)[7] = 5.5; pick(tf, 'Betrieb', 2)[3] = 'x'; tf.Betrieb.push([12, 'Sauna', 'Strom', '', 1, 100, 1, '', '']);
  p = plan('thg', tf);
  assert.deepEqual(p.rows.filter(r => r.st !== 'Unverändert').map(r => `${r.code || r.name} ${r.st}: ${r.note}`), [
    'Gebäudekategorie Hinweis: nicht in der Auswahl, bleibt unverändert', 'Tool Erstellung Geändert: bisher Lesosai', "PV-Ertrag kWh/a Geändert: bisher 55'800",
    `${src.code} Geändert: bisher 0.05, Hersteller`, 'C02.01 Geändert: neue Emissionsquelle', 'Q99 Ignoriert: Elementgruppe unbekannt',
    'B1 Geändert: Nutzenergie bisher 22.00, Endenergie neu', 'B2 Geändert: Projektwert', 'B12 Ignoriert: Zeile unbekannt']);
  actions.importItem({ arg: 'excel', form: 'thg' });
  assert.equal(store.get().imp.form, 'thg');
  actions.impNext(); assert.equal(store.get().imp.step, 1, 'the Ökobilanz has no sample file: a file first'); assert.match(toast(), /Zuerst eine Excel-Datei/);
  store.setIn('imp', { file: { name: 'THG-32_musterhausen.xlsx', size: 30720, payload: X.readWorkbook('thg', tf, data) } });
  actions.impNext(); assert.equal(store.get().imp.step, 2);
  const n = P().thgSrc.length;
  actions.impApply();
  const fresh = P().thgSrc.at(-1);
  assert.equal(P().thgHead.tool, 'Thermo'); assert.equal(P().thgHead.kat, 'Verwaltung', 'a value outside the selection is not taken'); assert.equal(P().thgBetr.pv_y, 70000); assert.equal(P().thgSrc[0].kw, 0.09); assert.equal(P().thgSrc[0].hs, true);
  assert.equal(P().thgSrc.length, n + 1); assert.deepEqual([fresh.grp, fresh.code, fresh.tcode, fresh.name, fresh.unit, fresh.q, fresh.kw], ['C', 'C02.01', 'Wa09', 'Aussenwand Holz', 'm²', 800, 0.4]);
  assert.equal(P().thgBetr.b0_n, 20); assert.equal(P().thgBetr.b0_end, 5.5); assert.equal(P().thgBetr.b1_proj, true);
  assert.equal(plan('thg', asFile(X.sheetsOf('thg', P(), data))).values, 0); assert.ok(eventTitles(P().forms.thg).includes('Excel importiert'));
  actions.impReset();
  assert.equal(P().thgSrc.length, n); assert.equal(P().thgSrc[0].kw, 0.05); assert.equal(P().thgBetr.b0_n, 22); assert.equal(P().thgHead.tool, 'Lesosai');

  // a file of another form is not used; a locked form refuses the import
  store.setIn('imp', { form: 'kv', done: false, file: { name: 'x.xlsx', size: 1, payload: X.readWorkbook('thg', tf, data) } });
  const vBefore = JSON.stringify(P().kvV);
  actions.impApply();
  assert.equal(P().kvV.C02, data.ebkp.import.changes.C02, 'the sample file of the prototype applies instead'); assert.notEqual(JSON.stringify(P().kvV), vBefore);
  setup.pid = 'agroscope-posieux';
  const locked = JSON.stringify(P());
  store.setIn('imp', { form: 'kv', done: false, file: null }); actions.impApply();
  assert.equal(JSON.stringify(P()), locked);
});

test('review 06.11. (QS): Übersicht click, roles, first input, filter, search, deep links, Photovoltaik, shares, completeness', () => {
  const { actions, P, F, store, nav, toast } = setup('musterhausen');
  const asUser = key => store.set({ user: key });
  // a row of the Übersicht opens the Erfassung but never breaks a summarised Hauptgruppe open (it replaced the amount, also on a locked form)
  actions.formMode({ form: 'kv', group: 'C' }); actions.formGroupVal({ form: 'kv', group: 'C' }, { value: '5000000' });
  const before = F('kv').total;
  actions.formOpenGroup({ form: 'kv', group: 'C', tab: 'erfassung' });
  assert.equal(P().forms.kv.modes.C, 'direct'); assert.equal(P().forms.kv.gvals.C, 5000000); assert.equal(F('kv').total, before); assert.ok(nav.last.endsWith('/deliveries/kv-32/erfassung'));
  actions.formMode({ form: 'thg', group: 'G' }); assert.equal(P().forms.thg.modes.G, 'direct');
  actions.formOpenGroup({ form: 'thg', group: 'G', tab: 'erfassung' }); assert.equal(P().forms.thg.modes.G, 'detail', 'the Ökobilanz only unfolds the group');
  // «Nur fehlende Werte anzeigen» does not survive the submission; a locked form shows all rows
  actions.setMap({ key: 'kvQ', code: 'D08' }, { value: '186' }); actions.formToggleMissing({ key: 'kv' });
  assert.equal(P().forms.kv.missingOnly, true);
  actions.formSubmit({ key: 'kv' });
  assert.equal(P().forms.kv.step, 3); assert.equal(P().forms.kv.missingOnly, false); assert.ok(F('kv').erf.rows.length > 30);
  store.setIn('projects', { musterhausen: { ...P(), forms: { ...P().forms, kv: { ...P().forms.kv, missingOnly: true } } } });
  assert.ok(F('kv').erf.rows.length > 30, 'a filter left on by an older state has no effect on a locked form');
  // comment and transfer belong to the BBL; the Übersicht click still changes nothing on the locked form
  asUser('GM'); actions.formComment({ key: 'kv' }, { value: 'von aussen' }); assert.equal(P().forms.kv.comment || '', '');
  asUser('PM'); actions.formComment({ key: 'kv' }, { value: 'Bitte C prüfen' }); assert.equal(P().forms.kv.comment, 'Bitte C prüfen');
  actions.formToggleCheck({ arg: 'kv', key: P().forms.kv && F('kv').manual[0].key }); actions.formToggleCheck({ arg: 'kv', key: F('kv').manual[1].key }); actions.formApprove({ key: 'kv' });
  assert.equal(P().forms.kv.step, 5);
  actions.formComment({ key: 'kv' }, { value: 'nach der Freigabe' }); assert.equal(P().forms.kv.comment, 'Bitte C prüfen', 'no comment after the review');
  asUser('GM'); assert.equal(F('kv').canTransfer, false); actions.formTransfer({ key: 'kv' }); assert.equal(P().forms.kv.step, 5, 'an external person does not hand over');
  actions.formOpenGroup({ form: 'kv', group: 'C' }); assert.equal(F('kv').total, before);
  asUser('PM'); assert.equal(F('kv').canTransfer, true); actions.formTransfer({ key: 'kv' }); assert.equal(P().forms.kv.step, 6);
  assert.equal(F('kv').peopleRows.length >= 2, true);

  // the first input on an open form starts the Erfassung
  setup.pid = 'eigerplatz';
  assert.equal(P().forms.kv.step, 0); assert.equal(F('kv').comp.text, 'Noch keine Werte erfasst'); assert.equal(F('kv').next.text, 'Noch keine Werte erfasst. Die Erfassung ist offen.');
  assert.ok(F('kv').ovList.rows.every(r => r.code === 'A' || r.d === '–'), 'no «−100 %» against the Vorphase on a form without values'); assert.equal(F('kv').ovList.dTot, '–');
  actions.setMap({ key: 'kvV', code: 'C01' }, { value: '500000' });
  assert.equal(P().forms.kv.step, 1); assert.equal(F('kv').status, 'In Bearbeitung'); assert.ok(eventTitles(P().forms.kv).includes('Erfassung begonnen')); assert.equal(P().forms.kv.dates[1], 'heute');
  assert.match(F('kv').comp.text, /^2 von 55 Werten erfasst · 53 fehlen$/);
  // «Bezugsmengen aus den Grundrissen übernehmen» fills the missing Mengen whose Bezugsgrösse is a quantity of the floor plans
  actions.importItem({ arg: 'dwg', form: 'kv' });
  const sia = P().sia;
  assert.match(toast(), /^10 Bezugsmengen aus den Grundrissen übernommen\.$/); assert.equal(P().kvQ.A01, sia.GSF); assert.equal(P().kvQ.D01, sia.GF); assert.equal(P().kvQ.D05, sia.EBF); assert.equal(P().kvQ.J02, sia.HNF + sia.NNF); assert.equal(P().kvQ.I01, sia.BUF);
  assert.equal(P().kvQ.C01, null, 'a Bezugsgrösse of the element itself (Fläche Fundament) does not come from the SIA 416 figures'); assert.equal(P().kvQ.D08, null);
  actions.importItem({ arg: 'dwg', form: 'kv' }); assert.match(toast(), /Keine fehlende Menge/);
  // Tool-Export: the message names both what came in and what was filled
  const gone = P().thgSrc[5];
  actions.thgRemove({ id: gone.id }); actions.importItem({ arg: 'tool', form: 'thg' });
  assert.match(toast(), /1 Emissionsquelle übernommen, 3 Werte ergänzt/);
  assert.equal(F('thg').docs.filter(d => d.name === 'Oekobilanz_Toolexport_SIA32.xlsx').length, 1, 'a file the form already lists is not added twice');

  // search: ArrowUp from «nothing active» goes to the last hit
  actions.searchType({}, { value: 'kv' }); const hits = store.get().ui;
  actions.searchMove({ dir: -1 });
  const { searchModel } = searchMod;
  assert.equal(store.get().ui.searchIdx, searchModel('kv', data).items.length - 1); assert.equal(hits.searchIdx, -1);

  // deep links never replace a slice of the state
  const st = store.get();
  assert.equal(patchDotted(st, { ui: null }, { typed: true }).ui.dialog, st.ui.dialog); assert.ok(Object.keys(patchDotted(st, { projects: {} }, { typed: true }).projects).length > 3);
  assert.ok(patchDotted(st, { 'projects.musterhausen.forms': null }, { typed: true }).projects.musterhausen.forms.kv); assert.equal(patchDotted(st, { 'ui.dialog': 'order', 'imp.step': 2 }, { typed: true }).imp.step, 2);
  assert.equal(patchDotted(st, { 'imp.step': null }, { typed: true }).imp.step, st.imp.step);

  // Photovoltaik: Eigenverbrauch 0–100 %, capped at the Endenergie Strom; asked for only with a plant; a missing share is not «100 %»
  setup.pid = 'musterhausen';
  const full = F('thg');
  assert.equal(full.missB, 0); assert.equal(full.betr.pv[0].val, '62 kWp · aus D01.01 Erstellung');
  actions.thgBetr({ key: 'pv_ev' }, { value: '150' });
  assert.equal(F('thg').missB, 1, 'an Eigenverbrauch above 100 % is a typo'); assert.ok(!/\d/.test(F('thg').betr.rows.find(r => r.name === 'PV-Export').carrier), 'no negative export');
  actions.thgBetr({ key: 'pv_ev' }, { value: '85' }); actions.thgBetr({ key: 'pv_y' }, { value: '5000000' });
  const big = F('thg'), pvRow = big.betr.rows.find(r => r.name === 'PV-Eigenverbrauch');
  assert.ok(pvRow.carrier.endsWith('begrenzt auf den Strombedarf')); assert.ok(num(big.betr.end.replace('−', '-')) >= 0, 'the Endenergie of the building cannot become negative through its own PV');
  actions.thgBetr({ key: 'pv_y' }, { value: '55800' });
  actions.thgBetr({ key: 'b0_a' }, { value: '' });
  const an = F('thg').summ.find(r => r.key === 'anteile');
  assert.deepEqual([an.val, an.st], ['fehlt bei Raumwärme', 'warn']);
  actions.thgBetr({ key: 'b0_a' }, { value: '100' });
  assert.equal(F('thg').summ.find(r => r.key === 'anteile').val, '100 %');
  setup.pid = 'botschaft-wien';
  assert.equal(P().thgSrc.length, 0); assert.equal(F('thg').fields, 27, 'no plant, no Photovoltaik fields: 9 services × 3'); assert.equal(F('thg').comp.pct, '0 %');
  actions.importItem({ arg: 'rechenhilfe', form: 'thg' });
  assert.equal(P().forms.thg.step, 1, 'an import starts the Erfassung'); assert.equal(F('thg').missB, 0); assert.notEqual(F('thg').comp.pct, '100 %', 'complete Betrieb, no Emissionsquelle: not 100 %'); assert.match(F('thg').comp.text, /^Noch keine Emissionsquellen erfasst/);

  // shares of the lists add up to 100; the KS-31 of the Musterprojekt adds up to the figures the KV-32 names as Vorphase
  for (const pid of ['musterhausen', 'agroscope-posieux', 'tenero', 'botschaft-wien']) {
    setup.pid = pid;
    for (const kind of ['kv', 'ks']) { const X = F(kind); if (X && X.total > 0) assert.equal(X.ovList.rows.reduce((a, r) => a + num(r.share.replace(' %', '')), 0), 100, `${pid}/${kind}: Anteil A–Z`); }
    const T = F('thg'); if (T && T.nSrc) assert.equal(T.ovList.rows.reduce((a, r) => a + num(r.share.replace(' %', '')), 0), 100, `${pid}/thg: Anteil B–G`);
  }
  setup.pid = 'musterhausen';
  const M = mockProject(data.projects.projects.find(p => p.id === 'musterhausen'), data);
  for (const g of data.ebkp.ebkp.filter(x => x.code !== 'Z')) assert.equal(g.kids.reduce((a, k) => a + M.ksV[k.code], 0), data.ebkp.ks31[g.code] || 0, `KS-31 ${g.code}`);
  assert.equal(M.ksV.Z01, M.prev.kv.Z);
});

test('review 06.11. (QS): Excel import edge cases and the state of the dialog', async () => {
  const X = await mod('js/excel.js');
  const { importSource } = await mod('js/model/import.js');
  const { actions, P, F, store, toast } = setup('musterhausen');
  const asFile = sheets => Object.fromEntries(sheets.map(s => [s.name, s.rows.map(r => [...r])]));
  const plan = (kind, file, mode) => X.planImport(kind, X.readWorkbook(kind, file, data), P(), data, mode);
  const R = (file, sheet, key) => file[sheet].find(r => r[0] === key);
  const notes = p => Object.fromEntries(p.rows.map(r => [r.code, `${r.st}: ${r.note}`]));
  // a column the file does not have is absent; it is not read from another column by position
  const kv = asFile(X.sheetsOf('kv', P(), data));
  const narrow = { 'KV-32': kv['KV-32'].map(r => [r[0], r[1], r[4]]) };   // Code, Bezeichnung, Kosten CHF
  let p = plan('kv', narrow);
  assert.equal(p.values, 0, 'without the columns Menge and Einheit nothing changes'); assert.equal(X.readWorkbook('kv', narrow, data).rows.find(r => r.code === 'C02').q, null);
  // duplicate codes: the last row counts, the earlier one is ignored
  const dup = asFile(X.sheetsOf('kv', P(), data));
  dup['KV-32'].push(['E01', '', 900, '', 45000, ''], ['E01', '', 100, '', 5000, ''], ['C02', '', 5240, 'm²', 1400000, '']);
  p = plan('kv', dup);
  assert.equal(p.patch.fresh.length, 1); assert.deepEqual([p.patch.fresh[0].q, p.patch.fresh[0].v], [100, 5000]); assert.equal(p.patch.V.C02, 1400000); assert.equal(p.values, 3);
  assert.equal(p.rows.filter(r => r.st === 'Ignoriert' && r.note.startsWith('Code doppelt')).length, 2);
  // numbers of a file are rounded as typed ones are stored
  const frac = asFile(X.sheetsOf('kv', P(), data)); R(frac, 'KV-32', 'C02')[4] = 1310000.6; R(frac, 'KV-32', 'C02')[2] = 5240.4;
  assert.deepEqual([X.readWorkbook('kv', frac, data).rows.find(r => r.code === 'C02').v, X.readWorkbook('kv', frac, data).rows.find(r => r.code === 'C02').q], [1310001, 5240]);
  // a removed Kostenelement comes back with the unit of its row and without what it carried before
  actions.formUnit({ form: 'kv', code: 'G03' }, { value: 'pauschal' }); actions.formKw({ form: 'kv', code: 'G03' }, { value: '77' });
  actions.formRemovePos({ form: 'kv', code: 'J01' }); actions.formRemovePos({ form: 'kv', code: 'G03' });
  const back = asFile(X.sheetsOf('kv', P(), data));
  back['KV-32'].push(['J01', '', 420, '', 480000, ''], ['G03', '', 9000, 'm²', 400000, ''], ['W03', '', 500, '', '', '']);
  p = plan('kv', back);
  assert.equal(notes(p).J01, 'Geändert: neues Kostenelement'); assert.equal(p.patch.Q.J01, 420, 'J01 is counted in St, as its row was'); assert.deepEqual([p.patch.units.G03, p.patch.Q.G03, p.patch.kws.G03], ['m²', 9000, '']);
  assert.equal(notes(p).W03, 'Hinweis: Menge ohne Wirkung bei Einheit «pauschal»', 'a row without a usable value is not counted as a change'); assert.equal(p.values, 4);
  store.setIn('imp', { form: 'kv', pid: 'musterhausen', file: { name: 'zurueck.xlsx', size: 1, payload: X.readWorkbook('kv', back, data) } }); actions.impApply();
  assert.equal(P().forms.kv.removed.J01, undefined); assert.equal(F('kv').erf.rows.find(r => r.code === 'G03').unit, 'm²'); assert.equal(F('kv').erf.rows.find(r => r.code === 'G03').kwOwn, false);
  assert.equal(plan('kv', asFile(X.sheetsOf('kv', P(), data))).values, 0, 'the export of the result imports without changes');
  actions.impReset();
  // a changed Kostenelement of a summarised Hauptgruppe: the preview says that the group is broken open; its own amount of the file has no effect
  actions.formMode({ form: 'kv', group: 'C' }); actions.formGroupVal({ form: 'kv', group: 'C' }, { value: '5000000' });
  const sum = asFile(X.sheetsOf('kv', P(), data)); R(sum, 'KV-32', 'C')[4] = 6000000; sum['KV-32'].push(['C02', '', 5240, 'm²', 1400000, '']);
  p = plan('kv', sum);
  assert.equal(notes(p).C, "Hinweis: wird aufgeschlüsselt, Betrag bisher 5'000'000"); assert.deepEqual(p.patch.gvals, {}); assert.equal(p.values, 1);
  // the dialog: no change → nothing to apply; closing forgets result, undo, file and mode; a file belongs to its project
  actions.importItem({ arg: 'excel', form: 'kv' });
  store.setIn('imp', { file: { name: 'gleich.xlsx', size: 1, payload: X.readWorkbook('kv', asFile(X.sheetsOf('kv', P(), data)), data) } });
  actions.impApply();
  assert.equal(store.get().imp.done, false); assert.match(toast(), /keine Änderungen/);
  store.setIn('imp', { file: null }); actions.impApply();
  assert.equal(store.get().imp.done, true); assert.ok(store.get().imp.undo);
  actions.impApply(); assert.equal(store.get().imp.applied > 0, true, 'a second click does not overwrite the result');
  store.setIn('imp', { mode: 'leer' }); actions.impClose();
  assert.deepEqual([store.get().imp.done, store.get().imp.undo, store.get().imp.file, store.get().imp.mode, store.get().imp.step], [false, null, null, 'ueber', 1]);
  store.setIn('imp', { form: 'kv', pid: 'musterhausen', file: { name: 'm.xlsx', size: 1, payload: X.readWorkbook('kv', kv, data) } });
  assert.equal(importSource(store.get(), data, P(), 'musterhausen').name, 'm.xlsx'); assert.equal(importSource(store.get(), data, store.get().projects.tenero, 'tenero').name, 'kv_bauprojekt_v3.xlsx', 'another project gets the sample, not the file');
  // the sample scales with the project; the KS-31 has its own file name
  const ten = X.samplePayload('kv', store.get().projects.tenero, data).rows.find(r => r.code === 'C02'), tenV = store.get().projects.tenero.kvV.C02;
  assert.ok(Math.abs(ten.v - tenV) < tenV * 0.05 && ten.v !== tenV, `Tenero C02 ${tenV} → ${ten.v}`);
  store.setIn('imp', { form: 'ks', file: null }); assert.equal(importSource(store.get(), data, store.get().projects['botschaft-wien'], 'botschaft-wien').name, 'ks_vorprojekt_v2.xlsx');

  // Ökobilanz: the untouched empty template changes nothing; an empty flag cell says nothing, «-» clears; unit and Elementgruppe
  const tpl = asFile(X.sheetsOf('thg', P(), data, { empty: true }));
  assert.equal(plan('thg', tpl).values, 0, 'Leere Vorlage THG-32, unchanged');
  const tf = asFile(X.sheetsOf('thg', P(), data)), hs = P().thgSrc.find(s => s.hs), first = P().thgSrc[0];
  R(tf, 'Erstellung', hs.id)[5] = '-'; R(tf, 'Erstellung', first.id)[1] = ''; R(tf, 'Erstellung', first.id)[8] = 0.07;
  tf.Erstellung.push(['', 'd01.01', '', 'PV-Anlage Dach Süd', 'KBOB 34.022', '', 30, 'kWp', 0.2]);
  R(tf, 'Betrieb', 1)[3] = '-';
  p = plan('thg', tf);
  assert.equal(p.patch.src[hs.id].hs, false); assert.equal(p.patch.src[first.id].kw, 0.07); assert.equal(p.patch.src[first.id].code, undefined, 'a known ID keeps its Elementgruppe when the cell is empty');
  assert.deepEqual([p.patch.fresh[0].code, p.patch.fresh[0].unit], ['D01.01', 'kWp']); assert.equal(p.patch.betr.b0_proj, false);
  // the Einheit of an Emissionsquelle is a dropdown (as in the cost forms) and round-trips through the file
  const src2 = P().thgSrc[1], row2 = () => F('thg').erf.rows.find(r => r.id === src2.id);
  assert.equal(row2().unit, 'tkm'); assert.deepEqual(row2().unitOpts.map(o => o.v), ['m²', 'm³', 'm', 'St', 'kg', 't', 'tkm', 'kW', 'kWp', 'm² EBF']); assert.equal(row2().unitOpts.find(o => o.sel).v, 'tkm');
  actions.thgVal({ id: src2.id, field: 'unit' }, { value: 't' });
  assert.equal(P().thgSrc[1].unit, 't'); assert.equal(R(asFile(X.sheetsOf('thg', P(), data)), 'Erstellung', src2.id)[7], 't');
  const uf = asFile(X.sheetsOf('thg', P(), data)); R(uf, 'Erstellung', src2.id)[7] = 'tkm'; R(uf, 'Erstellung', first.id)[7] = 'Fuder'; R(uf, 'Erstellung', hs.id)[7] = 'm2';
  const up = plan('thg', uf);
  assert.equal(up.patch.src[src2.id].unit, 'tkm'); assert.ok(up.rows.some(r => r.st === 'Geändert' && r.note === 'Einheit bisher t')); assert.ok(up.rows.some(r => r.st === 'Hinweis' && r.note === 'Einheit «Fuder» unbekannt'));
  assert.equal(up.values, hs.unit === 'm²' ? 1 : 2, '«m2» is read as «m²»');
  const noCol = { ...tf, Erstellung: tf.Erstellung.map(r => [r[0], r[1], r[3], r[6], r[8]]) };   // without Tool-Code, Ökobilanzdaten, Hersteller, Einheit
  const q = plan('thg', noCol);
  assert.equal(q.rows.filter(r => r.note.includes('Tool-Code')).length, 0); assert.equal(q.patch.src[hs.id], undefined, 'no Hersteller column: the flag stays');
});

test('review 06.11. (QS): Planlieferungen – Verlauf and dates of a second round, Entfernen, roles, filter per plan', () => {
  const { actions, store, toast } = setup('musterhausen');
  const plan = key => planModel(store.get(), data).plans[key];
  const form = key => planForm(plan(key), data, data.users.users.find(u => u.key === store.get().user));
  // OG2 is in review: reject → own upload → submit again
  assert.equal(plan('OG2').status, 'pruefung');
  actions.planToggleCheck({ arg: 'OG2', key: 'c1' });
  assert.equal(plan('OG2').history.filter(h => h.t === 'Prüfung begonnen').length, 1, 'the review had begun before the session');
  actions.planReject({ key: 'OG2' });
  assert.equal(plan('OG2').status, 'zurueck'); assert.equal(plan('OG2').history.at(-1).t, 'Zurückgewiesen'); assert.equal(plan('OG2').dates[2], '', 'the submission is open again');
  store.setIn('plans', { OG2: { ...store.get().plans.OG2, result: { ...data.plans.seeds.cadv01, file: { name: 'korrigiert.dwg', size: 1 }, checkedAt: '2027-05-05T08:00:00.000Z' } } });
  actions.planSubmit({ key: 'OG2' });
  const h = plan('OG2').history.map(x => x.t);
  assert.deepEqual(h.filter(t => /eingereicht|Zurückgewiesen|Prüfung begonnen/.test(t)), ['Zur Prüfung eingereicht', 'Prüfung begonnen', 'Zurückgewiesen', 'Zur Prüfung eingereicht'], 'the first round stays in the Verlauf');
  assert.equal(plan('OG2').dates[2], 'heute'); assert.equal(form('OG2').lock, 'Eingereicht heute. Änderungen erst nach Rückweisung.');
  // transfer and comment belong to the BBL
  actions.planToggleCheck({ arg: 'OG2', key: 'c1' }); actions.planToggleCheck({ arg: 'OG2', key: 'c2' }); actions.planApprove({ key: 'OG2' });
  assert.equal(plan('OG2').status, 'freigegeben');
  store.set({ user: 'AB' });
  assert.equal(form('OG2').canTransfer, false); actions.planTransfer({ key: 'OG2' }); assert.equal(plan('OG2').status, 'freigegeben');
  actions.planComment({ key: 'OG2' }, { value: 'x' }); assert.equal(plan('OG2').comment, '');
  store.set({ user: 'PM' }); actions.planTransfer({ key: 'OG2' });
  assert.equal(plan('OG2').status, 'uebertragen'); assert.equal(plan('OG2').history.at(-1).t, 'An SAP RE-FX übertragen'); assert.equal(plan('OG2').dates[5], 'heute');
  actions.planResetReview({ key: 'OG2' }); assert.deepEqual([plan('OG2').status, store.get().plans.OG2.events.length], ['pruefung', 0]);
  // «Entfernen» only takes an own upload away
  const eg0 = JSON.stringify(store.get().plans.EG);
  actions.planRemove({ key: 'EG' }); assert.equal(JSON.stringify(store.get().plans.EG), eg0, 'EG shows its delivered plan: nothing to remove');
  store.setIn('plans', { EG: { ...store.get().plans.EG, status: 'zurueck', result: { ...data.plans.seeds.cadv01, file: { name: 'eigen.dwg', size: 1 } } } });
  actions.planRemove({ key: 'EG' });
  assert.equal(store.get().plans.EG.result, null); assert.equal(plan('EG').status, 'zurueck', 'a rejection stays a rejection'); assert.ok(plan('EG').history.some(h => h.t === 'DWG entfernt'));
  // filter and search belong to the plan they were set on
  actions.planSearch({ key: 'EG' }, { value: 'LAYER_00' }); actions.planFilter({ key: 'EG', arg: 'errors' });
  assert.equal(planLists(plan('EG'), store.get().ui).text, 'LAYER_00'); assert.equal(planLists(plan('EG'), store.get().ui).filter, 'errors');
  assert.deepEqual([planLists(plan('UG'), store.get().ui).text, planLists(plan('UG'), store.get().ui).filter, planLists(plan('UG'), store.get().ui).rules.passed.length], ['', 'all', 38]);
  actions.planFilter({ key: 'UG', arg: 'warnings' }); assert.equal(store.get().ui.planSearch, '', 'a filter on another plan starts without the old search');
  assert.equal(toast().length >= 0, true);
});
