// Single-location map of a project (Überblick › Standort): MapLibre GL with the swisstopo base map, one pin.
// Like the dashboard map, the instance survives re-renders of the page and is removed when leaving it.
let live = null;   // { map, el, key }

window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.name === 'AbortError' && live === null) e.preventDefault(); });

export function unmountProjectMap() {
  if (!live) return;
  try { live.map.remove(); } catch { /* already gone */ }
  live = null;
}

export function mountProjectMap(host, ctx, project) {
  if (!host || !window.maplibregl || !project || !project.location) return;
  const key = project.id;
  if (live && live.key === key && live.el) {
    host.appendChild(live.el);
    host.querySelector('.ov-map-fallback')?.remove();
    live.map.resize();
    host.__map = live.map;
    return;
  }
  unmountProjectMap();
  const cfg = ctx.data.projects.map || {};
  const { lng, lat } = project.location;
  const el = document.createElement('div');
  el.className = 'dash-map-canvas';
  host.appendChild(el);
  const map = new maplibregl.Map({ container: el, style: cfg.style, center: [lng, lat], zoom: cfg.projectZoom || 15, attributionControl: { compact: true } });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  live = { map, el, key };
  host.__map = map;
  let fellBack = false;
  map.on('error', e => {
    const err = e && e.error;
    const url = err && err.url ? String(err.url) : '';
    const styleFailed = !map.isStyleLoaded() && (url.startsWith(cfg.style || '\u0000') || /style/i.test(String(err && err.message || '')));
    if (!fellBack && cfg.fallbackStyle && styleFailed) { fellBack = true; map.setStyle(cfg.fallbackStyle); }
  });
  map.once('load', () => { host.querySelector('.ov-map-fallback')?.remove(); map.resize(); });
  const pin = document.createElement('span');
  pin.className = 'map-pin';
  pin.title = project.name;
  new maplibregl.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map);
}
