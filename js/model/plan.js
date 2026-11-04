// Planlieferungen DWG für das Flächenmanagement (SAP RE-FX): one floor plan = one delivery (DWG-UG … DWG-DG).
// State per floor (state.plans[key]): { status, checks: {c1, c2}, result: null | engine result, busy, error }.
// A floor without an own result shows the precomputed seed of data/plans.json (engine result of a sample plan).
import { pillSpec } from './pill.js';
import { mkSteps } from './steps.js';
import { ruleRows, fmtNum, buildKpiSections, buildEntityRows, formatArea, formatShare, formatRatio } from '../plancheck/index.js';

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
const SIA_ROWS = [['GF', 'Geschossfläche', 'gf'], ['EBF', 'Energiebezugsfläche (SIA 416/1)', 'ebf'], ['KF', 'Konstruktionsfläche', 'kf'], ['NGF', 'Nettogeschossfläche', 'ngf'], ['NF', 'Nutzfläche', 'nf'], ['HNF', 'Hauptnutzfläche', 'hnf'], ['NNF', 'Nebennutzfläche', 'nnf'], ['VF', 'Verkehrsfläche', 'vf'], ['FF', 'Funktionsfläche', 'ff']];
const SIA_COLORS = { HNF: '#f4b6b6', NNF: '#ffd59b', VF: '#fff3a3', FF: '#b5d8f7', KF: '#d9d9d9' };

