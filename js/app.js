// Bootstrap: load data → store → resolve route → render; re-render on state or route change.
import { loadData } from './data.js';
import { createStore, patchDotted, clearPersisted } from './store.js';
import { initialState } from './model/state.js';
import { compute } from './model/index.js';
import { makeActions } from './actions.js';
import { currentRoute, routeOverrides, navigate, replaceHash, onRoute, isLegacyId } from './router.js';
import { link, LEGACY, screenIdFor, defaultDeliveryTab } from './links.js';
import { kindOfCode } from './model/form.js';
import { frame, notificationDrawer, userMenu, toast, PROJECT_PAGES } from './shell.js';
import { renderStudy } from './study.js';
import { marker, raw, esc } from './ui.js';
import { views, dialogs } from './views/index.js';

const appRoot = document.getElementById('app');
const studyRoot = document.getElementById('study');
let data, store, actions, screens;
let mountedView = null;      // view whose mount() ran last (for unmount)
let overlayKey = '';         // which overlay is open, to move focus only when it opens
let overlayInvoker = null;   // focus signature of the control that opened the overlay (focus returns there on close)
let DETAILED_PID = 'musterhausen';   // the project with the full workflow (projects.json «detailed»)
const PROJECT_ROUTES = new Set(PROJECT_PAGES);
// Paths of earlier prototype versions → paths of the CDE Bund
const OLD_PATHS = { 'info-management/delivery-plan': 'delivery-plan', 'info-management/documents': 'documents', 'info-management/loin': 'loin', activities: 'timeline' };

/** Error page: shown when the data cannot be loaded or the persisted state breaks the render (with a way out). */
const errorPage = (title, detail, hint = '') => `<div class="boot-error"><h1>${esc(title)}</h1><pre>${esc(detail)}</pre>${hint}
  <p><button type="button" class="btn btn-primary" data-action="hardReset">Zustand zurücksetzen und neu laden</button></p></div>`;

async function main() {
  try {
    data = await loadData();
  } catch (e) {
    appRoot.innerHTML = errorPage('Daten konnten nicht geladen werden', e.message, `<p>Der Prototyp lädt seine Mock-Daten per <code>fetch()</code> aus <code>data/*.json</code>. Das funktioniert nicht über <code>file://</code>.
      Bitte einen statischen Server im Projektordner starten, z.&nbsp;B. <code>python -m http.server 8080</code> oder <code>npx serve</code>, und dann <code>http://localhost:8080</code> öffnen.</p>`);
    return;
  }
  screens = data.screens;
  DETAILED_PID = (data.projects.projects.find(p => p.detailed) || data.projects.projects[0]).id;
  store = createStore(initialState(data));
  actions = makeActions(store, data, { navigate: navTo, studyPid: () => DETAILED_PID, currentPid: () => currentRoute().params.pid || DETAILED_PID });
  store.subscribe(schedule);
  onRoute(onHashChange);
  bindEvents();
  // Debug hook for the browser console and tests: cde.state, cde.store.set({...}), cde.navigate('/tasks/all')
  window.cde = { get state() { return store.get(); }, store, data, navigate: navTo, actions, link };
  onHashChange(true);
}

/** Navigate to a path, or to a study screen id (legacy «s03» links inside views; no persona switch). */
function navTo(target) {
  if (!target) return;
  if (isLegacyId(target)) {
    const id = target.replace(/^\//, '');
    const L = LEGACY[id];
    if (!L) { navigate('/'); return; }
    if (L.patch) applyOverrides(L.patch);
    navigate(L.path(DETAILED_PID));
    return;
  }
  navigate(target);
}

function onHashChange(initial) {
  const r = currentRoute();
  if (r.name === 'legacy') {
    if (!LEGACY[r.params.id]) { replaceHash('/'); render(); return; }   // unknown study id → start page
    actions.studyGo({ study: r.params.id });                              // #s05 → study screen (persona + route)
    return;
  }
  const o = routeOverrides(r.query);
  if (o) applyOverrides(o);
  if (canonicalize(r)) return;                                            // hash replaced → hashchange renders
  if (initial !== true) {
    window.scrollTo(0, 0);
    const ui = store.get().ui;
    if (ui.userMenu || ui.sideOpen || ui.importMenu || ui.searchOpen || ui.dialog === 'columns') store.setIn('ui', { userMenu: false, sideOpen: false, importMenu: false, searchOpen: false, dialog: ui.dialog === 'columns' ? null : ui.dialog });   // page-local overlays close on navigation
  }
  render();
}

/** Deliveries without a tab get the role's default tab in the URL (one canonical address per view). */
function canonicalize(r) {
  if (r.name === 'section') {
    const old = r.params.sub ? `${r.params.section}/${r.params.sub}` : r.params.section;
    if (OLD_PATHS[old]) { location.replace('#' + `/projects/${r.params.pid}/${OLD_PATHS[old]}`); return true; }
    return false;
  }
  if (r.name !== 'delivery' || r.params.tab) return false;
  const project = data.projects.projects.find(p => p.id === r.params.pid);
  if (!project) return false;
  const code = r.params.code.toLowerCase();
  const hasForm = code.startsWith('dwg-') ? !!project.detailed : !!((data.forms.byProject[project.id] || {})[kindOfCode(code)]);
  if (!hasForm) return false;
  const tab = defaultDeliveryTab(code);
  if (!tab) return false;
  const path = link.delivery(r.params.pid, r.params.code, tab);
  if (location.hash === '#' + path) return false;
  location.replace('#' + path);
  return true;
}

/** Patch the state with dotted keys from a deep link or a study screen: { 'ui.dialog': 'order', 'projects.musterhausen.forms.thg.step': 5 }.
 *  Values may only replace values of the same kind, so a bad link cannot break the persisted state. */
function applyOverrides(o) {
  const safe = Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('__')));
  store.set(patchDotted(store.get(), safe, { typed: true }));
}

