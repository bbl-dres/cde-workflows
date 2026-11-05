// Planlieferungen DWG für das Flächenmanagement (SAP RE-FX): one floor plan = one delivery (DWG-UG … DWG-DG).
// State per floor (state.plans[key]): { status, checks: {c1, c2}, result: null | engine result, busy, error }.
// A floor without an own result shows the precomputed seed of data/plans.json (engine result of a sample plan).
import { pillSpec } from './pill.js';
import { mkSteps } from './steps.js';
import { ruleRows, fmtNum, buildKpiSections, formatRatio } from '../plancheck/index.js';

// idx: step of the plan stepper (data/plans.json steps); formStep: step of the Datenformular (0 Erstellt … 6 Übertragen)
export const PLAN_STATUS = {
  offen:       { label: 'Offen', idx: 0, formStep: 0 },
  bearbeitung: { label: 'In Bearbeitung', idx: 1, formStep: 1 },
  eingereicht: { label: 'Eingereicht', idx: 2, formStep: 3 },
  pruefung:    { label: 'In Prüfung', idx: 3, formStep: 4 },
  freigegeben: { label: 'Freigegeben', idx: 4, formStep: 5 },
  uebertragen: { label: 'Abgeschlossen', idx: 6, formStep: 6 },
  zurueck:     { label: 'Zurückgewiesen', idx: 1, formStep: 1, warn: true },
};
export const LOCKED = new Set(['eingereicht', 'pruefung', 'freigegeben', 'uebertragen']);
export const REVIEWABLE = new Set(['eingereicht', 'pruefung']);
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** Hover text of the SIA 416 rows: where the figure comes from. */
const SIA_TIP = { GF: 'Fläche des Geschosspolygons (R_GESCHOSSPOLYGON)', EBF: 'GF eines beheizten Geschosses, sonst 0 (SIA 416/1)', KF: 'GF − NGF', NGF: 'Summe der Raumflächen: NF + VF + FF', NF: 'HNF + NNF', HNF: 'Nach Nutzungsart des Raumstempels; Räume ohne Stempel zählen zur HNF', NNF: 'Nach Nutzungsart des Raumstempels', VF: 'Nach Nutzungsart des Raumstempels', FF: 'Nach Nutzungsart des Raumstempels' };
// Übersicht «Flächen SIA 416»: from the whole (GF) down to its parts; the Kennzahlen list the parts first and add the EBF
const SIA_ROWS = [['GF', 'Geschossfläche', 'gf'], ['KF', 'Konstruktionsfläche', 'kf'], ['NGF', 'Nettogeschossfläche', 'ngf'], ['VF', 'Verkehrsfläche', 'vf'], ['FF', 'Funktionsfläche', 'ff'], ['NF', 'Nutzfläche', 'nf'], ['HNF', 'Hauptnutzfläche', 'hnf'], ['NNF', 'Nebennutzfläche', 'nnf']];
const KPI_AREAS = ['HNF', 'NNF', 'NF', 'VF', 'FF', 'NGF', 'KF', 'GF', 'EBF'];
const SIA_COLORS = { HNF: '#f4b6b6', NNF: '#ffd59b', VF: '#fff3a3', FF: '#b5d8f7', KF: '#d9d9d9' };

const area = v => (v == null ? '–' : fmtNum(v, Math.abs(v) >= 100 ? 0 : 1) + ' m²');
const area1 = v => (v == null ? '–' : fmtNum(v, 1) + ' m²');           // area tables: one decimal
const r2 = v => Math.round(v * 100) / 100;

/** Nutzungsart per room: the room stamp (R_RAUMSTEMPEL) is not read by the plan check yet, data/plans.json › stamps stands in
 *  for it (AOID → DIN 277 group such as «HNF 2», «VF 9»). Rooms without a stamp count as HNF; without any match the figures stay. */
