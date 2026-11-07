// All user actions. Views reference them declaratively:
//   <button data-action="formSubmit" data-key="kv">                → actions.formSubmit(dataset, el, event)
//   <input data-change="setMap" data-key="kvV" data-code="C02">   → actions.setMap(dataset, el, event) on change
//   <a data-nav="/projects/all">  or  data-nav="s03" (study id)   → navigate
//   <a data-study="s05">                                          → actions.studyGo: switch persona + open the study screen
// Conventions of the data-* attributes: key = identifier of the thing acted on (form kind, plan key, check id, user key),
// arg = option or value (dialog name, import item, tab), id = row id (Emissionsquelle, Kostenelement, notification),
// group / code / field = Hauptgruppe, position code and field of a value.
// The Datenformulare act on the project of the current route (nav.currentPid()); the THG-32 keeps its Emissionsquellen
// in state.projects[pid].thgSrc (thgVal, thgAdd, thgRemove …) and its Betrieb in thgBetr (thgBetr, thgBetrFlag), the cost forms
// their positions in kvQ/kvV and ksQ/ksV.
import { searchModel } from './model/search.js';
import { LEGACY, link } from './links.js';
import { TASK_COLUMNS } from './model/columns.js';
import { formModel, LOCKED_FROM } from './model/form.js';
import { initProject } from './model/state.js';
import { KEYS, mockProject, groupAmount, egOf, mergeBetr, needsQty } from './model/mock.js';
import { planModel } from './model/plan.js';
import { patchDotted } from './store.js';
import { num } from './format.js';
import { planSession } from './plansession.js';
import { buildReportModel, downloadPlanReport, formatDateTime } from './plancheck/report.js';
import { captureViewerImage, offscreenCapture, viewerReady } from './views/plan.js';
import { sheetsOf, fileNameOf, workbookBlob, sheetsOfFile, saveBlob, readWorkbook, planImport, applyImport, importScope } from './excel.js';
import { importSource } from './model/import.js';

