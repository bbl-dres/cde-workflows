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
const { mockProject, groupAmount, mergeToolExport, thgTotal60 } = await mod('js/model/mock.js');
const { FMT, FMT1, FMT2, num, disp, disp1, mio } = await mod('js/format.js');

/** A fresh store + actions acting on project `pid`; `nav` records navigations. */
function setup(pid = 'musterhausen') {
  const store = createStore(initialState(data));
  const nav = { navigate: p => nav.last = p, studyPid: () => 'musterhausen', currentPid: () => setup.pid, last: null };
  setup.pid = pid;
  const actions = makeActions(store, data, nav);
  const P = () => store.get().projects[setup.pid];
  const F = kind => formModel(store.get(), data, data.projects.projects.find(p => p.id === setup.pid))[kind];
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

test('actions: THG dataset input splits name and KBOB id; a code change keeps the material of an existing row', () => {
  const { actions, P, el } = setup('eigerplatz');
  const id = P().thgSrc[0].id;
  actions.thgVal({ id, field: 'dataset' }, el('Magerbeton · KBOB 01.001'));
  assert.equal(P().thgSrc[0].kbob, 'KBOB 01.001'); assert.equal(P().thgSrc[0].name, 'Magerbeton');
  actions.thgVal({ id, field: 'dataset' }, el('Recyclingbeton'));
  assert.equal(P().thgSrc[0].name, 'Recyclingbeton'); assert.equal(P().thgSrc[0].kbob, 'KBOB 01.001', 'without an id the id stays');
  actions.thgVal({ id, field: 'dataset' }, el('KBOB 01.004'));
  assert.equal(P().thgSrc[0].kbob, 'KBOB 01.004'); assert.equal(P().thgSrc[0].name, 'Recyclingbeton', 'only an id keeps the name');
  actions.thgVal({ id, field: 'code' }, el('C02.02'));
  assert.equal(P().thgSrc[0].code, 'C02.02'); assert.equal(P().thgSrc[0].name, 'Recyclingbeton', 'existing row keeps its material'); assert.equal(P().thgSrc[0].a, 60); assert.equal(P().thgSrc[0].unit, 'm²');
});

test('actions: Hauptgruppen toggle and sums (KV-32)', () => {
  const { actions, P, F, store } = setup();
  actions.formMode({ form: 'kv', group: 'C' });
  assert.equal(P().forms.kv.modes.C, 'detail');
  actions.formMode({ form: 'kv', group: 'C' });
  const sum = data.ebkp.ebkp.find(g => g.code === 'C').kids.reduce((a, k) => a + num(P().kvV[k.code]), 0);
  assert.equal(P().forms.kv.modes.C, 'direct'); assert.equal(P().forms.kv.gvals.C, sum, 'Zusammenfassen keeps the sum as the group amount');
  // A group whose positions are all empty closes with an empty amount, not 0.
  actions.setMap({ key: 'kvQ', code: 'D01' }, { value: '' });
  ['D01', 'D05', 'D07', 'D08'].forEach(c => actions.setMap({ key: 'kvV', code: c }, { value: '' }));
  actions.formMode({ form: 'kv', group: 'D' });
  assert.equal(P().forms.kv.gvals.D, ''); assert.ok(F('kv').missing >= 1);
  // A group without positions keeps its Pauschalbetrag; added elements are merged into it when closing.
  const v0 = num(P().kvV.V);
  actions.formMode({ form: 'kv', group: 'V' });
  assert.equal(F('kv').groups.find(g => g.code === 'V').sum, v0, 'opening V does not change the total');
  actions.formAddPos({ form: 'kv', group: 'V' });
  const id = P().forms.kv.added[0].id;
  actions.formNewVal({ form: 'kv', id, field: 'code' }, { value: 'V01' });
  actions.formNewVal({ form: 'kv', id, field: 'v' }, { value: '100000' });
  assert.equal(F('kv').groups.find(g => g.code === 'V').sum, v0 + 100000);
  actions.formMode({ form: 'kv', group: 'V' });
  assert.equal(num(P().kvV.V), v0 + 100000); assert.equal(P().forms.kv.added.length, 0); assert.equal(F('kv').groups.find(g => g.code === 'V').sum, v0 + 100000);
  // THG: formMode only opens and closes the group (C is open by default); a form in review ignores the toggle, reopening restores it
  assert.equal(P().forms.thg.modes.C, 'detail');
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
  assert.deepEqual([n1.code, P().thgSrc.find(s => s.id === 'n1').name, P().thgSrc.find(s => s.id === 'n1').unit, P().thgSrc.find(s => s.id === 'n1').a], ['', 'Stützenkonstruktion', 'm', 60]);
  actions.thgVal({ id: 'n1', field: 'h' }, { value: '13,27' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').h, 13.3, 'typed numbers are stored as numbers, one decimal for t CO₂-eq');
  actions.thgVal({ id: 'n1', field: 'q' }, { value: "1'234.6" });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').q, 1235);
  actions.thgVal({ id: 'n1', field: 'q' }, { value: 'abc' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').q, 'abc', 'unparsable text stays as typed (and counts as missing)');
  actions.thgToggleHs({ id: 'n1' });
  assert.equal(P().thgSrc.find(s => s.id === 'n1').hs, true);
  actions.thgRemove({ id: 'C01-3' });
  assert.ok(!P().thgSrc.some(s => s.id === 'C01-3')); assert.ok(eventTitles(P().forms.thg).includes('Emissionsquelle entfernt'));
  actions.thgRemove({ id: 'n1' });
  assert.ok(!P().thgSrc.some(s => s.id === 'n1')); assert.equal(eventTitles(P().forms.thg).filter(t => t === 'Emissionsquelle entfernt').length, 1, 'dropping a new row is no event');
  actions.thgHead({ key: 'tool' }, { value: 'Lesosai' });
  assert.equal(P().thgHead.tool, 'Lesosai'); assert.equal(F('thg').erf.head.find(h => h.key === 'tool').val, 'Lesosai');
  store.setIn('projects', { eigerplatz: { ...P(), forms: { ...P().forms, thg: { ...P().forms.thg, step: 4 } } } });
  const before = JSON.stringify(P());
  actions.thgAdd({ group: 'C' }); actions.thgRemove({ id: 'C01-1' }); actions.thgToggleHs({ id: 'C01-1' });
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
  assert.equal(P().thgSrc.length, data.thg.sources.length); assert.match(toast(), /25 Emissionsquellen übernommen/);
  assert.equal(F('thg').missing, 0); assert.equal(F('thg').bar.canSubmit, true);
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
  actions.thgRemove({ id: 'C01-1' });
  actions.formResetReview({ key: 'thg' });
  assert.equal(P().thgSrc.length, data.thg.sources.length); assert.equal(P().thgHead.tool, data.thg.head.find(h => h[0] === 'tool')[2]); assert.equal(P().forms.thg.step, 1, 'reset restores the instance step of the data (In Bearbeitung for the demo project)');
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
  actions.planApprove({ key: 'OG2' });
  assert.equal(plans().OG2.status, 'freigegeben');
  actions.planTransfer({ key: 'OG2' });
  assert.equal(plans().OG2.status, 'uebertragen');
  actions.planSubmit({ key: 'EG' });
  assert.equal(plans().EG.status, 'bearbeitung', 'EG has errors → not submittable');
  actions.planComment({ key: 'EG' }, { value: 'Layer prüfen' });
  assert.equal(plans().EG.comment, 'Layer prüfen');
  actions.planResetReview({ key: 'OG2' });
  assert.equal(plans().OG2.status, data.plans.floors.find(f => f.key === 'OG2').status);
});

test('mock: deterministic, scaled, calibrated; group amounts; Tool-Export merge', () => {
  const projects = data.projects.projects;
  for (const p of projects) assert.deepEqual(mockProject(p, data), mockProject(p, data), `${p.id}: deterministic`);
  const agro = mockProject(projects.find(p => p.id === 'agroscope-posieux'), data);
  assert.ok(Math.abs(thgTotal60(agro.thgSrc) / 60 / agro.sia.EBF - 11.4) < 0.05, 'calibrated to the Endwert of the instance');
  for (const p of projects) {
    const M = mockProject(p, data, { complete: true });
    const zero = new Set(data.ebkp.extra.filter(g => !g.cost).map(g => g.code));   // A Grundstück, H Nutzungsspezifische Anlage
    assert.ok(Object.entries(M.kvV).every(([c, v]) => (zero.has(c) ? v === 0 : v >= 1000)) && Object.values(M.kvQ).every(q => q >= 10), `${p.id}: scaled values`);
    assert.ok(M.thgSrc.length === data.thg.sources.length && M.thgSrc.every(s => s.q != null && s.h != null && s.e != null), `${p.id}: complete sources`);
  }
  const g = data.ebkp.ebkp.find(x => x.code === 'C');
  assert.equal(groupAmount(g, { C01: '', C02: null }), null); assert.equal(groupAmount(g, { C01: 10, C02: '20' }), 30);
  assert.equal(groupAmount(g, { C01: 10, C02: 20 }, { C02: true }, [{ v: '5' }]), 15);
  const full = data.thg.sources.map(s => ({ ...s }));
  const cur = full.slice(0, 3).map(s => ({ ...s, h: null }));
  const m = mergeToolExport(cur, full);
  assert.equal(m.filled, 3); assert.equal(m.added, full.length - 3); assert.equal(m.next.length, full.length);
  assert.deepEqual(mergeToolExport(full, full), { next: full, added: 0, filled: 0 });
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