export function withUsage(k, rooms, stamps) {
  if (!k || !stamps || !rooms.some(r => stamps[r.aoid])) return k;
  const cat = { HNF: 0, NNF: 0, VF: 0, FF: 0 }, din = {};
  for (const r of rooms) {
    if (r.duplicate) continue;
    const g = stamps[r.aoid], c = g ? g.split(' ')[0] : 'HNF';
    cat[c in cat ? c : 'HNF'] += r.area;
    if (g) din[g] = (din[g] || 0) + r.area;
  }
  return { ...k, hnf: r2(cat.HNF), nnf: r2(cat.NNF), vf: r2(cat.VF), ff: r2(cat.FF), nf: r2(cat.HNF + cat.NNF), din277: Object.fromEntries(Object.entries(din).map(([g, v]) => [g, r2(v)])) };
}

/** Ring «Anteile SIA 416» (360 × 200 px box, ring 140 px around 180/100): conic-gradient stops, and per segment a leader line
 *  with its label; the labels of one side keep 18 px distance. `segs` is [[abbr, m²], …] without empty segments. */
export function donutOf(segs) {
  const total = segs.reduce((a, [, v]) => a + v, 0);
  if (!total) return null;
  const cx = 180, cy = 100, r0 = 72, r1 = 86;
  let acc = 0, from = 0;
  const stops = segs.map(([k, v]) => { const a = from; from += v / total * 100; return `${SIA_COLORS[k]} ${a.toFixed(2)}% ${from.toFixed(2)}%`; });
  const L = segs.map(([k, v]) => {
    const f = v / total, mid = (acc + f / 2) * 2 * Math.PI; acc += f;
    const sx = Math.sin(mid), sy = -Math.cos(mid);
    return { k, f, right: sx >= 0, p0: [cx + r0 * sx, cy + r0 * sy], p1: [cx + r1 * sx, cy + r1 * sy], y: cy + r1 * sy };
  });
  for (const side of [true, false]) {
    const S = L.filter(l => l.right === side).sort((p, q) => p.y - q.y);
    S.forEach((l, i) => { l.y = Math.min(192, Math.max(8, l.y)); if (i && l.y - S[i - 1].y < 18) l.y = S[i - 1].y + 18; });
    for (let i = S.length - 1; i >= 0; i--) { if (S[i].y > 192) S[i].y = 192; if (i < S.length - 1 && S[i + 1].y - S[i].y < 18) S[i].y = S[i + 1].y - 18; }
  }
  const callouts = L.map(l => {
    const p1 = [l.p1[0], l.y], p2 = [p1[0] + (l.right ? 14 : -14), l.y];
    return { label: l.k, pct: Math.round(l.f * 100) + ' %', right: l.right, yPx: l.y, pts: [l.p0, p1, p2].map(p => p.map(n => n.toFixed(1)).join(',')).join(' '), x: (p2[0] + (l.right ? 4 : -4)).toFixed(1) + 'px', y: l.y.toFixed(1) + 'px' };
  });
  return { gradient: `conic-gradient(${stops.join(', ')})`, label: segs.map(([k, v]) => `${k} ${Math.round(v / total * 100)} %`).join(', '), callouts };
}
const share = (v, t) => (v == null || !t ? '' : Math.round(v / t * 100) + ' %');

