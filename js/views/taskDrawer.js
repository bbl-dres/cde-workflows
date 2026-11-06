import { html, icon, pill, raw } from '../ui.js';

// Detail panel of a normal task (Aufgabe, Modell-Issue), as in the CDE Bund: opens from the right over the task lists, with
// Zugewiesen an, Aufgabe für, Fällig am, Status, Beschreibung and the comments. A task that is a Datenformular or a
// plan delivery does not open here: its link goes to the delivery (see parts/taskTable.js).
const day = s => String(s || '').slice(0, 10);

export default {
  when: ctx => ['tasks', 'projectTasks', 'overview'].includes(ctx.route.name) && !!ctx.vm.taskById(ctx.state.ui.taskId),
  render(ctx) {
    const t = ctx.vm.taskById(ctx.state.ui.taskId);
    const owner = (ctx.data.projects.projects.find(p => p.id === t.projectId) || {}).responsible || t.fuer;
    return html`<div class="backdrop" data-action="taskClose"></div>
    <aside class="drawer drawer-wide drawer-task" role="dialog" aria-modal="true" aria-labelledby="task-title">
      <div class="drawer-head"><button type="button" class="dialog-close" data-action="taskClose" aria-label="Schliessen">${icon('x', 18, '#000')}</button></div>
      <div class="drawer-body" style="gap:14px">
        <div class="task-head">
          <h2 class="task-title" id="task-title">${t.name}</h2>
          <button type="button" class="btn-icon" data-action="proto" title="Link kopieren" aria-label="Link kopieren">${icon('link', 14, '#1f2937')}</button>
          <span class="task-by fs-12">Erstellt von <span class="tasks-person">${owner}</span><span class="task-sep"></span>${day(t.start)}</span>
        </div>
        <div class="task-facts">
          <span class="task-fk">${icon('user', 18, '#1f2937')}Zugewiesen an</span><span class="tasks-person">${t.zug || '–'}</span>
          <span class="task-fk">${icon('users', 18, '#1f2937')}Aufgabe für</span><span class="tasks-person">${t.fuer || '–'}</span>
          <span class="task-fk">${icon('calendar', 18, '#1f2937')}Fällig am</span><span>${t.ende ? t.ende.replace(' ', ', ') : '–'}</span>
          <span class="task-fk">${icon('database', 18, '#1f2937')}Status</span><span>${pill(t.pill, { size: 'sm' })}</span>
        </div>
        <div class="task-desc"><div class="task-desc-h">Beschreibung</div><div>${t.desc || html`<span class="muted">Keine Beschreibung</span>`}</div></div>
        <div class="task-tabs"><span class="task-tab">Kommentare (0)</span></div>
        <div class="task-comments">${icon('inbox', 56, '#c9cfd6')}<div class="muted fs-13">Keine Kommentare vorhanden</div></div>
        <div class="task-compose">
          <span class="avatar" style="width:34px;height:34px;background:#c9cfd6;color:#fff;font-size:13px">${ctx.user.initials}</span>
          <div class="task-editor">
            <div class="task-fmt" aria-hidden="true"><b>B</b><i>I</i><u>U</u><s>S</s></div>
            <textarea class="rv-textarea task-text" aria-label="Kommentar" data-fid="task-comment"></textarea>
          </div>
        </div>
        <div class="task-compose-foot"><span class="field flex-1">Auswählen…</span><button type="button" class="btn btn-secondary" data-action="proto" disabled>Kommentieren</button></div>
      </div>
      <div class="drawer-foot"><button type="button" class="btn btn-secondary" data-action="proto">In Bearbeitung</button><button type="button" class="btn btn-primary" data-action="proto">Erledigt</button></div>
    </aside>`;
  },
};
