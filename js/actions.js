// All user actions. Views reference them declaratively:
//   <button data-action="formSubmit" data-key="kv">                → actions.formSubmit(dataset, el, event)
//   <input data-change="setMap" data-key="kvV" data-code="C02">   → actions.setMap(dataset, el, event) on change
//   <a data-nav="/projects/all">  or  data-nav="s03" (study id)   → navigate
//   <a data-study="s05">                                          → actions.studyGo: switch persona + open the study screen
// Conventions of the data-* attributes: key = identifier of the thing acted on (form kind, plan key, check id, user key),
// arg = option or value (dialog name, import item, tab), id = row id (Emissionsquelle, Kostenelement, notification),
// group / code / field = Hauptgruppe, position code and field of a value.
// The Datenformulare act on the project of the current route (nav.currentPid()); the THG-32 keeps its Emissionsquellen
// in state.projects[pid].thgSrc (thgVal, thgAdd, thgRemove …), the cost forms their positions in kvQ/kvV and ksQ/ksV.
import { LEGACY } from './links.js';
import { TASK_COLUMNS } from './model/columns.js';
import { formModel, LOCKED_FROM } from './model/form.js';
import { initProject } from './model/state.js';
import { KEYS, mockProject, groupAmount, egOf, mergeToolExport } from './model/mock.js';
import { planModel } from './model/plan.js';
import { patchDotted } from './store.js';
import { num } from './format.js';
import { planSession } from './plansession.js';
import { buildReportModel, downloadPlanReport } from './plancheck/report.js';
import { captureViewerImage } from './views/plan.js';

