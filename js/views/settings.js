import { html, icon } from '../ui.js';
import { pageHead, tabs, emptyState } from '../shell.js';
import s09 from './s09.js';

// Projekt › Einstellungen: tabs of the CDE Bund. «Allgemein» shows the Projektdaten form (placeholder, read-only),
// «Informationsanforderungen» holds the templates of the study (screen 09); the other tabs are placeholders.
const TABS = [
  ['general', 'Allgemein'], ['files', 'Dateien'], ['categories', 'Kategorien'], ['links', 'Verknüpfungen'],
  ['information-requirements', 'Informationsanforderungen'], ['danger-zone', 'Gefahrenzone'],
];
const PLACEHOLDER = {
  files: ['Dateien', 'Ablagestruktur, Namenskonventionen und erlaubte Dateitypen des Projekts.'],
  categories: ['Kategorien', 'Kategorien für Aufgaben, Dateien und Lieferungen.'],
  links: ['Verknüpfungen', 'Verknüpfte Projekte und externe Systeme (ePPM, SUS).'],
  'danger-zone': ['Gefahrenzone', 'Projekt archivieren oder löschen.'],
};

const field = (label, value, opts = {}) => html`<div class="form-row">
  <label class="form-label">${label}${opts.required ? html` <span class="req">*</span>` : ''}</label>
  ${opts.textarea ? html`<div class="textarea form-control" style="min-height:48px;color:var(--text)">${value}</div><div class="form-count">${String(value).length}/1000</div>`
    : opts.select ? html`<div class="field form-control"><span class="flex-1" style="color:${value ? 'var(--text)' : 'var(--placeholder)'}">${value || 'Auswählen…'}</span>${icon('chevron-down', 12, '#8a939e')}</div>`
    : html`<div class="text-input form-control" style="display:flex;align-items:center;color:${value ? 'var(--text)' : 'var(--placeholder)'}">${value || ''}</div>`}
</div>`;

function general(ctx) {
  const { project } = ctx;
  const details = [['Projektnummer', project.number], ['Technischer Platz', project.technicalPlace], ['Projektbezeichnung', project.designation], ['Teilportfolio', project.teilportfolioLabel]];
  return html`<div class="settings-card">
    <div class="settings-grid">
      <div>
        <h2 class="settings-h">Projektdaten</h2>
        <p class="settings-text">Aktualisiere die grundlegenden Informationen und Einstellungen dieses Projekts.</p>
      </div>
      <div class="settings-form">
        ${field('Name', project.name, { required: true })}
        ${field('Beschreibung', project.description, { textarea: true })}
        ${field('Projektstatus', 'Aktiv', { required: true, select: true })}
        <h3 class="form-h">Details</h3>
        <div class="form-inline">
          ${details.map(([k, v]) => html`<label><span class="req">*</span> ${k}</label><div class="text-input form-control" style="display:flex;align-items:center">${v}</div>`)}
          <label><span class="req">*</span> Verantwortlicher</label><div class="field form-control">${icon('user', 14, '#8c8c8c')}<span class="flex-1">${project.responsible}</span>${icon('chevron-down', 12, '#8a939e')}</div>
        </div>
        ${field('Teilprojekt von', '', { select: true })}
        <h3 class="form-h">Geo Koordinaten</h3>
        <div class="form-two">${field('Breitengrad', project.location.lat.toFixed(4))}${field('Längengrad', project.location.lng.toFixed(4))}</div>
        <h3 class="form-h form-h-line">Projektbild</h3>
        <div class="form-label">Bild</div>
        ${project.image ? html`<img class="img-box img-box-img" src="${project.image}" alt="${project.name}">` : html`<div class="img-box">Kein Bild vorhanden</div>`}
        <button type="button" class="btn btn-secondary" style="margin-top:12px" data-action="proto">${project.image ? 'Bild ändern' : 'Bild hochladen'}</button>
        <div class="form-hint">PNG (transparent) oder JPG, mind. 200×200px, quadratisch, max. 1 MB</div>
      </div>
    </div>
  </div>`;
}

export default {
  title: ctx => `Einstellungen · ${ctx.project.name}`,
  render(ctx) {
    const { link } = ctx;
    const tab = TABS.some(t => t[0] === ctx.route.params.tab) ? ctx.route.params.tab : 'general';
    const ph = PLACEHOLDER[tab];
    return html`
      ${pageHead('Einstellungen', ctx.crumbs('Einstellungen'))}
      ${tabs(TABS.map(([key, label]) => ({ key, label, href: link.settings(key) })), tab)}
      ${tab === 'general' ? general(ctx)
        : tab === 'information-requirements' ? s09.render(ctx)
        : html`<div class="settings-card"><div class="settings-grid"><div><h2 class="settings-h">${ph[0]}</h2><p class="settings-text">${ph[1]}</p></div><div style="padding:40px 0">${emptyState('Im Prototyp nicht umgesetzt', 56)}</div></div></div>`}`;
  },
};
