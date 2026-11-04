// All user actions. Views reference them declaratively:
//   <button data-action="formSubmit" data-key="kv">                → actions.formSubmit(dataset, el, event)
//   <input data-change="setMap" data-key="kvV" data-code="C2">    → actions.setMap(dataset, el, event) on change
//   <a data-nav="/projects/all">  or  data-nav="s03" (study id)   → navigate
//   <a data-study="s05">                                          → actions.studyGo: switch persona + open the study screen
// The Datenformulare act on the project of the current route (nav.currentPid()).
import { LEGACY } from './links.js';
import { TASK_COLUMNS } from './model/columns.js';
import { formModel } from './model/form.js';
import { initProject } from './model/state.js';
import { KEYS } from './model/mock.js';
import { num } from './format.js';
import { planSession } from './plansession.js';

export function makeActions(store, data, nav) {
  const s = () => store.get();
  const ui = patch => store.setIn('ui', patch);
  const applyDotted = (st, patch) => {
    for (const [k, v] of Object.entries(patch || {})) {
      const path = k.split('.'); let t = st;
      for (let i = 0; i < path.length - 1; i++) { t[path[i]] = { ...(t[path[i]] || {}) }; t = t[path[i]]; }
      t[path[path.length - 1]] = v;
    }
    return st;
  };
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
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const ev = (who, text, detail = '') => ['heute', now(), who, text, detail];
  const me = () => s().user;
  /** Move the form to a later step; steps in between get today's date. */
  const advance = (kind, to, who, text, detail) => setForm(kind, f => {
    const dates = f.dates.slice();
    for (let i = f.step; i < to; i++) if (!dates[i]) dates[i] = 'heute';
    return { step: to, dates, rejected: false, events: [...f.events, ev(who, text, detail)] };
  });
  const vm = kind => { const p = projectOf(pid()); return p ? formModel(s(), data, p)[kind] : null; };
  const groupSum = (kind, g) => {
    const grp = data.ebkp.ebkp.find(x => x.code === g), V = (P() || {})[KEYS[kind][1]] || {};
    return grp ? grp.kids.reduce((a, k) => a + (num(V[k.code]) || 0), 0) : 0;
  };

  // ---- Planlieferungen DWG: one floor plan = one delivery; files are checked locally with js/plancheck ----
  const planOf = key => (s().plans || {})[key];
  const floorOf = key => (data.plans.floors || []).find(f => f.key === key);
  const setPlan = (key, patch) => store.setIn('plans', { [key]: { ...planOf(key), ...patch } });
  const runPlanCheck = async (key, run) => {
    const floor = floorOf(key);
    if (!floor || !planOf(key) || planOf(key).busy) return;
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
    noop: () => {},
    nav: ds => nav.navigate(ds.nav || ds.arg),

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
    setMap: (ds, el) => setP(p => ({ [ds.key]: { ...(p[ds.key] || {}), [ds.code]: el.value } })),
    setSia: (ds, el) => setP(p => ({ sia: { ...p.sia, [ds.code]: el.value } })),
    setEndwert: (ds, el) => setP({ endwert: el.value }),

    // ---- Datenformulare: Erfassung ----
    formGroupVal: (ds, el) => setForm(ds.form, f => ({ gvals: { ...f.gvals, [ds.group]: el.value } })),
    /** «Aufschlüsseln» opens the positions of a Hauptgruppe; «Zusammenfassen» keeps their sum as the group amount. */
    formMode: ds => {
      const kind = ds.form, g = ds.group, f = formOf(kind);
      if (!f || !data.ebkp.ebkp.some(x => x.code === g)) return;
      const direct = (f.modes[g] || 'direct') === 'direct';
      setForm(kind, direct ? { modes: { ...f.modes, [g]: 'detail' } } : { modes: { ...f.modes, [g]: 'direct' }, gvals: { ...f.gvals, [g]: groupSum(kind, g) } });
    },
    formToggleMissing: ds => setForm(ds.key, f => ({ missingOnly: !f.missingOnly })),
    toggleImportMenu: () => ui({ importMenu: !s().ui.importMenu, userMenu: false, notif: false }),
    importItem: ds => {
      ui({ importMenu: false });
      if (ds.arg === 'excel' && (ds.form === 'kv' || ds.form === 'ks')) { ui({ dialog: 'import' }); return; }
      if (ds.arg === 'kvqty') {
        const p = P(); if (!p) return;
        const thgQ = { ...p.thgQ };
        data.ebkp.ebkp.forEach(g => g.kids.forEach(k => { if (num(p.kvQ[k.code]) != null) thgQ[k.code] = p.kvQ[k.code]; }));
        setP({ thgQ });
        setForm('thg', f => ({ events: [...f.events, ev(me(), 'Mengen aus KV-32 übernommen')] }));
        toast('Mengen aus KV-32 übernommen.');
        return;
      }
      toast('Im Prototyp ohne Funktion.');
    },
    formSubmit: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.bar.canSubmit) return;
      advance(kind, 3, me(), 'Zur Prüfung eingereicht', F.submitDetail);
      toast(`${F.code} eingereicht. ${F.reviewer} wurde benachrichtigt.`);
    },
    formReopen: ds => setForm(ds.key, f => ({ step: 1, dates: f.dates.slice(0, 2), checks: {}, rejected: false, events: [...f.events, ev(me(), 'Erfassung wieder geöffnet', 'Prototyp')] })),

    // ---- Datenformulare: Prüfung BBL ----
    formToggleCheck: ds => {
      const kind = ds.arg, f = formOf(kind);
      if (!f || !(f.step === 3 || f.step === 4)) return;
      const patch = { checks: { ...f.checks, [ds.key]: !f.checks[ds.key] } };
      if (f.step === 3) { const dates = f.dates.slice(); if (!dates[3]) dates[3] = 'heute'; Object.assign(patch, { step: 4, dates, events: [...f.events, ev(me(), 'Prüfung begonnen')] }); }
      setForm(kind, patch);
    },
    formApprove: ds => {
      const kind = ds.key, F = vm(kind);
      if (!F || !F.rv.canApprove) return;
      advance(kind, 5, me(), 'Freigegeben');
      toast(`${F.code} freigegeben.`);
    },
    formReject: ds => {
      const kind = ds.key, f = formOf(kind), F = vm(kind);
      if (!f || !F || !(f.step === 3 || f.step === 4)) return;
      setForm(kind, { step: 1, dates: f.dates.slice(0, 2), rejected: true, checks: {}, events: [...f.events, ev(me(), 'Zurückgewiesen', 'Erfassung wieder offen')] });
      toast(`${F.code} zurückgewiesen. ${F.leadName.replace(/ \(.*\)$/, '')} wurde benachrichtigt.`);
    },
    formTransfer: ds => {
      const kind = ds.key, f = formOf(kind), F = vm(kind);
      if (!f || !F || f.step !== 5) return;
      advance(kind, 6, 'SYS', `An ${F.target} übertragen`, F.submitDetail);
      toast(`${F.code} an ${F.target} übertragen.`);
    },
    /** «Zurücksetzen»: the form and its values go back to the initial mock state of the project. */
    formResetReview: ds => {
      const kind = ds.key, project = projectOf(pid()); if (!project) return;
      const init = initProject(data, project), [q, v] = KEYS[kind];
      setP(p => ({ forms: { ...p.forms, [kind]: init.forms[kind] }, [q]: init[q], [v]: init[v], ...(kind === 'thg' ? { endwert: init.endwert } : {}) }));
    },

    // ---- 02 Datenlieferung bestellen (drawer on the Informationslieferplan) ----
    setOrderType: (ds, el) => store.set({ orderType: ds.arg || (el && el.value) }),
    orderReqType: (ds, el) => ui({ orderReq: el.value }),
    orderSubmit: () => { closeDialog(); toast('Bestellung erstellt. Der Lieferverantwortliche erhält eine Aufgabe vom Typ «Datenformular».'); },
    orderCancel: closeDialog,

    // ---- Excel importieren (dialog on the Erfassung of a Kostenformular) ----
    impFilter: ds => store.setIn('imp', { filter: ds.arg }),
    impMode: ds => store.setIn('imp', { mode: ds.arg }),
    impNext: () => store.setIn('imp', { step: 2 }),
    impBack: () => store.setIn('imp', { step: 1 }),
    impClose: closeDialog,
    impGoto: ds => { closeDialog(); nav.navigate(ds.arg); },
    impApply: () => {
      const st = s(), p = P(), CH = data.ebkp.import.changes;
      if (!p || !p.forms.kv) return;
      const applied = st.imp.mode === 'ueber' ? Object.keys(CH).length : 0;
      const modes = { ...p.forms.kv.modes };
      if (applied) for (const g of data.ebkp.ebkp) if (g.kids.some(k => CH[k.code] != null)) modes[g.code] = 'detail';   // imported positions are shown in detail
      const events = applied ? [...p.forms.kv.events, ev(me(), 'Excel importiert', `${data.ebkp.import.file} · ${applied} Werte übernommen`)] : p.forms.kv.events;
      setP({ kvV: applied ? { ...p.kvV, ...CH } : p.kvV, forms: { ...p.forms, kv: { ...p.forms.kv, modes, events } } });
      store.setIn('imp', { done: true, applied });
    },
    impReset: () => {
      const project = projectOf(pid()); if (!project) return;
      const init = initProject(data, project), orig = {};
      Object.keys(data.ebkp.import.changes).forEach(c => { orig[c] = init.kvV[c]; });
      setP(p => ({ kvV: { ...p.kvV, ...orig } }));
      store.setIn('imp', { done: false, applied: 0 });
    },

    // ---- 09 Vorlagen ----
    tplSelect: ds => store.set({ tplSel: ds.key }),
    tplToggle: (ds, el, ev2) => { ev2 && ev2.stopPropagation(); store.setIn('tplOn', { [ds.key]: !s().tplOn[ds.key] }); },

    // ---- Planlieferungen DWG für das CAFM (DWG-UG … DWG-DG) ----
    planTab: ds => ui({ planTab: ds.arg }),
    planFile: (ds, el) => {
      const file = el && el.files && el.files[0];
      if (el && 'value' in el) { try { el.value = ''; } catch { /* drop event stand-in */ } }
      if (!file) return;
      runPlanCheck(ds.key, () => planSession.checkFile(ds.key, file));
    },
    planLoadSample: ds => runPlanCheck(ds.key, () => planSession.checkAsset(ds.key, data.plans.samples.cadv01.src)),
    planRemove: ds => { const f = floorOf(ds.key); if (!f || planOf(ds.key).busy) return; setPlan(ds.key, { result: null, error: null, status: f.seed ? 'bearbeitung' : 'offen' }); },
    planSubmit: ds => {
      const p = planOf(ds.key), f = floorOf(ds.key);
      if (!p || !f || p.busy) return;
      const result = p.result || (f.seed ? data.plans.seeds[f.seed] : null);
      if (!result || result.summary.errorCount > 0 || ['eingereicht', 'pruefung', 'freigegeben', 'uebertragen'].includes(p.status)) return;
      setPlan(ds.key, { status: 'eingereicht' });
      toast(`${f.code} eingereicht. Paula Muster wurde benachrichtigt.`);
    },
    planReopen: ds => setPlan(ds.key, { status: 'bearbeitung', checks: { c1: false, c2: false } }),
    planToggleCheck: ds => { const p = planOf(ds.arg); if (!p || !['eingereicht', 'pruefung'].includes(p.status)) return; setPlan(ds.arg, { checks: { ...p.checks, [ds.key]: !p.checks[ds.key] }, status: 'pruefung' }); },
    planApprove: ds => { const p = planOf(ds.key), f = floorOf(ds.key); if (!p || !p.checks.c1 || !p.checks.c2) return; setPlan(ds.key, { status: 'freigegeben' }); toast(`${f.code} freigegeben.`); },
    planReject: ds => { const p = planOf(ds.key), f = floorOf(ds.key); if (!p || !['eingereicht', 'pruefung'].includes(p.status)) return; setPlan(ds.key, { status: 'zurueck', checks: { c1: false, c2: false } }); toast(`${f.code} zurückgewiesen. Alex Beispiel wurde benachrichtigt.`); },
    planTransfer: ds => { const p = planOf(ds.key), f = floorOf(ds.key); if (!p || p.status !== 'freigegeben') return; setPlan(ds.key, { status: 'uebertragen' }); toast(`${f.code}: Raumpolygone, AOID und Flächen an das CAFM übertragen.`); },
    planResetReview: ds => { const f = floorOf(ds.key); if (f) setPlan(ds.key, { status: f.status, checks: { ...f.checks } }); },

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
      const st = structuredClone(s());
      st.ui = { ...st.ui, dialog: null, notif: false, userMenu: false, importMenu: false };
      st.imp = { ...st.imp, step: 1 };
      if (sc && sc.user) {
        const u = data.users.users.find(x => x.initials === sc.user.initials);
        if (u) st.user = u.key;
      }
      applyDotted(st, L.patch);
      store.set(st);
      nav.navigate(L.path(nav.studyPid()));
    },
  };
}
