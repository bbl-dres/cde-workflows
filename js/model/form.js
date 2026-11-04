// Datenformulare (design of 04.11.2026): one view-model shape for the Kostenvoranschlag KV-32, the Kostenschätzung
// KS-31, the Ökobilanz THG-32 and the DWG floor plans, with the tabs Übersicht · Erfassung · Prüfung · Beteiligte ·
// Dokumente · Verlauf. Every project has its own slice in state.projects[pid]:
//   { kvQ, kvV, ksQ, ksV, thgQ, thgV, sia, endwert, forms: { kind: { step, dates[], modes{}, gvals{}, checks{}, rejected, missingOnly, events[] } } }
// Steps: 0 Erstellt (Offen), 1 In Bearbeitung, 2 Intern geprüft (only with a GP mandate, not used), 3 Eingereicht,
// 4 In Prüfung, 5 Freigegeben, 6 Übertragen (Abgeschlossen). Which forms a project has comes from data/forms.json.
import { FMT, FMT1, FMT2, num, disp, mio } from '../format.js';
import { pillSpec } from './pill.js';
import { RULES } from '../plancheck/rules.js';
import { mockProject, KEYS, KIND_OF } from './mock.js';

export const LOCKED_FROM = 3;
const STATUS = ['Offen', 'In Bearbeitung', 'In Bearbeitung', 'Eingereicht', 'In Prüfung', 'Freigegeben', 'Abgeschlossen'];
export const statusOfStep = (step, rejected) => (rejected ? 'Zurückgewiesen' : STATUS[step] || 'Offen');
const PLAN_STEP = { offen: 0, bearbeitung: 1, eingereicht: 3, pruefung: 4, freigegeben: 5, uebertragen: 6, zurueck: 1 };
const CAT = [['LAYER', 'Layer'], ['POLY', 'Raumpolygone'], ['GPOLY', 'Geschosspolygon'], ['AOID', 'AOID'], ['GEOM', 'Geometrie'], ['TEXT', 'Text'], ['STYLE', 'Stil'], ['LAYOUT', 'Layout'], ['DIM', 'Bemassung'], ['HATCH', 'Schraffur']];
const ST_COLOR = { 'Fertig gemeldet': '#2f6b12', Eingereicht: '#2f6b12', Prüft: '#8a6100', 'Ab Einreichung': '#6b7280' };
const ACT_FORM = { submit: 'formSubmit', reopen: 'formReopen', toggle: 'formToggleCheck', approve: 'formApprove', reject: 'formReject', transfer: 'formTransfer', reset: 'formResetReview' };
const ACT_PLAN = { submit: 'planSubmit', reopen: 'planReopen', toggle: 'planToggleCheck', approve: 'planApprove', reject: 'planReject', transfer: 'planTransfer', reset: 'planResetReview' };

const pct = (a, b) => (b ? a / b * 100 : 0);
const signed = d => (d > 0 ? '+' : d < 0 ? '−' : '±') + FMT1(Math.abs(d)) + ' %';
/** Comparison cell set: current value, previous value (may be unknown) and the deviation; ≥ 10 % is highlighted. */
function dRow(cur, pv, dv = 1) {
  const known = pv != null && pv !== 0, d = known ? pct(cur - pv, pv) : null, hi = d != null && Math.abs(d) >= 10;
  return { cur: FMT(cur / dv), prev: known ? FMT(pv / dv) : '–', delta: d == null ? '–' : signed(d), dc: hi ? '#9b2c44' : '#262626', dw: hi ? 600 : 400, hi };
}
const ck = (ok, label) => ({ label, ok, icon: ok ? 'circle-check' : 'triangle-alert', color: ok ? '#2f7d63' : '#c49a1c' });
const alt = i => (i % 2 ? 'transparent' : '#f6f7f9');

