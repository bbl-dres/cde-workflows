// Link builders, sidebar sections and the mapping of the design study's screen ids to app routes.

export const SECTIONS = {
  ue: { path: 'overview', label: 'Überblick' },
  ak: { path: 'timeline', label: 'Aktivitäten' },
  da: { path: 'files', label: 'Dateien' },
  mo: { path: 'model', label: 'Modell' },
  au: { path: 'tasks', label: 'Aufgaben' },
  loin: { path: 'loin', label: 'LOIN' },
  dok: { path: 'documents', label: 'Dokumente' },
  ilp: { path: 'delivery-plan', label: 'Informationslieferplan' },
  at: { path: 'automation', label: 'Automatisierung' },
  wf: { path: 'workflows', label: 'Workflows' },
  mi: { path: 'members', label: 'Mitglieder' },
  st: { path: 'master-data', label: 'Stammdaten' },
  lo: { path: 'master-data/delivery-objects', label: 'Lieferobjekte' },
  ei: { path: 'settings', label: 'Einstellungen' },
};
const PATH_TO_KEY = Object.fromEntries(Object.entries(SECTIONS).map(([k, v]) => [v.path, k]));

export const link = {
  home: () => '/',
  projects: view => '/projects/all' + (view ? `?view=${view}` : ''),
  favorites: () => '/projects/favorites',
  tasks: (filter = 'all', type) => `/tasks/${filter}` + (type && type !== 'all' ? `?type=${type}` : ''),
  project: pid => `/projects/${pid}/overview`,
  section: (pid, key) => `/projects/${pid}/${(SECTIONS[key] || SECTIONS.ue).path}`,
  ilp: pid => `/projects/${pid}/delivery-plan`,
  projectTasks: pid => `/projects/${pid}/tasks`,
  delivery: (pid, code, tab) => `/projects/${pid}/deliveries/${String(code).toLowerCase()}${tab ? '/' + tab : ''}`,
  settings: (pid, tab) => `/projects/${pid}/settings${tab ? '/' + tab : ''}`,
  study: page => page ? `/study/${page}` : '/study',
};

/** Sidebar key for a route inside a project. */
export function sectionKeyFor(route, user) {
  const p = route.params;
  switch (route.name) {
    case 'overview': return 'ue';
    case 'projectTasks': return 'au';
    case 'ilp': return 'ilp';
    case 'settings': return 'ei';
    case 'documents': return 'dok';
    case 'loin': return 'loin';
    case 'timeline': return 'ak';
    case 'delivery': return user && user.internal ? 'ilp' : 'au';
    case 'section': return PATH_TO_KEY[p.sub ? `${p.section}/${p.sub}` : p.section] || null;
    default: return null;
  }
}

// ---- Design study: screen id → route + state patch (persona is applied separately from screens.json) ----
// The study's screens map onto the Datenformulare of the design 04.11.2026 (FV-32 entfällt → Planlieferungen DWG).
const D = (code, tab) => pid => link.delivery(pid, code, tab);
export const LEGACY = {
  home: { path: () => link.study(), study: true },
  review: { path: () => link.study('review'), study: true },
  qs: { path: () => link.study('qs'), study: true },
  varb: { path: () => link.study('variant-b'), study: true },
  s01: { path: pid => link.ilp(pid) },
  s02: { path: pid => link.ilp(pid), patch: { 'ui.dialog': 'order' } },
  s02b: { path: pid => link.projectTasks(pid), patch: { 'ui.notif': true } },
  s03a: { path: D('dwg-ug', 'uebersicht') },
  s03: { path: D('kv-32', 'erfassung') },
  s03c: { path: D('kv-32', 'erfassung'), patch: { 'ui.dialog': 'import', 'imp.step': 1 } },
  s03d: { path: D('kv-32', 'erfassung'), patch: { 'ui.dialog': 'import', 'imp.step': 2 } },
  s03b: { path: D('kv-32', 'uebersicht') },
  s04: { path: D('thg-32', 'erfassung') },
  s05: { path: D('thg-32', 'pruefung') },
  s06: { path: () => link.tasks('all', 'thg') },
  s07: { path: D('kv-32', 'beteiligte') },
  s08: { path: D('kv-32', 'pruefung') },
  s09: { path: pid => link.settings(pid, 'information-requirements') },
  s10: { path: D('dwg-eg', 'uebersicht') },
  s11: { path: D('dwg-eg', 'erfassung') },
};

/** Tabs of every Datenformular (same order for all, design 04.11.2026); Übersicht is the landing tab. */
export const FORM_TABS = ['uebersicht', 'erfassung', 'pruefung', 'beteiligte', 'dokumente', 'verlauf'];
export const PLAN_CODES = ['dwg-ug', 'dwg-eg', 'dwg-og1', 'dwg-og2', 'dwg-dg'];
export const DELIVERY_TABS = Object.fromEntries(['kv-32', 'ks-31', 'thg-32', ...PLAN_CODES].map(c => [c, FORM_TABS]));
export function defaultDeliveryTab(code) {
  return DELIVERY_TABS[String(code).toLowerCase()] ? 'uebersicht' : null;
}

/** Which study screen the current route + state corresponds to (for annotations and markers). */
export function screenIdFor(route, state) {
  const p = route.params, ui = state.ui || {};
  switch (route.name) {
    case 'study': return { undefined: 'home', review: 'review', qs: 'qs', 'variant-b': 'varb' }[p.page] || 'home';
    case 'ilp': return ui.dialog === 'order' ? 's02' : 's01';
    case 'projectTasks': return 's02b';
    case 'tasks': return route.query.type === 'thg' ? 's06' : null;
    case 'settings': return p.tab === 'information-requirements' ? 's09' : null;
    case 'delivery': {
      const code = (p.code || '').toLowerCase(), tab = p.tab;
      if (code === 'kv-32') {
        if (tab === 'erfassung') return ui.dialog === 'import' ? ((state.imp && state.imp.step === 2) ? 's03d' : 's03c') : 's03';
        return { uebersicht: 's03b', beteiligte: 's07', pruefung: 's08' }[tab] || null;
      }
      if (code === 'thg-32') return { erfassung: 's04', pruefung: 's05' }[tab] || null;
      if (code === 'dwg-eg') return { uebersicht: 's10', erfassung: 's11' }[tab] || null;
      if (code === 'dwg-ug') return tab === 'uebersicht' ? 's03a' : null;
      return null;
    }
    default: return null;
  }
}
