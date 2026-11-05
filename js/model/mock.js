// Deterministic mock values for the Datenformulare of every project: the Musterhausen base data (data/ebkp.json,
// data/thg.json, data/sia416.json) scaled by the project's Anlagekosten and jittered per project, so that all projects
// open with plausible, complete and consistent positions, Emissionsquellen, Betriebswerte, Bezugsmengen, Vorphasenwerte and Zielwerte.
// Musterhausen keeps its base values unchanged. Which forms a project has (kv, ks, thg) and their workflow state come
// from data/forms.json (byProject); a form at step 0 («Offen») has no values yet, `missing` blanks single fields of
// forms in progress («kvQ:D08» for the cost maps, «thg:C04.01-1:kw» for a field of an Emissionsquelle, «thgB:b0_n» for a Betrieb value).
import { num } from '../format.js';

export const BASE_AK = 24.6;
export const BASE_EBF = 5600;
export const KIND_OF = { 'KV-32': 'kv', 'KS-31': 'ks', 'THG-32': 'thg' };
/** Value maps of the cost forms (quantities, values per position); the THG keeps its Emissionsquellen in thgSrc, the Grundlagen in thgHead and the Betrieb in thgBetr. */
export const KEYS = { kv: ['kvQ', 'kvV'], ks: ['ksQ', 'ksV'] };
/** Does a Kostenelement with this Einheit carry a Menge? «pauschal» has no Bezugsgrösse; «CHF» is a Berechnungsbezug of the norm (a sum of cost groups), not a quantity that is measured. */
export const needsQty = unit => unit !== 'pauschal' && unit !== 'CHF';

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const roundTo = (v, step) => Math.round(v / step) * step;
const round2 = v => Math.round(v * 100) / 100;
const roundQ = v => (v >= 20000 ? roundTo(v, 100) : v >= 500 ? roundTo(v, 10) : Math.max(1, Math.round(v)));
const sum = o => Object.values(o).reduce((a, b) => a + (b || 0), 0);
/** THGE Erstellung of a list of Emissionsquellen (kg CO₂-eq/m² EBF·a): Σ kw; over 60 years incl. replacement = Σ kw × EBF × 60. */
export const thgErst = srcs => srcs.reduce((a, s) => a + (Number(s.kw) || 0), 0);
/** Betrieb values of the Rechenhilfe SIA 390/1: Nutzenergie, Anteil, Nutzungsgrad and the Projektwert flag (project value instead of the Standardwert) per Energiedienstleistung, Photovoltaik yield scaled with the building. */
export function betrDefaults(TH, f = 1) {
  const B = {};
  TH.betrieb.forEach(([, , n, a, eta, , proj], i) => { B[`b${i}_n`] = n; B[`b${i}_a`] = a; B[`b${i}_eta`] = eta; B[`b${i}_proj`] = !!proj; });
  B.pv_y = roundTo(TH.pv.y * f, 100); B.pv_ev = TH.pv.ev;
  return B;
}
/** Element group of the SIA 2032 list by code: [code, name, unit, amortisation] or null. */
export const egOf = (data, code) => { for (const list of Object.values(data.thg.eg)) { const x = list.find(y => y[0] === code); if (x) return x; } return null; };

/** Values, previous-phase figures and cost targets of one project (pure function of the data).
 *  opts.complete: keep every value (no blanks for `missing`, Emissionsquellen also for an open THG-32), e.g. for the Tool-Export import. */
