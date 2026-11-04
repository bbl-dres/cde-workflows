// Hash router with the URL structure of the CDE Bund:
//   #/                                              Dashboard
//   #/projects/all?view=list|card · #/projects/favorites
//   #/projects/:pid/overview · tasks · timeline[/logs] · documents · loin[/:tab] · delivery-plan · files · members · settings/:tab …
//   #/projects/:pid/deliveries/:code/:tab            Datenlieferung (kv-32/erfassung …)
//   #/tasks/all | assigned | everything              Aufgaben
//   #/study · #/study/review | qs | variant-b        Design-Studie
//
// Legacy study ids (#s01 … #s11, #home, #review, #qs, #varb) are resolved by app.js via links.js.
//
// Query parameters that are not route parameters patch the state once when the hash is entered
// (deep links, screenshots): #/projects/musterhausen/deliveries/thg-32/pruefung?projects.musterhausen.forms.thg.step=5&user=FM
// Dotted keys patch nested objects; values are parsed as JSON when possible and may only replace values of the same kind.

const PATTERNS = [
  ['/', 'home'],
  ['/projects/all', 'projects'],
  ['/projects/favorites', 'projects'],
  ['/projects/:pid/overview', 'overview'],
  ['/projects/:pid/tasks', 'projectTasks'],
  ['/projects/:pid/delivery-plan', 'ilp'],
  ['/projects/:pid/documents', 'documents'],
  ['/projects/:pid/loin', 'loin'],
  ['/projects/:pid/loin/:tab', 'loin'],
  ['/projects/:pid/timeline', 'timeline'],
  ['/projects/:pid/timeline/:tab', 'timeline'],
  ['/projects/:pid/deliveries/:code', 'delivery'],
  ['/projects/:pid/deliveries/:code/:tab', 'delivery'],
  ['/projects/:pid/settings', 'settings'],
  ['/projects/:pid/settings/:tab', 'settings'],
  ['/projects/:pid/:section', 'section'],
  ['/projects/:pid/:section/:sub', 'section'],
  ['/tasks/:filter', 'tasks'],
  ['/study', 'study'],
  ['/study/:page', 'study'],
];

const ROUTE_QUERY_KEYS = new Set(['view', 'type', 'q', 'group', 'page']);
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };

export function parseHash(hash = location.hash) {
  const h = (hash || '').replace(/^#/, '');
  const i = h.indexOf('?');
  const path = (i === -1 ? h : h.slice(0, i)) || '/';
  const qs = i === -1 ? '' : h.slice(i + 1);
  const query = {};
  for (const pair of qs.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    query[safeDecode(k)] = safeDecode(v);
  }
  return { path, query };
}

export const isLegacyId = path => /^\/?(s\d+[a-z]?|home|review|qs|varb)$/.test(path);

export function matchRoute(path) {
  const segs = path.split('/').filter(Boolean);
  for (const [pattern, name] of PATTERNS) {
    const ps = pattern.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(':')) params[ps[i].slice(1)] = safeDecode(segs[i]);
      else if (ps[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { name, params };
  }
  return { name: 'notfound', params: {} };
}

export function currentRoute() {
  const { path, query } = parseHash();
  if (isLegacyId(path)) return { name: 'legacy', params: { id: path.replace(/^\//, '') }, path, query };
  return { ...matchRoute(path), path, query };
}

/** State overrides from the query string (everything that is not a route parameter). */
export function routeOverrides(query) {
  const out = {};
  for (const [k, v] of Object.entries(query || {})) {
    if (ROUTE_QUERY_KEYS.has(k)) continue;
    let val;
    try { val = JSON.parse(v); } catch { val = v; }
    out[k] = val;
  }
  return Object.keys(out).length ? out : null;
}

export const navigate = path => {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target) return;
  location.hash = target;
};

/** Replace the current hash without adding a history entry. */
export const replaceHash = path => history.replaceState(null, '', '#' + (path.startsWith('/') ? path : '/' + path));

export const onRoute = fn => addEventListener('hashchange', fn);
