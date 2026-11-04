// Tiny HTML templating and shared UI atoms (icons, pills, markers, buttons, form controls, cards, filters).
//
//   html`<div>${value}</div>`   → escapes interpolated values; nested html`` results and raw() are inserted as-is;
//                                 arrays are joined; null/undefined/false render as ''.

export class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(String(s ?? ''));

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

function val(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += val(values[i]) + strings[i + 1];
  return new Raw(out);
}

// ---- Icons (lucide, vendored in assets/icons, rendered as CSS mask so colour is free) ----
export const ICON_BASE = 'assets/icons/';
export const icon = (name, size = 16, color = 'currentColor', style = '') => {
  const m = `url(${ICON_BASE}${name}.svg) center/contain no-repeat`;
  return html`<span class="ic" style="width:${size}px;height:${size}px;background:${color};-webkit-mask:${m};mask:${m};${raw(style)}" aria-hidden="true"></span>`;
};
/** Text for screen readers only (icon-only meaning). */
export const srOnly = text => html`<span class="sr-only">${text}</span>`;

// ---- Status pill: { label, bg, bd, c, icon } (see model/pill.js) ----
export const pill = (p, opts = {}) => {
  const sm = opts.size === 'sm';
  return html`<span class="pill${sm ? ' pill-sm' : ''}" style="border-color:${p.bd};background:${p.bg};color:${p.c}">${icon(p.icon, sm ? 12 : 13, p.c)}${p.label}</span>`;
};

// ---- Orange study marker (numbered). Pass show=false to hide (tweak «Markierungen»). ----
export const marker = (n, style = '', show = true) =>
  show ? html`<span class="marker" style="${raw(style)}" title="Markierung ${n} der Design-Studie">${n}</span>` : '';

export const avatar = (initials, size = 26, bg = '#aab2bc', color = '#fff') =>
  html`<span class="avatar" style="width:${size}px;height:${size}px;background:${bg};color:${color};font-size:${Math.round(size * 0.42)}px">${initials}</span>`;

// ---- Buttons ----
// Shared data-* wiring of the controls: action/arg/key/id/nav resolve in app.js (event delegation).
const dataAttrs = o => raw([
  o.action ? html`data-action="${o.action}"` : '',
  o.arg != null ? html`data-arg="${o.arg}"` : '',
  o.key != null ? html`data-key="${o.key}"` : '',
  o.id != null ? html`data-id="${o.id}"` : '',
  o.nav ? html`data-nav="${o.nav}"` : '',
  o.disabled ? raw('disabled') : '',
  o.title ? html`title="${o.title}"` : '',
].map(String).filter(Boolean).join(' '));

// btn({ label, kind:'primary'|'secondary', size:'sm', cls, action, arg, key, nav, disabled, icon, title, style })
export const btn = o => {
  const cls = ['btn', o.kind === 'primary' ? 'btn-primary' : 'btn-secondary', o.size === 'sm' ? 'btn-sm' : '', o.cls || ''].filter(Boolean).join(' ');
  return html`<button type="button" class="${cls}" style="${raw(o.style || '')}" ${dataAttrs(o)}>${o.icon ? icon(o.icon, 13, 'currentColor') : ''}${o.label}</button>`;
};
/** A link-looking action (keyboard reachable): linkBtn({ label, action, key, arg, id, cls }) */
export const linkBtn = o => html`<button type="button" class="btn-link${o.cls ? ' ' + o.cls : ''}" ${dataAttrs(o)}>${o.label}</button>`;
/** Icon-only button with an accessible name: iconBtn({ icon, label, action, key, arg, id, cls, size, color, pressed }) */
export const iconBtn = o => html`<button type="button" class="btn-icon${o.cls ? ' ' + o.cls : ''}" aria-label="${o.label}" title="${o.label}" ${o.pressed != null ? html`aria-pressed="${o.pressed ? 'true' : 'false'}"` : ''} ${dataAttrs(o)}>${icon(o.icon, o.size || 14, o.color || '#374151')}</button>`;

// ---- Custom checkbox (keyboard: Enter/Space via data-action + role) ----
// checkbox({ checked, label, sub, action, key, arg, disabled })
export const checkbox = o => html`<div class="checkbox${o.disabled ? ' is-disabled' : ''}" role="checkbox" aria-checked="${o.checked ? 'true' : 'false'}" ${o.disabled ? raw('aria-disabled="true"') : ''} tabindex="${o.disabled ? -1 : 0}"
    ${o.action ? html`data-action="${o.action}"` : ''} ${o.key != null ? html`data-key="${o.key}"` : ''} ${o.arg != null ? html`data-arg="${o.arg}"` : ''}>
  <span class="checkbox-box${o.checked ? ' is-checked' : ''}">${o.checked ? '✓' : ''}</span>
  <span class="checkbox-text"><span>${o.label}</span>${o.sub ? html`<span class="checkbox-sub">${o.sub}</span>` : ''}</span>
</div>`;