let pending = null;
function schedule() { if (pending) return; pending = setTimeout(() => { pending = null; render(); }, 0); }

function render() {
  if (pending) { clearTimeout(pending); pending = null; }                // a navigation renders at once, no second render afterwards
  try { renderPage(); } catch (e) {
    console.error(e);
    appRoot.innerHTML = errorPage('Fehler beim Rendern', String(e.stack || e));
  }
}

function renderPage() {
  const route = currentRoute();
  if (route.name === 'legacy') return;
  const state = store.get();
  const users = data.users.users;
  const user = users.find(u => u.key === state.user) || users[0];
  const pid = route.params.pid;
  const project = pid ? data.projects.projects.find(p => p.id === pid) || null : null;
  const effProject = project || data.projects.projects.find(p => p.id === DETAILED_PID);
  const dataCtx = { ...data, project: { ...data.project, ...effProject } };
  const vm = compute(state, dataCtx, effProject, user);
  const screenId = screenIdFor(route, state);
  const screen = screens.find(s => s.id === screenId) || null;
  const mk = !!(state.ui.studyOpen && state.tweaks.showMarkers);
  const epid = effProject.id;
  const ctx = {
    state, data: dataCtx, vm, actions, navigate: navTo, route, project, user, screens, screenId, screen, mk,
    marker: (n, style = '') => marker(n, style, mk),
    link: {
      ...link,
      project: (p = epid) => link.project(p),
      section: (key, p = epid) => link.section(p, key),
      ilp: (p = epid) => link.ilp(p),
      projectTasks: (p = epid) => link.projectTasks(p),
      delivery: (code, tab, p = epid) => link.delivery(p, code, tab),
      settings: (tab, p = epid) => link.settings(p, tab),
    },
    crumbs: (...rest) => [
      { label: 'Projekte', href: link.projects() },
      ...(project ? [{ label: project.name, href: link.project(project.id) }] : []),
      ...rest.map(r => typeof r === 'string'
        ? ({ Aufgaben: { label: r, href: link.projectTasks(epid) }, Informationslieferplan: { label: r, href: link.ilp(epid) }, Einstellungen: { label: r, href: link.settings(epid) } }[r] || r)
        : r),
    ],
  };
  const view = (PROJECT_ROUTES.has(route.name) && !project) ? views.notfound : (views[route.name] || views.notfound);
  if (mountedView && mountedView !== view && mountedView.unmount) { try { mountedView.unmount(); } catch (e) { console.error(e); } }
  const focus = captureFocus();
  const body = view.render(ctx);
  const page = view.full ? body : frame(ctx, body, overlays(ctx));
  appRoot.innerHTML = String(page);
  studyRoot.innerHTML = String(renderStudy(ctx));
  document.body.classList.toggle('study-open', !!state.ui.studyOpen);
  document.body.classList.toggle('side-open', !!state.ui.sideOpen);
  if (view.mount) { try { view.mount(appRoot, ctx); } catch (e) { console.error(e); } }
  mountedView = view;
  restoreFocus(focus);
  focusOverlay(state, focus);
  document.title = `${view.title ? view.title(ctx) : 'CDE Bund'} · CDE Bund`;
  showSpinner(state.ui.busy || (Object.values(state.plans || {}).find(p => p && p.busy) || {}).busy);
}

/** Global loading indicator (#spin in index.html): shown while the data loads at start and whenever something is busy. */
function showSpinner(text) {
  const el = document.getElementById('spin');
  if (!el) return;
  el.hidden = !text;
  if (text) el.querySelector('.spin-text').textContent = text;
}

function overlays(ctx) {
  const { state } = ctx;
  const parts = [];
  const d = state.ui.dialog;
  if (d && dialogs[d] && (!dialogs[d].when || dialogs[d].when(ctx))) parts.push(dialogs[d].render(ctx));
  if (state.ui.notif) parts.push(notificationDrawer(ctx));
  if (state.ui.userMenu) parts.push(userMenu(ctx));
  parts.push(toast(state.ui.toast));
  return raw(parts.map(String).join(''));
}