const area = v => (v == null ? '–' : fmtNum(v, Math.abs(v) >= 100 ? 0 : 1) + ' m²');
const share = (v, t) => (v == null || !t ? '' : Math.round(v / t * 100) + ' %');
const ok = (o, label, warn = false) => ({ label, ok: o, icon: o ? 'circle-check' : warn ? 'triangle-alert' : 'circle-x', color: o ? '#2f7d63' : warn ? '#c49a1c' : '#9b2c44' });

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
    counts: { rules: failed.length ? `${failed.length} offen` : 'alle', issues: String(issues.length), rooms: String(roomsF.length), areas: String(areasF.length), layers: String(layersF.length), kpi: '' },
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
    const k0 = result ? result.kpi : null;
    const k = k0 ? { ...k0, ebf: k0.gf != null && result.areas.length > 0 ? (f.beheizt === false ? 0 : k0.gf) : null } : null;   // EBF (SIA 416/1): GF of a heated floor
    const rooms = result ? result.rooms : [], areas = result ? result.areas : [];
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

    // Checks before submission (supplier) and for the review (BBL)
    const gateChecks = !result ? [ok(false, 'Noch keine DWG-Datei geprüft', true)] : [
      ok(errors === 0, errors === 0 ? 'Keine Fehler in den Prüfregeln (Schweregrad Fehler)' : `${errors} Fehler in ${rules.failed.filter(r => r.severity === 'error').length} Prüfregel(n) — im CAD beheben und neu hochladen`),
      ok(warnings === 0, warnings === 0 ? 'Keine Warnungen' : `${warnings} Warnung(en) in ${rules.failed.filter(r => r.severity === 'warning').length} Prüfregel(n) — zulässig, werden in der Prüfung angezeigt`, true),
      ok(hasRooms && !fired('AOID_001'), hasRooms ? `${rooms.length} Räume mit AOID erkannt` : 'Keine Raumpolygone auf R_RAUMPOLYGON', !hasRooms),
      ok(hasAreas, hasAreas ? `Geschosspolygon vorhanden · GF ${area(k.gf)}` : 'Kein Geschosspolygon auf R_GESCHOSSPOLYGON', true),
    ];
    const autoChecks = !result ? [] : [
      ...gateChecks,
      ok(!fired('GEOM_001'), 'Zeichnungseinheit Millimeter (1:1)'),
      ok(!fired('LAYER_008'), fired('LAYER_008') ? 'Unbekannte Layer vorhanden (nicht in der CAFM-Layerliste)' : 'Nur zulässige CAFM-Layer', true),
    ];
    const manualChecks = P.checklist.map(c => ({ key: c.key, label: c.label, checked: !!(p.checks || {})[c.key], disabled: !REVIEWABLE.has(status) }));

    // Kennzahlen SIA 416
    const siaRows = SIA_ROWS.map(([abbr, label, prop]) => {
      const v = k ? k[prop] : null;
      const avail = v != null && (['GF', 'EBF', 'KF'].includes(abbr) ? hasAreas : hasRooms);
      return { abbr, label, value: avail ? area(v) : '–', share: avail && k.gf ? share(v, k.gf) : '', sum: ['GF', 'NGF', 'NF'].includes(abbr) };
    });
    const segs = k ? [['HNF', k.hnf], ['NNF', k.nnf], ['VF', k.vf], ['FF', k.ff], ['KF', k.kf]].filter(([, v]) => v != null && v > 0) : [];
    const segTotal = segs.reduce((a, [, v]) => a + v, 0) || 1;
    const siaSegs = segs.map(([label, v]) => ({ label, pct: (v / segTotal * 100).toFixed(1) + '%', text: `${label} ${Math.round(v / segTotal * 100)} %`, bg: SIA_COLORS[label] }));
    const sections = k ? buildKpiSections({ ...k, hasRooms, hasAreaPolys: hasAreas }) : null;
    const kpiRow = r => ({ abbr: r.abbr, label: r.label, value: formatArea(r.value), share: formatShare(r.value, r.total), sum: ['GF', 'NGF', 'NF'].includes(r.abbr) });
    const kpiDash = sections ? {
      volume: sections.volume.map(kpiRow), areas: sections.areas.map(kpiRow), din277: sections.din277.map(kpiRow),
      economy: sections.economy.map(r => ({ abbr: r.abbr, label: r.label, value: formatRatio(r.ratio) })),
      entities: buildEntityRows(result.entities),
    } : null;
    const ratios = k ? [
      ['NGF / GF', k.gf && hasRooms ? (k.ngf / k.gf).toFixed(2) : '–'], ['KF / GF', k.gf && k.kf != null ? (k.kf / k.gf).toFixed(2) : '–'],
      ['NF / NGF', hasRooms && k.ngf > 0 ? (k.nf / k.ngf).toFixed(2) : '–'], ['HNF / NGF', hasRooms && k.ngf > 0 ? (k.hnf / k.ngf).toFixed(2) : '–'],
    ] : [];

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
      gateOk, autoChecks, manualChecks,
      canSubmit: gateOk && !locked && !p.busy,
      isReviewable: REVIEWABLE.has(status), isFrei: status === 'freigegeben', isUeber: status === 'uebertragen', isZurueck: status === 'zurueck', notSubmitted: idx < 2 && status !== 'zurueck',
      approveDisabled: !manualChecks.every(m => m.checked),
      transferStatus: status === 'uebertragen' ? 'Übertragen, ' + (f.transferredAt || 'heute') : status === 'freigegeben' ? 'Bereit zur Übertragung' : 'Wartet auf Freigabe',
      steps, dates, siaRows, siaSegs, ratios, kpiDash, history, comment: p.comment || '',
      meta: [['Kürzel', f.code], ['Geschoss', `${f.floor} (Ebene ${f.ee})`], ['Bestellt von', P.orderedBy], ['Lieferant', `${sup.name}, ${sup.firm}`], ['Fällig', f.due], ['Grundlage', P.guideline], ['Prüfung', `${P.ruleCount} Prüfregeln, lokal im Browser`], ['Zielsystem', P.target]]
        .map(([k2, v], i) => ({ k: k2, v, bg: i % 2 ? 'transparent' : '#f6f7f9' })),
    };
  });

  const plans = Object.fromEntries(floors.map(f => [f.key, f]));
  return { plans, planList: floors, planByCode: code => floors.find(f => f.codeLc === String(code).toLowerCase()) || null };
}
