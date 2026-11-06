// Planlieferungen DWG für das Flächenmanagement (SAP RE-FX): one floor plan = one delivery (DWG-UG … DWG-DG).
// State per floor (state.plans[key]): { status, checks: {c1, c2}, result: null | engine result, busy, error, comment,
//   events: [{ d, who, t, detail }] what happened in this session (Verlauf), at: { step: date } dates of the steps reached in this session }.
// What happened before the session (order, delivery of the plan, submission …) comes from the floor in data/plans.json.
// A floor without an own result shows the precomputed seed of data/plans.json (engine result of a sample plan).
import { pillSpec } from './pill.js';
import { mkSteps } from './steps.js';
import { ruleRows, fmtNum, buildKpiSections, formatRatio } from '../plancheck/index.js';
import { wholeShares } from '../format.js';

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
const SIA_TIP = { GF: 'Fläche des Geschosspolygons (R_GESCHOSSPOLYGON)', EBF: 'SIA 380/1, Bezugsfläche der Ökobilanz. Hergeleitet aus der Flächenart der Räume: HNF, NNF und VF zählen, FF nicht, ein Geschoss ausserhalb der thermischen Gebäudehülle zählt nicht; zuzüglich Anteil der Konstruktionsfläche', KF: 'GF − NGF', NGF: 'Summe der Raumflächen: NF + VF + FF', NF: 'HNF + NNF', HNF: 'Nach Nutzungsart der Raumtabelle; Räume ohne Angabe zählen zur HNF', NNF: 'Nach Nutzungsart der Raumtabelle', VF: 'Nach Nutzungsart der Raumtabelle', FF: 'Nach Nutzungsart der Raumtabelle' };
// Übersicht «Flächen SIA 416»: from the whole (GF) down to its parts; the Kennzahlen list the parts first. The Energiebezugsfläche EBF
// is not a SIA 416 area (SIA 380/1) and a required figure of every floor plan: it has its own block, a Prüfpunkt and gates the submission.
const SIA_ROWS = [['GF', 'Geschossfläche', 'gf'], ['KF', 'Konstruktionsfläche', 'kf'], ['NGF', 'Nettogeschossfläche', 'ngf'], ['VF', 'Verkehrsfläche', 'vf'], ['FF', 'Funktionsfläche', 'ff'], ['NF', 'Nutzfläche', 'nf'], ['HNF', 'Hauptnutzfläche', 'hnf'], ['NNF', 'Nebennutzfläche', 'nnf']];
const KPI_AREAS = ['HNF', 'NNF', 'NF', 'VF', 'FF', 'NGF', 'KF', 'GF'];
const SIA_COLORS = { HNF: 'var(--sia-hnf)', NNF: 'var(--sia-nnf)', VF: 'var(--sia-vf)', FF: 'var(--sia-ff)', KF: 'var(--sia-kf)' };

const area = v => (v == null ? '–' : fmtNum(v, Math.abs(v) >= 100 ? 0 : 1) + ' m²');
const area1 = v => (v == null ? '–' : fmtNum(v, 1) + ' m²');           // area tables: one decimal
const r2 = v => Math.round(v * 100) / 100;

/** Nutzungsart per room: the CAD-Richtlinie documents it in the Raumtabelle (Anhang CAD.A01, chapter 5.11), which the prototype
 *  does not read yet; data/plans.json › usage stands in for it (AOID → DIN 277 group such as «HNF 2», «VF 9»). Rooms without an
 *  entry count as HNF; without any match the figures stay. */
export function withUsage(k, rooms, usage) {
  const of = aoid => (Object.hasOwn(usage, aoid) && typeof usage[aoid] === 'string' ? usage[aoid] : '');   // own entries only: an AOID text such as «toString» must not hit Object.prototype
  if (!k || !usage || !rooms.some(r => of(r.aoid))) return k;
  const cat = { HNF: 0, NNF: 0, VF: 0, FF: 0 }, din = {};
  for (const r of rooms) {
    if (r.duplicate) continue;
    const g = of(r.aoid), c = g ? g.split(' ')[0] : 'HNF';
    cat[c in cat ? c : 'HNF'] += r.area;
    if (g) din[g] = (din[g] || 0) + r.area;
  }
  return { ...k, hnf: r2(cat.HNF), nnf: r2(cat.NNF), vf: r2(cat.VF), ff: r2(cat.FF), nf: r2(cat.HNF + cat.NNF), din277: Object.fromEntries(Object.entries(din).map(([g, v]) => [g, r2(v)])) };
}

