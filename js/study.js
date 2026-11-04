// Study panel: the design study as a help layer over the application. Screen list (switches persona and
// opens the screen), the numbered annotations of the current screen, and the study's tweaks.
import { html, icon, raw } from './ui.js';

const GROUPS = [['studie', 'Studie'], ['screens', 'Screens'], ['varianteb', 'Variante B']];

export function renderStudy(ctx) {
  const { screens, screen, state, user } = ctx;
  if (!state.ui.studyOpen) {
    return '';   // the panel opens from the user menu («Design-Studie öffnen») or a study link (#s01 …)
  }
  const idx = screen ? screens.findIndex(s => s.id === screen.id) : -1;
  const prev = idx > 0 ? screens[idx - 1] : null, next = idx >= 0 ? screens[idx + 1] : null;
  const tw = state.tweaks;
  return html`<aside class="study-panel" aria-label="Design-Studie">
    <div class="study-head">
      <div><div class="study-title">Design-Studie</div><div class="study-sub">Datenlieferungen KV und THG in der CDE Bund</div></div>
      <button type="button" class="study-close" data-action="toggleStudy" aria-label="Panel schliessen">${icon('x', 16, '#5b6573')}</button>
    </div>

    ${screen ? html`
    <div class="study-current">
      <span class="study-code">${screen.code}</span>
      <div class="flex-1">
        <div class="study-screen-title">${screen.title}</div>
        ${screen.subtitle ? html`<div class="study-screen-sub">${screen.subtitle}</div>` : ''}
        ${screen.user ? html`<div class="study-user">${icon('users', 13, '#5b6573')}Studie zeigt ${screen.user.name}${screen.user.name !== user.name ? html` · angemeldet: ${user.name}` : ''}</div>` : ''}
      </div>
    </div>
    <div class="study-navbtns">
      <button type="button" class="btn btn-secondary btn-sm" ${prev ? html`data-study="${prev.id}" title="${prev.title}"` : raw('disabled')}>${icon('chevron-left', 12, 'currentColor')}${prev ? prev.code : '–'}</button>
      <a class="study-home" href="#/study" data-study="home">Übersicht</a>
      <button type="button" class="btn btn-secondary btn-sm" ${next ? html`data-study="${next.id}" title="${next.title}"` : raw('disabled')}>${next ? next.code : '–'}${icon('chevron-right', 12, 'currentColor')}</button>
    </div>` : html`
    <div class="study-current">
      <div class="flex-1"><div class="study-screen-title">Diese Seite ist nicht Teil der Studie.</div><div class="study-screen-sub">Sie gehört zur bestehenden CDE Bund (Mock). Unten einen Screen der Studie wählen; die Ansicht wechselt in die passende Rolle.</div></div>
    </div>`}

    ${screen && screen.annotations && screen.annotations.length ? html`<section class="study-section">
      <h3>Erläuterungen</h3>
      ${screen.annotations.map((a, i) => html`<div class="study-ann"><span class="marker marker-static">${i + 1}</span><span>${raw(a)}</span></div>`)}
    </section>` : ''}

    <section class="study-section">
      <h3>Tweaks</h3>
      <label class="study-field"><input type="checkbox" data-change="tweak" data-key="showMarkers" ${tw.showMarkers ? raw('checked') : ''}><span>Markierungen anzeigen</span></label>
      <label class="study-field"><span>Anlagekosten</span><input type="number" min="0" max="100" step="0.1" value="${tw.anlagekostenMio}" data-change="tweak" data-key="anlagekostenMio" data-fid="tweak-ak"><span class="muted">Mio CHF</span></label>
      <button type="button" class="btn btn-secondary btn-sm" data-action="resetAll" style="margin-top:6px">Prototyp zurücksetzen</button>
    </section>

    <section class="study-section">
      <h3>Screens</h3>
      ${GROUPS.map(([g, label]) => html`<div class="study-group">${label}</div>${screens.filter(s => s.group === g).map(s =>
        html`<a class="study-link${screen && s.id === screen.id ? ' is-active' : ''}" href="#${s.id}" data-study="${s.id}" title="${s.user ? 'Als ' + s.user.name : s.subtitle || ''}"><span class="study-link-code">${s.code}</span><span class="ellipsis">${s.title}</span></a>`)}`)}
    </section>
    <div class="study-foot">Personen, Firmen und Werte sind fiktiv. Projektnamen der weiteren Projekte nach den öffentlichen Bautendokumentationen des BBL.</div>
  </aside>`;
}
