import { html, icon, radio } from '../ui.js';

// 03d Excel importieren: Vorschau – step 2/3 of the import dialog (preview, mode, apply, done state).
const COLS = 'grid-template-columns:52px minmax(0,1fr) 100px 120px 110px 170px';

const step = (s, label) => html`<span class="imp-step" style="font-weight:${s.w};color:${s.t}"><span class="imp-step-dot" style="border-color:${s.bd};background:${s.bg};color:${s.c}">${s.sym}</span>${label}</span>`;

export default {
  overlay(ctx) {
    const { vm } = ctx;
    return html`<div class="overlay" style="padding-top:70px">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="imp-title" style="width:900px">
        <div class="dialog-head">
          <div><div class="dialog-title" id="imp-title">Excel importieren</div><div class="dialog-sub">${vm.impFile} · Blatt «KV ${vm.glLabel}»</div></div>
          <button type="button" class="dialog-close" data-action="impClose" aria-label="Dialog schliessen">${icon('x', 18, '#5b6573')}</button>
        </div>
        <div class="imp-steps">${step(vm.impStep1, 'Datei wählen')}${step(vm.impStep2, 'Vorschau prüfen')}${step(vm.impStep3, 'Übernehmen')}</div>

        ${vm.impOpen ? html`
          <div class="rel flex items-center gap-8" style="padding:16px 24px 0">
            ${ctx.marker(1, 'top:6px;left:2px')}
            ${vm.impTabs.map(t => html`<button type="button" class="imp-tab" data-action="impFilter" data-arg="${t.key}" aria-pressed="${t.active ? 'true' : 'false'}" style="border-color:${t.bd};background:${t.bg};color:${t.c}">${t.label}<span style="font-size:12px;font-weight:400;opacity:.8">${t.count}</span></button>`)}
          </div>
          <div class="imp-table">
            <div class="imp-thead" style="${COLS}"><span>Code</span><span>Bezeichnung (Datei)</span><span class="right">Menge</span><span class="right">Kosten CHF</span><span>Status</span><span>Bemerkung</span></div>
            ${vm.impRows.map(r => html`<div class="imp-trow" style="${COLS};background:${r.bg}">
              <span class="code">${r.code}</span>
              <span class="ellipsis">${r.name}</span>
              <span class="right">${r.fq}</span>
              <span class="right" style="font-weight:${r.vW}">${r.fv}</span>
              <span><span class="imp-st" style="border-color:${r.stBd};background:${r.stBg};color:${r.stC}">${r.st}</span></span>
              <span class="fs-12 muted ellipsis">${r.note}</span>
            </div>`)}
          </div>
          <div class="rel flex items-center fs-13 imp-modes" style="padding:14px 24px 0;gap:22px">
            ${ctx.marker(2, 'top:10px;left:2px')}
            <span class="fw-500" style="padding-left:30px">Bestehende Werte</span>
            ${vm.impModes.map(m => radio({ checked: m.checked, label: m.label, action: 'impMode', arg: m.key }))}
          </div>`
        : html`
          <div class="imp-done">
            ${icon('circle-check', 40, '#2f7d63')}
            <div class="fs-16 fw-600">${vm.impDoneText}</div>
            <div class="fs-13 muted" style="max-width:460px;line-height:1.5">Der Import ist im Verlauf protokolliert. Hinweise bleiben in der Erfassung markiert. Werte in <button type="button" class="btn-link" data-action="impGoto" data-arg="s03">der Erfassung</button> und <button type="button" class="btn-link" data-action="impGoto" data-arg="s03b">der Übersicht</button> sind aktualisiert.</div>
            <button type="button" class="btn-link fs-13" style="margin-top:6px" data-action="impReset">Import zurücksetzen</button>
          </div>`}

        <div class="dialog-foot rel" style="margin-top:14px">
          ${ctx.marker(3, 'top:18px;left:24px')}
          <span class="flex-1 fs-125 muted" style="padding-left:30px">${vm.impSummary}</span>
          <button type="button" class="btn btn-secondary" data-action="${vm.impDone ? 'impClose' : 'impBack'}">${vm.impCancel}</button>
          ${vm.impOpen ? html`<button type="button" class="btn btn-primary" data-action="impApply" style="padding:7px 18px">${vm.impBtn}</button>` : ''}
        </div>
      </div>
    </div>`;
  },
};