/** Energiebezugsfläche EBF (SIA 380/1) of a floor in m², derived from the Flächenart of its rooms with a decision tree (data/plans.json › ebf),
 *  as the BBL does until the plans carry EBF polygons:
 *    1. a floor outside the thermal envelope does not count (`heated` false; the CAD-Richtlinie has this per room in the Raumtabelle);
 *    2. a room counts when its Flächenart (DIN 277 group, e.g. «HNF 2») is listed in `rule.counts`; a room without Flächenart counts;
 *    3. room areas are net, the EBF is a floor area: EBF = GF × share of the counting room areas in the NGF.
 *  null when the floor has no Geschosspolygon or no rooms (the figure cannot be told). */
export function ebfOf(k, rooms, usage, rule, heated = true) {
  if (!k || k.gf == null || !rooms.some(r => !r.duplicate)) return null;
  if (heated === false) return 0;
  const counts = new Set((rule && rule.counts) || []), of = aoid => (usage && Object.hasOwn(usage, aoid) && typeof usage[aoid] === 'string' ? usage[aoid] : '');
  let all = 0, inside = 0;
  for (const r of rooms) { if (r.duplicate) continue; const g = of(r.aoid); all += r.area; if (!g || counts.has(g)) inside += r.area; }
  return all > 0 ? r2(k.gf * inside / all) : null;
}

/** Ring «Anteile SIA 416» (360 × 200 px box, ring 140 px around 180/100): conic-gradient stops, and per segment a leader line
 *  with its label; the labels of one side keep 18 px distance. `segs` is [[abbr, m²], …] without empty segments. */
export function donutOf(segs) {
  const total = segs.reduce((a, [, v]) => a + v, 0);
  if (!total) return null;
  const cx = 180, cy = 100, r0 = 72, r1 = 86;
  let acc = 0, from = 0;
  const stops = segs.map(([k, v]) => { const a = from; from += v / total * 100; return `${SIA_COLORS[k]} ${a.toFixed(2)}% ${from.toFixed(2)}%`; });
  const pcts = wholeShares(segs.map(([, v]) => v));
  const L = segs.map(([k, v], i) => {
    const f = v / total, mid = (acc + f / 2) * 2 * Math.PI; acc += f;
    const sx = Math.sin(mid), sy = -Math.cos(mid);
    return { k, f, pct: pcts[i], right: sx >= 0, p0: [cx + r0 * sx, cy + r0 * sy], p1: [cx + r1 * sx, cy + r1 * sy], y: cy + r1 * sy };
  });
  for (const side of [true, false]) {
    const S = L.filter(l => l.right === side).sort((p, q) => p.y - q.y);
    S.forEach((l, i) => { l.y = Math.min(192, Math.max(8, l.y)); if (i && l.y - S[i - 1].y < 18) l.y = S[i - 1].y + 18; });
    for (let i = S.length - 1; i >= 0; i--) { if (S[i].y > 192) S[i].y = 192; if (i < S.length - 1 && S[i + 1].y - S[i].y < 18) S[i].y = S[i + 1].y - 18; }
  }
  const callouts = L.map(l => {
    const p1 = [l.p1[0], l.y], p2 = [p1[0] + (l.right ? 14 : -14), l.y];
    return { label: l.k, pct: l.pct + ' %', right: l.right, yPx: l.y, pts: [l.p0, p1, p2].map(p => p.map(n => n.toFixed(1)).join(',')).join(' '), x: (p2[0] + (l.right ? 4 : -4)).toFixed(1) + 'px', y: l.y.toFixed(1) + 'px' };
  });
  return { gradient: `conic-gradient(${stops.join(', ')})`, label: segs.map(([k], i) => `${k} ${pcts[i]} %`).join(', '), callouts };
}
const share = (v, t) => (v == null || !t ? '' : (v / t * 100).toFixed(1) + ' %');   // one decimal, as in the Kennzahlen: the parts add up to their sum

