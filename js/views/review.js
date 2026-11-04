import { html } from '../ui.js';

// Review aus Nutzersicht: five role cards (Gut / Lücken).
export default {
  render(ctx) {
    const R = ctx.data.study.review;
    return html`<div class="study-page">
      <div class="study-section-head" style="margin-top:0"><span class="study-h2">${R.title}</span><span class="study-h2-sub">${R.subtitle}</span></div>
      <div class="review-grid">${R.cards.map(c => html`<div class="review-card">
        <div class="review-role">${c.role}</div>
        <div class="review-tag review-good">Gut</div>
        <div>${c.good}</div>
        <div class="review-tag review-gap">Lücken</div>
        ${c.gaps.map(g => html`<div>${g.text} ${g.link ? html`<a href="#${g.link}" data-study="${g.link}">${g.linkLabel}</a>` : html`<span class="muted">offen</span>`}</div>`)}
      </div>`)}</div>
    </div>`;
  },
};