/** Rows of the «Verlauf» card: the six visible steps with symbol, colours, date and the current marker. */
export function stepRows(labels, step, dates, rejected) {
  const out = [];
  labels.forEach((label, i) => {
    if (i === 2) return;                                             // «Intern geprüft» only with a GP mandate
    const done = i < step, cur = i === step;
    const o = { label, bg: '#fff', bd: '#d1d5db', fg: '#6b7280', sym: '', lc: '#6b7280', fw: 400, sub: '', isCur: cur, rowBg: cur ? '#f3f6f9' : 'transparent' };
    if (done) Object.assign(o, { bg: '#10384f', bd: '#10384f', fg: '#fff', sym: '✓', lc: '#262626', sub: dates[i] || '' });
    else if (cur) Object.assign(o, rejected ? { bd: '#cf1322', fg: '#cf1322', lc: '#cf1322', fw: 600, sub: 'zurückgewiesen' } : { bd: '#10384f', fg: '#10384f', lc: '#10384f', fw: 600, sub: 'aktuell' });
    out.push(o);
  });
  out.forEach((o, j) => { if (o.sym !== '✓') o.sym = String(j + 1); });
  return out;
}

const person = (people, key) => people[key] || [key, ''];
const peopleShort = (people, list) => list.map(([ini, role]) => ({ ini, name: person(people, ini)[0], firm: person(people, ini)[1], role }));
const peopleRows = (people, list, scopeOf = s => s) => list.map(([ini, role, scope, st], i) => ({ ini, name: person(people, ini)[0], firm: person(people, ini)[1], role, scope: scopeOf(scope), st, stC: ST_COLOR[st] || '#262626', editable: role !== 'Lieferverantwortlich', bg: i % 2 ? '#fafbfc' : '#fff' }));
const docRows = list => list.map(([name, type, req, by, date]) => ({ name, type, req, by, date, reqFg: req === 'Pflicht' ? '#262626' : '#6b7280', reqFw: req === 'Pflicht' ? 600 : 400 }));
/** Newest first; an event is [date, time, who, title, detail]. */
const histRows = (people, list) => list.slice().reverse().map(([d, time, who, t, detail]) => ({ d, time: time || '', t, detail: detail || '', ini: who === 'SYS' ? 'CDE' : who, name: person(people, who)[0], firm: person(people, who)[1] }));
const handoverStatus = (step, date) => (step < 5 ? 'Nach Freigabe' : step === 5 ? 'Bereit zur Übertragung' : `Übertragen, ${date || 'heute'}`);

function nextStep(step, target, reviewer, open) {
  if (step <= 1) return open;
  if (step <= 4) return { text: `${reviewer} prüft die Lieferung.`, btn: 'Prüfung öffnen', tab: 'pruefung' };
  if (step === 5) return { text: `Freigegeben. Die Übergabe an ${target} steht aus.`, btn: 'Übergabe öffnen', tab: 'pruefung' };
  return { text: `Abgeschlossen und an ${target} übertragen.`, btn: '', tab: '' };
}

/** Instance of a form in a project (data/forms.json byProject) with generated defaults for people, documents and history. */
function instanceOf(D, kind, project, f) {
  const T = D.kinds[kind], I = (D.byProject[project.id] || {})[kind] || {}, people = D.people;
  const reviewer = D.reviewers[project.responsible] || 'PM';
  const lead = I.lead || 'AB', step = f.step, dates = f.dates;
  const leadName = person(people, lead)[0];
  const docDate = dates[3] || dates[1] || dates[0] || '–';
  const docs = I.docs || (step >= 1 ? T.docs.map(([name, type, req]) => [name, type, req, leadName, docDate]) : []);
  const history = I.history || [
    [dates[0] || '–', '', reviewer, 'Lieferung erstellt', `Vorlage ${T.vorlage}, Frist ${I.frist || '–'}, Zielsystem ${T.ziel}`],
    ...(step >= 1 ? [[dates[1] || '–', '', lead, 'Erfassung begonnen', '']] : []),
    ...(step >= 3 ? [[dates[3] || '–', '', lead, 'Zur Prüfung eingereicht', '']] : []),
    ...(step >= 4 ? [[dates[4] || '–', '', reviewer, 'Prüfung begonnen', '']] : []),
    ...(step >= 5 ? [[dates[5] || '–', '', reviewer, 'Freigegeben', '']] : []),
    ...(step >= 6 ? [[dates[6] || dates[5] || '–', '', 'SYS', `An ${T.target} übertragen`, '']] : []),
  ];
  const peopleList = I.people || [[lead, 'Lieferverantwortlich', 'Alle Hauptgruppen', step >= 3 ? 'Eingereicht' : 'Aktiv'], [reviewer, 'Prüfend', '–', step >= 4 && step < 5 ? 'Prüft' : 'Ab Einreichung']];
  return { T, I, reviewer, reviewerName: person(people, reviewer)[0], lead, leadName, leadFirm: person(people, lead)[1], docs, history, peopleList, frist: I.frist || '–', overdue: !!I.overdue, kann: !!I.kann };
}