export function makeActions(store, data, nav) {
  const s = () => store.get();
  const ui = patch => store.setIn('ui', patch);
  let toastTimer = null;
  const toast = text => {
    ui({ toast: { text, id: Date.now() } });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui({ toast: null }), 4000);
  };
  const closeDialog = () => { ui({ dialog: null }); store.setIn('imp', { step: 1 }); };

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
  /** Patch a form and append an event to its Verlauf. */
  const logEv = (kind, who, text, detail, patch = {}) => setForm(kind, f => ({ ...(typeof patch === 'function' ? patch(f) : patch), events: [...f.events, ev(who, text, detail)] }));
  /** Move the form to a later step; the steps reached on the way get today's date (dates[i] = date step i was reached). */
  const advance = (kind, to, who, text, detail) => logEv(kind, who, text, detail, f => {
    const dates = f.dates.slice();
    for (let i = f.step + 1; i <= to; i++) if (i !== 2 && !dates[i]) dates[i] = 'heute';   // step 2 (Intern geprüft) is not used
    return { step: to, dates, rejected: false };
  });
  /** Back to the Erfassung (rejection or reopening in the prototype). */
  const backToEntry = (kind, rejected, text, detail) => logEv(kind, me(), text, detail, f => ({ step: 1, dates: f.dates.slice(0, 2), checks: {}, rejected }));
  const vm = kind => { const p = projectOf(pid()); return p ? formModel(s(), data, p)[kind] : null; };
  const setSrc = (id, patch) => setP(p => ({ thgSrc: (p.thgSrc || []).map(x => (x.id === id ? { ...x, ...patch } : x)) }));
  /** Typed numbers are stored as numbers (rounded to `decimals`), so they render with thousands separators; other text stays as typed. */
  const normNum = (raw, decimals = 0) => { const n = num(raw); if (n == null) return String(raw ?? '').trim(); const f = 10 ** decimals; return Math.round(n * f) / f; };

  // ---- Planlieferungen DWG: one floor plan = one delivery; files are checked locally with js/plancheck ----
  const planOf = key => (s().plans || {})[key];
  const planVm = key => planModel(s(), data).plans[key];
  const floorOf = key => (data.plans.floors || []).find(f => f.key === key);
  const setPlan = (key, patch) => store.setIn('plans', { [key]: { ...planOf(key), ...patch } });
  const supplier = data.plans.supplier, planReviewer = (data.forms.people.PM || ['Paula Muster'])[0];
  const runPlanCheck = async (key, run) => {
    const floor = floorOf(key);
    if (!floor || !planOf(key)) return;
    if (planOf(key).busy) { toast('Eine Prüfung läuft bereits. Bitte warten.'); return; }
    setPlan(key, { busy: 'Datei wird gelesen und geprüft (LibreDWG WebAssembly, lokal im Browser)…', error: null });
    try {
      const { entry, src } = await run();
      const result = { ...entry.result, src: src || null, checkedAt: new Date().toISOString() };
      const p = planOf(key);
      setPlan(key, { busy: null, result, status: p.status === 'offen' ? 'bearbeitung' : p.status });
      const sm = result.summary;
      toast(sm.errorCount === 0
        ? `${floor.code}: ${result.file.name} geprüft, ${sm.passedRules}/${sm.totalRules} Prüfregeln bestanden, ${sm.warningCount} Warnung(en).`
        : `${floor.code}: ${result.file.name} geprüft, ${sm.errorCount} Fehler. Plan im CAD korrigieren und neu hochladen.`);
    } catch (err) {
      setPlan(key, { busy: null, error: err.message });
      toast(`Prüfung fehlgeschlagen: ${err.message}`);
    }
  };

  return {
    // ---- Shell ----
    setUser: ds => { store.set({ user: ds.key }); ui({ userMenu: false, notif: false, importMenu: false }); },
    toggleUserMenu: () => ui({ userMenu: !s().ui.userMenu, notif: false, importMenu: false }),
    closeMenus: () => ui({ userMenu: false, notif: false, importMenu: false }),
    toggleNotif: () => ui({ notif: !s().ui.notif, userMenu: false, importMenu: false }),
    notifUnreadOnly: () => ui({ notifUnreadOnly: !s().ui.notifUnreadOnly }),
    markRead: ds => store.set({ notifRead: [...new Set([...(s().notifRead || []), ds.id])] }),
    markAllRead: () => store.set({ notifRead: data.notifications.map(n => n.id) }),
    notifOpen: ds => { store.set({ notifRead: [...new Set([...(s().notifRead || []), ds.id])] }); ui({ notif: false }); nav.navigate(ds.href); },
    toggleFavorite: ds => { const f = new Set(s().favorites || []); f.has(ds.id) ? f.delete(ds.id) : f.add(ds.id); store.set({ favorites: [...f] }); },
    toggleNav: ds => ui({ navOpen: { ...s().ui.navOpen, [ds.key]: !s().ui.navOpen[ds.key] } }),
    openDialog: ds => ui({ dialog: ds.arg, importMenu: false }),
    toggleSide: () => ui({ sideOpen: !s().ui.sideOpen }),
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

    // ---- Inputs of the Datenformulare (values of the current project) ----
    setMap: (ds, el) => setP(p => ({ [ds.key]: { ...(p[ds.key] || {}), [ds.code]: normNum(el.value) } })),

    // ---- Datenformulare: Erfassung (KV-32, KS-31) ----
    formGroupVal: (ds, el) => setForm(ds.form, f => ({ gvals: { ...f.gvals, [ds.group]: normNum(el.value) } })),
    /** The code of a position is a dropdown: choosing another eBKP-H element group replaces the position by an edited row with the same values. */
    formPosCode: (ds, el) => {
      const kind = ds.form, f = formOf(kind), code = el.value;
      if (!f || !editable(kind) || !code || code === ds.code) return;
      setP(p => {
        const [qKey, vKey] = KEYS[kind], n = (f.nNew || 0) + 1;
        return { forms: { ...p.forms, [kind]: { ...f, nNew: n, removed: { ...(f.removed || {}), [ds.code]: true }, added: [...(f.added || []), { id: `kn${n}`, grp: ds.group, code, q: p[qKey][ds.code] ?? '', v: p[vKey][ds.code] ?? '' }] } } };
      });
    },
    /** KV/KS: «Aufschlüsseln» opens the positions of a Hauptgruppe, «Zusammenfassen» keeps their sum as the group amount
     *  (a group without positions keeps its Pauschalbetrag plus the Kostenelemente added). THG: opens or closes the group. */
    formMode: ds => {
      const kind = ds.form, g = ds.group, f = formOf(kind);
      if (!f || !(g in f.modes) || !editable(kind)) return;
      const direct = (f.modes[g] || 'direct') === 'direct';
      if (direct || kind === 'thg') { setForm(kind, { modes: { ...f.modes, [g]: direct ? 'detail' : 'direct' } }); return; }
      const grp = data.ebkp.ebkp.find(x => x.code === g), V = P()[KEYS[kind][1]] || {}, added = (f.added || []).filter(a => a.grp === g);
      if (grp) { setForm(kind, { modes: { ...f.modes, [g]: 'direct' }, gvals: { ...f.gvals, [g]: groupAmount(grp, V, f.removed, added) ?? '' } }); return; }
      const sum = groupAmount({ kids: [{ code: g }] }, V, {}, added);                 // Pauschalbetrag + added elements → one amount again
      setP(p => ({ [KEYS[kind][1]]: { ...p[KEYS[kind][1]], [g]: sum ?? '' }, forms: { ...p.forms, [kind]: { ...f, modes: { ...f.modes, [g]: 'direct' }, added: (f.added || []).filter(a => a.grp !== g) } } }));
    },
    /** Remove a position (Kostenelement) from the Erfassung; the Verlauf keeps the event. */
    formRemovePos: ds => {
      const kind = ds.form, f = formOf(kind), k = data.ebkp.ebkp.flatMap(g => g.kids).find(x => x.code === ds.code);
      if (!f || !k || !editable(kind)) return;
      logEv(kind, me(), 'Kostenelement entfernt', `${k.code} ${k.name}`, { removed: { ...(f.removed || {}), [ds.code]: true } });
    },
    formAddPos: ds => { if (editable(ds.form)) setForm(ds.form, f => { const n = (f.nNew || 0) + 1; return { nNew: n, added: [...(f.added || []), { id: `kn${n}`, grp: ds.group, code: '', q: '', v: '' }] }; }); },
    formNewVal: (ds, el) => setForm(ds.form, f => ({ added: (f.added || []).map(a => (a.id === ds.id ? { ...a, [ds.field]: ds.field === 'code' ? el.value : normNum(el.value) } : a)) })),
    formDropNew: ds => setForm(ds.form, f => ({ added: (f.added || []).filter(a => a.id !== ds.id) })),
    formToggleMissing: ds => setForm(ds.key, f => ({ missingOnly: !f.missingOnly })),
    toggleImportMenu: () => ui({ importMenu: !s().ui.importMenu, userMenu: false, notif: false }),
    importItem: ds => {
      ui({ importMenu: false });
      if (!editable(ds.form)) { toast('Die Erfassung ist gesperrt.'); return; }
      if (ds.arg === 'excel' && KEYS[ds.form]) { store.setIn('imp', { form: ds.form, step: 1, done: false, applied: 0 }); ui({ dialog: 'import' }); return; }
      if (ds.arg === 'tool' && ds.form === 'thg') {
        // Tool-Export (XLSX/JSON of the Ökobilanz tool): the Emissionsquellen of the project come in, missing values are filled
        const p = P(), project = projectOf(pid()); if (!p || !project) return;
        const { next, added, filled } = mergeToolExport(p.thgSrc || [], mockProject(project, data, { complete: true }).thgSrc);
        if (!added && !filled) { toast('Tool-Export enthält keine neuen Werte.'); return; }
        const doc = (data.forms.kinds.thg.docs.find(d => d[1] === 'Excel') || [])[0] || 'Tool-Export';
        const what = added ? `${added} Emissionsquellen übernommen` : `${filled} Werte ergänzt`;
        setP({ thgSrc: next });
        logEv('thg', me(), 'Tool-Export importiert', `${doc} · Modell ecCo · ${what}`);
        toast(`Tool-Export importiert: ${what}.`);
        return;
      }
      toast('Im Prototyp ohne Funktion.');
    },

    // ---- Datenformulare: Erfassung (THG-32, Emissionsquellen je eBKP-H-Elementgruppe) ----
    thgHead: (ds, el) => setP(p => ({ thgHead: { ...(p.thgHead || {}), [ds.key]: el.value } })),
    thgVal: (ds, el) => {
      const patch = { [ds.field]: ds.field === 'q' ? normNum(el.value) : ds.field === 'h' || ds.field === 'e' ? normNum(el.value, 1) : el.value };
      if (ds.field === 'code') { const eg = egOf(data, el.value); Object.assign(patch, { name: eg ? eg[1] : '', unit: eg ? eg[2] : '', a: eg ? eg[3] : null }); }
      setSrc(ds.id, patch);
    },
    thgToggleHs: ds => { const x = ((P() || {}).thgSrc || []).find(y => y.id === ds.id); if (x && editable('thg')) setSrc(ds.id, { hs: !x.hs }); },
    thgAdd: ds => {
      if (!editable('thg')) return;
      setP(p => {
        const f = p.forms.thg, n = (f.nNew || 0) + 1;
        return { thgSrc: [...(p.thgSrc || []), { id: `n${n}`, grp: ds.group, isNew: true, code: '', kbob: '', name: '', unit: '', a: null, q: '', h: '', e: '', hs: false }], forms: { ...p.forms, thg: { ...f, nNew: n } } };
      });
    },
    thgRemove: ds => {
      const p = P(), x = p && (p.thgSrc || []).find(y => y.id === ds.id);
      if (!x || !editable('thg')) return;
      setP({ thgSrc: p.thgSrc.filter(y => y.id !== ds.id) });
      if (!x.isNew) logEv('thg', me(), 'Emissionsquelle entfernt', `${x.code} ${x.name} (${x.kbob})`);
    },

    // ---- Datenformulare: Einreichen, Prüfung BBL, Übergabe ----
    formSubmit: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.bar.canSubmit) return;
      advance(kind, 3, me(), 'Zur Prüfung eingereicht', F.submitDetail);
      toast(`${F.code} eingereicht. ${F.reviewer} wurde benachrichtigt.`);
    },
    formReopen: ds => { if (!editable(ds.key)) backToEntry(ds.key, false, 'Erfassung wieder geöffnet', 'Prototyp'); },
    formComment: (ds, el) => setForm(ds.key, { comment: el.value }),
    formToggleCheck: ds => {
      const kind = ds.arg, f = formOf(kind);
      if (!f || !(f.step === 3 || f.step === 4)) return;
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
      const values = kind === 'thg' ? { thgSrc: init.thgSrc, thgHead: init.thgHead } : { [KEYS[kind][0]]: init[KEYS[kind][0]], [KEYS[kind][1]]: init[KEYS[kind][1]] };
      setP(p => ({ forms: { ...p.forms, [kind]: init.forms[kind] }, ...values }));
    },

    // ---- 02 Datenlieferung bestellen (drawer on the Informationslieferplan) ----
    setOrderType: (ds, el) => store.set({ orderType: ds.arg || (el && el.value) }),
    orderReqType: (ds, el) => ui({ orderReq: el.value }),
    orderSubmit: () => { closeDialog(); toast('Bestellung erstellt. Der Lieferverantwortliche erhält eine Aufgabe vom Typ «Datenformular».'); },
    orderCancel: closeDialog,

    // ---- Excel importieren (dialog on the Erfassung of a Kostenformular; imp.form = kv | ks) ----
    impFilter: ds => store.setIn('imp', { filter: ds.arg }),
    impMode: ds => store.setIn('imp', { mode: ds.arg }),
    impNext: () => store.setIn('imp', { step: 2 }),
    impBack: () => store.setIn('imp', { step: 1 }),
    impClose: closeDialog,
    impGoto: ds => { closeDialog(); nav.navigate(ds.arg); },
    impApply: () => {
      const st = s(), p = P(), kind = (st.imp && KEYS[st.imp.form] ? st.imp.form : 'kv'), CH = data.ebkp.import.changes, vKey = KEYS[kind][1];
      if (!p || !p.forms[kind] || !editable(kind)) return;
      const applied = st.imp.mode === 'ueber' ? Object.keys(CH).length : 0;
      const modes = { ...p.forms[kind].modes };
      if (applied) for (const g of data.ebkp.ebkp) if (g.kids.some(k => CH[k.code] != null)) modes[g.code] = 'detail';   // imported positions are shown in detail
      const events = applied ? [...p.forms[kind].events, ev(me(), 'Excel importiert', `${data.ebkp.import.file} · ${applied} Werte übernommen`)] : p.forms[kind].events;
      setP({ [vKey]: applied ? { ...p[vKey], ...CH } : p[vKey], forms: { ...p.forms, [kind]: { ...p.forms[kind], modes, events } } });
      store.setIn('imp', { done: true, applied });
    },
    impReset: () => {
      const st = s(), kind = (st.imp && KEYS[st.imp.form] ? st.imp.form : 'kv'), vKey = KEYS[kind][1], project = projectOf(pid()); if (!project) return;
      const init = initProject(data, project), orig = {};
      Object.keys(data.ebkp.import.changes).forEach(c => { orig[c] = init[vKey][c]; });
      setP(p => ({ [vKey]: { ...p[vKey], ...orig } }));
      store.setIn('imp', { done: false, applied: 0 });
    },

    // ---- 09 Vorlagen ----
    tplSelect: ds => store.set({ tplSel: ds.key }),
    tplToggle: ds => store.setIn('tplOn', { [ds.key]: !s().tplOn[ds.key] }),

    // ---- Planlieferungen DWG für das CAFM (DWG-UG … DWG-DG); the gates come from the plan model ----
    planTab: ds => ui({ planTab: ds.arg }),
    planFile: (ds, el) => {
      const file = el && el.files && el.files[0];
      if (el && 'value' in el) { try { el.value = ''; } catch { /* drop event stand-in */ } }
      if (!file) return;
      runPlanCheck(ds.key, () => planSession.checkFile(ds.key, file));
    },
    planLoadSample: ds => runPlanCheck(ds.key, () => planSession.checkAsset(ds.key, data.plans.samples[data.plans.defaultSample || 'cadv01'].src)),
    planRemove: ds => { const f = floorOf(ds.key); if (!f || planOf(ds.key).busy) return; setPlan(ds.key, { result: null, error: null, status: f.seed ? 'bearbeitung' : 'offen' }); },
    planSubmit: ds => {
      const pv = planVm(ds.key);
      if (!pv || !pv.canSubmit) return;
      setPlan(ds.key, { status: 'eingereicht' });
      toast(`${pv.code} eingereicht. ${planReviewer} wurde benachrichtigt.`);
    },
    planReopen: ds => { const pv = planVm(ds.key); if (pv && pv.locked) setPlan(ds.key, { status: 'bearbeitung', checks: { c1: false, c2: false } }); },
    planComment: (ds, el) => setPlan(ds.key, { comment: el.value }),
    planToggleCheck: ds => { const pv = planVm(ds.arg); if (!pv || !pv.isReviewable) return; setPlan(ds.arg, { checks: { ...planOf(ds.arg).checks, [ds.key]: !planOf(ds.arg).checks[ds.key] }, status: 'pruefung' }); },
    planApprove: ds => { const pv = planVm(ds.key); if (!pv || !pv.isReviewable || pv.approveDisabled) return; setPlan(ds.key, { status: 'freigegeben' }); toast(`${pv.code} freigegeben.`); },
    planReject: ds => { const pv = planVm(ds.key); if (!pv || !pv.isReviewable) return; setPlan(ds.key, { status: 'zurueck', checks: { c1: false, c2: false } }); toast(`${pv.code} zurückgewiesen. ${supplier.name} wurde benachrichtigt.`); },
    planTransfer: ds => { const pv = planVm(ds.key); if (!pv || !pv.isFrei) return; setPlan(ds.key, { status: 'uebertragen' }); toast(`${pv.code}: Raumpolygone, AOID und Flächen an das CAFM übertragen.`); },
    planResetReview: ds => { const f = floorOf(ds.key); if (f) setPlan(ds.key, { status: f.status, checks: { ...f.checks }, comment: '' }); },
    /** Prüfbericht (PDF) of the checked plan with the drawing images of the viewer; opts.save = false returns the Blob only (tests). */
    planReport: async (ds, el, ev, opts = {}) => {
      const pv = planVm(ds.key), f = floorOf(ds.key), project = projectOf(pid());
      if (!pv || !pv.result || !f) { toast('Noch kein Prüfergebnis für den Prüfbericht.'); return null; }
      const model = buildReportModel(pv.result, { project: project ? project.name : '', code: pv.code, name: pv.name, floor: `${pv.floor} (Ebene ${pv.ee})`, status: pv.statusLabel, reviewer: `${planReviewer}, BBL`, due: pv.due, guideline: data.plans.guideline, uploadedAt: pv.uploadedAt || '' });
      try {
        const blob = await downloadPlanReport(model, { capture: captureViewerImage, save: opts.save !== false });
        if (opts.save !== false) toast(`Prüfbericht ${model.baseName}_Pruefbericht.pdf erstellt.`);
        return blob;
      } catch (err) { console.error(err); toast(`Prüfbericht konnte nicht erstellt werden: ${err.message}`); return null; }
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
      const base = { ...st, ui: { ...st.ui, dialog: null, notif: false, userMenu: false, importMenu: false }, imp: { ...st.imp, step: 1 } };
      const u = sc && sc.user ? data.users.users.find(x => x.initials === sc.user.initials) : null;
      store.set(patchDotted(u ? { ...base, user: u.key } : base, L.patch));
      nav.navigate(L.path(nav.studyPid()));
    },
  };
}
