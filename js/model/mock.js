// Deterministic mock values for the Datenformulare of every project: the Musterhausen base data (data/ebkp.json,
// data/sia416.json) scaled by the project's Anlagekosten and jittered per project, so that all projects open with
// plausible, complete and consistent positions, Bezugsmengen, Vorphasenwerte and Zielwerte. Musterhausen keeps its
// base values unchanged. Which forms a project has (kv, ks, thg) and their workflow state come from data/forms.json
// (byProject); a form at step 0 («Offen») has no values yet, `missing` blanks single fields of forms in progress.
export const BASE_AK = 24.6;
export const KIND_OF = { 'KV-32': 'kv', 'KS-31': 'ks', 'THG-32': 'thg' };
export const KEYS = { kv: ['kvQ', 'kvV'], ks: ['ksQ', 'ksV'], thg: ['thgQ', 'thgV'] };

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const roundTo = (v, step) => Math.round(v / step) * step;
const sum = o => Object.values(o).reduce((a, b) => a + (b || 0), 0);

/** Values, previous-phase figures and cost targets of one project (pure function of the data). */
export function mockProject(project, data) {
  const E = data.ebkp, base = !!project.detailed;
  const scale = base ? 1 : (project.anlagekostenMio || BASE_AK) / BASE_AK;
  const r = rng(project.id);
  const jit = (lo, hi) => (base ? 1 : lo + (hi - lo) * r());
  const inst = (data.forms.byProject || {})[project.id] || {};
  const sia = Object.fromEntries(Object.entries(data.sia416.initial).map(([k, v]) => [k, base ? v : Math.max(10, roundTo(v * scale * jit(0.95, 1.05), 10))]));
  const kvQ = {}, kvV = {}, ksQ = {}, ksV = {}, thgQ = {}, thgV = {};
  const ksFactor = {};
  E.ebkp.forEach(g => { const s = g.kids.reduce((a, k) => a + k.cost, 0); ksFactor[g.code] = (E.ks31[g.code] || s * 0.93) / s; });
  E.ebkp.forEach(g => g.kids.forEach(k => {
    const q = Math.max(10, roundTo(k.qty * scale * jit(0.95, 1.05), 10));
    kvQ[k.code] = q; ksQ[k.code] = q; thgQ[k.code] = q;
    kvV[k.code] = Math.max(1000, roundTo(k.cost * scale * jit(0.9, 1.1), 1000));
    ksV[k.code] = Math.max(1000, roundTo(k.cost * ksFactor[g.code] * scale * jit(0.9, 1.1), 1000));
    thgV[k.code] = Math.max(1000, roundTo(k.thg * scale * jit(0.9, 1.1), 1000));
  }));
  E.extra.forEach(k => {
    kvV[k.code] = Math.max(1000, roundTo(k.cost * scale * jit(0.9, 1.1), 1000));
    ksV[k.code] = Math.max(1000, roundTo(kvV[k.code] * (E.ks31[k.code] ? E.ks31[k.code] / k.cost : 0.93), 1000));
  });
  // THG calibrated to the Endwert of the instance (kg CO₂-eq/m² EBF·a over 60 years)
  const thgInst = inst.thg || {}, EBF = sia.EBF || 1;
  if (thgInst.endwert != null && sum(thgV)) { const f = thgInst.endwert * 60 * EBF / sum(thgV); Object.keys(thgV).forEach(c => { thgV[c] = Math.max(1000, roundTo(thgV[c] * f, 1000)); }); }
  const control = sum(thgV) / 60 / EBF;
  const endwert = thgInst.step === 0 ? '' : thgInst.endwert != null ? String(thgInst.endwert) : base ? '9.1' : (Math.round(control * jit(0.98, 1.02) * 10) / 10).toFixed(1);
  // Previous phases: KS-31 for the KV, Kostengrobschätzung SIA 21 for the KS, SIA 31 for the THG
  const prev = { kv: {}, ks: {}, thg: {} };
  Object.entries(E.ks31).forEach(([c, v]) => { prev.kv[c] = base ? v : Math.max(1000, roundTo(v * scale * jit(0.9, 1.05), 1000)); prev.ks[c] = Math.max(1000, roundTo(prev.kv[c] * (base ? 0.9 : jit(0.85, 0.95)), 1000)); });
  Object.entries(E.prev31).forEach(([c, v]) => { prev.thg[c] = base ? v : Math.max(1000, roundTo(v * scale * jit(0.9, 1.1), 1000)); });
  // Missing values (forms in progress) and empty forms (step 0)
  const values = { kvQ, kvV, ksQ, ksV, thgQ, thgV };
  const missing = [...(base ? (E.missingInitially || []).map(c => 'kvQ:' + c) : []), ...Object.values(inst).flatMap(i => i.missing || [])];
  missing.forEach(spec => { const [k, c] = spec.split(':'); if (values[k] && c in values[k]) values[k][c] = null; });
  Object.entries(inst).forEach(([kind, i]) => { if (i.step === 0) (KEYS[kind] || []).forEach(k => Object.keys(values[k]).forEach(c => { values[k][c] = null; })); });
  const kostenziel = project.kostenzielBW || roundTo(sum(prev.kv) * 1.03, 1e5);
  const kostendach = (inst.kv && inst.kv.kostendach) || roundTo(kostenziel * 1.1, 1e5);
  return { scale, sia, endwert, ...values, prev, kostenziel, kostendach };
}

/** Group amounts for the direct entry mode: the sum of the positions of each Hauptgruppe ('' when nothing is entered). */
export function groupAmounts(values, data) {
  return Object.fromEntries(data.ebkp.ebkp.map(g => {
    const vals = g.kids.map(k => values[k.code]).filter(v => v != null && v !== '');
    return [g.code, vals.length ? vals.reduce((a, b) => a + Number(b), 0) : ''];
  }));
}
