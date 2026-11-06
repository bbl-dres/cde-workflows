import { html, icon, raw } from '../ui.js';

// 03c Excel importieren: Datei wählen – step 1 of the import dialog, over the Erfassung of a Datenformular (KV-32, KS-31, THG-32).
// The file is read in the browser (js/excel.js); the templates are the workbook «Excel herunterladen» writes, with or without values.

export default {
  overlay(ctx) {
    const { vm } = ctx;
    return html`<div class="overlay" style="padding-top:110px">
      <div class="dialog fx" role="dialog" aria-modal="true" aria-labelledby="imp-title" style="width:860px">
        <div class="dialog-head">
          <div><div class="dialog-title" id="imp-title">Excel importieren</div><div class="dialog-sub">${vm.impCode} · ${vm.impTitle}</div></div>
          <button type="button" class="dialog-close" data-action="impClose" aria-label="Dialog schliessen">${icon('x', 18, 'var(--muted)')}</button>
        </div>
        <div class="imp-steps">
          <span class="imp-step is-cur"><span class="dot dot-lg is-cur">1</span>Datei wählen</span>
          <span class="imp-step"><span class="dot dot-lg">2</span>Vorschau prüfen</span>
          <span class="imp-step"><span class="dot dot-lg">3</span>Übernehmen</span>
        </div>
        <div class="dialog-body" style="gap:18px">
          <label class="imp-drop" data-drop="impFile">
            ${icon('upload', 30, 'var(--muted)')}
            <div class="fs-14">Excel-Datei hierher ziehen oder <span class="btn-link">auswählen</span></div>
            <div class="fs-12 muted">.xlsx, max. 10 MB · wird im Browser gelesen, nichts wird hochgeladen</div>
            <input type="file" accept=".xlsx" class="vh" data-change="impFile" aria-label="Excel-Datei für ${vm.impCode} auswählen">
          </label>
          ${vm.impHasFile ? html`<div class="imp-file">
            ${icon('file-spreadsheet', 18, 'var(--ok)')}
            <div class="flex-1"><strong>${vm.impFile}</strong> <span class="muted">· ${vm.impFileSize}</span><div class="fs-12" style="color:var(--green-dark)">${vm.impIsSample ? 'Beispieldatei des Prototyps · ' : ''}${vm.impSheet} erkannt · ${vm.impRowsText}</div></div>
            ${vm.impIsSample ? '' : html`<button type="button" class="btn-link fs-125" data-action="impFileClear">Entfernen</button>`}
          </div>` : ''}
          <div class="imp-cols">
            <div class="imp-box">
              ${ctx.marker(1, 'top:-10px;right:-10px')}
              <div class="fs-14 fw-600" style="margin-bottom:4px">Vorlage</div>
              <div class="fs-125 muted" style="line-height:1.5;margin-bottom:12px">${vm.impTplText}</div>
              <div class="flex-col gap-8 items-start">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:5px 12px" data-action="formExcel" data-form="${vm.impKind}" data-arg="leer">${icon('download', 14, 'var(--text-3)')}Leere Vorlage ${vm.impCode} (.xlsx)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:5px 12px" data-action="formExcel" data-form="${vm.impKind}">${icon('download', 14, 'var(--text-3)')}Vorlage mit aktuellen Werten (.xlsx)</button>
              </div>
            </div>
            <div class="imp-box">
              ${ctx.marker(2, 'top:-10px;right:-10px')}
              <div class="fs-14 fw-600" style="margin-bottom:8px">Erwartetes Format</div>
              <div class="imp-format">${vm.impFormat.map(([c, l, r]) => html`<span class="code muted">${c}</span><span>${l}</span><span class="muted">${r}</span>`)}</div>
              <div class="fs-12 muted" style="margin-top:10px;line-height:1.5">${vm.impFormatNote}</div>
            </div>
          </div>
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn btn-secondary" data-action="impClose">Abbrechen</button>
          <button type="button" class="btn btn-primary" data-action="impNext" style="padding:7px 18px" ${vm.impHasFile ? '' : raw('disabled title="Zuerst eine Excel-Datei wählen"')}>Weiter</button>
        </div>
      </div>
    </div>`;
  },
};
