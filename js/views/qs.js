import { html } from '../ui.js';

// QS Design und UX: what was harmonised, recommendations for the design system.
export default {
  render(ctx) {
    const Q = ctx.data.study.qs;
    return html`<div class="study-page">
      <div class="study-section-head" style="margin-top:0"><span class="study-h2">${Q.title}</span><span class="study-h2-sub">${Q.subtitle}</span></div>
      <div class="qs-grid">${Q.columns.map(col => html`<div class="qs-card">
        <div class="qs-title">${col.title}</div>
        <div class="qs-rows">${col.items.map(([k, v]) => html`<span class="qs-k">${k}</span><span>${v}</span>`)}</div>
      </div>`)}</div>
    </div>`;
  },
};
