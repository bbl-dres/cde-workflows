import { html, raw } from '../ui.js';

// Variante B: Grundmengen aus DWG-Plänen (intro + comparison A/B + links to B1/B2).
export default {
  render(ctx) {
    const V = ctx.data.study.variantB, screens = ctx.screens.filter(s => s.group === 'varianteb' && s.id !== 'varb');
    return html`<div class="study-page">
      <div class="study-intro">
        <div class="study-intro-main">
          <div class="eyebrow">${V.eyebrow}</div>
          <h1 class="study-h1" style="font-size:42px">${V.title}</h1>
          <p class="study-lead" style="font-size:20px">${raw(V.lead)}</p>
        </div>
        <div class="study-intro-side">
          <div class="varb-grid">
            ${V.cards.map(c => html`<div class="review-card">
              <div class="review-role" style="font-size:19px">${c.title}</div>
              <div class="review-tag review-good">Stärken</div><div>${c.strengths}</div>
              <div class="review-tag review-gap">Grenzen</div><div>${c.limits}</div>
            </div>`)}
            <div class="varb-reco"><strong>Empfehlung zur Diskussion:</strong> ${V.recommendation}</div>
          </div>
        </div>
      </div>
      <div class="study-section-head"><span class="study-h2">Screens</span></div>
      <div class="screen-grid">${screens.map(s => html`<a class="screen-card" href="#${s.id}" data-study="${s.id}"><span class="study-code">${s.code}</span><span class="screen-card-body"><span class="screen-card-title">${s.title}</span><span class="screen-card-sub">${s.subtitle}</span></span></a>`)}</div>
    </div>`;
  },
};
