// View model: everything the screens show, computed from state + data on every render. Views only read from here.
// Datenformulare (KV-32, KS-31, THG-32 of every project, Planlieferungen DWG) in model/form.js, application lists in model/app.js.
import { pillSpec } from './pill.js';
import { templatesModel } from './templates.js';
import { importModel } from './import.js';
import { appModel } from './app.js';
import { planModel } from './plan.js';
import { formModel, planForm, kindOfCode } from './form.js';

export function compute(state, data, project, user) {
  const s = state, tw = s.tweaks || {};
  const mk = tw.showMarkers !== false;
  const ak = Number.isFinite(tw.anlagekostenMio) ? tw.anlagekostenMio : data.project.anlagekostenMio;
  const plan = planModel(s, data);                       // Planlieferungen DWG (status per floor, Musterhausen)
  const formsAll = Object.fromEntries(data.projects.projects.map(p => [p.id, formModel(s, data, p)]));
  const forms = formsAll[project.id] || {};
  /** Status of a Datenformular of a project by delivery code (null for classic deliveries). */
  const formStatusOf = (pid, code) => { const kind = kindOfCode(code), F = kind && formsAll[pid] && formsAll[pid][kind]; return F ? F.status : null; };
  const formByCode = code => {
    const c = String(code).toLowerCase();
    if (c.startsWith('dwg-')) { const p = project.detailed ? plan.planByCode(c) : null; return p ? planForm(p, data) : null; }
    const kind = kindOfCode(c);
    return kind && forms[kind] ? forms[kind] : null;
  };

  // ---- 02 Bestellen ----
  const ot = s.orderType, isTHG = ot === 'thg', big = ak >= 1;
  const akStr = ak.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // ---- Statuses shared by ILP, Aufgaben, Portfolio: the rows of data/ilp.json and data/tasks.json belong to the detailed
  // project, so they follow its forms on every route (the topbar counts must not change with the project opened) ----
  const detailed = data.projects.projects.find(p => p.detailed) || project;
  const dForms = formsAll[detailed.id] || {};
  const resolve = r => {
    const status = r.plan && plan.plans[r.plan] ? plan.plans[r.plan].statusLabel : r.statusKey && dForms[r.statusKey] ? dForms[r.statusKey].status : r.status;
    return { ...r, status, pill: pillSpec(status) };
  };
  const auRows = data.tasks.rows.map((r, i) => ({ ...resolve(r), typW: r.typ === 'Datenformular' ? 600 : 400, mark: mk && !!r.mark, bg: i % 2 ? '#f6f7f9' : '#fff' }));
  const ilpRows = data.ilp.rows.map(resolve);
  const ilpCount = {
    total: ilpRows.length,
    work: ilpRows.filter(r => r.status === 'In Bearbeitung').length,
    check: ilpRows.filter(r => r.status === 'In Prüfung').length,
    done: ilpRows.filter(r => r.status === 'Abgeschlossen').length,
    over: ilpRows.filter(r => r.status === 'Überfällig').length,
  };
  const ilpTiles = data.ilp.tiles.map(t => ({ ...t, value: ilpCount[t.key] }));

  // ---- 06 Kontrolle über alle Projekte: every row follows the THG-32 of its project ----
  const pfRows = data.portfolio.rows.map((r, i) => {
    const F = r.project && formsAll[r.project] && formsAll[r.project].thg;
    const status = F ? F.status : r.status;
    const done = F ? F.step >= 6 : r.status === 'Abgeschlossen';
    const ew = F ? (done ? F.endwertStr : '–') : r.ew;
    const sus = F ? (done ? 'übertragen' : '–') : r.sus;
    return {
      ...r, status, akStr: 'CHF ' + r.ak.toLocaleString('de-CH', { minimumFractionDigits: 1 }) + ' Mio',
      pflicht: r.ak >= 1 ? 'Muss' : 'Kann', kontrolle: r.ak >= 1 ? 'Kontrolle' : 'nur Ablage',
      dueC: status === 'Überfällig' ? '#c8102e' : '#1f2937', pill: pillSpec(status), ew, sus, bg: i % 2 ? '#f9fafb' : '#fff',
      href: F ? `/projects/${r.project}/deliveries/thg-32` : null,
    };
  });
  const cnt = f => pfRows.filter(r => f(r.status)).length;

  const base = {
    mk, gl: 'eBKP-H', glLabel: 'eBKP-H', ak, akStr,
    ...importModel(s, data), ...templatesModel(s, data), ...plan,

    // Datenformulare
    forms, formByCode, formStatusOf,

    // Lists of the detailed project
    auRows, ilpRows, ilpTiles,

    // 02 Bestellen
    orderType: ot,
    orderCards: data.templates.orderOptions.map(o => ({ ...o, on: o.key === ot, bd: o.key === ot ? '2px solid var(--navy)' : '1px solid #d3d8de', bg: o.key === ot ? '#f4f6f8' : '#fff' })),
    glText: 'eBKP-H (vorgegeben)', glBg: '#f4f6f8', glReadonly: true,
    supplier: isTHG ? 'Olivia Beispiel, Ökobilanz Beispiel AG' : 'Gian Muster, Generalplaner Beispiel AG', supplierInitials: isTHG ? 'OB' : 'GM',
    target: isTHG ? 'SUS (THG Erstellung und Betrieb)' : 'ePPM (Leitsystem Baukosten)',
    ruleOrder: isTHG ? (big ? 'Muss' : 'Kann') : 'Muss', ruleCheck: isTHG ? (big ? 'Pflicht' : 'Keine') : 'Pflicht',
    ruleColor: (isTHG && !big) ? '#5b6573' : '#1f2937',
    ruleText: isTHG
      ? (big ? `Anlagekosten gemäss Stammdaten: CHF ${akStr} Mio. Ab 1 Mio CHF ist die Ökobilanz der Bauemissionen zu bestellen und zu kontrollieren.`
             : `Anlagekosten gemäss Stammdaten: CHF ${akStr} Mio. Unter 1 Mio CHF kann die Ökobilanz nach Ermessen PPE/PM bestellt werden; sie wird nur abgelegt, nicht kontrolliert.`)
      : 'Kostenvoranschlag gemäss Phasenvorgabe SIA 32. Freigegebene Werte werden an ePPM übertragen; die Bezugsmengen kommen aus den Grundrissen (DWG).',

    // 06 Portfolio
    pfRows,
    pf: {
      total: pfRows.length,
      bearb: cnt(x => x === 'In Bearbeitung' || x === 'Offen'),
      pruef: cnt(x => x === 'In Prüfung' || x === 'Freigegeben' || x === 'Eingereicht'),
      done: cnt(x => x === 'Abgeschlossen'),
      over: cnt(x => x === 'Überfällig' || x === 'Zurückgewiesen'),
    },
  };
  return project && user ? { ...base, ...appModel(state, data, project, user, base) } : base;
}
