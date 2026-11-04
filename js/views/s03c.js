import { html, icon } from '../ui.js';

// 03c Excel importieren: Datei wählen – step 1 of the import dialog, over the KV-32 Erfassung.
const FORMAT = gl => [['A', `Code ${gl}`, 'Pflicht'], ['B', 'Bezeichnung', 'optional'], ['C', 'Menge', 'Pflicht'], ['D', 'Einheit', 'optional'], ['E', 'Kosten CHF', 'Pflicht']];

export default {
  overlay(ctx) {
    const { vm } = ctx;
    return html`<div class="overlay" style="padding-top:110px">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="imp-title" style="width:860px">
        <div class="dialog-head">
          <div><div class="dialog-title" id="imp-title">Excel importieren</div><div class="dialog-sub">KV-32 · ${vm.kvTitle}</div></div>
          <button type="button" class="dialog-close" data-action="impClose" aria-label="Dialog schliessen">${icon('x', 18, '#5b6573')}</button>
        </div>
        <div class="imp-steps">
          <span class="imp-step fw-600"><span class="imp-step-dot" style="border-color:var(--navy)">1</span>Datei wählen</span>
          <span class="imp-step" style="color:#6b7480"><span class="imp-step-dot" style="border-color:#c9cfd6">2</span>Vorschau prüfen</span>
          <span class="imp-step" style="color:#6b7480"><span class="imp-step-dot" style="border-color:#c9cfd6">3</span>Übernehmen</span>
        </div>
        <div class="dialog-body" style="gap:18px">
          <div class="imp-drop">
            ${icon('upload', 30, '#5b6573')}
            <div class="fs-14">Excel-Datei hierher ziehen oder <a>auswählen</a></div>
            <div class="fs-12 muted">.xlsx, max. 10 MB</div>
          </div>
          <div class="imp-file">
            ${icon('file-spreadsheet', 18, '#2f7d63')}
            <div class="flex-1"><strong>${vm.impFile}</strong> <span class="muted">· ${vm.impFileSize}</span><div class="fs-12" style="color:#1f4a3b">Blatt «KV ${vm.glLabel}» erkannt · ${vm.impAll} Zeilen</div></div>
            <a class="fs-125">Entfernen</a>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="imp-box">
              ${ctx.marker(1, 'top:-10px;right:-10px')}
              <div class="fs-14 fw-600" style="margin-bottom:4px">Vorlage</div>
              <div class="fs-125 muted" style="line-height:1.5;margin-bottom:12px">Enthält alle bestellten Positionen in der Gliederung ${vm.glLabel}, mit Einheiten und Spaltenköpfen.</div>
              <div class="flex-col gap-8 items-start">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:5px 12px">${icon('download', 14, '#3a4350')}Leere Vorlage ${vm.glLabel} (.xlsx)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:5px 12px">${icon('download', 14, '#3a4350')}Vorlage mit aktuellen Werten (.xlsx)</button>
              </div>
            </div>
            <div class="imp-box">
              ${ctx.marker(2, 'top:-10px;right:-10px')}
              <div class="fs-14 fw-600" style="margin-bottom:8px">Erwartetes Format</div>
              <div class="imp-format">${FORMAT(vm.glLabel).map(([c, l, r]) => html`<span class="code muted">${c}</span><span>${l}</span><span class="muted">${r}</span>`)}</div>
              <div class="fs-12 muted" style="margin-top:10px;line-height:1.5">Der Code ist der Schlüssel. Zeilen mit unbekanntem Code werden ignoriert.</div>
            </div>
          </div>
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn btn-secondary" data-action="impClose">Abbrechen</button>
          <button type="button" class="btn btn-primary" data-action="impNext" style="padding:7px 18px">Weiter</button>
        </div>
      </div>
    </div>`;
  },
};
