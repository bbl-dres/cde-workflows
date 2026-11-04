import { html, icon, thSort } from '../ui.js';
import { emptyState } from '../shell.js';

// Projekte: Liste und Kartenansicht (#/projects/all?view=list|card), Favoriten (#/projects/favorites).
const COLS = 'grid-template-columns:minmax(0,1.6fr) 120px 130px minmax(0,1.3fr) 130px 140px 80px 100px 110px 36px';

export default {
  title: ctx => ctx.route.path === '/projects/favorites' ? 'Favoriten' : 'Projekte',
  render(ctx) {
    const { vm, route, link } = ctx;
    const fav = route.path === '/projects/favorites';
    const view = route.query.view === 'list' ? 'list' : 'card';   // card view is the default of the CDE Bund
    const q = (route.query.q || '').toLowerCase();
    let rows = vm.projects.filter(p => !fav || p.favorite);
    if (q) rows = rows.filter(p => (p.name + ' ' + p.number + ' ' + p.designation).toLowerCase().includes(q));
    const base = fav ? link.favorites() : link.projects();
    const star = p => html`<button type="button" class="star-btn" data-action="toggleFavorite" data-id="${p.id}" aria-pressed="${p.favorite ? 'true' : 'false'}" title="${p.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}">${icon('star', 15, p.favorite ? '#3f8f8b' : '#8a939e')}</button>`;
    return html`
      <div class="projects-top">
        <span class="flex-1"></span>
        <div class="search" style="width:290px">Suchen…</div><div class="search-btn">${icon('search', 14, '#fff')}</div>
        <span class="view-toggle">
          <a class="${view === 'list' ? 'is-active' : ''}" href="#${base}?view=list" data-nav="${base}?view=list" title="Liste">${icon('list', 15, '#1f2937')}</a>
          <a class="${view === 'card' ? 'is-active' : ''}" href="#${base}?view=card" data-nav="${base}?view=card" title="Karten">${icon('layout-grid', 15, '#1f2937')}</a>
        </span>
      </div>
      <div class="filters">
        <a class="filter-btn${fav ? ' is-on' : ''}" href="#${fav ? link.projects(view) : link.favorites() + '?view=' + view}" data-nav="${fav ? link.projects(view) : link.favorites() + '?view=' + view}">Favoriten</a>
        <span class="filter-btn">Zugriff</span><span class="filter-btn">Zugriff verlängern</span><span class="filter-btn">Archiviert</span><span class="filter-btn">Alle Filter</span>
      </div>

      ${view === 'card' ? html`<div class="project-cards">
        ${rows.map(p => html`<div class="project-card">
          <a class="project-card-body" href="#${p.href}" data-nav="${p.href}">
            <span class="project-card-text"><span class="project-card-name">${p.name}</span><span class="project-card-desc">${p.description}</span></span>
            ${p.image ? html`<img class="project-card-img" src="${p.image}" alt="" loading="lazy">` : html`<span class="project-card-img"></span>`}
          </a>
          <div class="project-card-foot"><span title="${p.access}">${icon('lock-open', 15, '#3f8f8b')}</span>${star(p)}</div>
        </div>`)}
      </div>` : html`<div class="table" style="overflow-x:auto"><div style="min-width:1100px">
        <div class="table-head" style="${COLS};height:40px;padding:0 10px">
          ${thSort('Name')}<span>Projektnummer</span><span>Technischer Platz</span><span>Projektbezeichnung</span>${thSort('Teilportfolio')}<span>Verantwortlicher</span>${thSort('Zugriff')}${thSort('Erstellt am')}${thSort('Aktualisiert am')}<span></span>
        </div>
        ${rows.map(p => html`<div class="table-row" style="${COLS};height:34px;font-size:12.5px">
          <a class="ellipsis" href="#${p.href}" data-nav="${p.href}">${p.name}</a>
          <span class="ellipsis">${p.number}</span><span class="ellipsis">${p.technicalPlace}</span><span class="ellipsis">${p.designation}</span>
          <span class="ellipsis">${p.teilportfolioLabel}</span><span class="ellipsis">${p.responsible}</span><span>${p.access}</span>
          <span>${p.createdAt}</span><span>${p.updatedAt.slice(0, 10)}</span>${star(p)}
        </div>`)}
        ${rows.length === 0 ? html`<div style="padding:28px 0">${emptyState('Keine Projekte')}</div>` : ''}
      </div></div>`}`;
  },
};
