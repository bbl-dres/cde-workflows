import { html, icon, searchBox } from '../ui.js';
import { pageHead, emptyState } from '../shell.js';
import { SECTIONS } from '../links.js';

// Project sections of the existing CDE Bund that are not part of the study: Dateien, Modell, Automatisierung,
// Workflows, Mitglieder, Stammdaten, Lieferobjekte. Mock content, no editing. (Aktivitäten, Dokumente, LOIN,
// Informationslieferplan, Einstellungen have their own views.)
const FILES = [
  ['Oekobilanz_TP2_Musterhausen_SIA32.pdf', 'PDF', '2.4 MB', 'Olivia Beispiel', '03.05.2027'],
  ['KV_Bauprojekt_detail_v3.pdf', 'PDF', '1.1 MB', 'Kai Beispiel', '24.04.2027'],
  ['kv_bauprojekt_v3.xlsx', 'Excel', '48 KB', 'Kai Beispiel', '20.04.2027'],
  ['Fachmodell_Architektur_BP.ifc', 'IFC', '186 MB', 'Alex Beispiel', '01.04.2027'],
  ['Grundrisse_BP_1-100.pdf', 'PDF', '12.8 MB', 'Alex Beispiel', '29.03.2027'],
];
const ROLE = u => u.internal ? (u.key === 'PM' ? 'Verantwortlicher' : 'Manager') : 'Mitglied Extern';
const sortIcon = () => icon('chevrons-up-down', 10, '#bfbfbf');

function keyFor(route) {
  const p = route.params.sub ? `${route.params.section}/${route.params.sub}` : route.params.section;
  return Object.keys(SECTIONS).find(k => SECTIONS[k].path === p) || null;
}

export default {
  title: ctx => { const k = keyFor(ctx.route); return `${k ? SECTIONS[k].label : 'Seite'} · ${ctx.project.name}`; },
  render(ctx) {
    const { vm, project } = ctx;
    const key = keyFor(ctx.route);
    const label = key ? SECTIONS[key].label : 'Seite nicht gefunden';
    const head = pageHead(label, ctx.crumbs(label));
    switch (key) {
      case 'da':
        return html`${head}
          <div class="toolbar toolbar-page"><span class="btn-split"><button type="button" class="btn btn-primary">Hochladen</button><button type="button" class="btn btn-primary btn-split-more" aria-label="Weitere Aktionen">${icon('ellipsis', 14, '#fff')}</button></span><button type="button" class="btn btn-secondary">Ordner erstellen</button><span class="flex-1"></span>${searchBox(290)}</div>
          <div class="card card-page"><div class="ant-table">
            <div class="ant-head" style="grid-template-columns:minmax(0,2fr) 90px 90px minmax(0,1fr) 110px 70px"><span class="th-sort">Name${sortIcon()}</span><span>Typ</span><span>Grösse</span><span>Hochgeladen von</span><span class="th-sort">Datum${sortIcon()}</span><span></span></div>
            ${(project.detailed ? FILES : FILES.slice(3)).map(f => html`<div class="ant-row" style="grid-template-columns:minmax(0,2fr) 90px 90px minmax(0,1fr) 110px 70px">
              <span class="flex items-center gap-8 min-w-0">${icon(f[1] === 'Excel' ? 'file-spreadsheet' : 'file-text', 16, '#3a4350')}<a class="ellipsis table-link">${f[0]}</a></span><span>${f[1]}</span><span>${f[2]}</span><span class="ellipsis">${f[3]}</span><span>${f[4]}</span><span class="row-actions-inline"><span class="btn-icon">${icon('download', 13, '#1f2937')}</span><span class="btn-icon">${icon('eye', 13, '#1f2937')}</span></span>
            </div>`)}
          </div></div>`;
      case 'mi':
        return html`${head}
          <div class="toolbar toolbar-page"><span class="btn-split"><button type="button" class="btn btn-primary">Mitglied hinzufügen</button><button type="button" class="btn btn-primary btn-split-more" aria-label="Weitere Aktionen">${icon('ellipsis', 14, '#fff')}</button></span><span class="flex-1"></span>${searchBox(290)}</div>
          <div class="card card-page"><div class="ant-table ant-table-striped">
            <div class="ant-head" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,3fr) 40px"><span class="th-sort">Name${sortIcon()}</span><span class="th-sort">Rolle${sortIcon()}</span><span></span><span></span></div>
            ${vm.members.map(u => html`<div class="ant-row" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,3fr) 40px">
              <a class="ellipsis tasks-person" style="color:var(--text)" title="${u.org} · ${u.role}">${u.name}</a><span class="flex items-center gap-10">${ROLE(u)}${icon('ellipsis', 12, '#8c8c8c')}</span><span></span><span class="row-actions-inline"><span class="btn-icon btn-icon-danger" title="Entfernen">${icon('trash-2', 13, '#ff3162')}</span></span>
            </div>`)}
          </div></div>`;
      case 'st':
        return html`${head}<div class="card card-page" style="max-width:760px">
          <div class="card-head">Projektdaten</div>
          <div style="padding:8px 12px 12px">${[['Projektnummer', project.number], ['Technischer Platz', project.technicalPlace], ['Projektbezeichnung', project.designation], ['Teilportfolio', project.teilportfolioLabel], ['SIA-Phase', project.phase], ['Anlagekosten', 'CHF ' + project.anlagekostenMio.toLocaleString('de-CH', { minimumFractionDigits: 1 }) + ' Mio'], ['Kostenziel B–W', 'CHF ' + (project.kostenzielBW / 1e6).toLocaleString('de-CH', { minimumFractionDigits: 2 }) + ' Mio'], ['Standort', project.location.place], ['Verantwortlicher', project.responsible]]
            .map(([k, v], i) => html`<div class="meta-row" style="grid-template-columns:190px 1fr;background:${i % 2 ? 'transparent' : '#f6f7f9'}"><span class="meta-k">${k}</span><span>${v}</span></div>`)}</div>
          <div class="card-foot">Die Anlagekosten steuern die Pflicht zur Ökobilanz (ab CHF 1 Mio). Im Prototyp über das Studien-Panel änderbar.</div>
        </div>`;
      case 'ue': case 'au': case 'ilp': case 'ei': case 'ak': case 'dok': case 'loin': return html`${head}`;
      default:
        return html`${head}<div class="card card-page" style="min-height:360px;display:flex;align-items:center;justify-content:center">${emptyState(key ? 'Keine Einträge' : 'Seite nicht gefunden', 56)}</div>`;
    }
  },
};
