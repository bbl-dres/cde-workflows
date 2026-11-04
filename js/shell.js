// The CDE Bund frame: prototype banner, topbar, sidebars (project · projects · tasks), page head with
// breadcrumb, tabs, notification drawer, user menu, toast. Geometry follows docs/reviews/2026-11-03-gap-analysis-pixel.md.
import { html, icon, avatar, raw } from './ui.js';
import { SECTIONS, link, sectionKeyFor } from './links.js';

export const PROJECT_PAGES = ['overview', 'projectTasks', 'ilp', 'delivery', 'settings', 'section', 'documents', 'loin', 'timeline'];
export const BANNER_TEXT = 'Prototyp, fiktive oder öffentlich verfügbare Inhalte — nur zur Demonstration';

/** Red prototype banner above the topbar (white on red). */
export const banner = () => html`<div class="proto-banner" role="note"><span class="proto-banner-long">${BANNER_TEXT}</span><span class="proto-banner-short" aria-hidden="true">Prototyp – nur zur Demonstration</span></div>`;

/** Footer: source link at the right. */
export const REPO_URL = 'https://github.com/bbl-dres/cde-workflows';
export const footer = () => html`<footer class="app-footer"><span class="app-footer-note">Prototyp – nur zur Demonstration</span><span>Quellcode: <a href="${REPO_URL}" target="_blank" rel="noopener">${REPO_URL.replace('https://', '')}</a></span></footer>`;

// ---- Topbar ----
export function topbar(ctx, hasSidebar) {
  const { user, vm, route, state } = ctx;
  const inProjects = route.name === 'projects' || PROJECT_PAGES.includes(route.name);
  const inTasks = route.name === 'tasks';
  return html`<header class="topbar">
    ${hasSidebar ? html`<button type="button" class="side-toggle" data-action="toggleSide" aria-label="Navigation" aria-expanded="${state.ui.sideOpen ? 'true' : 'false'}">${icon('menu', 22, '#fff')}</button>` : ''}
    <a class="swiss-logo" href="#/" data-nav="/" aria-label="CDE Bund · Startseite"></a>
    <a class="topbar-link" href="#/projects/all" data-nav="/projects/all" style="font-weight:${inProjects ? 500 : 400}">Projekte</a>
    <a class="topbar-link rel" href="#/tasks/all" data-nav="/tasks/all" style="font-weight:${inTasks ? 500 : 400}">Aufgaben${vm.dash.open ? html`<span class="topbar-badge">${vm.dash.open}</span>` : ''}</a>
    <div class="topbar-search"><div class="topbar-search-input">Suchen nach Projekten und Bestandsdaten...</div><div class="topbar-search-btn">${icon('search', 16, '#1f2937')}</div></div>
    <div class="topbar-icons">
      <button type="button" class="topbar-iconbtn rel" data-action="toggleNotif" aria-label="Benachrichtigungen" aria-expanded="${state.ui.notif ? 'true' : 'false'}">${icon('bell', 20, '#fff')}${vm.unreadCount ? html`<span class="topbar-dot"></span>` : ''}</button>
      <span class="topbar-iconbtn" title="Hilfe" aria-hidden="true">${icon('book', 20, '#fff')}</span>
      <span class="topbar-iconbtn" title="Einstellungen">${icon('settings', 20, '#fff')}</span>
    </div>
    <button type="button" class="topbar-user" data-action="toggleUserMenu" aria-haspopup="menu" aria-expanded="${state.ui.userMenu ? 'true' : 'false'}">${avatar(user.initials, 28, '#ccc')}<span class="topbar-username">${user.name}</span></button>
  </header>`;
}

// ---- Sidebars ----
const navIcon = (name, sub) => icon(name, sub ? 18 : 20, '#374151');

