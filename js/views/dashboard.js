import { html, icon, esc } from '../ui.js';
import { mountMap, unmountMap } from './parts/map.js';

// Startseite nach dem Login: Begrüssung, offene Aufgaben, Meine Projekte, Einblicke mit Karte (MapLibre GL,
// weltweite CARTO-Basiskarte «Positron» als Vektorkacheln; Fallback Esri World Light Gray; ohne Netz eine Ortsliste).
//
// The map lives in the shared map slot (views/parts/map.js) and survives re-renders of the dashboard.

export default {
  title: () => 'Startseite',
  render(ctx) {
    const { vm, user, link } = ctx;
    const n = vm.dash.open;
    const insights = [
      ['Issues', vm.insights.issues], ['Aufgaben', vm.insights.tasks],
      ['Data Drops', vm.insights.dataDrops], ['Kommunikation', vm.insights.communication],
    ];
    return html`<div class="dash">
      <div class="dash-top">
        <div>
          <h1 class="dash-hello">Hallo ${user.firstName}</h1>
          <p class="dash-sub">Du hast aktuell ${n} offene ${n === 1 ? 'Aufgabe' : 'Aufgaben'}. <a href="#${link.tasks('all')}" data-nav="${link.tasks('all')}">Mehr anzeigen</a></p>
        </div>
        <div class="dash-stats">
          <div><span class="dash-stat-n">${vm.dash.open}</span><span class="dash-stat-l">Offen</span></div>
          <div><span class="dash-stat-n">${vm.dash.onTrack}</span><span class="dash-stat-l">On Track</span></div>
          <div><span class="dash-stat-n">${vm.dash.late}</span><span class="dash-stat-l">Verspätet</span></div>
        </div>
      </div>

      <div class="dash-section-head"><span class="dash-h2">Meine Projekte</span><a href="#${link.projects()}" data-nav="${link.projects()}">Alle anzeigen</a></div>
      <div class="dash-projects">
        ${vm.myProjects.map(p => html`<a class="dash-project" href="#${p.href}" data-nav="${p.href}">
          <span class="dash-project-name">${p.name}</span>
          <span class="dash-project-desc">${p.description}</span>
          <span class="dash-project-meta">Letzte Änderungen am ${p.updatedAt}</span>
        </a>`)}
        ${vm.myProjects.length === 0 ? html`<div class="muted">Keine Projekte zugewiesen.</div>` : ''}
      </div>

      <div class="dash-insights">
        <div class="dash-insights-left">
          <div class="dash-h2" style="margin-bottom:14px">Einblicke</div>
          <div class="dash-grid">
            ${insights.map(([l, v]) => html`<div class="dash-cell"><span class="dash-cell-l">${l}</span><span class="dash-cell-n">${v}</span></div>`)}
          </div>
        </div>
        <div class="dash-map" id="dash-map" aria-label="Karte der Projekte">
          <div class="dash-map-fallback">${icon('map-pin', 22, '#5b6573')}<div>${vm.myProjects.map(p => html`<div>${p.name} · ${p.location.place}</div>`)}</div></div>
        </div>
      </div>
    </div>`;
  },

  mount(root, ctx) {
    const host = root.querySelector('#dash-map');
    const cfg = ctx.data.projects.map || {};
    const projects = ctx.vm.myProjects;
    mountMap(host, {
      key: 'dash:' + ctx.user.key + ':' + projects.map(p => p.id).join(','), cfg, center: cfg.center || [8.2, 46.8], zoom: cfg.zoom || 6.4, fallback: '.dash-map-fallback',
      build: (map, maplibregl) => {
        projects.forEach(p => {
          const pin = document.createElement('button');
          pin.type = 'button';
          pin.className = 'map-pin';
          pin.title = p.name;
          pin.setAttribute('aria-label', p.name);
          const popup = new maplibregl.Popup({ offset: 14, closeButton: false })
            .setHTML(`<strong>${esc(p.name)}</strong><br>${esc(p.location.place)} · ${esc(p.phase)}<br><a href="#${esc(p.href)}">Projekt öffnen</a>`);
          new maplibregl.Marker({ element: pin }).setLngLat([p.location.lng, p.location.lat]).setPopup(popup).addTo(map);
        });
        // Frame every project: the portfolio is worldwide (Auslandbauten), so the map zooms out as far as needed.
        const bounds = new maplibregl.LngLatBounds();
        projects.forEach(p => bounds.extend([p.location.lng, p.location.lat]));
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 56, maxZoom: cfg.maxZoom || 8.5, duration: 0 });
      },
    });
  },

  /** Called by app.js when another page replaces the dashboard. */
  unmount() { unmountMap(); },
};
