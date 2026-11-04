import { html, raw } from '../ui.js';

// Cover page of the design study: intro, workflow, open points, and the index of all screens.
export default {
  render(ctx) {
    const S = ctx.data.study, screens = ctx.screens;
    const card = s => html`<a class="screen-card" href="#${s.id}" data-study="${s.id}">
      <span class="study-code">${s.code}</span>
      <span class="screen-card-body"><span class="screen-card-title">${s.title}</span><span class="screen-card-sub">${s.subtitle}</span></span></a>`;
    return html`<div class="study-page">
      <div class="study-intro">
        <div class="study-intro-main">
          <div class="eyebrow">${S.intro.eyebrow}</div>
          <h1 class="study-h1">${S.intro.title}</h1>
          <p class="study-lead">${raw(S.intro.lead.replace('{marker}', '<span class="marker marker-inline">1</span>'))}</p>
          <div class="study-note"><div class="study-note-title">${S.intro.noteTitle}</div><div class="study-note-text">${S.intro.noteText}</div></div>
          <div class="study-hint">Prototyp: Die Screens unten öffnen die passende Seite der CDE Bund in der Rolle der Studie. Über die <a href="#/" data-nav="/">Startseite</a> lässt sich die Anwendung frei bedienen; Eingaben und Freigaben bleiben erhalten, bis «Prototyp zurücksetzen» gedrückt wird.</div>
        </div>
        <div class="study-intro-side">
          <div>
            <div class="study-label">Workflow</div>
            <div class="workflow">${S.workflow.map((w, i) => html`${i ? html`<span class="workflow-arrow">→</span>` : ''}<span class="workflow-step${w.dashed ? ' is-dashed' : ''}">${w.label}${w.who ? html` <span class="workflow-who">${w.who}</span>` : ''}</span>`)}</div>
          </div>
          <div>
            <div class="study-label">Offene Punkte für die Sitzung</div>
            <ol class="study-ol">${S.openPoints.map(p => html`<li>${p}</li>`)}</ol>
          </div>
        </div>
      </div>

      <div class="study-section-head"><span class="study-h2">Screens</span><span class="study-h2-sub">Variante A · Eingabemasken und Workflow</span></div>
      <div class="screen-grid">${screens.filter(s => s.group === 'screens').map(card)}</div>

      <div class="study-section-head"><span class="study-h2">Variante B</span><span class="study-h2-sub">Grundmengen aus DWG-Plänen</span></div>
      <div class="screen-grid">${screens.filter(s => s.group === 'varianteb').map(card)}</div>

      <div class="study-section-head"><span class="study-h2">Studie</span><span class="study-h2-sub">Einschätzung und Qualitätssicherung</span></div>
      <div class="screen-grid">${screens.filter(s => s.group === 'studie' && s.id !== 'home').map(card)}</div>
    </div>`;
  },
};