export function mockProject(project, data, opts = {}) {
  const E = data.ebkp, TH = data.thg, base = !!project.detailed;
  const scale = base ? 1 : (project.anlagekostenMio || BASE_AK) / BASE_AK;
  const r = rng(project.id);
  const jit = (lo, hi) => (base ? 1 : lo + (hi - lo) * r());
  const chf = (v, lo = 0.9, hi = 1.1) => Math.max(1000, roundTo(v * scale * jit(lo, hi), 1000));
  const qty = v => Math.max(10, roundTo(v * scale * jit(0.95, 1.05), 10));
  const inst = (data.forms.byProject || {})[project.id] || {};
  const sia = Object.fromEntries(Object.entries(data.sia416.initial).map(([k, v]) => [k, base ? v : qty(v)]));
  const kvQ = {}, kvV = {}, ksQ = {}, ksV = {};
  const ksFactor = {};
  E.ebkp.forEach(g => { const s = g.kids.reduce((a, k) => a + k.cost, 0); ksFactor[g.code] = s ? (E.ks31[g.code] || s * 0.93) / s : 0; });
  E.ebkp.forEach(g => g.kids.forEach(k => {
    const q = k.qty != null ? qty(k.qty) : null;             // only elements with a Bezugsgrösse carry a Menge
    kvQ[k.code] = q; ksQ[k.code] = q;
    kvV[k.code] = k.cost ? chf(k.cost) : 0;                  // A Grundstück is 0 in the sample projects
    ksV[k.code] = k.cost ? chf(k.cost * ksFactor[g.code]) : 0;
  }));
  if (base) E.ebkp.forEach(g => {                             // per Hauptgruppe the rounding of the elements goes to the largest one: the KS-31 form shows the sum the KV-32 names as Vorphase
    const kids = g.kids.filter(k => k.cost), diff = (E.ks31[g.code] || 0) - kids.reduce((a, k) => a + ksV[k.code], 0);
    if (kids.length && diff && g.code !== 'Z') { const top = kids.reduce((a, k) => (ksV[k.code] > ksV[a.code] ? k : a)); ksV[top.code] += diff; }
  });
  // Z Mehrwertsteuer is an amount the delivery team enters; the sample projects carry the rate of data/project.json on B–Y (A Grundstück is not taxed)
  const MWST = data.project.mwstRate || 0.081, taxable = V => Object.entries(V).reduce((a, [c, v]) => a + (/^[AZ]/.test(c) ? 0 : (v || 0)), 0);
  kvV.Z01 = roundTo(taxable(kvV) * MWST, 100); ksV.Z01 = roundTo(taxable(ksV) * MWST, 100);
  // THG: the Emissionsquellen of the design (Tool-Export) with the reference quantities scaled to the project (per m² EBF for the
  // Gebäudetechnik) and jittered Kennwerte, calibrated to the Endwert of the instance (THGE Erstellung, kg CO₂-eq/m² EBF·a) when
  // one is given; the Betrieb starts with the Standardwerte of the Rechenhilfe SIA 390/1
  const thgInst = inst.thg || {}, EBF = sia.EBF || 1;
  let thgSrc = TH.sources.map(s => {
    if (base) return { ...s };
    const fq = s.unit === 'm² EBF' ? EBF / BASE_EBF : scale * jit(0.95, 1.05);
    return { ...s, q: s.unit === 'm² EBF' ? EBF : roundQ(s.q * fq), kw: round2(s.kw * jit(0.95, 1.05)) };
  });
  if (thgInst.endwert != null && thgErst(thgSrc)) { const f = thgInst.endwert / thgErst(thgSrc); thgSrc.forEach(s => { s.kw = round2(s.kw * f); }); }
  let thgBetr = betrDefaults(TH, base ? 1 : EBF / BASE_EBF);
  const thgHead = { ...Object.fromEntries(TH.head.filter(h => h[2] != null).map(h => [h[0], h[2]])), ...(thgInst.head || {}) };
  // Previous phases: KS-31 for the KV, Kostengrobschätzung SIA 21 for the KS, SIA 31 for the THG
  const prev = { kv: {}, ks: {}, thg: {} };
  Object.entries(E.ks31).forEach(([c, v]) => { prev.kv[c] = base || !v ? v : chf(v, 0.9, 1.05); prev.ks[c] = v ? Math.max(1000, roundTo(prev.kv[c] * (base ? 0.9 : jit(0.85, 0.95)), 1000)) : 0; });
  prev.kv.Z = roundTo(taxable(prev.kv) * MWST, 100); prev.ks.Z = roundTo(taxable(prev.ks) * MWST, 100);
  Object.entries(TH.prev31).forEach(([c, v]) => { prev.thg[c] = base ? v : chf(v); });
  // Missing values (forms in progress) and empty forms (step 0)
  const values = { kvQ, kvV, ksQ, ksV };
  const missing = opts.complete ? [] : [...(base ? (E.missingInitially || []).map(c => 'kvQ:' + c) : []), ...Object.values(inst).flatMap(i => i.missing || [])];
  missing.forEach(spec => {
    const [k, c, field] = spec.split(':');
    if (k === 'thg') { const s = thgSrc.find(x => x.id === c); if (s && field in s) s[field] = null; }
    else if (k === 'thgB') { if (c in thgBetr) thgBetr[c] = null; }
    else if (values[k] && c in values[k]) values[k][c] = null;
  });
  if (!opts.complete) {
    const zero = new Set(E.ebkp.flatMap(g => g.kids.filter(k => !k.cost).map(k => k.code)));   // A Grundstück is 0 in every sample project, also on an open form
    Object.entries(inst).forEach(([kind, i]) => { if (i.step === 0) (KEYS[kind] || []).forEach(k => Object.keys(values[k]).forEach(c => { values[k][c] = k.endsWith('V') && zero.has(c) ? 0 : null; })); });
    if (thgInst.step === 0) { thgSrc = []; thgBetr = {}; }   // an open THG-32 has no Emissionsquellen and no Betrieb yet (Tool-Export, Rechenhilfe or manual entry)
  }
  const kostenziel = project.kostenzielBW || roundTo((sum(prev.kv) - prev.kv.Z) * 1.03, 1e5);   // net of the Mehrwertsteuer, as before Z was a group
  const kostendach = (inst.kv && inst.kv.kostendach) || roundTo(kostenziel * 1.1, 1e5);
  return { sia, ...values, thgSrc, thgHead, thgBetr, prev, kostenziel, kostendach };
}