function sidebarProject(ctx) {
  const { project, route, user, state } = ctx;
  const active = sectionKeyFor(route, user);
  const open = state.ui.navOpen || {};
  const infoOpen = !!(open.im ?? ['loin', 'dok', 'ilp'].includes(active));
  const stOpen = !!(open.st ?? active === 'lo');
  const items = [];
  ctx.data.navigation.forEach(it => {
    items.push(it);
    const isOpen = it.key === 'im' ? infoOpen : it.key === 'st' ? stOpen : false;
    if (it.group && isOpen) (it.children || []).forEach(c => items.push({ ...c, sub: true }));
  });
  return html`<aside class="sidebar sidebar-project-nav">
    <div class="sidebar-project"><div class="sidebar-project-name" title="${project.name}">${project.name}</div><div class="sidebar-project-type">Projekt</div></div>
    <nav class="nav" aria-label="Projekt">${items.map(n => {
      const isOpen = n.key === 'im' ? infoOpen : stOpen;
      const badge = n.key === 'au' ? String(ctx.vm.auRows.length) : '';
      const inner = html`${navIcon(n.icon, n.sub)}<span class="flex-1 ellipsis">${n.label}</span>${badge ? html`<span class="nav-badge">${badge}</span>` : ''}${n.group ? icon(isOpen ? 'chevron-down' : 'chevron-right', 16, '#6b7280') : ''}`;
      const cls = `nav-item${n.key === active ? ' is-active' : ''}${n.sub ? ' is-sub' : ''}`;
      if (n.group) return html`<button type="button" class="${cls} nav-group" data-action="toggleNav" data-key="${n.key}" aria-expanded="${isOpen ? 'true' : 'false'}">${inner}</button>`;
      const href = link.section(project.id, n.key);
      return html`<a class="${cls}" href="#${href}" data-nav="${href}" ${n.key === active ? raw('aria-current="page"') : ''}>${inner}</a>`;
    })}</nav>
  </aside>`;
}

function sidebarSimple(title, items, activeHref) {
  return html`<aside class="sidebar sidebar-simple">
    <div class="sidebar-project"><div class="sidebar-project-name sidebar-title">${title}</div><div class="sidebar-project-type">Übersicht</div></div>
    <nav class="nav" aria-label="${title}">${items.map(it => html`<a class="nav-item${it.href === activeHref ? ' is-active' : ''}" href="#${it.href}" data-nav="${it.href}" ${it.href === activeHref ? raw('aria-current="page"') : ''}>${navIcon(it.icon)}<span class="flex-1">${it.label}</span></a>`)}</nav>
  </aside>`;
}

export function sidebarFor(ctx) {
  const { route } = ctx;
  if (route.name === 'projects') {
    const active = route.path === '/projects/favorites' ? link.favorites() : link.projects();
    return sidebarSimple('Projekte', [{ label: 'Projekte', icon: 'folder', href: link.projects() }, { label: 'Favoriten', icon: 'star', href: link.favorites() }], active);
  }
  if (route.name === 'tasks') {
    const f = route.params.filter;
    return sidebarSimple('Aufgaben', [
      { label: 'Alle meine Aufgaben', icon: 'list', href: link.tasks('all') },
      { label: 'Mir zugewiesen', icon: 'star', href: link.tasks('assigned') },
      { label: 'Alle Aufgaben', icon: 'inbox', href: link.tasks('everything') },
    ], link.tasks(['all', 'assigned', 'everything'].includes(f) ? f : 'all'));
  }
  if (ctx.project && PROJECT_PAGES.includes(route.name)) return sidebarProject(ctx);
  return '';
}

/** Wraps a page in the CDE frame. extra = overlays (dialogs, drawer, menu, toast). */
export function frame(ctx, content, extra) {
  const sb = sidebarFor(ctx);
  const white = ctx.route.name === 'tasks';
  const mainCls = `app-main${sb ? '' : ' app-main-full'}${white ? ' app-main-white' : ''}`;
  return html`<div class="app-frame"><a class="skip-link" href="#main">Zum Inhalt</a>${banner()}${topbar(ctx, !!sb)}<div class="app-body">${sb}${sb ? html`<div class="side-backdrop" data-action="toggleSide"></div>` : ''}<main class="${mainCls}" id="main">${white ? html`<div class="page-card">${content}</div>` : content}</main></div>${footer()}${extra || ''}</div>`;
}

