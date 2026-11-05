// Datenformulare (design of 05.11.2026): one view-model shape for the Kostenvoranschlag KV-32, the Kostenschätzung
// KS-31, the Ökobilanz THG-32 (Erfassung Erstellung and Erfassung Betrieb) and the DWG floor plans, with the tabs
// Übersicht · Erfassung · Prüfung · Beteiligte · Dokumente · Verlauf. Every project has its own slice in state.projects[pid]:
//   { kvQ, kvV, ksQ, ksV, thgSrc[], thgHead{}, thgBetr{}, sia,
//     forms: { kind: { step, dates[], modes{}, gvals{}, checks{}, rejected, missingOnly, events[], removed{}, added[], nNew, comment } } }
// Steps: 0 Erstellt (Offen), 1 In Bearbeitung, 2 Intern geprüft (only with a GP mandate, not used), 3 Eingereicht,
// 4 In Prüfung, 5 Freigegeben, 6 Übertragen (Abgeschlossen). Which forms a project has comes from data/forms.json;
// dates[i] is the date step i was reached. Everything after the initial step of the instance is in forms[kind].events.
import { FMT, FMT1, FMT2, num, disp, disp2, disp01, mio } from '../format.js';
import { pillSpec } from './pill.js';
import { PLAN_STATUS } from './plan.js';
import { RULES } from '../plancheck/rules.js';
import { mockProject, KEYS, KIND_OF } from './mock.js';

export const LOCKED_FROM = 3;
const STATUS = ['Offen', 'In Bearbeitung', 'In Bearbeitung', 'Eingereicht', 'In Prüfung', 'Freigegeben', 'Abgeschlossen'];
const statusOfStep = (step, rejected) => (rejected ? 'Zurückgewiesen' : STATUS[step] || 'Offen');
const CAT = [['LAYER', 'Layer'], ['POLY', 'Raumpolygone'], ['GPOLY', 'Geschosspolygon'], ['AOID', 'AOID'], ['GEOM', 'Geometrie'], ['TEXT', 'Text'], ['STYLE', 'Stil'], ['LAYOUT', 'Layout'], ['DIM', 'Bemassung'], ['HATCH', 'Schraffur']];
const ST_COLOR = { 'Fertig gemeldet': '#2f6b12', Eingereicht: '#2f6b12', Prüft: '#8a6100', 'Ab Einreichung': '#6b7280' };
const ACT_FORM = { submit: 'formSubmit', reopen: 'formReopen', toggle: 'formToggleCheck', approve: 'formApprove', reject: 'formReject', transfer: 'formTransfer', reset: 'formResetReview', comment: 'formComment' };
const ACT_PLAN = { submit: 'planSubmit', reopen: 'planReopen', toggle: 'planToggleCheck', approve: 'planApprove', reject: 'planReject', transfer: 'planTransfer', reset: 'planResetReview', comment: 'planComment' };
const DEV_PCT = 10;                                                 // default threshold of the comparison with the previous phase

const pct = (a, b) => (b ? a / b * 100 : 0);
const signed = d => (d > 0 ? '+' : d < 0 ? '−' : '±') + FMT1(Math.abs(d)) + ' %';
/** Comparison cell set: current value, previous value (may be unknown) and the deviation; ≥ limit % is highlighted. */
function dRow(cur, pv, dv = 1, limit = DEV_PCT) {
  const known = pv != null && pv !== 0, d = known ? pct(cur - pv, pv) : null, hi = d != null && Math.abs(d) >= limit;
  return { cur: FMT(cur / dv), prev: known ? FMT(pv / dv) : '–', delta: d == null ? '–' : signed(d), dc: hi ? '#9b2c44' : '#262626', dw: hi ? 600 : 400, hi };
}
/** Übersicht table and Prüfung comparison of the Hauptgruppen with the previous phase. */
function compareRows(groups, prev, kwOf, dv, limit) {
  const prevTotal = Object.values(prev).reduce((a, b) => a + b, 0), total = groups.reduce((a, G) => a + G.sum, 0);
  const costRows = groups.map((G, i) => ({ code: G.code, name: G.name, cur: FMT(G.sum / dv), prev: prev[G.code] != null ? FMT(prev[G.code] / dv) : '–', kw: kwOf(G.sum), bg: i % 2 ? '#fafbfc' : '#fff' }));
  const cmp = groups.map(G => ({ code: G.code, name: G.name, ...dRow(G.sum, prev[G.code], dv, limit) }));
  return { prevTotal, costRows, totalRow: { cur: FMT(total / dv), prev: FMT(prevTotal / dv), kw: kwOf(total) }, cmp, cmpT: dRow(total, prevTotal, dv, limit), hiCodes: cmp.filter(c => c.hi).map(c => c.code) };
}
const ck = (ok, label) => ({ label, ok, icon: ok ? 'circle-check' : 'triangle-alert', color: ok ? '#2f7d63' : '#c49a1c' });
const alt = i => (i % 2 ? 'transparent' : '#f6f7f9');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const missingText = n => plural(n, 'Wert fehlt', 'Werte fehlen');
/** Options of an element-group select: the element groups of the Hauptgruppe not yet in the table (the own code stays). */
const optsOf = (list, code, used) => list.filter(x => x[0] === code || !used.has(x[0])).map(x => ({ v: x[0], label: `${x[0]} ${x[1]}`, sel: x[0] === code }));

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
/** Prüfung BBL: who may decide, whether all manual checks are ticked, the text after the decision. */
const reviewOf = ({ step, canReview, allChecked, target, reviewer, notSubmitted, comment, internal = true }) => ({
  decide: step < 5 && internal, canReview, canApprove: canReview && allChecked, notSubmitted, comment: comment || '',   // only BBL users see Freigeben / Zurückweisen
  reason: !canReview ? 'Erst nach der Einreichung möglich' : allChecked ? '' : 'Erst alle Prüfpunkte bestätigen',
  done: step >= 5, transferred: step >= 6, doneText: step >= 6 ? `Freigegeben und an ${target} übertragen. Lieferung abgeschlossen.` : `Freigegeben durch ${reviewer}.`,
});
/** Sticky bar at the end of the Erfassung. */
const barOf = ({ editing, locked, canFilter, canSubmit, reason, comp, reviewer }) => ({
  editing, locked, canFilter, label: 'Zur Prüfung einreichen', canSubmit, reason: canSubmit || locked ? '' : reason,
  compText: comp.text, compW: comp.w, compBar: comp.bar, lockedText: `Eingereicht. Die Erfassung ist gesperrt, bis ${reviewer} freigibt oder zurückweist.`,
});
const badge = (n, locked) => (n && !locked ? { n, bg: '#fff1f0', fg: '#9b2c44' } : null);
/** Tab badges: missing values of the Erfassung (the Ökobilanz splits them into Erstellung and Betrieb), number of documents. */
const badgesOf = (missing, locked, nDocs) => { const m = typeof missing === 'object' ? missing : { erfassung: missing }; return { erfassung: badge(m.erfassung, locked), betrieb: badge(m.betrieb, locked), dokumente: { n: nDocs, bg: '#f3f4f6', fg: '#374151' } }; };

