// One map slot for the pages with a MapLibre GL map (Startseite «Einblicke», Projekt › Überblick «Standort»):
// worldwide base map: CARTO «Positron» vector style (public, no key), Esri World Light Gray raster tiles as fallback
// style, a text fallback without network. The projects are worldwide (Auslandbauten), so no Swiss-only tiles.
// The map is expensive (WebGL context, style download), so the live element survives re-renders of the same page:
// it is moved into the fresh DOM instead of being rebuilt, and removed when the page is left (unmount).
let live = null;           // { map, el, key, host, loaded }
// German texts of the MapLibre controls and of the hint that a map with `cooperative` shows on a plain scroll
const LOCALE = {
  'Map.Title': 'Karte', 'Marker.Title': 'Standort', 'NavigationControl.ZoomIn': 'Vergrössern', 'NavigationControl.ZoomOut': 'Verkleinern', 'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
  'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + Scrollen zoomt die Karte', 'CooperativeGesturesHandler.MacHelpText': '⌘ + Scrollen zoomt die Karte', 'CooperativeGesturesHandler.MobileHelpText': 'Karte mit zwei Fingern verschieben',
};
let suppressUntil = 0;     // removing a map whose style is still loading makes MapLibre reject its fetch with an AbortError

window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.name === 'AbortError' && Date.now() < suppressUntil) e.preventDefault(); });
// The removed map has no listeners left, so MapLibre reports the same aborted request with console.error: not an error of the app.
const consoleError = console.error;
console.error = (...args) => { if (args[0] && args[0].name === 'AbortError' && Date.now() < suppressUntil) return; consoleError.apply(console, args); };

export function unmountMap() {
  if (!live) return;
  suppressUntil = Date.now() + 15000;   // the aborted style or tile request can reject seconds later on a slow connection
  if (live.ro) live.ro.disconnect();
  try { live.map.remove(); } catch { /* already gone */ }
  live = null;
}

/**
 * mountMap(host, { key, cfg, center, zoom, fallback, build, cooperative }): reuses the live map when `key` is unchanged, otherwise
 * creates one with the style of data/projects.json › map and calls build(map, maplibregl) for markers and bounds.
 * `cooperative` is for a map inside a scrolling page: the wheel scrolls the page, zooming needs Ctrl (⌘) + wheel or the
 * buttons, and on touch one finger scrolls the page while two fingers move the map.
 * `fallback` is the selector of the text fallback inside the host; it is removed once the style has loaded.
 */
export function mountMap(host, { key, cfg = {}, center, zoom, fallback, build, cooperative = false }) {
  if (!host || !window.maplibregl) return null;
  if (live && live.key === key && live.el) {
    host.appendChild(live.el);
    live.host = host;
    if (live.loaded) host.querySelector(fallback)?.remove();
    live.map.resize();
    host.__map = live.map;
    return live.map;
  }
  unmountMap();
  const el = document.createElement('div');
  el.className = 'dash-map-canvas';
  host.appendChild(el);
  const map = new maplibregl.Map({ container: el, style: cfg.style, center, zoom, attributionControl: { compact: true }, cooperativeGestures: cooperative, locale: LOCALE });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  // MapLibre only listens to the window: a reflow of the box (breakpoint, sidebar, grid) needs an explicit resize.
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.resize()) : null;
  if (ro) ro.observe(el);
  live = { map, el, key, host, loaded: false, ro };
  host.__map = map;   // diagnostics / tests
  // Fall back to the second style only if the first cannot be loaded (offline, blocked); an object style is applied as is.
  let fellBack = false;
  map.on('error', e => {
    const err = e && e.error;
    const url = err && err.url ? String(err.url) : '';
    const styleFailed = !map.isStyleLoaded() && (url.startsWith(cfg.style || '\u0000') || /style/i.test(String(err && err.message || '')));
    if (!fellBack && cfg.fallbackStyle && styleFailed) { fellBack = true; map.setStyle(cfg.fallbackStyle); }
  });
  map.once('load', () => { if (live && live.map === map) { live.loaded = true; live.host.querySelector(fallback)?.remove(); } map.resize(); });
  if (build) build(map, maplibregl);
  return map;
}