/** Status filter of the Prüfplattform ('all' | 'warnings' | 'errors') against a status ('ok' | 'warning' | 'error'). */
const matchesFilter = (filter, status) => filter === 'all' || (filter === 'errors' ? status === 'error' : status === 'warning');
const STATUS_RANK = { error: 0, warning: 1, ok: 2 };
const byStatus = (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || String(a.aoid || '').localeCompare(String(b.aoid || ''));

/**
 * The sub-tab lists of a checked plan under the status filter and the search of the list toolbar (as in plan-check):
 * rules by severity (passed rules only without filter), issues by severity, rooms and floor areas by status, layers only
 * for «Warnungen» (unknown layers). The group counts follow the filter and the search.
 */
export function planLists(plan, { planFilter = 'all', planSearch = '', planFor = null } = {}) {
  const mine = planFor == null || planFor === plan.key;                  // filter and search belong to the plan they were set on
  const filter = mine ? planFilter : 'all', search = mine ? planSearch : '';
  const text = String(search || '').trim(), q = text.toLowerCase();
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
    filter, query: q, text,
    rules: { failed: failed.filter(r => hit(ruleText(r))), passed: passed.filter(r => hit(ruleText(r))), total },
    issues: issues.filter(x => hit(`${x.it.code} ${x.it.message} ${x.ref}`)),
    rooms: roomsF.filter(r => hit(r.aoid + (r.duplicate ? ' Duplikat' : ''))),
    areas: areasF.filter(a => hit(`${a.aoid || ''} Bruttogeschossfläche`)),
    layers: layersF.filter(l => hit(l.name)),
  };
}