/** Amount of a Hauptgruppe from its positions (base positions not removed + Kostenelemente added); null when nothing is entered. */
export function groupAmount(g, V, removed = {}, added = []) {
  const vals = [...(g.kids || []).filter(k => !removed[k.code]).map(k => V[k.code]), ...added.map(a => a.v)].map(num).filter(v => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}
/** Group amounts for the direct entry mode of every Hauptgruppe ('' when nothing is entered). */
export const groupAmounts = (values, data) => Object.fromEntries(data.ebkp.ebkp.map(g => [g.code, groupAmount(g, values) ?? (g.kids.length ? '' : 0)]));   // a Hauptgruppe without elements (H) is 0, not missing

/** Tool-Export import: the complete Emissionsquellen of the project come in; existing rows keep their values, blanks are filled. */
export function mergeToolExport(current, complete) {
  let added = 0, filled = 0;
  const next = current.map(x => {
    const b = complete.find(y => y.id === x.id);
    if (!b || x.isNew) return x;
    const o = { ...x };
    ['q', 'kw'].forEach(k => { if (num(o[k]) == null && b[k] != null) { o[k] = b[k]; filled++; } });
    return o;
  });
  complete.forEach(b => { if (!current.some(x => x.id === b.id)) { next.push({ ...b }); added++; } });
  return { next, added, filled };
}

/** Rechenhilfe import (Betrieb): the complete values of the project come in; values already entered stay, blanks are filled. */
export function mergeBetr(current, complete) {
  let filled = 0; const next = { ...current };
  Object.entries(complete).forEach(([k, v]) => {
    if (typeof v === 'boolean') { if (next[k] == null) next[k] = v; return; }
    if (num(next[k]) == null) { next[k] = v; filled++; }
  });
  return { next, filled };
}
