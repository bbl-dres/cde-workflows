import { html, icon, toggle } from '../ui.js';

// 09 Vorlagen für Datenformulare (BIM-Management · Einstellungen › Informationsanforderungen)
const COLS = 'grid-template-columns:minmax(0,1.4fr) 110px 60px 90px minmax(0,1.2fr) 110px';

export default {
  render(ctx) {
    const { vm } = ctx;
    return html`

      <div class="s09-panel">
        <div class="s09-intro">
          <div class="s09-intro-title">Datenformulare</div>
          <div class="s09-intro-text">Vorlagen für strukturierte Datenlieferungen. Inhalt, Pflichtfelder und Prüfregeln werden zentral durch das BIM-Management BBL gepflegt und versioniert. Im Projekt werden sie aktiviert und im Informationslieferplan bestellt.</div>
        </div>

        <div class="s09-main">
          <div class="rel">
            ${ctx.marker(1, 'top:-10px;left:-10px')}
            <div class="s09-head" style="${COLS}">
              <span>Vorlage</span><span>Gliederung</span><span>Version</span><span>Zielsystem</span><span>Pflicht</span><span>Im Projekt</span>
            </div>
            ${vm.tplRows.map(t => html`
              <div class="s09-row" role="button" tabindex="0" data-action="tplSelect" data-key="${t.key}" aria-pressed="${t.selected ? 'true' : 'false'}"
                   style="${COLS};background:${t.bg};box-shadow:inset 3px 0 0 ${t.bl}">
                <a>${t.name}</a><span>${t.gl}</span><span class="num">${t.ver}</span><span>${t.ziel}</span><span style="color:#3d4650">${t.pflicht}</span>
                <span class="s09-toggle">${toggle({ on: t.on, label: `${t.name} im Projekt aktiv`, action: 'tplToggle', key: t.key })}</span>
              </div>`)}
          </div>

          <div class="s09-detail">
            ${ctx.marker(2, 'top:-10px;left:-10px')}
            <div class="s09-detail-head">
              <div class="flex-1"><div class="s09-detail-title">${vm.tplName}</div><div class="s09-detail-meta">${vm.tplMeta}</div></div>
              <span class="s09-readonly">Zentral gepflegt · nur lesen</span>
            </div>
            <div class="s09-detail-body">
              <div style="grid-column:span 2">
                <div class="s09-label">Positionen <span class="s09-label-hint">dunkel = Pflicht, hell = optional</span></div>
                <div class="flex" style="flex-wrap:wrap;gap:6px">
                  ${vm.tplPos.map(p => html`<span class="s09-chip" style="border-color:${p.bd};background:${p.bg};color:${p.col}">${p.c}</span>`)}
                </div>
              </div>
              <div>
                <div class="s09-label">Felder je Position</div>
                <div class="flex-col gap-6">
                  ${vm.tplFields.map(f => html`<div class="s09-item"><span style="color:#6b7480">–</span>${f}</div>`)}
                </div>
              </div>
              <div class="rel">
                ${ctx.marker(3, 'top:-4px;left:96px')}
                <div class="s09-label">Prüfregeln</div>
                <div class="flex-col gap-6">
                  ${vm.tplRules.map(f => html`<div class="s09-item">${icon('list-checks', 14, '#5b6573', 'margin-top:3px')}${f}</div>`)}
                </div>
              </div>
            </div>
            <div class="s09-detail-foot">
              <span class="flex-1" style="font-size:12.5px;color:#5b6573">Projektspezifisch anpassbar: Fälligkeiten, Prüfende, optionale Positionen.</span>
              <button type="button" class="btn btn-secondary btn-sm" style="padding:5px 12px">Excel-Vorlage ansehen</button>
              <button type="button" class="btn btn-primary btn-sm" style="padding:6px 14px">Projektanpassungen</button>
            </div>
          </div>
        </div>
      </div>`;
  },
};