/** Initial per-floor state from data/plans.json. */
/** Status filter of the Prüfplattform ('all' | 'warnings' | 'errors') against a status ('ok' | 'warning' | 'error'). */
const matchesFilter = (filter, status) => filter === 'all' || (filter === 'errors' ? status === 'error' : status === 'warning');
const STATUS_RANK = { error: 0, warning: 1, ok: 2 };
const byStatus = (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || String(a.aoid || '').localeCompare(String(b.aoid || ''));

/**
 * The sub-tab lists of a checked plan under the status filter and the search of the list toolbar (as in plan-check):
 * rules by severity (passed rules only without filter), issues by severity, rooms and floor areas by status, layers only
 * for «Warnungen» (unknown layers). The tab counts follow the filter but not the search.
 */
export function planLists(plan, { planFilter: filter = 'all', planSearch: search = '' } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const hit = text => !q || String(text).toLowerCase().includes(q);
  const res = plan.result || { issues: [], rooms: [], areas: [], layers: [] };
  const sev = filter === 'errors' ? 'error' : 'warning';
  const failed = plan.rules.failed.filter(r => matchesFilter(filter, r.severity));
  const passed = filter === 'all' ? plan.rules.passed : [];
  const total = filter === 'all' ? plan.rules.total : plan.rules.failed.concat(plan.rules.passed).filter(r => r.severity === sev).length;
  const rooms = new Map(res.rooms.map(r => [r.id, r]));
  const refOf = it => it.roomId ? (rooms.get(it.roomId) || {}).aoid || '' : it.layer ? it.layer : it.handle ? 'H:' + it.handle : it.handles ? `${it.handles.length} Elemente` : '';
  const issues = res.issues.map((it, i) => ({ it, i, ref: refOf(it) })).filter(x => matchesFilter(filter, x.it.severity))
    .sort((a, b) => STATUS_RANK[a.it.severity] - STATUS_RANK[b.it.severity] || a.i - b.i);
  const roomsF = res.rooms.filter(r => matchesFilter(filter, r.status)).sort(byStatus);
  const areasF = res.areas.filter(a => matchesFilter(filter, a.status)).sort(byStatus);
  const layersF = res.layers.filter(l => matchesFilter(filter, l.ok ? 'ok' : 'warning'));
  const ruleText = r => `${r.code} ${r.text} ${r.category}`;
  return {
    filter, query: q,
    rules: { failed: failed.filter(r => hit(ruleText(r))), passed: passed.filter(r => hit(ruleText(r))), total },
    issues: issues.filter(x => hit(`${x.it.code} ${x.it.message} ${x.ref}`)),
    rooms: roomsF.filter(r => hit(r.aoid + (r.duplicate ? ' Duplikat' : ''))),
    areas: areasF.filter(a => hit(`${a.aoid || ''} Bruttogeschossfläche`)),
    layers: layersF.filter(l => hit(l.name)),
  };
}

export const initialPlans = data => Object.fromEntries((data.plans?.floors || []).map(f => [f.key, { status: f.status, checks: { ...f.checks }, result: null, busy: null, error: null }]));

export function planModel(s, data) {
  const P = data.plans;
  if (!P) return { plans: {}, planList: [], planByCode: () => null };
  const S = s.plans || {};
  const sup = P.supplier;

  const floors = P.floors.map(f => {
    const p = S[f.key] || { status: f.status, checks: { ...f.checks }, result: null };
    const status = p.status, st = PLAN_STATUS[status] || PLAN_STATUS.offen;
    const own = !!p.result;
    const result = own ? p.result : (f.seed ? P.seeds[f.seed] : null);
    const sample = f.seed ? P.samples[f.seed] : null;
    const src = own ? (p.result.src || null) : (sample ? sample.src : null);
    const drawingKey = own ? `upload:${f.key}:${p.result.file.name}` : src;
    const fileName = own ? p.result.file.name : (result ? f.file : null);
    const sum = result ? result.summary : null;
    const errors = sum ? sum.errorCount : 0, warnings = sum ? sum.warningCount : 0;
    const gateOk = !!result && errors === 0;
    const locked = LOCKED.has(status);
    const rules = ruleRows(result);
    const rooms = result ? result.rooms : [], areas = result ? result.areas : [];
    const k0 = result ? withUsage(result.kpi, rooms, P.stamps) : null;
    const k = k0 ? { ...k0, ebf: k0.gf != null && result.areas.length > 0 ? (f.beheizt === false ? 0 : k0.gf) : null } : null;   // EBF (SIA 416/1): GF of a heated floor
    const hasRooms = rooms.length > 0, hasAreas = areas.length > 0;
    const passed = sum ? `${sum.passedRules}/${sum.totalRules}` : `–/${P.ruleCount}`;
    const scoreC = !sum ? '#6b7480' : sum.score >= 90 ? '#2f7d63' : sum.score >= 60 ? '#8a6100' : '#9b2c44';
    const fired = code => result ? result.issues.some(i => i.code === code) : false;
    const uploadedAt = own ? 'heute' : (result ? f.uploadedAt : null);

    // Workflow stepper
    const idx = st.idx;
    const dates = [P.orderedAt,
      uploadedAt || (idx >= 1 ? 'heute' : ''),
      f.submittedAt || (idx >= 2 ? 'heute' : ''),
      f.reviewStartedAt || (idx >= 3 ? 'heute' : ''),
      f.reviewedAt || (idx >= 4 ? 'heute' : ''),
      f.transferredAt || (idx >= 6 ? 'heute' : '')];
    const steps = mkSteps(P.steps, idx, st.warn ? 1 : -1).map((x, i) => ({ ...x, date: (i < idx || idx >= P.steps.length || i === idx) ? dates[i] : '' }));

    // Zusammenfassung of the Prüfung: [key, Prüfpunkt, value of the Lieferung, requirement (hover), state]
    const good = rooms.filter(r => r.aoid && !r.duplicate).length, sia = hasAreas && hasRooms;
    const summary = !result ? [] : [
      ['err', `Fehler nach ${P.guideline}`, String(errors), 'Keine Fehler zulässig', errors ? 'err' : 'ok'],
      ['warn', 'Warnungen', String(warnings), 'Zulässig, im Einzelfall prüfen', warnings ? 'warn' : 'ok'],
      ['aoid', 'Raumpolygone mit eindeutiger AOID', hasRooms ? `${good} von ${rooms.length}` : 'Keine Raumpolygone', 'Jedes Raumpolygon trägt genau eine eindeutige AOID', hasRooms && good === rooms.length ? 'ok' : 'err'],
      ['sia', 'Flächen SIA 416: GF = NGF + KF', hasAreas ? area(k.gf) : 'Kein Geschosspolygon', sia ? `NGF ${area(k.ngf)} + KF ${area(k.kf)}` : 'Geschosspolygon auf R_GESCHOSSPOLYGON und Raumpolygone auf R_RAUMPOLYGON', sia && k.kf >= 0 ? 'ok' : hasAreas ? 'err' : 'warn'],
    ];
    const manualChecks = P.checklist.map(c => ({ key: c.key, label: c.label, checked: !!(p.checks || {})[c.key], disabled: !REVIEWABLE.has(status) }));

    // Kennzahlen SIA 416
    const siaRows = SIA_ROWS.map(([abbr, label, prop]) => {
      const v = k ? k[prop] : null;
      const avail = v != null && (['GF', 'EBF', 'KF'].includes(abbr) ? hasAreas : hasRooms);
      return { abbr, label, tip: SIA_TIP[abbr] || '', value: avail ? area1(v) : '–', share: avail && k.gf ? share(v, k.gf) : '', sum: ['GF', 'NGF', 'NF'].includes(abbr) };
    });
    const segs = k ? [['HNF', k.hnf], ['NNF', k.nnf], ['VF', k.vf], ['FF', k.ff], ['KF', k.kf]].filter(([, v]) => v != null && v > 0) : [];
    const sections = k ? buildKpiSections({ ...k, hasRooms, hasAreaPolys: hasAreas }) : null;
    const kpiRow = (r, i) => ({ abbr: r.abbr, label: r.label, value: area1(r.value), share: r.value == null || !r.total ? '–' : (r.value / r.total * 100).toFixed(1) + ' %', sum: ['GF', 'NGF', 'NF'].includes(r.abbr), bg: i % 2 ? '#fff' : '#f6f7f9' });
    // Kennzahlen sub-tab (design 06.11.2026): Flächen SIA 416 and DIN 277, Flächenkennzahlen, ring with callouts
    const kpiDash = sections ? {
      areas: KPI_AREAS.map(a => sections.areas.find(r => r.abbr === a)).filter(Boolean).map(kpiRow), din277: sections.din277.map(kpiRow),
      economy: sections.economy.map((r, i) => ({ abbr: r.abbr, label: r.label, value: formatRatio(r.ratio), bg: i % 2 ? '#fff' : '#f6f7f9' })),
      donut: donutOf(segs),
    } : null;

    // History
    // History: { d, who (person key of data/forms.json), t, detail }
    const history = [{ d: P.orderedAt, who: 'PM', t: 'Lieferung erstellt', detail: `${f.name}, ${P.guideline}, Frist ${f.due}, Zielsystem ${P.target}` }];
    if (result) {
      history.push({ d: uploadedAt, who: sup.initials, t: 'DWG hochgeladen', detail: `${fileName}${result.version ? ' · ' + result.version : ''}` });
      history.push({ d: uploadedAt, who: 'SYS', t: `Plan geprüft: ${errors} Fehler, ${warnings} Warnungen`, detail: `${passed} Prüfregeln bestanden${hasRooms ? ` · ${rooms.length} Räume · NGF ${area(k.ngf)}` : ''}` });
    }
    if (idx >= 2 || status === 'zurueck') history.push({ d: f.submittedAt || 'heute', who: sup.initials, t: 'Zur Prüfung eingereicht', detail: '' });
    if (idx >= 3 || status === 'zurueck') history.push({ d: f.reviewStartedAt || 'heute', who: 'PM', t: 'Prüfung begonnen', detail: '' });
    if (idx >= 4) history.push({ d: f.reviewedAt || 'heute', who: 'PM', t: 'Freigegeben', detail: '' });
    if (idx >= 6) history.push({ d: f.transferredAt || 'heute', who: 'SYS', t: 'An SAP RE-FX übertragen', detail: 'Raumpolygone, AOID und Flächen SIA 416' });
    if (status === 'zurueck') history.push({ d: 'heute', who: 'PM', t: 'Zurückgewiesen', detail: 'Erfassung wieder offen' });

    const statusLabel = st.label;
    return {
      key: f.key, code: f.code, codeLc: f.code.toLowerCase(), ee: f.ee, name: f.name, floor: f.floor, due: f.due,
      status, statusLabel, pill: pillSpec(statusLabel), locked, own, result, src, drawingKey, fileName,
      version: result ? result.version : null,
      uploadedAt, busy: p.busy || null, error: p.error || null,
      sampleSrc: P.samples.cadv01.src, sampleLabel: P.samples.cadv01.label,
      errors, warnings, passed, score: sum ? sum.score + ' %' : '–', scoreC, scoreLabel: `Score (${passed})`,
      roomCount: rooms.length, areaCount: areas.length, ngf: k && hasRooms ? area(k.ngf) : '–', gf: k && hasAreas ? area(k.gf) : '–',
      rules, issueCount: result ? result.issues.length : 0, layerCount: result ? result.layers.length : 0,
      gateOk, summary, manualChecks,
      canSubmit: gateOk && !locked && !p.busy,
      isReviewable: REVIEWABLE.has(status), isFrei: status === 'freigegeben', isUeber: status === 'uebertragen', isZurueck: status === 'zurueck', notSubmitted: idx < 2 && status !== 'zurueck',
      approveDisabled: !manualChecks.every(m => m.checked),
      transferStatus: status === 'uebertragen' ? 'Übertragen, ' + (f.transferredAt || 'heute') : status === 'freigegeben' ? 'Bereit zur Übertragung' : 'Nach Freigabe',
      steps, dates, kpiRaw: k, siaRows, kpiDash, history, comment: p.comment || '',
    };
  });

  const plans = Object.fromEntries(floors.map(f => [f.key, f]));
  return { plans, planList: floors, planByCode: code => floors.find(f => f.codeLc === String(code).toLowerCase()) || null };
}