// ---- Custom radio ----
// radio({ checked, label, action, arg, key, static })
export const radio = o => html`<div class="radio${o.static ? ' o-radio' : ''}" role="radio" aria-checked="${o.checked ? 'true' : 'false'}" tabindex="${o.static ? -1 : 0}"
    ${o.action ? html`data-action="${o.action}"` : ''} ${o.key != null ? html`data-key="${o.key}"` : ''} ${o.arg != null ? html`data-arg="${o.arg}"` : ''}>
  <span class="radio-dot"><span style="background:${o.checked ? 'var(--navy)' : 'transparent'}"></span></span><span>${o.label}</span>
</div>`;

// ---- Toggle switch ----
export const toggle = o => html`<span class="toggle" role="switch" aria-checked="${o.on ? 'true' : 'false'}" tabindex="0" ${o.label ? html`aria-label="${o.label}"` : ''}
    ${o.action ? html`data-action="${o.action}"` : ''} ${o.key != null ? html`data-key="${o.key}"` : ''}>
  <span class="toggle-track" style="background:${o.on ? 'var(--navy)' : '#c9cfd6'};justify-content:${o.on ? 'flex-end' : 'flex-start'}"><span class="toggle-knob"></span></span>
  <span class="toggle-label">${o.on ? 'Aktiv' : 'Inaktiv'}</span>
</span>`;

// ---- Cards: card(head, body, { style, cls }); head is the h2 of the card ----
export const card = (head, body, opts = {}) => html`<div class="card${opts.cls ? ' ' + opts.cls : ''}" style="${raw(opts.style || '')}">${head ? html`<h2 class="card-head">${head}</h2>` : ''}${body}</div>`;
export const headLink = (label, href) => html`<a class="card-head-link" href="#${href}" data-nav="${href}">${label}</a>`;
export const hint = t => html`<span class="card-hint">${t}</span>`;

// ---- Key/value rows for the «Lieferung» meta card: [{k, v, bg}] ----
export const metaRows = rows => rows.map(m => html`<div class="meta-row" style="background:${m.bg || 'transparent'}"><span class="meta-k">${m.k}</span><span>${m.v}</span></div>`);

// ---- Filters, search and sortable headers (look-alikes of the CDE Bund toolbars) ----
export const searchBox = (width = 398, placeholder = 'Suchen…') => html`<div class="search" style="width:${width}px">${placeholder}</div><div class="search-btn">${icon('search', 14, '#fff')}</div>`;
/** filterBtn(label, { caret, menu }) – a toolbar button; `menu` marks it as the trigger of a hover/focus menu. */
export const filterBtn = (label, o = {}) => html`<button type="button" class="filter-btn" ${o.menu ? raw('aria-haspopup="menu"') : ''}>${label}${o.caret ? icon('chevron-down', 12, '#3a4350') : ''}</button>`;
export const filterField = (label, w, ic) => html`<span class="filter-field" style="width:${w}px">${label}${icon(ic, 13, '#a3abb4')}</span>`;
/** Column header with the sort chevrons of the Ant tables. */
export const thSort = (label, color = 'var(--faint)') => html`<span class="th-sort">${label}${icon('chevrons-up-down', 10, color)}</span>`;

// ---- Fake select / field ----
export const selectField = (text, opts = {}) => html`<div class="field${opts.readonly ? ' field-readonly' : ''}" style="${raw(opts.style || '')}">${opts.avatar ? avatar(opts.avatar, 18, '#c9cfd6') : ''}<span class="flex-1">${text}</span>${icon('chevron-down', 12, '#8a939e')}</div>`;
export const textField = (text, opts = {}) => html`<div class="field${opts.readonly ? ' field-readonly' : ''}" style="${raw(opts.style || '')}">${text}</div>`;
export const fieldLabel = (label, required = false) => html`<div class="field-label">${label}${required ? html` <span class="req">*</span>` : ''}</div>`;

// Progress bar 0..100
export const progress = (pctStr, color) => html`<div class="progress"><div style="width:${pctStr};background:${color}"></div></div>`;