// ---- KV-32 / KS-31 / THG-32 of one project ----
function dataForm(kind, P, data, project) {
  const D = data.forms, f = P.forms[kind], E = data.ebkp, people = D.people;
  const X = instanceOf(D, kind, project, f), T = X.T;
  const M = mockProject(project, data);
  const isTHG = kind === 'thg', isCost = !isTHG;
  const [qKey, vKey] = KEYS[kind], Q = P[qKey], V = P[vKey];
  const sn = k => num(P.sia[k]) || 0;
  const ref = { GSF: sn('GSF'), GF: sn('GF'), FAW: sn('FAW'), FB: sn('FB'), BUF: sn('BUF'), NF: sn('HNF') + sn('NNF'), EBF: sn('EBF') };
  const GF = ref.GF || 1, EBF = ref.EBF || 1;
  const prev = M.prev[kind] || {}, dv = isTHG ? 1000 : 1;
  const kwOf = v => (isTHG ? FMT1(v / 60 / EBF) : FMT(v / GF));
  const step = f.step, locked = step >= LOCKED_FROM, rejected = !!f.rejected;
  const bd = miss => (!locked && miss ? '#ffa39e' : '#d9d9d9');
  const status = X.overdue && step <= 1 && !rejected ? 'Überfällig' : statusOfStep(step, rejected);
  const reviewer = X.reviewerName;

  // Hauptgruppen: a direct amount (one field) or the detailed positions (quantity + value per position)
  const defs = isCost ? [...E.ebkp, ...E.extra] : E.ebkp;
  let fields = 0, missing = 0, total = 0;
  const groups = defs.map(g => {
    const kids = g.kids || null, direct = !kids || (f.modes[g.code] || 'direct') === 'direct';
    const gval = kids ? f.gvals[g.code] : V[g.code];
    const G = { code: g.code, name: g.name, kids, direct, sum: 0, gval, gMiss: false, pos: [] };
    if (direct) { fields++; const v = num(gval); if (v == null) { missing++; G.gMiss = true; } else G.sum = v; }
    else kids.forEach(k => {
      const hasQty = !!k.unit, q = Q[k.code], v = V[k.code];
      const qMiss = hasQty && num(q) == null, vMiss = num(v) == null, vn = num(v) || 0;
      fields += hasQty ? 2 : 1; missing += (qMiss ? 1 : 0) + (vMiss ? 1 : 0); G.sum += vn;
      G.pos.push({ isPos: true, code: k.code, name: k.name, unit: k.unit || '', hasQty, qStr: disp(q), vStr: disp(v), kw: vMiss ? '' : kwOf(vn), qBd: bd(qMiss), vBd: bd(vMiss), miss: qMiss || vMiss, qKey, vKey });
    });
    total += G.sum;
    return G;
  });
  const sumOf = (set, src) => groups.filter(G => set.includes(G.code)).reduce((a, G) => a + (src ? (src[G.code] || 0) : G.sum), 0);
  const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0);
  const mwst = data.project.mwstRate || 0.081;
  const bw = isCost ? sumOf('BCDEFGHIJVW') : total;
  const endwert = num(P.endwert), control = total && EBF ? total / 60 / EBF : null;

  // Erfassung rows
  const rows = [];
  groups.forEach(G => {
    const rf = T.groupRef[G.code] || ['pauschal'];
    rows.push({ isGroupRow: true, code: G.code, name: G.name, unit: rf[0], bez: rf[1] ? FMT(ref[rf[1]]) : '', direct: G.direct, canToggle: !!G.kids, gStr: disp(G.gval), gBd: bd(G.gMiss), gKey: G.kids ? '' : vKey, sum: FMT(G.sum), kw: G.direct && G.gMiss ? '' : kwOf(G.sum), chev: G.direct ? 'chevron-right' : 'chevron-down', toggleLabel: G.direct ? 'Aufschlüsseln' : 'Zusammenfassen', sub: G.direct ? '' : `Summe aus ${G.kids.length} Positionen`, bg: G.direct ? '#fff' : '#f3f4f6', miss: G.gMiss || G.pos.some(p => p.miss) });
    if (!G.direct) rows.push(...G.pos);
  });
  const shownRows = f.missingOnly ? rows.filter(r => r.miss) : rows;
  const SUBS = [['C–G', 'Bauwerkskosten', 'CDEFG', false], ['B–W', 'Erstellungskosten', 'BCDEFGHIJVW', false], ['A–Z', 'Anlagekosten', 'BCDEFGHIJVWY', true]];
  const subtotals = isCost ? SUBS.map(([code, name, set, withMwst]) => { const cur = sumOf(set) * (withMwst ? 1 + mwst : 1), pv = withMwst ? null : sumOf(set, prev); return { code, name, kw: FMT(cur / GF), ...dRow(cur, pv) }; }) : [];

  // Übersicht
  const kpis = isCost ? [{ k: 'Erstellungskosten B–W', v: bw ? FMT1(bw / 1e6) : '–', u: 'Mio CHF' }, { k: 'Kennwert B–W', v: bw ? FMT(bw / GF) : '–', u: 'CHF/m² GF' }]
    : [{ k: 'Endwert für SUS', v: endwert == null ? '–' : FMT1(endwert), u: 'kg CO₂-eq/m² EBF·a' }, { k: 'Summe Positionen', v: total ? FMT(total / 1000) : '–', u: 't CO₂-eq' }];
  const filled = fields - missing, compPct = fields ? Math.round(filled / fields * 100) : 100;
  const comp = { label: 'Vollständigkeit', pct: compPct + ' %', w: compPct + '%', bar: missing ? '#d48806' : '#2f7d63', fg: missing ? '#8a6100' : '#2f6b12', text: missing ? `${filled} von ${fields} Werten erfasst · ${missing} fehlen` : `Alle ${fields} Werte erfasst` };
  const costRows = groups.map((G, i) => ({ code: G.code, name: G.name, cur: FMT(G.sum / dv), prev: prev[G.code] != null ? FMT(prev[G.code] / dv) : '–', kw: kwOf(G.sum), bg: i % 2 ? '#fafbfc' : '#fff' }));
  const totalRow = { cur: FMT(total / dv), prev: FMT(prevTotal / dv), kw: kwOf(total) };
  let chart;
  if (isCost) {
    const Tz = M.kostenziel, acc = T.accuracy, prevBW = sumOf('BCDEFGHIJVW', prev);
    const tv = T.targets.map(([label, v, c]) => ({ label, c, v: v === 'ziel' ? Tz : v === 'prev' ? prevBW : v === 'dach' ? M.kostendach : v }));
    const bl = Tz * (1 - acc / 100), bh = Tz * (1 + acc / 100);
    const lo = Math.min(bw, bl, ...tv.map(x => x.v)), hi = Math.max(bw, bh, ...tv.map(x => x.v));
    const x0 = Math.max(0, Math.floor(lo * 0.97 / 1e5) * 1e5), x1 = Math.max(x0 + 1e5, Math.ceil(hi * 1.02 / 1e5) * 1e5), X = v => ((v - x0) / (x1 - x0) * 100).toFixed(2) + '%';
    chart = { ist: mio(bw), istW: X(bw), hasBand: true, bandL: X(bl), bandW: ((bh - bl) / (x1 - x0) * 100).toFixed(2) + '%', min: mio(x0), max: mio(x1), acc, band: `${FMT2(bl / 1e6)}–${FMT2(bh / 1e6)} Mio`,
      targets: tv.map((m, i) => { const d = pct(bw - m.v, m.v); return { ...m, n: String(i + 1), x: X(m.v), ly: i % 2 ? '48px' : '0px', val: mio(m.v), delta: bw ? signed(d) : '–', dc: d > 0 ? '#9b2c44' : '#2f6b12' }; }) };
  } else {
    const ann = v => v / 60 / EBF, ist = endwert != null ? endwert : ann(total);
    const tv = T.targets.map(([label, v, c]) => ({ label, c, v: v === 'prev' ? ann(prevTotal) : v }));
    const lo = Math.min(ist, ...tv.map(x => x.v)), hi = Math.max(ist, ...tv.map(x => x.v));
    const x0 = Math.max(0, Math.floor(lo * 0.85)), x1 = Math.max(x0 + 1, Math.ceil(hi * 1.08)), X = v => ((v - x0) / (x1 - x0) * 100).toFixed(2) + '%', kg = v => FMT1(v) + ' kg';
    chart = { ist: kg(ist) + ' CO₂-eq/m² EBF·a', istW: X(ist), hasBand: false, bandL: '0%', bandW: '0%', min: kg(x0), max: kg(x1), acc: 0, band: '',
      targets: tv.map((m, i) => { const d = pct(ist - m.v, m.v); return { ...m, n: String(i + 1), x: X(m.v), ly: i % 2 ? '48px' : '0px', val: kg(m.v), delta: ist ? signed(d) : '–', dc: d > 0 ? '#9b2c44' : '#2f6b12' }; }) };
  }
  const open = step === 0 && missing === fields ? { text: 'Noch keine Werte erfasst. Die Erfassung ist offen.', btn: 'Erfassung öffnen', tab: 'erfassung' }
    : missing ? { text: `${missing} ${missing === 1 ? 'Wert fehlt' : 'Werte fehlen'} noch. Danach zur Prüfung einreichen.`, btn: 'Erfassung fortsetzen', tab: 'erfassung' }
    : { text: 'Alle Werte sind erfasst.', btn: 'Zur Prüfung einreichen', tab: 'erfassung' };
  const meta = [['Kürzel', T.code], ['Vorlage', T.vorlage], ['Lieferverantwortlich', `${X.leadName}, ${X.leadFirm}`], ['Prüfend', `${reviewer}, BBL`], ['Frist', X.frist], ['Zielsystem', T.ziel], ...(T.reporting ? [['Berichterstattung', T.reporting]] : []), ...(X.kann ? [['Pflicht', 'Kann · nur Ablage (Anlagekosten unter CHF 1 Mio)']] : [])].map(([k, v], i) => ({ k, v, bg: alt(i) }));

  // Prüfung
  const cmp = groups.map(G => ({ code: G.code, name: G.name, ...dRow(G.sum, prev[G.code], dv) }));
  const cmpT = dRow(total, prevTotal, dv);
  const hiCodes = cmp.filter(c => c.hi).map(c => c.code);
  const kwv = bw / GF;
  const autoChecks = isCost ? [
    ck(missing === 0, missing ? `${missing} ${missing === 1 ? 'Wert fehlt' : 'Werte fehlen'}` : 'Alle Hauptgruppen erfasst'),
    ck(kwv >= 2400 && kwv <= 3600, `Kennwert ${FMT(kwv)} CHF/m² GF B–W im Bereich Verwaltungsbauten (2’400–3’600)`),
    ck(hiCodes.length === 0, hiCodes.length ? `Abweichung zu ${T.cmpPrevLabel} über 10 % bei ${hiCodes.join(', ')}` : `Abweichungen zu ${T.cmpPrevLabel} unter 10 %`),
    ck(true, 'Bezugsmengen aus den Grundrissen (DWG) übernommen'),
  ] : [
    ck(endwert != null, 'Endwert für SUS erfasst'),
    ck(X.docs.length > 0, X.docs.length ? 'Ökobilanz-Bericht hochgeladen' : 'Ökobilanz-Bericht fehlt'),
    ck(endwert != null && control != null && Math.abs(endwert - control) / control <= 0.05, `Endwert entspricht dem Kontrollwert ${control == null ? '–' : FMT1(control)} (± 5 %)`),
    ck(endwert != null && endwert <= 9.0, 'Endwert unter Zielwert SIA 390/1 Erstellung (9.0)'),
  ];
  const canReview = step === 3 || step === 4;
  const manual = T.manual.map(([key, label]) => ({ key, label, checked: !!f.checks[key], disabled: !canReview }));
  const allChecked = manual.every(m => m.checked);
  const rv = { decide: step < 5, canReview, canApprove: canReview && allChecked, notSubmitted: false,
    reason: !canReview ? 'Erst nach der Einreichung möglich' : allChecked ? '' : 'Erst alle Prüfpunkte bestätigen',
    done: step >= 5, doneText: step >= 6 ? `Freigegeben und an ${T.target} übertragen. Lieferung abgeschlossen.` : `Freigegeben durch ${reviewer}.` };
  const handover = { ziel: T.ziel, value: isCost ? `Erstellungskosten B–W CHF ${FMT(bw)}` : `${endwert == null ? '–' : FMT1(endwert)} kg CO₂-eq/m² EBF·a`, status: handoverStatus(step, f.dates[6]) };
  const canSubmit = step <= 1 && missing === 0 && (!isTHG || endwert != null);
  const bar = { editing: step <= 1, locked, canFilter: missing > 0 || !!f.missingOnly, label: 'Zur Prüfung einreichen', canSubmit,
    reason: canSubmit || step > 1 ? '' : missing ? 'Einreichen erst, wenn alle Werte erfasst sind' : 'Endwert für SUS fehlt',
    compText: comp.text, compW: comp.w, compBar: comp.bar, lockedText: `Eingereicht. Die Erfassung ist gesperrt, bis ${reviewer} freigibt oder zurückweist.` };

  return {
    kind: 'data', id: kind, pid: project.id, code: T.code, codeLc: T.code.toLowerCase(), title: T.title, short: T.short, lead: X.lead, leadName: `${X.leadName} (${X.leadFirm})`, reviewer, target: T.target,
    step, locked, rejected, status, pill: pillSpec(status), act: ACT_FORM,
    badges: { erfassung: missing && !locked ? { n: missing, bg: '#fff1f0', fg: '#9b2c44' } : null, dokumente: { n: X.docs.length, bg: '#f3f4f6', fg: '#374151' } },
    steps: stepRows(D.steps, step, f.dates, rejected), next: nextStep(step, T.target, reviewer, open),
    kpis, comp, meta, people: peopleShort(people, X.peopleList), peopleRows: peopleRows(people, X.peopleList), docs: docRows(X.docs), hist: histRows(people, [...X.history, ...f.events]),
    ov: T.ov, costRows, totalRow, subtotals, chart,
    erf: { tableTitle: T.tableTitle, qtyLabel: T.qtyLabel, valLabel: T.valLabel, kwLabel: T.kwLabel, totalLabel: T.totalLabel, foot: T.foot, rows: shownRows, allRows: rows, totalStr: FMT(total), totalKw: kwOf(total), missingOnly: !!f.missingOnly, importItems: T.importItems, hasEndwert: isTHG, endwert: P.endwert, control: control == null ? '–' : FMT1(control), inputBg: locked ? '#f3f4f6' : '#fff' },
    bar, cmp, cmpT, cmpPrevLabel: T.cmpPrevLabel, cmpUnit: T.cmpUnit, autoChecks, manual, rv, handover, canTransfer: step === 5,
    missing, fields, total, bw, groups: groups.map(G => ({ code: G.code, direct: G.direct, sum: G.sum })),
    submitDetail: isCost ? `Erstellungskosten B–W CHF ${FMT(bw)}` : `Endwert ${P.endwert} kg CO₂-eq/m² EBF·a`,
  };
}