/** Instance of a form in a project (data/forms.json byProject) with generated defaults for people, documents and history,
 *  derived from the initial step of the instance (later transitions are user events). */
function instanceOf(D, kind, project, f) {
  const T = D.kinds[kind], I = (D.byProject[project.id] || {})[kind] || {}, people = D.people;
  const reviewer = D.reviewers[project.responsible] || 'PM';
  const lead = I.lead || 'AB', step = I.step ?? f.step, dates = I.dates || f.dates;
  const leadName = person(people, lead)[0];
  const docDate = dates[3] || dates[1] || dates[0] || '–';
  const docs = [...(I.docs || (step >= 1 ? T.docs.map(([name, type, req]) => [name, type, req, leadName, docDate]) : [])), ...(f.docs || [])];   // plus the files the imports brought in
  const history = I.history || [
    [dates[0] || '–', '', reviewer, 'Lieferung erstellt', `Vorlage ${T.vorlage}, Frist ${I.frist || '–'}, Zielsystem ${T.ziel}`],
    ...(step >= 1 ? [[dates[1] || '–', '', lead, 'Erfassung begonnen', '']] : []),
    ...(step >= 3 ? [[dates[3] || '–', '', lead, 'Zur Prüfung eingereicht', '']] : []),
    ...(step >= 4 ? [[dates[4] || '–', '', reviewer, 'Prüfung begonnen', '']] : []),
    ...(step >= 5 ? [[dates[5] || '–', '', reviewer, 'Freigegeben', '']] : []),
    ...(step >= 6 ? [[dates[6] || dates[5] || '–', '', 'SYS', `An ${T.target} übertragen`, '']] : []),
  ];
  const live = f.step;
  const peopleList = I.people || [[lead, 'Lieferverantwortlich', 'Alle Hauptgruppen', live >= 3 ? 'Eingereicht' : 'Aktiv'], [reviewer, 'Prüfend', '–', live >= 4 && live < 5 ? 'Prüft' : 'Ab Einreichung']];
  return { T, I, reviewer, reviewerName: person(people, reviewer)[0], lead, leadName, leadFirm: person(people, lead)[1], docs, history, peopleList, frist: I.frist || '–', overdue: !!I.overdue, kann: !!I.kann };
}

/** Target chart (Kostenziel / Zielwert): ist value, optional accuracy band, numbered targets. */
function targetChart(ist, tv, opts) {
  const { band, fmtV, unit, step: st } = opts;
  const vals = tv.map(x => x.v);
  const bl = band ? band[0] : ist, bh = band ? band[1] : ist;
  const lo = Math.min(ist, bl, ...vals), hi = Math.max(ist, bh, ...vals);
  const x0 = Math.max(0, Math.floor(lo * (band ? 0.97 : 0.85) / st) * st), x1 = Math.max(x0 + st, Math.ceil(hi * (band ? 1.02 : 1.08) / st) * st);
  const X = v => ((v - x0) / (x1 - x0) * 100).toFixed(2) + '%';
  return { ist: fmtV(ist) + unit, istW: X(ist), hasBand: !!band, bandL: band ? X(bl) : '0%', bandW: band ? ((bh - bl) / (x1 - x0) * 100).toFixed(2) + '%' : '0%', min: fmtV(x0), max: fmtV(x1),
    targets: tv.map((m, i) => { const d = pct(ist - m.v, m.v); return { ...m, n: String(i + 1), x: X(m.v), ly: i % 2 ? '48px' : '0px', val: fmtV(m.v), delta: ist ? signed(d) : '–', dc: d > 0 ? '#9b2c44' : '#2f6b12' }; }) };
}

