// Bootstrap: load data → store → resolve route → render; re-render on state or route change.
import { loadData } from './data.js';
import { createStore } from './store.js';
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

const DETAILED_PID = 'musterhausen';
const PROJECT_ROUTES = new Set(PROJECT_PAGES);
// Paths of earlier prototype versions → paths of the CDE Bund
const OLD_PATHS = { 'info-management/delivery-plan': 'delivery-plan', 'info-management/documents': 'documents', 'info-management/loin': 'loin', activities: 'timeline' };

async function main() {
  try {
    data = await loadData();
  } catch (e) {
    appRoot.innerHTML = `<div class="boot-error"><h1>Daten konnten nicht geladen werden</h1><p>${esc(e.message)}</p>
      <p>Der Prototyp lädt seine Mock-Daten per <code>fetch()</code> aus <code>data/*.json</code>. Das funktioniert nicht über <code>file://</code>.
      Bitte einen statischen Server im Projektordner starten, z.&nbsp;B. <code>python -m http.server 8080</code> oder <code>npx serve</code>, und dann <code>http://localhost:8080</code> öffnen.</p></div>`;
    return;
  }
  screens = data.screens;
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
    if (ui.userMenu || ui.sideOpen || ui.importMenu || ui.dialog === 'columns') store.setIn('ui', { userMenu: false, sideOpen: false, importMenu: false, dialog: ui.dialog === 'columns' ? null : ui.dialog });   // page-local overlays close on navigation
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

/** Patch the state with dotted keys: { 'ui.dialog': 'order', review: 'freigegeben' } */
function applyOverrides(o) {
  const st = structuredClone(store.get());
  for (const [k, v] of Object.entries(o)) {
    const path = k.split('.');
    let t = st;
    for (let i = 0; i < path.length - 1; i++) { if (typeof t[path[i]] !== 'object' || t[path[i]] === null) t[path[i]] = {}; t = t[path[i]]; }
    t[path[path.length - 1]] = v;
  }
  store.set(st);
}

let pending = false;
function schedule() { if (pending) return; pending = true; setTimeout(() => { pending = false; render(); }, 0); }

function render() {
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
  let page;
  try {
    const body = view.render(ctx);
    page = view.full ? body : frame(ctx, body, overlays(ctx));
  } catch (e) {
    console.error(e);
    page = `<div class="boot-error"><h1>Fehler beim Rendern</h1><pre>${esc(String(e.stack || e))}</pre></div>`;
  }
  appRoot.innerHTML = String(page);
  studyRoot.innerHTML = String(renderStudy(ctx));
  document.body.classList.toggle('study-open', !!state.ui.studyOpen);
  document.body.classList.toggle('side-open', !!state.ui.sideOpen);
  if (view.mount) { try { view.mount(appRoot, ctx); } catch (e) { console.error(e); } }
  mountedView = view;
  restoreFocus(focus);
  focusOverlay(state);
  document.title = `${view.title ? view.title(ctx) : 'CDE Bund'} · CDE Bund`;
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

/** Move focus into a dialog, drawer or menu when it opens; back to the page when it closes. */
function focusOverlay(state) {
  const key = state.ui.dialog ? 'dialog:' + state.ui.dialog : state.ui.notif ? 'notif' : state.ui.userMenu ? 'menu' : '';
  if (key === overlayKey) return;
  const wasOpen = !!overlayKey;
  overlayKey = key;
  if (key) {
    const box = appRoot.querySelector('[role="dialog"], .user-menu');
    const target = box && (box.querySelector('[autofocus], .dialog-close, button, [tabindex="0"], a[href], input, select') || box);
    if (target) target.focus({ preventScroll: true });
  } else if (wasOpen) {
    const main = appRoot.querySelector('.app-main');
    if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
  }
}

function captureFocus() {
  const el = document.activeElement;
  if (!el || !el.dataset || !el.dataset.fid) return null;
  const sel = ('selectionStart' in el && el.type !== 'number') ? [el.selectionStart, el.selectionEnd] : null;
  return { fid: el.dataset.fid, sel };
}
function restoreFocus(f) {
  if (!f) return;
  const el = document.querySelector(`[data-fid="${CSS.escape(f.fid)}"]`);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (f.sel) { try { el.setSelectionRange(f.sel[0], f.sel[1]); } catch { /* not a text input */ } }
}

function run(name, ds, el, ev) {
  const fn = actions[name];
  if (!fn) { console.warn('Unbekannte Aktion', name); return; }
  fn(ds, el, ev);
}

function bindEvents() {
  document.body.addEventListener('click', e => {
    const a = e.target.closest('[data-action],[data-nav],[data-study],[data-screen-link]');
    if (!a) return;
    if (a !== e.target && e.target.closest('input,select,textarea,label')) return;   // a field inside a clickable row (Hauptgruppe) keeps its own behaviour
    if (a.hasAttribute('data-screen-link')) return;                       // plain #sXX link → hashchange → studyGo
    if (a.dataset.study) { e.preventDefault(); actions.studyGo({ study: a.dataset.study }); return; }
    if (a.dataset.nav) { e.preventDefault(); navTo(a.dataset.nav); return; }
    if (a.dataset.action) {
      if (a.disabled) return;
      e.preventDefault();
      run(a.dataset.action, a.dataset, a, e);
    }
  });
  document.body.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el) run(el.dataset.change, el.dataset, el, e);
  });
  document.body.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const ui = store.get().ui;
      if (ui.dialog) actions.closeDialog();
      else if (ui.notif || ui.userMenu) actions.closeMenus();
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

main();