/** Initial per-floor state from data/plans.json. */
export const initialPlans = data => Object.fromEntries((data.plans?.floors || []).map(f => [f.key, { status: f.status, checks: { ...f.checks }, result: null, busy: null, error: null, events: [], at: {} }]));

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
    const locked = LOCKED.has(status);
    const rules = ruleRows(result);
    const rooms = result ? result.rooms : [], areas = result ? result.areas : [];
    const k0 = result ? withUsage(result.kpi, rooms, P.usage) : null;
    const k = k0 ? { ...k0, ebf: ebfOf(k0, rooms, P.usage, P.ebf, f.beheizt !== false) } : null;   // EBF (SIA 380/1) from the Flächenart of the rooms
    const ebf = k ? k.ebf : null, ebfNote = f.beheizt === false ? 'ausserhalb der thermischen Gebäudehülle' : '';   // null: no Geschosspolygon or no rooms, the EBF cannot be told
    const gateOk = !!result && errors === 0 && ebf != null;                 // no errors and the Energiebezugsfläche is known
    const hasRooms = rooms.length > 0, hasAreas = areas.length > 0;
    const passed = sum ? `${sum.passedRules}/${sum.totalRules}` : `–/${P.ruleCount}`;
    const scoreC = !sum ? 'var(--muted)' : sum.score >= 90 ? 'var(--ok)' : sum.score >= 60 ? 'var(--amber-text)' : 'var(--rose-text)';
    const fired = code => result ? result.issues.some(i => i.code === code) : false;
    const uploadedAt = own ? 'heute' : (result ? f.uploadedAt : null);

    // Workflow stepper: the date of a step comes from the session (p.at; '' after a rejection: not reached any more), else from the floor
    const idx = st.idx, at = p.at || {}, REACHED = [0, 1, 2, 3, 4, 6];   // step i of the stepper is reached from status index REACHED[i]
    const dates = [P.orderedAt, uploadedAt, f.submittedAt, f.reviewStartedAt, f.reviewedAt, f.transferredAt].map((d, i) => (i === 0 ? d : (at[i] !== undefined ? at[i] : d) || (idx >= REACHED[i] ? 'heute' : '')));
    const steps = mkSteps(P.steps, idx, st.warn ? 1 : -1).map((x, i) => ({ ...x, date: (i < idx || idx >= P.steps.length || i === idx) ? dates[i] : '' }));

    // Zusammenfassung of the Prüfung: [key, Prüfpunkt, value of the Lieferung, requirement (hover), state]
    // a room without an AOID text carries the stand-in «R{id}» (AOID_001), a repeated AOID is AOID_002: neither is «eindeutig»
    const flagged = new Set(result ? result.issues.filter(i => (i.code === 'AOID_001' || i.code === 'AOID_002') && i.roomId).map(i => i.roomId) : []);
    const good = rooms.filter(r => !r.duplicate && !flagged.has(r.id)).length, sia = hasAreas && hasRooms;
    const exact = v => fmtNum(v, 2) + ' m²';
    const summary = !result ? [] : [
      ['err', `Fehler nach ${P.guideline}`, String(errors), 'Keine Fehler zulässig', errors ? 'err' : 'ok'],
      ['warn', 'Warnungen', String(warnings), 'Zulässig, im Einzelfall prüfen', warnings ? 'warn' : 'ok'],
      ['aoid', 'Raumpolygone mit eindeutiger AOID', hasRooms ? `${good} von ${rooms.length}` : 'Keine Raumpolygone', 'Jedes Raumpolygon trägt genau eine eindeutige AOID', hasRooms && good === rooms.length ? 'ok' : 'err'],
      ['ebf', 'Energiebezugsfläche EBF (SIA 380/1)', ebf != null ? `${area1(ebf)}${ebfNote ? ' · ' + ebfNote : ''}` : 'fehlt', 'Pflichtangabe für die Ökobilanz, hergeleitet aus der Flächenart der Räume; braucht Raumpolygone und ein Geschosspolygon', ebf != null ? 'ok' : 'err'],
      ['sia', 'Flächen SIA 416: GF = NGF + KF', hasAreas ? area1(k.gf) : 'Kein Geschosspolygon', sia ? `NGF ${exact(k.ngf)} + KF ${exact(k.kf)} = GF ${exact(k.gf)}` : 'Geschosspolygon auf R_GESCHOSSPOLYGON und Raumpolygone auf R_RAUMPOLYGON', sia && k.kf >= 0 ? 'ok' : hasAreas ? 'err' : 'warn'],
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
    const kpiRow = (r, i) => ({ abbr: r.abbr, label: r.label, value: area1(r.value), share: r.value == null || !r.total ? '–' : (r.value / r.total * 100).toFixed(1) + ' %', sum: ['GF', 'NGF', 'NF'].includes(r.abbr), bg: i % 2 ? 'var(--white)' : 'var(--surface-2)' });
    // Kennzahlen sub-tab (design 06.11.2026): Flächen SIA 416 and DIN 277, Flächenkennzahlen, ring with callouts
    const kpiDash = sections ? {
      areas: KPI_AREAS.map(a => sections.areas.find(r => r.abbr === a)).filter(Boolean).map(kpiRow), din277: sections.din277.map(kpiRow),
      ebf: sections.areas.filter(r => r.abbr === 'EBF').map((r, i) => ({ ...kpiRow({ ...r, label: `Energiebezugsfläche${ebfNote ? ` (${ebfNote})` : ''}` }, i), sum: true })),
      economy: sections.economy.map((r, i) => ({ abbr: r.abbr, label: r.label, value: formatRatio(r.ratio), bg: i % 2 ? 'var(--white)' : 'var(--surface-2)' })),
      donut: donutOf(segs),
    } : null;

    // History: { d, who (person key of data/forms.json), t, detail }. First what the floor brings along (its delivered plan and the
    // steps up to its initial status), then the events of this session (uploads, submission, review, rejection …) in their order.
    const b0 = (PLAN_STATUS[f.status] || PLAN_STATUS.offen).idx, seed = f.seed ? P.seeds[f.seed] : null;
    const history = [{ d: P.orderedAt, who: 'PM', t: 'Lieferung erstellt', detail: `${f.name}, ${P.guideline}, Frist ${f.due}, Zielsystem ${P.target}` }];
    if (seed) {
      const sm = seed.summary;
      history.push({ d: f.uploadedAt, who: sup.initials, t: 'DWG hochgeladen', detail: `${f.file}${seed.version ? ' · ' + seed.version : ''}` });
      history.push({ d: f.uploadedAt, who: 'SYS', t: `Plan geprüft: ${sm.errorCount} Fehler, ${sm.warningCount} Warnungen`, detail: `${sm.passedRules}/${sm.totalRules} Prüfregeln bestanden${seed.rooms.length ? ` · ${pl(seed.rooms.length, 'Raum', 'Räume')}` : ''}` });
    }
    if (b0 >= 2) history.push({ d: f.submittedAt || '–', who: sup.initials, t: 'Zur Prüfung eingereicht', detail: '' });
    if (b0 >= 3) history.push({ d: f.reviewStartedAt || '–', who: 'PM', t: 'Prüfung begonnen', detail: '' });
    if (b0 >= 4) history.push({ d: f.reviewedAt || '–', who: 'PM', t: 'Freigegeben', detail: '' });
    if (b0 >= 6) history.push({ d: f.transferredAt || '–', who: 'SYS', t: 'An SAP RE-FX übertragen', detail: 'Raumpolygone, AOID und Flächen SIA 416' });
    // a state that was set without the actions (deep link, study screen, test) has no events: what it implies is added for today
    const seen = new Set((p.events || []).map(e => e.t)), add = (who, t, detail = '') => { if (!seen.has(t)) history.push({ d: 'heute', who, t, detail }); };
    if (own && !seen.has('DWG hochgeladen')) history.push({ d: 'heute', who: sup.initials, t: 'DWG hochgeladen', detail: `${fileName}${result.version ? ' · ' + result.version : ''}` }, { d: 'heute', who: 'SYS', t: `Plan geprüft: ${errors} Fehler, ${warnings} Warnungen`, detail: `${passed} Prüfregeln bestanden${hasRooms ? ` · ${pl(rooms.length, 'Raum', 'Räume')}` : ''}` });
    history.push(...(p.events || []));
    const back = status === 'zurueck';
    if ((idx >= 2 || back) && b0 < 2) add(sup.initials, 'Zur Prüfung eingereicht');
    if ((idx >= 3 || back) && b0 < 3) add('PM', 'Prüfung begonnen');
    if (idx >= 4 && b0 < 4) add('PM', 'Freigegeben');
    if (idx >= 6 && b0 < 6) add('SYS', 'An SAP RE-FX übertragen', 'Raumpolygone, AOID und Flächen SIA 416');
    if (back) add('PM', 'Zurückgewiesen', 'Erfassung wieder offen');

    const statusLabel = st.label;
    return {
      key: f.key, code: f.code, codeLc: f.code.toLowerCase(), ee: f.ee, name: f.name, floor: f.floor, due: f.due,
      status, statusLabel, pill: pillSpec(statusLabel), locked, own, result, src, drawingKey, fileName,
      version: result ? result.version : null,
      uploadedAt, busy: p.busy || null, error: p.error || null,
      errors, warnings, passed, score: sum ? sum.score + ' %' : '–', scoreC, scoreLabel: `Score (${passed})`,
      ebf: ebf != null ? area(ebf) : '–', ebfKnown: ebf != null, ebfRow: { abbr: 'EBF', label: 'Energiebezugsfläche', note: ebfNote, value: ebf != null ? area1(ebf) : '–', share: ebf != null && k.gf ? share(ebf, k.gf) : '', tip: SIA_TIP.EBF },
      roomCount: rooms.length, aoidCount: good, ngf: k && hasRooms ? area(k.ngf) : '–', gf: k && hasAreas ? area(k.gf) : '–',
      rules,
      gateOk, summary, manualChecks,
      canSubmit: gateOk && !locked && !p.busy,
      isReviewable: REVIEWABLE.has(status), isFrei: status === 'freigegeben', isUeber: status === 'uebertragen', isZurueck: status === 'zurueck',
      approveDisabled: !manualChecks.every(m => m.checked),
      transferStatus: status === 'uebertragen' ? 'Übertragen, ' + (f.transferredAt || 'heute') : status === 'freigegeben' ? 'Bereit zur Übertragung' : 'Nach Freigabe',
      steps, dates, kpiRaw: k, siaRows, kpiDash, history, comment: p.comment || '',
    };
  });

  const plans = Object.fromEntries(floors.map(f => [f.key, f]));
  return { plans, planList: floors, planByCode: code => floors.find(f => f.codeLc === String(code).toLowerCase()) || null };
}