// ---- Kosten (KV-32, KS-31): Hauptgruppen with a direct amount or the positions, Kostenelemente added or removed ----
function costPart(kind, P, f, data, T, M, ref, locked, bd) {
  const E = data.ebkp, [qKey, vKey] = KEYS[kind], Q = P[qKey] || {}, V = P[vKey] || {};
  const removed = f.removed || {}, added = f.added || [], modes = f.modes || {}, gvals = f.gvals || {};
  const GF = ref.GF, prev = M.prev[kind] || {}, limit = T.devPct || DEV_PCT;
  const kwOf = v => (GF ? FMT(v / GF) : '–');
  let fields = 0, missing = 0, total = 0;
  const groups = [...E.ebkp, ...E.extra].sort((a, b) => a.code.localeCompare(b.code)).map(g => {   // A … Z as in the norm
    const hasKids = !!g.kids, base = (g.kids || []).filter(k => !removed[k.code]), extra = added.filter(a => a.grp === g.code);
    const direct = (modes[g.code] || 'direct') === 'direct';
    const gval = hasKids ? gvals[g.code] : V[g.code];                 // groups with positions keep their amount in gvals, the others in the value map
    const G = { code: g.code, name: g.name, direct, hasKids, sum: 0, gval, gMiss: false, pos: [] };
    /** One position row (base position, Pauschalbetrag of a group without positions, or an added Kostenelement). */
    const addPos = ({ code, name, unit, q, v }, more) => {
      const isNew = !!more.isNewPos, hasQty = !!unit, codeMiss = isNew && !code, qMiss = hasQty && num(q) == null, vMiss = num(v) == null, vn = num(v) || 0;
      fields += (hasQty ? 2 : 1) + (isNew ? 1 : 0); missing += (codeMiss ? 1 : 0) + (qMiss ? 1 : 0) + (vMiss ? 1 : 0); G.sum += vn;
      G.pos.push({ code, name, unit: unit || '', hasQty, qStr: disp(q), vStr: disp(v), kw: vMiss ? '' : kwOf(vn), qBd: bd(qMiss), vBd: bd(vMiss), codeBd: bd(codeMiss), miss: codeMiss || qMiss || vMiss, qKey, vKey, ...more });
    };
    if (direct) { fields++; const v = num(gval); if (v == null) { missing++; G.gMiss = true; } else G.sum = v; }
    else {
      const used = new Set([...base.map(k => k.code), ...extra.map(a => a.code)]), elements = E.elements[g.code] || [];
      base.forEach(k => addPos({ code: k.code, name: k.name, unit: k.unit, q: Q[k.code], v: V[k.code] }, { isPos: true, grp: g.code, canDel: !locked, opts: optsOf(elements, k.code, used) }));
      if (!hasKids) addPos({ code: g.code, name: 'Pauschalbetrag', unit: '', q: null, v: V[g.code] }, { isPos: true, pauschal: true, canDel: false });   // the direct amount stays part of the total
      extra.forEach(a => {
        const el = elements.find(x => x[0] === a.code);
        addPos({ code: a.code, name: el ? el[1] : '', unit: el ? el[2] : '', q: a.q, v: a.v }, { isNewPos: true, id: a.id, grp: g.code, opts: optsOf(elements, a.code, used) });
      });
    }
    total += G.sum;
    return G;
  });
  const sumOf = (set, src) => groups.filter(G => set.includes(G.code)).reduce((a, G) => a + (src ? (src[G.code] || 0) : G.sum), 0);
  const mwst = data.project.mwstRate || 0.081;
  const bw = sumOf('BCDEFGHIJVW');

  // Erfassung rows: group row, its positions when opened, «Kostenelement hinzufügen»
  const rows = [];
  groups.forEach(G => {
    const rf = T.groupRef[G.code] || ['pauschal'];
    rows.push({ isGroupRow: true, code: G.code, name: G.name, unit: rf[0], bez: rf[1] ? FMT(ref[rf[1]]) : '', direct: G.direct, canToggle: !locked, gStr: disp(G.gval), gBd: bd(G.gMiss), gKey: G.hasKids ? '' : vKey, sum: FMT(G.sum), kw: G.direct && G.gMiss ? '' : kwOf(G.sum), chev: G.direct ? 'chevron-right' : 'chevron-down', toggleLabel: G.direct ? 'Aufschlüsseln' : 'Zusammenfassen', bg: G.direct ? '#fff' : '#f3f4f6', miss: G.gMiss || G.pos.some(p => p.miss) });
    if (!G.direct) { rows.push(...G.pos); if (!locked && !f.missingOnly) rows.push({ isAdd: true, grp: G.code, label: '+ Kostenelement hinzufügen' }); }
  });
  const shownRows = f.missingOnly ? rows.filter(r => r.miss) : rows;
  const SUBS = [['C–G', 'Bauwerkskosten', 'CDEFG', false], ['B–W', 'Erstellungskosten', 'BCDEFGHIJVW', false], ['A–Z', 'Anlagekosten', 'BCDEFGHIJVWY', true]];
  const subtotals = SUBS.map(([code, name, set, withMwst]) => { const cur = sumOf(set) * (withMwst ? 1 + mwst : 1) + (withMwst ? sumOf('A') : 0), pv = withMwst ? null : sumOf(set, prev); return { code, name, kw: kwOf(cur), ...dRow(cur, pv, 1, limit) }; });   // A–Z = A Grundstück (ohne MWST) + B–Y × (1 + MWST)

  // Übersicht and Prüfung
  const kpis = [{ k: 'Erstellungskosten B–W', v: bw ? FMT1(bw / 1e6) : '–', u: 'Mio CHF' }, { k: 'Kennwert B–W', v: bw && GF ? FMT(bw / GF) : '–', u: 'CHF/m² GF' }];
  const C = compareRows(groups, prev, kwOf, 1, limit);
  const Tz = M.kostenziel, acc = T.accuracy, prevBW = sumOf('BCDEFGHIJVW', prev);
  const tv = T.targets.map(([label, v, c]) => ({ label, c, v: v === 'ziel' ? Tz : v === 'prev' ? prevBW : v === 'dach' ? M.kostendach : v }));
  const bl = Tz * (1 - acc / 100), bh = Tz * (1 + acc / 100);
  const chart = { ...targetChart(bw, tv, { band: [bl, bh], fmtV: mio, unit: '', step: 1e5 }), acc, band: `${FMT2(bl / 1e6)}–${FMT2(bh / 1e6)} Mio` };
  const kwv = GF ? bw / GF : 0;
  const autoChecks = [
    ck(missing === 0, missing ? missingText(missing) : 'Alle Hauptgruppen erfasst'),
    ck(kwv >= 2400 && kwv <= 3600, `Kennwert ${FMT(kwv)} CHF/m² GF B–W im Bereich Verwaltungsbauten (2’400–3’600)`),
    ck(C.hiCodes.length === 0, C.hiCodes.length ? `Abweichung zu ${T.cmpPrevLabel} über ${limit} % bei ${C.hiCodes.join(', ')}` : `Abweichungen zu ${T.cmpPrevLabel} unter ${limit} %`),
    ck(true, 'Bezugsmengen aus den Grundrissen (DWG) übernommen'),
  ];
  const value = `Erstellungskosten B–W CHF ${FMT(bw)}`;
  return { fields, missing, total, bw, groups: groups.map(G => ({ code: G.code, direct: G.direct, sum: G.sum, n: G.pos.length })), subtotals, kpis, costRows: C.costRows, totalRow: C.totalRow, chart, cmp: C.cmp, cmpT: C.cmpT, autoChecks,
    handoverValue: value, submitDetail: value, canSubmitData: missing === 0, reason: 'Einreichen erst, wenn alle Werte erfasst sind', endwert: null, endwertStr: '–', nSrc: 0,
    erf: { isTHG: false, qtyLabel: T.qtyLabel, valLabel: T.valLabel, kwLabel: T.kwLabel, rows: shownRows, totalStr: FMT(total), totalKw: kwOf(total) } };
}