// ---- Breadcrumb, page head, tabs ----
const crumbItem = (p, last) => {
  const label = typeof p === 'string' ? p : p.label, href = typeof p === 'string' ? null : p.href;
  if (last) return html`<span class="breadcrumb-current">${label}</span>`;
  return href ? html`<a class="breadcrumb-link" href="#${href}" data-nav="${href}">${label}</a><span class="breadcrumb-sep">/</span>` : html`<span>${label}</span><span class="breadcrumb-sep">/</span>`;
};
export const breadcrumb = parts => html`<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/" data-nav="/" class="breadcrumb-home" aria-label="Startseite">${icon('house', 13, '#8c8c8c')}</a><span class="breadcrumb-sep">/</span>${parts.map((p, i) => crumbItem(p, i === parts.length - 1))}</nav>`;

/** Page head: title (plus optional extra like a status pill) and breadcrumb. */
export const pageHead = (title, crumbs, opts = {}) =>
  html`<div class="page-head" style="${raw(opts.style || '')}"><h1 class="page-title">${title}${opts.extra || ''}</h1>${crumbs ? breadcrumb(crumbs) : ''}</div>`;

/** Tabs: items [{ key, label, href?, screen?, extra? }]. Items with href/screen navigate (sub-pages, so a <nav> with
 *  aria-current rather than a tab widget); others are static. */
export const tabs = (items, active, label = 'Unterseiten') => html`<nav class="tabs" aria-label="${label}">${items.map(t => {
  const target = t.href || t.screen;
  const cls = `tab${t.key === active ? ' is-active' : ''}${t.extra ? ' rel' : ''}`;
  return target
    ? html`<a class="${cls}" ${t.key === active ? raw('aria-current="page"') : ''} href="#${target}" data-nav="${target}">${t.label}${t.extra || ''}</a>`
    : html`<span class="${cls}" ${t.key === active ? raw('aria-current="page"') : ''}>${t.label}${t.extra || ''}</span>`;
})}</nav>`;

export const emptyState = (text = 'Keine Einträge', size = 44) => html`<div class="empty">${icon('inbox', size, '#d9d9d9')}<span>${text}</span></div>`;

/** Ant pagination: «1-n von n ‹ 1 › 20 / Seite». With `href(page)` the page buttons are links. */
export const pagination = (total, { page = 1, size = 10, href = null } = {}) => {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
  const pbtn = (p, cls, content, label) => (href && p >= 1 && p <= pages && p !== page
    ? html`<a class="pager-btn${cls}" href="#${href(p)}" data-nav="${href(p)}" aria-label="${label}">${content}</a>`
    : html`<span class="pager-btn${cls}" aria-label="${label}" ${p === page ? raw('aria-current="page"') : ''}>${content}</span>`);
  return html`<nav class="pager" aria-label="Seiten">
    <span class="pager-info">${total ? `${from}-${to} von ${total}` : '0 von 0'}</span>
    ${pbtn(page - 1, page <= 1 ? ' is-disabled' : '', icon('chevron-left', 12, page <= 1 ? '#d9d9d9' : '#1f2937'), 'Zurück')}
    ${Array.from({ length: Math.min(pages, 9) }, (_, i) => pbtn(i + 1, i + 1 === page ? ' is-active' : '', String(i + 1), `Seite ${i + 1}`))}
    ${pbtn(page + 1, page >= pages ? ' is-disabled' : '', icon('chevron-right', 12, page >= pages ? '#d9d9d9' : '#1f2937'), 'Weiter')}
    <span class="pager-btn pager-size">${size} / Seite ${icon('chevron-down', 12, '#9aa3ad')}</span>
  </nav>`;
};