/** The Datenformulare of one project (kv, ks, thg as far as the project has them). */
export function formModel(state, data, project) {
  const P = (state.projects || {})[project.id];
  const inst = (data.forms.byProject || {})[project.id] || {};
  if (!P) return {};
  return Object.fromEntries(Object.keys(inst).filter(kind => P.forms[kind]).map(kind => [kind, dataForm(kind, P, data, project)]));
}
export const kindOfCode = code => KIND_OF[String(code).toUpperCase()] || null;

// ---- Planlieferung DWG (one floor plan) in the same shape, on top of model/plan.js ----
export function planForm(plan, s, data) {
  const D = data.forms, P = data.plans, PF = D.plan, people = D.people, sup = P.supplier;
  const step = PLAN_STEP[plan.status] ?? 0, rejected = plan.status === 'zurueck', locked = plan.locked;
  const d6 = plan.dates, dates = [d6[0], d6[1], null, d6[2], d6[3], d6[4], d6[5]];
  const r = plan.result, k = r ? r.kpi : null, total = P.ruleCount;
  const passed = r ? r.summary.passedRules : 0, errors = plan.errors, warnings = plan.warnings;
  const status = plan.statusLabel;
  const byCode = new Map([...plan.rules.failed, ...plan.rules.passed].map(x => [x.code, x]));
  const cats = CAT.map(([pre, name]) => {
    const rs = RULES.filter(x => x.code.startsWith(pre + '_')), n = rs.length;
    const st = rs.map(x => (byCode.get(x.code) || {}).status);
    const w = st.filter(x => x === 'warn').length, e = st.filter(x => x === 'fail').length, ok = r ? n - w - e : 0;
    return { name, ratio: r ? `${ok}/${n}` : `–/${n}`, wOk: (ok / n * 100) + '%', wWarn: (w / n * 100) + '%', wErr: (e / n * 100) + '%' };
  });
  const sia = plan.siaRows.map((x, i) => ({ ab: x.abbr, name: x.label, val: x.value, share: x.share, bg: alt(i), fw: x.sum ? 600 : 400 }));
  const compW = r ? passed / total * 100 : 0;
  const comp = { label: 'Prüfregeln', pct: r ? `${passed} / ${total}` : '–', w: compW + '%', bar: errors ? '#cf1322' : '#2f7d63', fg: errors ? '#9b2c44' : '#2f6b12', text: r ? `${errors} Fehler · ${warnings} Warnungen` : 'Noch keine DWG-Datei geprüft' };
  const kpis = [{ k: 'Räume mit AOID', v: r ? String(plan.roomCount) : '–', u: 'Raumpolygone' }, { k: 'Geschossfläche GF', v: k && k.gf != null ? FMT1(k.gf) : '–', u: 'm²' }];
  const open = !r ? { text: 'Noch keine DWG-Datei. Plan hochladen, die Prüfung läuft im Browser.', btn: 'Erfassung öffnen', tab: 'erfassung' }
    : errors ? { text: `${errors} Fehler im Plan. Im CAD korrigieren und neu hochladen.`, btn: 'Erfassung öffnen', tab: 'erfassung' }
    : { text: 'Plan geprüft, keine Fehler. Bereit zum Einreichen.', btn: 'Zur Erfassung', tab: 'erfassung' };
  const meta = [['Kürzel', plan.code], ['Vorlage', PF.vorlage], ['Geschoss', `${plan.floor} (Ebene ${plan.ee})`], ['Lieferverantwortlich', `${sup.name}, ${sup.firm}`], ['Prüfend', 'Paula Muster, BBL'], ['Frist', plan.due], ['Zielsystem', P.target]].map(([k2, v], i) => ({ k: k2, v, bg: alt(i) }));
  const peopleList = PF.people;
  const docs = docRows([...(plan.fileName ? [[plan.fileName, 'DWG', 'Pflicht', sup.name, plan.uploadedAt || '–']] : []), ...PF.docs]);
  const hist = histRows(people, plan.history.map(h => [h.d, '', h.who, h.t, h.detail]));
  const res = !r ? { sym: '–', bg: '#f3f4f6', fg: '#6b7280', title: 'Kein Prüfergebnis', sub: 'Noch keine DWG-Datei geprüft' }
    : errors ? { sym: '×', bg: '#fff1f0', fg: '#9b2c44', title: `${errors} Fehler`, sub: `${passed} von ${total} Regeln bestanden · ${warnings} Warnungen` }
    : { sym: '✓', bg: '#e2efed', fg: '#1f4a3b', title: 'Keine Fehler', sub: `${passed} von ${total} Regeln bestanden · ${warnings} Warnungen, zulässig` };
  const reviewIssues = plan.rules.failed.map(x => ({ icon: x.status === 'fail' ? 'circle-x' : 'triangle-alert', color: x.status === 'fail' ? '#9b2c44' : '#8a6100', text: x.text, code: x.code, count: x.count }));
  const canReview = plan.isReviewable, allChecked = !plan.approveDisabled;
  const notSubmitted = step < LOCKED_FROM && !rejected;
  const rv = { decide: step < 5, canReview, canApprove: canReview && allChecked, notSubmitted,
    reason: !canReview ? 'Erst nach der Einreichung möglich' : allChecked ? '' : 'Erst alle Prüfpunkte bestätigen',
    done: step >= 5, doneText: step >= 6 ? 'Freigegeben und an das CAFM übertragen. Lieferung abgeschlossen.' : 'Freigegeben durch Paula Muster.' };
  const bar = { editing: !locked, locked, canFilter: false, label: 'Zur Prüfung einreichen', canSubmit: plan.canSubmit,
    reason: locked ? '' : !r ? 'Einreichen erst, wenn eine DWG-Datei geprüft wurde' : errors ? 'Einreichen erst, wenn der Plan keine Fehler hat' : '',
    compText: r ? `${passed} von ${total} Prüfregeln bestanden · ${errors} Fehler · ${warnings} Warnungen` : 'Noch keine DWG-Datei geprüft', compW: comp.w, compBar: comp.bar,
    lockedText: 'Eingereicht. Die Erfassung ist gesperrt, bis Paula Muster freigibt oder zurückweist.' };
  const fileMeta = r ? [plan.version, plan.uploadedAt ? `hochgeladen ${plan.uploadedAt}` : ''].filter(Boolean).join(' · ') : '';
  return {
    kind: 'plan', id: plan.key, plan, code: plan.code, codeLc: plan.codeLc, title: plan.name, short: plan.floor, lead: sup.initials, leadName: `${sup.name} (${sup.firm})`, reviewer: 'Paula Muster', target: 'CAFM',
    step, locked, rejected, status, pill: plan.pill, act: ACT_PLAN,
    badges: { erfassung: r && errors && !locked ? { n: errors, bg: '#fff1f0', fg: '#9b2c44' } : null, dokumente: { n: docs.length, bg: '#f3f4f6', fg: '#374151' } },
    steps: stepRows(D.steps, step, dates, rejected), next: nextStep(step, 'das CAFM', 'Paula Muster', open),
    kpis, comp, meta, people: peopleShort(people, peopleList), peopleRows: peopleRows(people, peopleList, sc => sc.replace('{floor}', plan.name)), docs, hist,
    planOv: { sia, cats },
    erf: { tableTitle: `${plan.name} · ${plan.floor}`, fileMeta, foot: PF.foot, hasEndwert: false },
    bar, res, reviewIssues, autoChecks: plan.autoChecks, manual: plan.manualChecks, rv,
    handover: { ziel: P.target, value: r ? `${plan.roomCount} Raumpolygone mit AOID, NGF ${plan.ngf}, GF ${plan.gf}` : '–', status: plan.transferStatus },
    canTransfer: plan.isFrei,
  };
}