// ---- Ökobilanz (THG-32): Erstellung = Emissionsquellen je eBKP-H-Elementgruppe aus dem Tool-Export (Referenzgrösse, Kennwert in
//      kg CO₂-eq/m² EBF·a), Betrieb = Energiedienstleistungen nach Rechenhilfe SIA 390/1 mit Photovoltaik und Stromprodukt,
//      Einordnung gegen die Richtwerte SIA 390/1 der Gebäudekategorie (Erstellung, Betrieb, Zusatzanforderung) ----
const neg = (v, fmt = FMT2) => (v < -0.00049 ? '−' : '') + fmt(Math.abs(v));   // typographic minus for negative Betrieb values (PV surplus)
function thgPart(P, f, data, T, M, ref, locked, bd, docs) {
  const TH = data.thg, EGS = TH.eg, S = P.thgSrc || [], H = P.thgHead || {}, B = P.thgBetr || {}, modes = f.modes || {};
  const EBF = ref.EBF, prev = M.prev.thg || {}, limit = T.devPct || DEV_PCT;
  const kwOf = v => (EBF ? FMT1(v / 60 / EBF) : '–');                 // kg CO₂-eq over 60 years → kg CO₂-eq/m² EBF·a
  const names = Object.fromEntries(data.ebkp.ebkp.map(g => [g.code, g.name]));
  const DEF = Object.fromEntries(TH.head.filter(h => h[2] != null).map(h => [h[0], h[2]]));
  const hv = key => (H[key] != null && H[key] !== '' ? H[key] : DEF[key] ?? '');

  // Erstellung: every Emissionsquelle needs a Referenzgrösse (q) and a Kennwert (kw); new rows also Elementgruppe and Bauteil
  let fieldsE = 0, missE = 0, erst = 0, nSrc = 0;
  const groups = Object.keys(EGS).map(code => ({ code, name: names[code] || code, open: (modes[code] || 'direct') === 'detail', kw: 0, sum: 0, n: 0, miss: 0, src: [] }));
  const byG = Object.fromEntries(groups.map(g => [g.code, g]));
  S.forEach(s => {
    const G = byG[s.grp]; if (!G) return;
    const isNew = !!s.isNew, q = num(s.q), kw = num(s.kw), label = [s.tcode, s.name].filter(Boolean).join(' ');
    const codeMiss = isNew && !s.code, dsMiss = isNew && !String(s.name || s.quelle || '').trim(), qMiss = q == null, kwMiss = kw == null;
    const m = [codeMiss, dsMiss, qMiss, kwMiss].filter(Boolean).length;
    fieldsE += isNew ? 4 : 2; missE += m; nSrc++; G.n++; G.miss += m;
    if (kw != null) { G.kw += kw; erst += kw; }
    G.src.push({ isSrc: !isNew, isNew, id: s.id, code: s.code, name: label, quelle: s.quelle || '', unit: s.unit || '', hs: !!s.hs, kwN: kw,
      qStr: disp(s.q), kwStr: disp2(s.kw), qBd: bd(qMiss), kwBd: bd(kwMiss), codeBd: bd(codeMiss), dsBd: bd(dsMiss), miss: m > 0,
      dataset: [label, s.quelle].filter(Boolean).join(' · '),             // one input «Wa01 Aussenwand Beton 25 cm · Bauteil Lesosai» in edit mode
      opts: optsOf(EGS[s.grp] || [], s.code, new Set()) });
  });
  const hasSrc = nSrc > 0, total = erst * EBF * 60;                     // kg CO₂-eq over 60 years incl. replacement
  const share = v => (erst ? Math.round(v / erst * 100) + ' %' : '');
  groups.forEach(G => { G.sum = G.kw * EBF * 60; G.src.forEach(r => { r.share = r.kwN != null ? share(r.kwN) : ''; }); });

  // Erfassung Erstellung rows: group row (B–G), its Emissionsquellen when opened, «Emissionsquelle hinzufügen»
  const rows = [];
  groups.forEach(G => {
    if (f.missingOnly && !G.miss) return;
    const open = G.open || !!f.missingOnly;
    rows.push({ isGroupRow: true, code: G.code, name: G.name, canToggle: !locked && !f.missingOnly, direct: !open, sub: plural(G.n, 'Emissionsquelle', 'Emissionsquellen'), kw: G.n ? FMT1(G.kw) : '', share: G.n ? share(G.kw) : '', chev: open ? 'chevron-down' : 'chevron-right', toggleLabel: open ? 'Zuklappen' : 'Aufklappen', bg: open ? '#f3f4f6' : '#fff', miss: G.miss > 0 });
    if (!open) return;
    rows.push(...(f.missingOnly ? G.src.filter(r => r.miss) : G.src));
    if (!locked && !f.missingOnly) rows.push({ isAdd: true, grp: G.code, label: '+ Emissionsquelle hinzufügen' });
  });
  const erstStr = hasSrc ? FMT1(erst) : '–';
  const tot = { kw: hasSrc ? FMT1(erst) : '', share: hasSrc ? '100 %' : '' };
  const derived = [{ name: 'THGE Erstellung pro Jahr', v: hasSrc ? FMT1(erst * EBF / 1000) : '–', u: 't CO₂-eq/a', kw: erstStr, ku: 'kg/m² EBF·a' },
    { name: 'THGE Erstellung, Betrachtungszeitraum 60 Jahre inkl. Ersatz', v: hasSrc ? FMT(total / 1000) : '–', u: 't CO₂-eq', kw: hasSrc ? FMT(erst * 60) : '–', ku: 'kg/m² EBF' }];

  // Betrieb: Endenergie = Nutzenergie × Anteil / Nutzungsgrad (JAZ), THG = Endenergie × Koeffizient des Energieträgers (Strom nach Stromprodukt);
  // the PV self-consumption reduces the Endenergie Strom, the surplus follows the rule «PV-Überschuss»
  const kE = TH.strom[hv('strom')] ?? Object.values(TH.strom)[0], pvRule = hv('pvRule');
  const bv = key => num(B[key]);
  let fieldsB = 0, missB = 0, endSum = 0, thgSum = 0;
  const betrRows = TH.betrieb.map(([name, carrier, , , , kf], i) => {
    const key = `b${i}`, n = bv(key + '_n'), a = bv(key + '_a'), eta = bv(key + '_eta'), etaOk = eta != null && eta > 0;   // a Nutzungsgrad of 0 is a typo, not a value
    const miss = [n, a].filter(v => v == null).length + (etaOk ? 0 : 1); fieldsB += 3; missB += miss;
    const end = n != null && a != null && etaOk ? n * a / 100 / eta : 0, kRow = kf === 'strom' ? kE : kf, thg = end * kRow;
    endSum += end; thgSum += thg;
    return { isRow: true, key, name, carrier, std: !!B[key + '_std'], nStr: disp01(B[key + '_n']), aStr: disp01(B[key + '_a']), etaStr: disp01(B[key + '_eta']),
      nBd: bd(n == null), aBd: bd(a == null), etaBd: bd(!etaOk), end: miss ? '–' : FMT1(end), kE: kRow.toFixed(3), thg: miss ? '–' : FMT2(thg), miss: miss > 0 };
  });
  const pvSrc = S.find(s => s.id === TH.pv.kWpId), kWp = pvSrc ? num(pvSrc.q) || 0 : 0;
  const Y = bv('pv_y'), EV = bv('pv_ev'); fieldsB += 2; missB += (Y == null ? 1 : 0) + (EV == null ? 1 : 0);
  const pvOn = EBF > 0 && Y != null && EV != null, eig = pvOn ? Y * EV / 100 / EBF : 0, exp = pvOn ? Y * (1 - EV / 100) / EBF : 0;
  const credit = pvRule === 'Gutschrift CH-Verbrauchermix' ? exp * TH.pv.credit : 0;
  const endB = endSum - eig, thgB = thgSum - eig * kE - credit, hasBetr = missB < fieldsB, sumIst = erst + thgB;
  const pvRows = [
    { isPv: true, name: 'PV-Eigenverbrauch', carrier: pvOn ? `${FMT(Y * EV / 100)} kWh/a aus der Photovoltaikanlage` : 'Ertrag und Eigenverbrauch der Photovoltaikanlage erfassen', end: pvOn ? neg(-eig, FMT1) : '–', kE: kE.toFixed(3), thg: pvOn ? neg(-eig * kE) : '–' },
    { isPv: true, name: 'PV-Export', carrier: pvOn ? `${FMT(Y * (1 - EV / 100))} kWh/a · ${pvRule}` : pvRule, end: '–', kE: credit ? TH.pv.credit.toFixed(3) : '–', thg: pvOn ? neg(-credit) : '–' }];
  const betrList = f.missingOnly ? betrRows.filter(r => r.miss) : [...betrRows, ...pvRows];
  const pvFields = [
    { label: 'Photovoltaik · Leistung', val: kWp ? `${FMT(kWp)} kWp · aus ${pvSrc.code} Erstellung` : 'keine Anlage in D01.01 der Erstellung', ro: true, bg: '#f3f4f6', bdc: '#d9d9d9' },
    { label: 'PV-Ertrag kWh/a', key: 'pv_y', val: disp(B.pv_y), ro: locked, bg: locked ? '#f3f4f6' : '#fff', bdc: bd(Y == null) },
    { label: 'Eigenverbrauch %', key: 'pv_ev', val: disp01(B.pv_ev), ro: locked, bg: locked ? '#f3f4f6' : '#fff', bdc: bd(EV == null) }];
  const betrStr = hasBetr ? neg(thgB, FMT1) : '–', sumStr = hasSrc && hasBetr ? neg(sumIst, FMT1) : '–';

  // Grundlagen: shared (Übersicht), Erstellung and Betrieb (head of the two Erfassung tabs); EBF and GF come from the floor plans
  const headField = ([key, label, def, opts]) => {
    const fromRef = def == null, ro = fromRef || locked, val = fromRef ? (ref[key] ? FMT(ref[key]) + ' m²' : '–') : hv(key);
    return { key, label, isSelect: !!opts, isText: !opts && !fromRef, opts: (opts || []).map(o => ({ v: o, sel: o === val })), val, ro, bg: ro ? '#f3f4f6' : '#fff' };
  };
  const byKey = Object.fromEntries(TH.head.map(h => [h[0], h])), headOf = keys => keys.map(k => byKey[k]).filter(Boolean).map(headField);
  const HG = TH.headGroups, headShared = headOf(HG.shared), headErst = headOf(HG.erstellung), headBetr = headOf(HG.betrieb);

  // Übersicht: Hauptgruppen im Vergleich mit der Vorphase (plus Betrieb), Zielwerte SIA 390/1 der Gebäudekategorie
  const C = compareRows(groups, prev, kwOf, 1000, limit);
  const noDev = { prev: '–', delta: '–', dc: '#262626', dw: 400, hi: false };
  const subtotals = [{ code: '', name: 'Betrieb', cur: hasBetr ? neg(thgB * EBF * 60 / 1000, FMT) : '–', kw: betrStr, ...noDev },
    { code: '', name: 'Erstellung + Betrieb', cur: hasSrc && hasBetr ? neg(total / 1000 + thgB * EBF * 60 / 1000, FMT) : '–', kw: sumStr, ...noDev }];
  const kat = hv('kat'), RW = TH.richtwerte[kat] || {}, rw = k => RW[k] || [null, null];
  const prevAnn = EBF && C.prevTotal ? C.prevTotal / 60 / EBF : null, gw1 = num(hv('gw1'));
  const IST = [erst, thgB, sumIst], istOk = [hasSrc, hasBetr, hasSrc && hasBetr];
  const MK = [{ n: 'B', label: 'Basis (B)', c: '#b07a00', v: [rw('erst')[0], rw('betr')[0], rw('zus')[0]] }, { n: 'A', label: 'Ambitioniert (A)', c: '#2f7d63', v: [rw('erst')[1], rw('betr')[1], rw('zus')[1]] },
    { n: 'M', label: 'Minergie-ECO GW1, objektspezifisch', c: '#5a7184', v: [gw1, null, null] }, { n: 'V', label: `Vorphase ${T.cmpPrevLabel}`, c: '#6b7280', v: [prevAnn, null, null] }];
  const allV = [...IST.filter((v, j) => istOk[j]), ...MK.flatMap(m => m.v)].filter(v => v != null);
  const mx = Math.max(1, Math.ceil(Math.max(0, ...allV) * 1.08)), X = v => Math.min(100, Math.max(0, v) / mx * 100).toFixed(2) + '%';
  const tzRows = [['Erstellung', 'Richtwert, informativ'], ['Betrieb', 'Richtwert, informativ'], ['Erstellung + Betrieb', 'Zusatzanforderung, einzuhalten']].map(([label, sub], j) => ({
    label, sub, ist: istOk[j] ? neg(IST[j], FMT1) : '–', istW: istOk[j] ? X(IST[j]) : '0%',
    marks: MK.filter(m => m.v[j] != null).sort((a, b) => a.v[j] - b.v[j]).map((m, i) => ({ n: m.n, c: m.c, x: X(m.v[j]), below: i % 2 === 1, title: `${m.label} ${FMT1(m.v[j])}` })) }));
  const zusB = rw('zus')[0];
  const tz = { title: T.ov.chartTitle, hint: `kg CO₂-eq/m² EBF·a · Richtwerte ${kat}${RW.zus ? (RW.verified ? '' : ' (Betrieb, Zusatzanforderung: Annahme)') : ' (keine Richtwerte Betrieb, Zusatzanforderung)'}`, max: FMT1(mx), rows: tzRows,
    ist: IST.map((v, j) => (istOk[j] ? neg(v, FMT1) : '–')), legend: MK.map(m => ({ n: m.n, c: m.c, label: m.label, cells: m.v.map((v, j) => ({ v: v == null ? '–' : FMT1(v), over: v != null && j === 2 && istOk[2] && sumIst > v })) })) };
  const kpis = [{ k: 'Erstellung', v: erstStr, u: 'kg CO₂-eq/m² EBF·a' }, { k: 'Betrieb', v: betrStr, u: 'kg CO₂-eq/m² EBF·a' }];

  // Prüfung
  const docNames = docs.map(d => d[0]), missingDocs = T.docs.map(d => d[0]).filter(n => !docNames.includes(n));
  const stdBasis = hv('kbob') === DEF.kbob && hv('sys') === DEF.sys;
  const gD = groups.find(g => g.code === 'D'), gt = gD && erst ? gD.kw / erst * 100 : 0;
  const shares = {}; TH.betrieb.forEach(([name], i) => { const a = bv(`b${i}_a`); if (a != null) shares[name] = (shares[name] || 0) + a; });
  const badShares = Object.keys(shares).filter(x => Math.abs(shares[x] - 100) > 0.5);
  const info = label => ({ label, ok: true, info: true, icon: 'info', color: '#5b6573' });
  const missing = missE + missB;
  const autoChecks = [
    ck(nSrc > 0 && missing === 0, !nSrc ? 'Keine Emissionsquellen erfasst' : missing ? missingText(missing) : `Alle ${nSrc} Emissionsquellen mit Elementgruppe, Referenzgrösse und Kennwert`),
    ck(!missingDocs.length, missingDocs.length ? `Pflichtdokumente fehlen: ${missingDocs.join(', ')}` : 'Ökobilanz-Bericht, Tool-Export und Rechenhilfe Betrieb hochgeladen'),
    ck(stdBasis, stdBasis ? `${DEF.kbob}, Systemgrenze SIA 2032` : `Abweichende Grundlagen: ${hv('kbob')} · ${hv('sys')}`),
    ck(C.hiCodes.length === 0, C.hiCodes.length ? `Abweichung zu ${T.cmpPrevLabel} über ${limit} % bei ${C.hiCodes.join(', ')}` : `Abweichungen zu ${T.cmpPrevLabel} unter ${limit} %`),
    zusB == null ? ck(false, `Keine Zusatzanforderung für die Gebäudekategorie ${kat}: Vergleichskategorie SIA 390/1 wählen`)
      : ck(hasSrc && sumIst <= zusB, `Zusatzanforderung B ${hasSrc && sumIst <= zusB ? 'eingehalten' : 'überschritten'}: Erstellung + Betrieb ${sumStr}, Grenze ${FMT1(zusB)}`),
    info(`Richtwerte B, informativ: Erstellung ${erstStr} zu ${rw('erst')[0] != null ? FMT1(rw('erst')[0]) : '–'}, Betrieb ${betrStr} zu ${rw('betr')[0] != null ? FMT1(rw('betr')[0]) : '–'}`),
    ck(!badShares.length, badShares.length ? `Anteile der Energieträger nicht 100 % bei ${badShares.join(', ')}` : 'Anteile der Energieträger je Energiedienstleistung 100 %'),
    ck(kWp > 0 && Y > 0, kWp > 0 && Y > 0 ? `Photovoltaik in Erstellung (${FMT(kWp)} kWp) und Betrieb (${FMT(Y)} kWh/a) erfasst` : 'Photovoltaik: Leistung in D01.01 (Erstellung) und Ertrag (Betrieb) prüfen'),
    ck(gt >= 15 && gt <= 50, `Anteil Gebäudetechnik ${Math.round(gt)} % der Erstellung (Erfahrungswert 15–50 %)`),
  ];
  const value = hasSrc ? `Erstellung ${erstStr}, Betrieb ${betrStr} kg CO₂-eq/m² EBF·a` : '–';
  return { fields: fieldsE + fieldsB, missing, missE, missB, total, bw: total, groups: groups.map(G => ({ code: G.code, open: G.open, sum: G.sum, kw: G.kw, n: G.n })), subtotals, cmpSubs: [], kpis, costRows: C.costRows, totalRow: C.totalRow, chart: null, tz, cmp: C.cmp, cmpT: C.cmpT, autoChecks,
    handoverValue: value, submitDetail: `${value} · ${plural(nSrc, 'Emissionsquelle', 'Emissionsquellen')}`, canSubmitData: nSrc > 0 && missing === 0,
    reason: nSrc ? 'Einreichen erst, wenn alle Werte erfasst sind' : 'Einreichen erst, wenn Emissionsquellen erfasst sind', endwert: hasSrc ? erst : null, endwertStr: erstStr, nSrc,
    headShared, erf: { isTHG: true, rows, head: headErst, tot, derived, nSrc, missing: missE },
    betr: { title: T.betrTitle, head: headBetr, pv: pvFields, rows: betrList, end: hasBetr ? neg(endB, FMT1) : '–', thg: hasBetr ? neg(thgB) : '–', missing: missB, hasValues: hasBetr,
      subs: [{ name: 'THGE Erstellung pro Jahr', v: erstStr }, { name: 'THGE Erstellung + Betrieb pro Jahr', v: sumStr }] },
    open: nSrc === 0 ? { text: 'Noch keine Emissionsquellen erfasst. Tool-Export importieren oder die Quellen von Hand erfassen.', btn: 'Erfassung öffnen', tab: 'erfassung' }
      : missE === 0 && missB ? { text: `Betrieb: ${missingText(missB)} noch. Rechenhilfe importieren oder die Werte erfassen.`, btn: 'Erfassung Betrieb öffnen', tab: 'betrieb' } : undefined };
}

