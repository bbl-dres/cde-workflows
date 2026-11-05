import { html, icon, checkbox } from '../ui.js';
import { TASK_COLUMNS } from '../model/columns.js';

// «Tabelle konfigurieren» (gear icon of the task tables): show/hide columns, as in the CDE Bund.
// Pinning («Anheften») and ordering («Sortieren») are shown but static in the prototype.
export default {
  when: ctx => ctx.route.name === 'tasks' || ctx.route.name === 'projectTasks',
  render(ctx) {
    const draft = new Set(ctx.state.ui.colDraft || []);
    const selectable = TASK_COLUMNS.filter(c => !c.unavailable && !c.fixed);
    const onCount = selectable.filter(c => draft.has(c.key)).length;
    const allState = onCount === selectable.length ? 'all' : onCount === 0 ? 'none' : 'some';
    return html`<div class="overlay" style="padding-top:48px">
      <div class="dialog cols-dialog" role="dialog" aria-modal="true" aria-label="Tabelle konfigurieren">
        <div class="cols-all">
          <span class="checkbox" role="checkbox" aria-checked="${allState === 'all' ? 'true' : allState === 'none' ? 'false' : 'mixed'}" tabindex="0" data-action="colAll" autofocus>
            <span class="checkbox-box${allState !== 'none' ? ' is-checked' : ''}">${allState === 'all' ? '✓' : allState === 'some' ? '■' : ''}</span><span class="checkbox-text">Alle auswählen</span>
          </span>
        </div>
        <div class="cols-head"><span>Anzeigen</span><span>Spalte</span><span>Anheften</span><span>Sortieren</span></div>
        <div class="cols-list">
          ${TASK_COLUMNS.map(c => {
            const on = c.fixed || draft.has(c.key);
            const disabled = c.fixed || c.unavailable;
            return html`<div class="cols-row">
              ${checkbox({ checked: on && !c.unavailable, label: '', ariaLabel: `Spalte ${c.label}`, action: disabled ? undefined : 'colToggle', key: c.key, disabled })}
              <span class="${c.unavailable ? 'muted' : ''}" title="${c.unavailable ? 'Im Prototyp ohne Daten' : ''}">${c.label}</span>
              <span class="field cols-pin">Kein${icon('chevron-down', 12, '#8a939e')}</span>
              <span class="cols-drag" title="Sortieren">${icon('grip-vertical', 14, '#8c8c8c')}</span>
            </div>`;
          })}
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn btn-secondary" data-action="colCancel">Abbrechen</button>
          <button type="button" class="btn btn-primary" data-action="colOk">OK</button>
        </div>
      </div>
    </div>`;
  },
};