/** Move focus into a dialog, drawer or menu when it opens; back to the control that opened it (or the page) when it closes.
 *  While a modal overlay is open, the page behind it is inert. */
function focusOverlay(state, focusBefore) {
  const key = state.ui.dialog ? 'dialog:' + state.ui.dialog : state.ui.notif ? 'notif' : state.ui.userMenu ? 'menu' : '';
  const modal = !!key && key !== 'menu';
  appRoot.querySelectorAll('.proto-banner, .topbar, .app-body, .app-footer').forEach(el => { el.inert = modal; });
  if (key === overlayKey) return;
  const wasOpen = !!overlayKey;
  overlayKey = key;
  if (key) {
    overlayInvoker = focusBefore;
    const box = appRoot.querySelector('.overlay [role="dialog"], .drawer[role="dialog"], .user-menu');
    const target = box && (box.querySelector('[autofocus], .dialog-close, button, [tabindex="0"], a[href], input, select') || box);
    if (target) target.focus({ preventScroll: true });
  } else if (wasOpen) {
    const back = overlayInvoker && findFocus(overlayInvoker);
    overlayInvoker = null;
    if (back) { back.focus({ preventScroll: true }); return; }
    const main = appRoot.querySelector('.app-main');
    if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
  }
}

// Focus survives the full re-render: inputs by data-fid, every other control by the signature of its data-* wiring.
const FOCUS_KEYS = ['action', 'change', 'nav', 'study', 'key', 'arg', 'id', 'group', 'code', 'form', 'field'];
function focusSelector(el) {
  if (!el || el === document.body || !el.dataset) return null;
  if (el.dataset.fid) return `[data-fid="${CSS.escape(el.dataset.fid)}"]`;
  const sig = FOCUS_KEYS.filter(k => el.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('');
  return sig || null;
}
function findFocus(f) { try { return document.querySelector(f.sel); } catch { return null; } }
function captureFocus() {
  const el = document.activeElement, sel = focusSelector(el);
  if (!sel) return null;
  const range = ('selectionStart' in el && el.type !== 'number') ? [el.selectionStart, el.selectionEnd] : null;
  return { sel, range };
}
function restoreFocus(f) {
  const el = f && findFocus(f);
  if (!el || el.disabled) return;
  el.focus({ preventScroll: true });
  if (f.range) { try { el.setSelectionRange(f.range[0], f.range[1]); } catch { /* not a text input */ } }
}

function run(name, ds, el, ev) {
  const fn = actions[name];
  if (!fn) { console.warn('Unbekannte Aktion', name); return; }
  fn(ds, el, ev);
}

function bindEvents() {
  document.body.addEventListener('click', e => {
    if (store.get().ui.searchOpen && !e.target.closest('.topbar-search')) actions.searchClose();   // click outside closes the suggestions
    const a = e.target.closest('[data-action],[data-nav],[data-study],[data-screen-link]');
    if (!a) return;
    if (a !== e.target && e.target.closest('input,select,textarea,label')) return;   // a field inside a clickable row (Hauptgruppe) keeps its own behaviour
    if (a.hasAttribute('data-screen-link')) return;                       // plain #sXX link → hashchange → studyGo
    if (a.dataset.study) { e.preventDefault(); actions.studyGo({ study: a.dataset.study }); return; }
    if (a.dataset.nav) { e.preventDefault(); navTo(a.dataset.nav); return; }
    if (a.dataset.action) {
      if (a.disabled) return;
      e.preventDefault();
      if (a.dataset.action === 'hardReset') { clearPersisted(); location.reload(); return; }   // error page: works without a store
      run(a.dataset.action, a.dataset, a, e);
    }
  });
  document.body.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el) run(el.dataset.change, el.dataset, el, e);
  });
  document.body.addEventListener('input', e => {                      // live fields (search), focus survives the re-render by data-fid
    const el = e.target.closest('[data-input]');
    if (el) run(el.dataset.input, el.dataset, el, e);
  });
  document.body.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('.topbar-search-input')) {   // combobox keys of the search
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); actions.searchMove({ dir: e.key === 'ArrowDown' ? 1 : -1 }); return; }
      if (e.key === 'Enter') { e.preventDefault(); actions.searchGo(); return; }
      if (e.key === 'Escape') { actions.searchClose(); return; }
    }
    if (e.key === 'Escape') {
      const ui = store.get().ui;
      if (ui.searchOpen) actions.searchClose();
      else if (ui.dialog) actions.closeDialog();
      else if (ui.notif || ui.userMenu || ui.sideOpen) actions.closeMenus();
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const a = e.target.closest('[data-action][role],[data-nav][role],[data-study][role]');
    if (!a || ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'].includes(a.tagName)) return;
    e.preventDefault();
    if (a.dataset.study) actions.studyGo({ study: a.dataset.study });
    else if (a.dataset.nav) navTo(a.dataset.nav);
    else run(a.dataset.action, a.dataset, a, e);
  });
}

main().catch(e => { console.error(e); appRoot.innerHTML = errorPage('Fehler beim Start', String(e.stack || e)); });