// ---- KV-32 / KS-31 / THG-32 of one project ----
function dataForm(kind, P, data, project, user) {
  const D = data.forms, f = P.forms[kind], people = D.people;
  const X = instanceOf(D, kind, project, f), T = X.T;
  const M = mockProject(project, data);
  const isTHG = kind === 'thg';
  const sn = k => num((P.sia || {})[k]) || 0;
  const ref = { GSF: sn('GSF'), GF: sn('GF'), FAW: sn('FAW'), FB: sn('FB'), BUF: sn('BUF'), NF: sn('HNF') + sn('NNF'), EBF: sn('EBF') };
  const step = f.step, locked = step >= LOCKED_FROM, rejected = !!f.rejected;
  const bd = miss => (!locked && miss ? '#ffa39e' : '#d9d9d9');
  const status = X.overdue && step <= 1 && !rejected ? 'Überfällig' : statusOfStep(step, rejected);
  const reviewer = X.reviewerName;
  const C = isTHG ? thgPart(P, f, data, T, M, ref, locked, bd, X.docs) : costPart(kind, P, f, data, T, M, ref, locked, bd);
  const { fields, missing } = C;

  const filled = fields - missing, compPct = fields ? Math.round(filled / fields * 100) : 0;
  const comp = { label: 'Vollständigkeit', pct: compPct + ' %', w: compPct + '%', bar: missing || !fields ? '#d48806' : '#2f7d63', fg: missing || !fields ? '#8a6100' : '#2f6b12',
    text: isTHG && !C.nSrc ? `Noch keine Emissionsquellen erfasst${C.missB ? ` · Betrieb: ${missingText(C.missB)}` : ''}` : !fields ? 'Noch keine Werte erfasst' : missing ? `${filled} von ${fields} Werten erfasst · ${missing} fehlen` : `Alle ${fields} Werte erfasst` };
  const open = C.open || (step === 0 && missing === fields ? { text: 'Noch keine Werte erfasst. Die Erfassung ist offen.', btn: 'Erfassung öffnen', tab: 'erfassung' }
    : missing ? { text: `${missingText(missing)} noch. Danach zur Prüfung einreichen.`, btn: 'Erfassung fortsetzen', tab: 'erfassung' }
    : { text: 'Alle Werte sind erfasst.', btn: 'Zur Prüfung einreichen', tab: 'erfassung' });
  const meta = [['Kürzel', T.code], ['Vorlage', T.vorlage], ['Lieferverantwortlich', `${X.leadName}, ${X.leadFirm}`], ['Prüfend', `${reviewer}, BBL`], ['Frist', X.frist], ['Zielsystem', T.ziel], ...(T.reporting ? [['Berichterstattung', T.reporting]] : []), ...(X.kann ? [['Pflicht', 'Kann · nur Ablage (Anlagekosten unter CHF 1 Mio)']] : [])].map(([k, v], i) => ({ k, v, bg: alt(i) }));

  // Prüfung, Übergabe, Leiste
  const canReview = (step === 3 || step === 4) && (!user || !!user.internal);   // only BBL users review; a missing user (tests) is not restricted
  const manual = T.manual.map(([key, label]) => ({ key, label, checked: !!f.checks[key], disabled: !canReview }));
  const rv = reviewOf({ step, canReview, allChecked: manual.every(m => m.checked), target: T.target, reviewer, notSubmitted: step < LOCKED_FROM && !rejected, comment: f.comment, internal: !user || !!user.internal });
  const canSubmit = step <= 1 && C.canSubmitData;
  const bar = barOf({ editing: step <= 1, locked, canFilter: missing > 0 || !!f.missingOnly, canSubmit, reason: C.reason, comp, reviewer });

  return {
    kind: 'data', id: kind, pid: project.id, code: T.code, codeLc: T.code.toLowerCase(), title: T.title, short: T.short, lead: X.lead, leadName: `${X.leadName} (${X.leadFirm})`, reviewer, target: T.target,
    step, locked, rejected, status, pill: pillSpec(status), act: ACT_FORM,
    badges: badgesOf(isTHG ? { erfassung: C.missE, betrieb: C.missB } : missing, locked, X.docs.length),
    steps: stepRows(D.steps, step, f.dates, rejected), next: nextStep(step, T.target, reviewer, open),
    kpis: C.kpis, comp, meta, people: peopleShort(people, X.peopleList), peopleRows: peopleRows(people, X.peopleList), docs: docRows(X.docs), hist: histRows(people, [...X.history, ...f.events]),
    ov: T.ov, costRows: C.costRows, totalRow: C.totalRow, subtotals: C.subtotals, cmpSubs: C.cmpSubs || C.subtotals, chart: C.chart, tz: C.tz, headShared: C.headShared, betr: C.betr,
    erf: { tableTitle: T.tableTitle, totalLabel: T.totalLabel, missingOnly: !!f.missingOnly, importItems: T.importItems, inputBg: locked ? '#f3f4f6' : '#fff', ...C.erf },
    bar, cmp: C.cmp, cmpT: C.cmpT, cmpPrevLabel: T.cmpPrevLabel, cmpUnit: T.cmpUnit, devPct: T.devPct || DEV_PCT, autoChecks: C.autoChecks, manual, rv, handover: { ziel: T.ziel, value: C.handoverValue, status: handoverStatus(step, f.dates[6]) }, canTransfer: step === 5,
    missing, fields, missE: C.missE, missB: C.missB, total: C.total, bw: C.bw, groups: C.groups, endwert: C.endwert, endwertStr: C.endwertStr, nSrc: C.nSrc,
    submitDetail: C.submitDetail,
  };
}