// ---- Overlays ----
export function notificationDrawer(ctx) {
  const { vm, state } = ctx;
  const list = state.ui.notifUnreadOnly ? vm.notifs.filter(n => n.unread) : vm.notifs;
  return html`<div class="backdrop" data-action="closeMenus"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Benachrichtigungen">
    <div class="drawer-head"><button type="button" class="dialog-close" data-action="toggleNotif" aria-label="Schliessen">${icon('x', 18, '#000')}</button></div>
    <div class="drawer-tools">
      <button type="button" class="btn btn-secondary btn-sm${state.ui.notifUnreadOnly ? ' is-on' : ''}" data-action="notifUnreadOnly" aria-pressed="${state.ui.notifUnreadOnly ? 'true' : 'false'}">Nur ungelesene</button>
      <span class="flex-1"></span>
      <span class="iconbar"><span title="Archiv" aria-hidden="true">${icon('archive', 15, '#1f2937')}</span><button type="button" data-action="markAllRead" title="Alle als gelesen markieren">${icon('circle-check', 15, '#1f2937')}</button></span>
    </div>
    <div class="drawer-list">
      ${list.length ? list.map(n => html`<div class="notif-row${n.unread ? ' is-unread' : ''}">
        <div class="flex-1 min-w-0">
          <div class="notif-title">${n.title}</div>
          <div class="notif-meta"><span>${n.date}</span><span>·</span><span class="ellipsis">${n.text}</span></div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-action="notifOpen" data-id="${n.id}" data-href="${n.href}">${n.action || 'Anzeigen'}</button>
        <button type="button" class="notif-check" data-action="markRead" data-id="${n.id}" title="${n.unread ? 'Als gelesen markieren' : 'Gelesen'}">${icon('circle-check', 16, n.unread ? '#4c8c75' : '#c9cfd6')}</button>
      </div>`) : html`<div class="muted" style="padding:24px 16px">Keine Benachrichtigungen.</div>`}
    </div>
    <div class="drawer-foot"><button type="button" class="btn btn-primary" data-action="toggleNotif">Schliessen</button></div>
  </aside>`;
}

export function userMenu(ctx) {
  const { user, data } = ctx;
  return html`<div class="backdrop backdrop-clear" data-action="closeMenus"></div>
  <div class="user-menu" role="menu">
    <div class="user-menu-head">${avatar(user.initials, 34, '#aab2bc')}<div><div class="fw-600">${user.name}</div><div class="muted fs-12">${user.role} · ${user.org}</div></div></div>
    <div class="user-menu-label">Anmelden als (Prototyp)</div>
    ${data.users.users.map(u => html`<button type="button" role="menuitem" class="user-menu-item${u.key === user.key ? ' is-active' : ''}" data-action="setUser" data-key="${u.key}">${avatar(u.initials, 24, u.internal ? 'var(--navy)' : '#aab2bc')}<span class="flex-1"><span>${u.name}</span><span class="muted fs-12"> · ${u.role}</span></span>${u.key === user.key ? icon('check', 14, '#2f7d63') : ''}</button>`)}
    <div class="user-menu-sep"></div>
    ${[['user', 'Mein Account'], ['settings', 'Meine Einstellungen'], ['bell', 'Benachrichtigungseinstellungen'], ['book', 'Benutzerhandbuch'], ['circle-help', 'Support'], ['file-text', 'Release Notes'], ['info', 'Impressum']]
      .map(([ic, label]) => html`<span class="user-menu-item is-static" role="menuitem" aria-disabled="true" title="Im Prototyp ohne Funktion">${icon(ic, 16, '#6b7280')}<span class="flex-1">${label}</span></span>`)}
    <div class="user-menu-sep"></div>
    <button type="button" role="menuitem" class="user-menu-item" data-action="toggleStudy">${icon('book', 16, '#10384f')}<span class="flex-1 fw-600">Design-Studie ${ctx.state.ui.studyOpen ? 'schliessen' : 'öffnen'}</span></button>
    <span class="user-menu-item is-static" role="menuitem" aria-disabled="true" title="Im Prototyp ohne Funktion">${icon('log-out', 16, '#6b7280')}<span class="flex-1">Logout</span></span>
  </div>`;
}

export const toast = t => t ? html`<div class="toast" role="status">${icon('circle-check', 16, '#4c8c75')}<span>${t.text}</span><button type="button" class="toast-close" data-action="dismissToast" aria-label="Schliessen">${icon('x', 14, '#5b6573')}</button></div>` : '';

export { SECTIONS };