export function makeActions(store, data, nav) {
  const s = () => store.get();
  const ui = patch => store.setIn('ui', patch);
  let toastTimer = null;
  const toast = text => {
    ui({ toast: { text, id: Date.now() } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui({ toast: null }), 4000);
  };
  /** The import dialog starts fresh every time: no result, undo, file or mode of an earlier import (also not through a study link). */
  const IMP_FRESH = { step: 1, filter: 'alle', mode: 'ueber', done: false, applied: 0, file: null, undo: null };
  const closeDialog = () => { ui({ dialog: null }); store.setIn('imp', IMP_FRESH); };
  const MAX_XLSX = 10 * 1024 * 1024;

  // ---- Datenformulare of the current project: one workflow object per form (state.projects[pid].forms[kind]) ----
  const pid = () => nav.currentPid();
  const projectOf = id => data.projects.projects.find(p => p.id === id);
  const P = () => (s().projects || {})[pid()];
  const setP = patch => { const p = P(); if (p) store.setIn('projects', { [pid()]: { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } }); };
  const formOf = kind => (P() || { forms: {} }).forms[kind];
  const setForm = (kind, patch) => setP(p => { const f = p.forms[kind]; return f ? { forms: { ...p.forms, [kind]: { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } } } : {}; });
  const editable = kind => { const f = formOf(kind); return !!f && f.step < LOCKED_FROM; };
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const ev = (who, text, detail = '') => ['heute', now(), who, text, detail];
  const me = () => s().user;
  const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const userOf = () => data.users.users.find(u => u.key === me());
  const isInternal = () => { const u = userOf(); return !u || !!u.internal; };   // only BBL users review
  /** A file an import brought in becomes a document of the form (once). */
  const addDoc = (kind, name, type = 'Excel') => setForm(kind, f => ((f.docs || []).some(d => d[0] === name) || ((vm(kind) || {}).docs || []).some(d => d.name === name) ? {} : { docs: [...(f.docs || []), [name, (data.forms.kinds[kind].docs.find(d => d[0] === name) || [name, type, 'Optional'])[1], (data.forms.kinds[kind].docs.find(d => d[0] === name) || [name, type, 'Optional'])[2], (userOf() || { name: me() }).name, 'heute']] }));
  /** Patch a form and append an event to its Verlauf. */
  const logEv = (kind, who, text, detail, patch = {}) => setForm(kind, f => ({ ...(typeof patch === 'function' ? patch(f) : patch), events: [...f.events, ev(who, text, detail)] }));
  /** Move the form to a later step; the steps reached on the way get today's date (dates[i] = date step i was reached). */
  const advance = (kind, to, who, text, detail) => logEv(kind, who, text, detail, f => {
    const dates = f.dates.slice();
    for (let i = f.step + 1; i <= to; i++) if (i !== 2 && !dates[i]) dates[i] = 'heute';   // step 2 (Intern geprüft) is not used
    return { step: to, dates, rejected: false, ...(to >= LOCKED_FROM ? { missingOnly: false } : {}) };   // a locked form shows all rows
  });
  /** The first input or import on an open form (step 0 «Erstellt») starts the Erfassung: status «In Bearbeitung», event in the Verlauf. */
  const begin = kind => { const f = formOf(kind); if (f && f.step === 0) advance(kind, 1, me(), 'Erfassung begonnen'); };
  /** Run an edit on a form that is still open; returns whether it ran. */
  const edit = (kind, fn) => { if (!editable(kind)) return false; begin(kind); fn(); return true; };
  /** Back to the Erfassung (rejection or reopening in the prototype). */
  const backToEntry = (kind, rejected, text, detail) => logEv(kind, me(), text, detail, f => ({ step: 1, dates: f.dates.slice(0, 2), checks: {}, rejected }));
  const vm = kind => { const p = projectOf(pid()); return p ? formModel(s(), data, p, userOf())[kind] : null; };
  const setSrc = (id, patch) => setP(p => ({ thgSrc: (p.thgSrc || []).map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  /** Typed numbers are stored as numbers (rounded to `decimals`), so they render with thousands separators; other text stays as typed. */
  const normNum = (raw, decimals = 0) => { const n = num(raw); if (n == null) return String(raw ?? '').trim(); const f = 10 ** decimals; return Math.round(n * f) / f; };

  // ---- Planlieferungen DWG: one floor plan = one delivery; files are checked locally with js/plancheck ----
  const planOf = key => (s().plans || {})[key];
  const planVm = key => planModel(s(), data).plans[key];
  const floorOf = key => (data.plans.floors || []).find(f => f.key === key);
  const setPlan = (key, patch) => store.setIn('plans', { [key]: { ...planOf(key), ...patch } });
  const supplier = data.plans.supplier, planReviewer = (data.forms.people.PM || ['Paula Muster'])[0];
  /** Patch a plan, append events { d, who, t, detail } to its Verlauf and set the dates of the steps reached (at[i]; '' = not reached any more). */
  const logPlan = (key, events, patch = {}, at = {}) => { const p = planOf(key); if (p) setPlan(key, { ...patch, events: [...(p.events || []), ...events.map(([who, t, detail = '']) => ({ d: 'heute', who, t, detail }))], at: { ...(p.at || {}), ...at } }); };
  const BACK_TO_ENTRY = { 2: '', 3: '', 4: '', 5: '' };   // after a rejection the later steps are open again
  const runPlanCheck = async (key, run) => {
    const floor = floorOf(key);
    if (!floor || !planOf(key)) return;
    if (planOf(key).busy) { toast('Eine Prüfung läuft bereits. Bitte warten.'); return; }
    setPlan(key, { busy: 'Plan wird lokal im Browser geprüft…', error: null });
    try {
      const { entry, src } = await run();
      const result = { ...entry.result, src: src || null, checkedAt: new Date().toISOString() };
      const p = planOf(key), sm = result.summary;
      logPlan(key, [[me(), 'DWG hochgeladen', `${result.file.name}${result.version ? ' · ' + result.version : ''}`], ['SYS', `Plan geprüft: ${sm.errorCount} Fehler, ${sm.warningCount} Warnungen`, `${sm.passedRules}/${sm.totalRules} Prüfregeln bestanden · ${pl(result.rooms.length, 'Raum', 'Räume')}`]],
        { busy: null, result, status: p.status === 'offen' ? 'bearbeitung' : p.status }, { 1: 'heute' });
      toast(sm.errorCount === 0
        ? `${floor.code}: ${result.file.name} geprüft, ${sm.passedRules}/${sm.totalRules} Prüfregeln bestanden, ${pl(sm.warningCount, 'Warnung', 'Warnungen')}.`
        : `${floor.code}: ${result.file.name} geprüft, ${sm.errorCount} Fehler. Plan im CAD korrigieren und neu hochladen.`);
    } catch (err) {
      setPlan(key, { busy: null, error: err.message });
      toast(`Prüfung fehlgeschlagen: ${err.message}`);
    }
  };

  /** Workbook of a form (js/excel.js): downloads it, or only returns the Blob (tests). */
  const excelDownload = async (kind, empty, save = true) => {
    const p = P(), project = projectOf(pid());
    if (!p || !project || !p.forms[kind]) return null;
    try {
      const blob = await workbookBlob(sheetsOf(kind, p, data, { empty })), name = fileNameOf(kind, project, data, empty);
      if (save) { saveBlob(blob, name); toast(`${name} heruntergeladen.`); }
      return blob;
    } catch (err) { toast(err.message); return null; }
  };

  return {
    // ---- Shell ----
    setUser: ds => { store.set({ user: ds.key }); ui({ userMenu: false, notif: false, importMenu: false }); },
    toggleUserMenu: () => ui({ userMenu: !s().ui.userMenu, notif: false, importMenu: false }),
    closeMenus: () => ui({ userMenu: false, notif: false, importMenu: false, sideOpen: false, searchOpen: false }),

    // ---- Topbar search: suggestions while typing, arrow keys, Enter opens the active (or first) hit ----
    searchType: (ds, el) => ui({ search: el.value, searchOpen: !!el.value.trim(), searchIdx: -1 }),
    searchClear: () => ui({ search: '', searchOpen: false, searchIdx: -1 }),
    searchClose: () => ui({ searchOpen: false }),
    searchMove: ds => { const n = searchModel(s().ui.search, data).items.length; if (!n) return; const d = Number(ds.dir) || 1, cur = s().ui.searchIdx; ui({ searchOpen: true, searchIdx: cur < 0 ? (d > 0 ? 0 : n - 1) : ((cur + d) % n + n) % n }); },   // from «nothing active» ArrowUp goes to the last hit
    searchGo: () => {
      const m = searchModel(s().ui.search, data), it = m.items[Math.max(0, s().ui.searchIdx)];
      if (!it) { ui({ searchOpen: !!m.query }); return; }
      ui({ search: '', searchOpen: false, searchIdx: -1 });
      nav.navigate(it.href);
    },
    toggleNotif: () => ui({ notif: !s().ui.notif, userMenu: false, importMenu: false }),
    notifUnreadOnly: () => ui({ notifUnreadOnly: !s().ui.notifUnreadOnly }),
    markRead: ds => store.set({ notifRead: [...new Set([...(s().notifRead || []), ds.id])] }),
    markAllRead: () => store.set({ notifRead: data.notifications.map(n => n.id) }),
    notifOpen: ds => { store.set({ notifRead: [...new Set([...(s().notifRead || []), ds.id])] }); ui({ notif: false }); nav.navigate(ds.href); },
    toggleFavorite: ds => { const f = new Set(s().favorites || []); f.has(ds.id) ? f.delete(ds.id) : f.add(ds.id); store.set({ favorites: [...f] }); },
    toggleNav: ds => ui({ navOpen: { ...s().ui.navOpen, [ds.key]: !s().ui.navOpen[ds.key] } }),
    openDialog: ds => ui({ dialog: ds.arg, importMenu: false }),
    toggleSide: () => ui({ sideOpen: !s().ui.sideOpen }),
    /** Detail panel of a normal task (Aufgabe, Modell-Issue); deliveries open their own page. */
    taskOpen: ds => ui({ dialog: 'task', taskId: ds.id, notif: false, userMenu: false, importMenu: false }),
    taskClose: () => ui({ dialog: null, taskId: null }),
    // «Tabelle konfigurieren»
    openColumns: () => ui({ dialog: 'columns', colDraft: [...(s().taskCols || [])] }),
    colToggle: ds => { const d = new Set(s().ui.colDraft || []); d.has(ds.key) ? d.delete(ds.key) : d.add(ds.key); ui({ colDraft: [...d] }); },
    colAll: () => {
      const all = TASK_COLUMNS.filter(c => !c.unavailable && !c.fixed).map(c => c.key);
      const d = new Set(s().ui.colDraft || []);
      ui({ colDraft: all.every(k => d.has(k)) ? ['name'] : ['name', ...all] });
    },
    colOk: () => { store.set({ taskCols: [...new Set(['name', ...(s().ui.colDraft || [])])] }); closeDialog(); },
    colCancel: closeDialog,
    closeDialog,
    dismissToast: () => ui({ toast: null }),

    // ---- Inputs of the Datenformulare (values of the current project); locked forms ignore every input ----
    setMap: (ds, el) => { edit(String(ds.key).slice(0, 2), () => setP(p => ({ [ds.key]: { ...(p[ds.key] || {}), [ds.code]: normNum(el.value) } }))); },
    skipToMain: () => { const main = document.querySelector('.app-main'); if (main) { main.tabIndex = -1; main.focus(); } },
    proto: () => toast('Im Prototyp ohne Funktion.'),

    // ---- Datenformulare: Erfassung (KV-32, KS-31) ----
    /** Einheit of a Kostenelement (dropdown) and its Kennwert CHF/m² GF (own value; an empty field is derived again). */
    formUnit: (ds, el) => { edit(ds.form, () => setForm(ds.form, f => ({ units: { ...(f.units || {}), [ds.code]: el.value } }))); },
    formKw: (ds, el) => { edit(ds.form, () => setForm(ds.form, f => ({ kws: { ...(f.kws || {}), [ds.code]: normNum(el.value) } }))); },
    formGroupVal: (ds, el) => { edit(ds.form, () => setForm(ds.form, f => ({ gvals: { ...f.gvals, [ds.group]: normNum(el.value) } }))); },
    /** The code of a position is a dropdown: choosing another eBKP-H element group replaces the position by an edited row with the same
     *  values and its own Kennwert (the Einheit follows the new element group); the Verlauf keeps the change, focus goes to the new row. */
    formPosCode: (ds, el) => {
      const kind = ds.form, code = el.value;
      if (!formOf(kind) || !editable(kind) || !code || code === ds.code) return;
      begin(kind);
      const f = formOf(kind), [qKey, vKey] = KEYS[kind], n = (f.nNew || 0) + 1, kw = (f.kws || {})[ds.code];
      setP(p => ({ forms: { ...p.forms, [kind]: { ...p.forms[kind], nNew: n, removed: { ...(f.removed || {}), [ds.code]: true }, kws: kw != null && kw !== '' ? { ...(f.kws || {}), [`new-kn${n}`]: kw } : (f.kws || {}),
        added: [...(f.added || []), { id: `kn${n}`, grp: ds.group, code, q: p[qKey][ds.code] ?? '', v: p[vKey][ds.code] ?? '' }] } } }));
      logEv(kind, me(), 'Kostenelement geändert', `${ds.code} → ${code}`);
      if (nav.focus) nav.focus(`${kind}-new-kn${n}-code`);
    },
    /** KV/KS: «Aufschlüsseln» opens the positions of a Hauptgruppe, «Zusammenfassen» keeps their sum as the group amount
     *  (0 for a Hauptgruppe without any element). THG: opens or closes the group (all open by default). */
    formMode: ds => {
      const kind = ds.form, g = ds.group, f = formOf(kind);
      if (!f || !(g in f.modes) || !editable(kind)) return;
      const direct = (f.modes[g] || 'direct') === 'direct';
      if (direct || kind === 'thg') { setForm(kind, { modes: { ...f.modes, [g]: direct ? 'detail' : 'direct' } }); return; }
      const grp = data.ebkp.ebkp.find(x => x.code === g), V = P()[KEYS[kind][1]] || {}, added = (f.added || []).filter(a => a.grp === g);
      if (!grp) return;
      const empty = !added.length && grp.kids.every(k => (f.removed || {})[k.code]);
      setForm(kind, { modes: { ...f.modes, [g]: 'direct' }, gvals: { ...f.gvals, [g]: groupAmount(grp, V, f.removed, added) ?? (empty ? 0 : '') } });
    },
    /** Remove a position (Kostenelement) from the Erfassung; the Verlauf keeps the event. */
    formRemovePos: ds => {
      const kind = ds.form, f = formOf(kind), k = data.ebkp.ebkp.flatMap(g => g.kids).find(x => x.code === ds.code);
      if (!f || !k || !editable(kind)) return;
      begin(kind);
      logEv(kind, me(), 'Kostenelement entfernt', `${k.code} ${k.name}`, { removed: { ...(f.removed || {}), [ds.code]: true } });
    },
    formAddPos: ds => { edit(ds.form, () => { const n = (formOf(ds.form).nNew || 0) + 1; setForm(ds.form, f => ({ nNew: n, added: [...(f.added || []), { id: `kn${n}`, grp: ds.group, code: '', q: '', v: '' }] })); if (nav.focus) nav.focus(`${ds.form}-new-kn${n}-code`); }); },
    formNewVal: (ds, el) => { edit(ds.form, () => setForm(ds.form, f => ({ added: (f.added || []).map(a => (a.id === ds.id ? { ...a, [ds.field]: ds.field === 'code' ? el.value : normNum(el.value) } : a)) }))); },
    formDropNew: ds => { if (editable(ds.form)) setForm(ds.form, f => ({ added: (f.added || []).filter(a => a.id !== ds.id) })); },
    formToggleMissing: ds => setForm(ds.key, f => ({ missingOnly: !f.missingOnly })),
    /** Übersicht «Wo entstehen die Emissionen?»: Erstellung or Betrieb. */
    ovArea: ds => ui({ ovArea: ds.arg === 'b' ? 'b' : 'e' }),
    /** A row of the Übersicht lists opens the Erfassung (or the Erfassung Betrieb). In the Ökobilanz the Hauptgruppe is unfolded, which
     *  only shows its rows; in a cost form «Aufschlüsseln» would replace the amount of a summarised Hauptgruppe, so nothing changes there. */
    formOpenGroup: ds => {
      const kind = ds.form, f = formOf(kind), T = data.forms.kinds[kind]; if (!f || !T) return;
      if (kind === 'thg' && ds.tab !== 'betrieb' && ds.group && (ds.group in f.modes) && f.modes[ds.group] !== 'detail') setForm(kind, { modes: { ...f.modes, [ds.group]: 'detail' } });
      nav.navigate(link.delivery(pid(), T.code, ds.tab || 'erfassung'));
    },
    toggleImportMenu: () => ui({ importMenu: !s().ui.importMenu, userMenu: false, notif: false }),
    importItem: ds => {
      ui({ importMenu: false });
      if (!editable(ds.form)) { toast('Die Erfassung ist gesperrt.'); return; }
      if (ds.arg === 'vorlage' && data.forms.kinds[ds.form]) { excelDownload(ds.form, true); return; }
      if (ds.arg === 'excel' && data.forms.kinds[ds.form]) { store.setIn('imp', { ...IMP_FRESH, form: ds.form, pid: pid() }); ui({ dialog: 'import' }); return; }
      if (ds.arg === 'dwg' && KEYS[ds.form]) {
        // Bezugsmengen aus den Grundrissen: the missing Mengen whose Bezugsgrösse of the norm is a quantity of the floor plans (GF, GSF, EBF, NF, BUF, FAW, FB)
        const kind = ds.form, p = P(), f = formOf(kind), [qKey] = KEYS[kind], sia = p.sia || {}, q = k => num(sia[k]) || 0;
        const ref = { GF: q('GF'), GSF: q('GSF'), EBF: q('EBF'), NF: q('HNF') + q('NNF'), BUF: q('BUF'), FAW: q('FAW'), FB: q('FB') };
        const OF = { FA: 'GF', SA: 'GSF', HRA: 'EBF', VRA: 'EBF', CERA: 'EBF', USA: 'NF', ESA: 'BUF', FGA: 'FAW', BRA: 'FB' };   // abbreviation of the Bezugsgrösse → quantity of data/sia416.json
        const Q = {}, added = {};
        for (const g of data.ebkp.ebkp) {
          if ((f.modes[g.code] || 'direct') !== 'detail') continue;
          const cat = c => (data.ebkp.elements[g.code] || []).find(e => e[0] === c) || [], amount = e => ref[OF[e[3]]] || 0;
          for (const k of g.kids) { const e = cat(k.code), u = (f.units || {})[k.code] ?? (k.unit || 'pauschal'); if (!(f.removed || {})[k.code] && u === e[2] && needsQty(u) && amount(e) && num(p[qKey][k.code]) == null) Q[k.code] = amount(e); }
          for (const a of (f.added || []).filter(x => x.grp === g.code && x.code)) { const e = cat(a.code), u = (f.units || {})[`new-${a.id}`] ?? (e[2] || 'pauschal'); if (u === e[2] && needsQty(u) && amount(e) && num(a.q) == null) added[a.id] = amount(e); }
        }
        const n = Object.keys(Q).length + Object.keys(added).length;
        if (!n) { toast('Keine fehlende Menge, die aus den Grundrissen kommt.'); return; }
        begin(kind);
        setP(pp => ({ [qKey]: { ...pp[qKey], ...Q }, forms: { ...pp.forms, [kind]: { ...pp.forms[kind], added: (pp.forms[kind].added || []).map(a => (a.id in added ? { ...a, q: added[a.id] } : a)) } } }));
        logEv(kind, me(), 'Bezugsmengen übernommen', `${pl(n, 'Menge', 'Mengen')} aus den Grundrissen (DWG)`);
        toast(`${pl(n, 'Bezugsmenge', 'Bezugsmengen')} aus den Grundrissen übernommen.`);
        return;
      }
      if (ds.arg === 'rechenhilfe' && ds.form === 'thg') {
        // Rechenhilfe SIA 390/1 (Betrieb): Energiedienstleistungen and Photovoltaik of the project come in, blanks are filled
        const p = P(), project = projectOf(pid()); if (!p || !project) return;
        const { next, filled } = mergeBetr(p.thgBetr || {}, mockProject(project, data, { complete: true }).thgBetr);
        if (!filled) { toast('Rechenhilfe enthält keine neuen Werte.'); return; }
        const doc = (data.forms.kinds.thg.docs.find(d => /rechenhilfe/i.test(d[0])) || [])[0] || 'Rechenhilfe';
        begin('thg');
        setP({ thgBetr: next });
        addDoc('thg', doc);
        logEv('thg', me(), 'Rechenhilfe SIA 390/1 importiert', `${doc} · ${pl(filled, 'Wert', 'Werte')} übernommen`);
        toast(`Rechenhilfe importiert: ${pl(filled, 'Wert', 'Werte')} übernommen.`);
        return;
      }
      toast('Im Prototyp ohne Funktion.');
    },

    // ---- Datenformulare: Erfassung Erstellung (THG-32, Emissionsquellen je eBKP-H-Elementgruppe) and Erfassung Betrieb ----
    thgHead: (ds, el) => { edit('thg', () => setP(p => ({ thgHead: { ...(p.thgHead || {}), [ds.key]: el.value } }))); },
    thgVal: (ds, el) => {
      if (!editable('thg')) return;
      begin('thg');
      const src = ((P() || {}).thgSrc || []).find(x => x.id === ds.id) || {};
      let patch;
      if (ds.field === 'dataset') {                               // «Wa01 Aussenwand Beton 25 cm · Bauteil Lesosai»: tool code, Bezeichnung, Ökobilanzdaten
        const parts = String(el.value || '').trim().split(/\s*·\s*/), first = (parts.shift() || '').trim(), quelle = parts.filter(Boolean).join(' · ');
        const m = first.match(/^([A-Z][a-z]\d{2})\s+(.*)$/);
        patch = { tcode: m ? m[1] : '', name: (m ? m[2] : first).trim(), quelle: quelle || (src.isNew ? '' : src.quelle || '') };   // without Ökobilanzdaten the existing ones stay
      } else patch = { [ds.field]: ds.field === 'q' ? normNum(el.value) : ds.field === 'kw' ? normNum(el.value, 2) : el.value };
      if (ds.field === 'code') { const eg = egOf(data, el.value); patch.unit = eg ? eg[2] : ''; if (src.isNew || !src.name) patch.name = eg ? eg[1] : ''; }   // an existing row keeps its Bauteil
      setSrc(ds.id, patch);
    },
    thgBetr: (ds, el) => { edit('thg', () => setP(p => ({ thgBetr: { ...(p.thgBetr || {}), [ds.key]: normNum(el.value, /_kf$/.test(ds.key) ? 3 : 2) } }))); },   // b{i}_end and b{i}_kf are own values that replace the derived ones
    thgBetrFlag: ds => { edit('thg', () => setP(p => ({ thgBetr: { ...(p.thgBetr || {}), [ds.key]: !(p.thgBetr || {})[ds.key] } }))); },
    thgToggleHs: ds => { const x = ((P() || {}).thgSrc || []).find(y => y.id === ds.id); if (x && editable('thg')) setSrc(ds.id, { hs: !x.hs }); },
    thgAdd: ds => {
      if (!editable('thg')) return;
      begin('thg');
      if (nav.focus) nav.focus(`thg-n${(formOf('thg').nNew || 0) + 1}-code`);
      setP(p => {
        const f = p.forms.thg, n = (f.nNew || 0) + 1;
        return { thgSrc: [...(p.thgSrc || []), { id: `n${n}`, grp: ds.group, isNew: true, code: '', tcode: '', name: '', quelle: '', unit: '', q: '', kw: '', hs: false }], forms: { ...p.forms, thg: { ...f, nNew: n } } };
      });
    },
    thgRemove: ds => {
      const p = P(), x = p && (p.thgSrc || []).find(y => y.id === ds.id);
      if (!x || !editable('thg')) return;
      setP({ thgSrc: p.thgSrc.filter(y => y.id !== ds.id) });
      if (!x.isNew) logEv('thg', me(), 'Emissionsquelle entfernt', `${x.code} ${[x.tcode, x.name].filter(Boolean).join(' ')}${x.quelle ? ` (${x.quelle})` : ''}`);
    },

    // ---- Datenformulare: Einreichen, Prüfung BBL, Übergabe ----
    formSubmit: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.bar.canSubmit) return;
      advance(kind, 3, me(), 'Zur Prüfung eingereicht', F.submitDetail);
      toast(`${F.code} eingereicht. ${F.reviewer} wurde benachrichtigt.`);
    },
    formReopen: ds => { if (!editable(ds.key)) backToEntry(ds.key, false, 'Erfassung wieder geöffnet', 'Prototyp'); },
    formComment: (ds, el) => { const F = vm(ds.key); if (F && F.rv.canReview) setForm(ds.key, { comment: el.value }); },   // the comment belongs to the review (BBL, while the Lieferung is in review)
    formToggleCheck: ds => {
      const kind = ds.arg, f = formOf(kind), F = vm(kind);
      if (!f || !F || !F.rv.canReview) return;
      const checks = { ...f.checks, [ds.key]: !f.checks[ds.key] };
      if (f.step === 3) advance(kind, 4, me(), 'Prüfung begonnen');              // the first check starts the review
      setForm(kind, { checks });
    },
    formApprove: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.rv.canApprove) return;
      advance(kind, 5, me(), 'Freigegeben');
      toast(`${F.code} freigegeben.`);
    },
    formReject: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.rv.canReview) return;
      backToEntry(kind, true, 'Zurückgewiesen', 'Erfassung wieder offen');
      toast(`${F.code} zurückgewiesen. ${F.leadName.replace(/ \(.*\)$/, '')} wurde benachrichtigt.`);
    },
    formTransfer: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.canTransfer) return;
      advance(kind, 6, 'SYS', `An ${F.target} übertragen`, F.submitDetail);
      toast(`${F.code} an ${F.target} übertragen.`);
    },
    /** «Zurücksetzen»: the form and its values go back to the initial mock state of the project. */
    formResetReview: ds => {
      const kind = ds.key, project = projectOf(pid()); if (!project) return;
      const init = initProject(data, project);
      const values = kind === 'thg' ? { thgSrc: init.thgSrc, thgHead: init.thgHead, thgBetr: init.thgBetr } : { [KEYS[kind][0]]: init[KEYS[kind][0]], [KEYS[kind][1]]: init[KEYS[kind][1]] };
      setP(p => ({ forms: { ...p.forms, [kind]: init.forms[kind] }, ...values }));
    },

    // ---- 02 Datenlieferung bestellen (drawer on the Informationslieferplan) ----
    setOrderType: (ds, el) => store.set({ orderType: ds.arg || (el && el.value) }),
    orderReqType: (ds, el) => ui({ orderReq: el.value }),
    orderSubmit: () => { closeDialog(); toast('Bestellung erstellt. Der Lieferverantwortliche erhält eine Aufgabe vom Typ «Datenformular».'); },
    orderCancel: closeDialog,

    // ---- Excel: «Excel herunterladen» and the import dialog of a Datenformular (imp.form = kv | ks | thg), see js/excel.js ----
    /** The values of a form as a workbook (ds.arg 'leer': the same sheets without values); opts.save = false returns the Blob only (tests). */
    formExcel: (ds, el, ev, opts = {}) => excelDownload(ds.form, ds.arg === 'leer', opts.save !== false),
    /** A file chosen or dropped in the dialog is read at once; a file that is not an export of this form is refused with the reason. */
    impFile: async (ds, el) => {
      const file = el && el.files && el.files[0];
      if (el && 'value' in el) { try { el.value = ''; } catch { /* drop event stand-in */ } }
      if (!file) return;
      const { kind } = importSource(s(), data, P(), pid());
      if (!/\.xlsx$/i.test(file.name)) { toast('Bitte eine Excel-Datei (.xlsx) wählen.'); return; }
      if (file.size > MAX_XLSX) { toast('Die Datei ist grösser als 10 MB.'); return; }
      try {
        const payload = readWorkbook(kind, await sheetsOfFile(file), data);
        store.setIn('imp', { file: { name: file.name, size: file.size, payload }, pid: pid(), filter: 'alle', done: false, applied: 0, undo: null });
      } catch (err) { toast(`${file.name}: ${err.message}`); }
    },
    impFileClear: () => store.setIn('imp', { file: null, step: 1 }),
    impFilter: ds => store.setIn('imp', { filter: ds.arg }),
    impMode: ds => store.setIn('imp', { mode: ds.arg }),
    impNext: () => { if (importSource(s(), data, P(), pid()).payload) store.setIn('imp', { step: 2 }); else toast('Zuerst eine Excel-Datei wählen.'); },
    impBack: () => store.setIn('imp', { step: 1 }),
    impClose: closeDialog,
    impGoto: ds => { closeDialog(); nav.navigate(ds.arg); },   // ds.arg: path of the current form (Erfassung or Übersicht)
    impApply: () => {
      const p0 = P(), { kind, payload, name } = importSource(s(), data, p0, pid());
      if (!p0 || !p0.forms[kind] || !payload || s().imp.done) return;
      if (!editable(kind)) { toast('Die Erfassung ist gesperrt.'); return; }
      const plan = planImport(kind, payload, p0, data, s().imp.mode), applied = plan.values;
      if (!applied) { toast('Die Datei enthält keine Änderungen.'); return; }
      const undo = { pid: pid(), kind, ...importScope(kind, p0) };   // the state before the import, also before «Erfassung begonnen»
      begin(kind);
      const p = P();
      setP(applyImport(kind, plan.patch, p));
      logEv(kind, me(), 'Excel importiert', `${name} · ${pl(applied, 'Wert', 'Werte')} übernommen`);
      addDoc(kind, name);
      store.setIn('imp', { done: true, applied, undo });
    },
    /** «Import zurücksetzen»: the values and the rows of the form as they were before the import; Verlauf and Dokumente keep the import. */
    impReset: () => {
      const u = (s().imp || {}).undo;
      if (u && u.pid === pid() && editable(u.kind)) {
        setP(p => ({ ...u.values, forms: { ...p.forms, [u.kind]: { ...p.forms[u.kind], ...u.form } } }));
        logEv(u.kind, me(), 'Excel-Import zurückgesetzt', 'Werte wie vor dem Import');
      }
      store.setIn('imp', { done: false, applied: 0, undo: null });
    },

    // ---- 09 Vorlagen ----
    tplSelect: ds => store.set({ tplSel: ds.key }),
    tplToggle: ds => store.setIn('tplOn', { [ds.key]: !s().tplOn[ds.key] }),

    // ---- Planlieferungen DWG für das Flächenmanagement (SAP RE-FX) (DWG-UG … DWG-DG); the gates come from the plan model ----
    planTab: ds => ui({ planTab: ds.arg, planSearch: '' }),                 // the search belongs to one list (plan-check resets it too)
    planFilter: ds => ui({ planFilter: ds.arg, planFor: ds.key || null, ...(s().ui.planFor === (ds.key || null) ? {} : { planSearch: '' }) }),   // 'all' | 'warnings' | 'errors'; filter and search belong to the plan they were set on (ui.planFor)
    planSearch: (ds, el) => ui({ planSearch: el.value, planFor: ds.key || null, ...(s().ui.planFor === (ds.key || null) ? {} : { planFilter: 'all' }) }),
    planFile: (ds, el) => {
      const file = el && el.files && el.files[0];
      if (el && 'value' in el) { try { el.value = ''; } catch { /* drop event stand-in */ } }
      if (!file) return;
      if ((planVm(ds.key) || {}).locked) { toast('Die Lieferung ist gesperrt.'); return; }
      runPlanCheck(ds.key, () => planSession.checkFile(ds.key, file));
    },
    planLoadSample: ds => { if ((planVm(ds.key) || {}).locked) { toast('Die Lieferung ist gesperrt.'); return; } runPlanCheck(ds.key, () => planSession.checkAsset(ds.key, data.plans.samples[data.plans.defaultSample || 'cadv01'].src)); },
    /** «Entfernen» takes the own upload away; a floor that came with a delivered plan shows that one again, a rejection stays a rejection. */
    planRemove: ds => { const f = floorOf(ds.key), pv = planVm(ds.key); if (!f || !pv || pv.locked || !pv.own || planOf(ds.key).busy) return; logPlan(ds.key, [[me(), 'DWG entfernt', pv.fileName || '']], { result: null, error: null, status: pv.status === 'zurueck' ? 'zurueck' : f.seed ? 'bearbeitung' : 'offen' }); },
    planSubmit: ds => {
      const pv = planVm(ds.key);
      if (!pv || !pv.canSubmit) return;
      logPlan(ds.key, [[me(), 'Zur Prüfung eingereicht']], { status: 'eingereicht' }, { 2: 'heute', 3: '', 4: '', 5: '' });
      toast(`${pv.code} eingereicht. ${planReviewer} wurde benachrichtigt.`);
    },
    planReopen: ds => { const pv = planVm(ds.key); if (pv && pv.locked) logPlan(ds.key, [[me(), 'Erfassung wieder geöffnet', 'Prototyp']], { status: 'bearbeitung', checks: { c1: false, c2: false } }, BACK_TO_ENTRY); },
    planComment: (ds, el) => { const pv = planVm(ds.key); if (pv && pv.isReviewable && isInternal()) setPlan(ds.key, { comment: el.value }); },   // the comment belongs to the review (BBL)
    planToggleCheck: ds => {
      const pv = planVm(ds.arg); if (!pv || !pv.isReviewable || !isInternal()) return;
      const checks = { ...planOf(ds.arg).checks, [ds.key]: !planOf(ds.arg).checks[ds.key] };
      if (pv.status === 'eingereicht') logPlan(ds.arg, [[me(), 'Prüfung begonnen']], { checks, status: 'pruefung' }, { 3: 'heute' });   // the first check starts the review
      else setPlan(ds.arg, { checks });
    },
    planApprove: ds => { const pv = planVm(ds.key); if (!pv || !pv.isReviewable || pv.approveDisabled || !isInternal()) return; logPlan(ds.key, [[me(), 'Freigegeben']], { status: 'freigegeben' }, { 4: 'heute' }); toast(`${pv.code} freigegeben.`); },
    planReject: ds => { const pv = planVm(ds.key); if (!pv || !pv.isReviewable || !isInternal()) return; logPlan(ds.key, [[me(), 'Zurückgewiesen', 'Erfassung wieder offen']], { status: 'zurueck', checks: { c1: false, c2: false } }, BACK_TO_ENTRY); toast(`${pv.code} zurückgewiesen. ${supplier.name} wurde benachrichtigt.`); },
    planTransfer: ds => { const pv = planVm(ds.key); if (!pv || !pv.isFrei || !isInternal()) return; logPlan(ds.key, [['SYS', 'An SAP RE-FX übertragen', 'Raumpolygone, AOID und Flächen SIA 416']], { status: 'uebertragen' }, { 5: 'heute' }); toast(`${pv.code}: Raumpolygone, AOID und Flächen an SAP RE-FX übertragen.`); },
    planResetReview: ds => { const f = floorOf(ds.key); if (f) setPlan(ds.key, { status: f.status, checks: { ...f.checks }, comment: '', events: [], at: {} }); },
    /** Prüfbericht (PDF) of the checked plan with the drawing images of the viewer; opts.save = false returns the Blob only (tests). */
    planReport: async (ds, el, ev, opts = {}) => {
      const pv = planVm(ds.key), f = floorOf(ds.key), project = projectOf(pid());
      if (!pv || !pv.result || !f) { toast('Noch kein Prüfergebnis für den Prüfbericht.'); return null; }
      const uploadedAt = pv.own && pv.result.checkedAt ? formatDateTime(new Date(pv.result.checkedAt)) : (pv.uploadedAt || '');
      const model = buildReportModel({ ...pv.result, kpi: pv.kpiRaw || pv.result.kpi }, { project: project ? project.name : '', code: pv.code, name: pv.name, heated: f.beheizt !== false, floor: `${pv.floor} (Ebene ${pv.ee})`, status: pv.statusLabel, reviewer: `${planReviewer}, BBL`, due: pv.due, guideline: data.plans.guideline, uploadedAt, fileName: pv.fileName });   // kpiRaw: the figures of the Kennzahlen (Nutzungsart of the rooms, DIN 277)
      ui({ busy: 'Prüfbericht wird erstellt…' });
      let capture = captureViewerImage, dispose = null, images = true;
      try {
        if (!viewerReady()) {   // Übersicht, Kennzahlen or a viewer that is still loading: the drawing is rendered off-screen
          let entry = planSession.get(pv.drawingKey);
          if (entry && entry.status === 'loading' && entry.promise) entry = await entry.promise.catch(() => null);
          if ((!entry || entry.status !== 'ready') && pv.src) entry = await planSession.loadAsset(pv.src).catch(() => null);   // not loaded yet, or a failed load: try (again)
          if (entry && entry.status === 'ready') ({ capture, dispose } = offscreenCapture(entry)); else images = false;
        }
        const blob = await downloadPlanReport(model, { capture, save: opts.save !== false });
        if (opts.save !== false) toast(`Prüfbericht ${model.baseName}_Pruefbericht.pdf erstellt${images ? '' : ', ohne Planbilder (die Zeichnung ist nicht mehr im Speicher)'}.`);
        return blob;
      } catch (err) { console.error(err); toast(`Prüfbericht konnte nicht erstellt werden: ${err.message}`); return null; }
      finally { if (dispose) dispose(); ui({ busy: null }); }
    },
    /** «CAD-Richtlinie ▾» of a plan: the Musterplan downloads (it is not loaded into the delivery); the guideline is a plain link to the PDF. */
    cadItem: () => {
      ui({ importMenu: false });
      const s = data.plans.samples.cadv01, a = document.createElement('a');
      a.href = s.src; a.download = s.name; document.body.appendChild(a); a.click(); a.remove();
    },

    // ---- Study panel ----
    tweak: (ds, el) => {
      const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? parseFloat(el.value) : el.value;
      store.setIn('tweaks', { [ds.key]: v });
    },
    toggleStudy: () => ui({ studyOpen: !s().ui.studyOpen, userMenu: false }),
    resetAll: () => store.reset(),
    /** Open a screen of the design study: switch to its persona, apply its state (dialog, step …), navigate. */
    studyGo: ds => {
      const id = ds.study || ds.arg;
      const L = LEGACY[id];
      if (!L) return;
      const sc = data.screens.find(x => x.id === id);
      const st = s();
      const base = { ...st, ui: { ...st.ui, dialog: null, notif: false, userMenu: false, importMenu: false }, imp: { ...st.imp, ...IMP_FRESH } };
      const u = sc && sc.user ? data.users.users.find(x => x.initials === sc.user.initials) : null;
      store.set(patchDotted(u ? { ...base, user: u.key } : base, L.patch));
      nav.navigate(L.path(nav.studyPid()));
    },
  };
}