/** The Datenformulare of one project (kv, ks, thg as far as the project has them). */
export function formModel(state, data, project, user) {
  const P = (state.projects || {})[project.id];
  const inst = (data.forms.byProject || {})[project.id] || {};
  if (!P) return {};
  return Object.fromEntries(Object.keys(inst).filter(kind => P.forms[kind]).map(kind => [kind, dataForm(kind, P, data, project, user)]));
}
export const kindOfCode = code => KIND_OF[String(code).toUpperCase()] || null;

// ---- Planlieferung DWG (one floor plan) in the same shape, on top of model/plan.js ----
export function planForm(plan, data, user) {
  const internal = !user || !!user.internal;
  const D = data.forms, P = data.plans, PF = D.plan, people = D.people, sup = P.supplier;
  const reviewer = (people.PM || ['Paula Muster'])[0];
  const step = (PLAN_STATUS[plan.status] || PLAN_STATUS.offen).formStep, rejected = plan.status === 'zurueck', locked = plan.locked;
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
  const meta = [['Kürzel', plan.code], ['Vorlage', PF.vorlage], ['Geschoss', `${plan.floor} (Ebene ${plan.ee})`], ['Lieferverantwortlich', `${sup.name}, ${sup.firm}`], ['Prüfend', `${reviewer}, BBL`], ['Frist', plan.due], ['Zielsystem', P.target]].map(([k2, v], i) => ({ k: k2, v, bg: alt(i) }));
  const peopleList = PF.people;
  const docs = docRows([...(plan.fileName ? [[plan.fileName, 'DWG', 'Pflicht', sup.name, plan.uploadedAt || '–']] : []), ...PF.docs]);
  const hist = histRows(people, plan.history.map(h => [h.d, '', h.who, h.t, h.detail]));
  const res = !r ? { sym: '–', bg: '#f3f4f6', fg: '#6b7280', title: 'Kein Prüfergebnis', sub: 'Noch keine DWG-Datei geprüft' }
    : errors ? { sym: '×', bg: '#fff1f0', fg: '#9b2c44', title: `${errors} Fehler`, sub: `${passed} von ${total} Regeln bestanden · ${warnings} Warnungen` }
    : { sym: '✓', bg: '#e2efed', fg: '#1f4a3b', title: 'Keine Fehler', sub: `${passed} von ${total} Regeln bestanden · ${warnings} Warnungen, zulässig` };
  const reviewIssues = plan.rules.failed.map(x => ({ icon: x.status === 'fail' ? 'circle-x' : 'triangle-alert', color: x.status === 'fail' ? '#9b2c44' : '#8a6100', text: x.text, code: x.code, count: x.count }));
  const rv = reviewOf({ step, canReview: plan.isReviewable && internal, allChecked: !plan.approveDisabled, target: 'SAP RE-FX', reviewer, notSubmitted: step < LOCKED_FROM && !rejected, comment: plan.comment, internal });
  const bar = barOf({ editing: !locked, locked, canFilter: false, canSubmit: plan.canSubmit, reviewer,
    reason: !r ? 'Einreichen erst, wenn eine DWG-Datei geprüft wurde' : errors ? 'Einreichen erst, wenn der Plan keine Fehler hat' : '',
    comp: { text: r ? `${passed} von ${total} Prüfregeln bestanden · ${errors} Fehler · ${warnings} Warnungen` : 'Noch keine DWG-Datei geprüft', w: comp.w, bar: comp.bar } });
  const fileMeta = r ? [plan.version, plan.uploadedAt ? `hochgeladen ${plan.uploadedAt}` : ''].filter(Boolean).join(' · ') : '';
  return {
    kind: 'plan', id: plan.key, plan, code: plan.code, codeLc: plan.codeLc, title: plan.name, short: plan.floor, lead: sup.initials, leadName: `${sup.name} (${sup.firm})`, reviewer, target: 'CAFM',
    step, locked, rejected, status, pill: plan.pill, act: ACT_PLAN,
    badges: badgesOf(r && errors && !locked ? errors : 0, locked, docs.length),
    steps: stepRows(D.steps, step, dates, rejected), next: nextStep(step, 'SAP RE-FX', reviewer, open),
    kpis, comp, meta, people: peopleShort(people, peopleList), peopleRows: peopleRows(people, peopleList, sc => sc.replace('{floor}', plan.name)), docs, hist,
    planOv: { sia, cats },
    erf: { tableTitle: `${plan.name} · ${plan.floor}`, fileMeta, isTHG: false },
    bar, res, reviewIssues, autoChecks: plan.autoChecks, manual: plan.manualChecks.map(m => ({ ...m, disabled: m.disabled || !internal })), rv,
    handover: { ziel: P.target, value: r ? `${plan.roomCount} Raumpolygone mit AOID, NGF ${plan.ngf}, GF ${plan.gf}` : '–', status: plan.transferStatus },
    canTransfer: plan.isFrei,
  };
}
