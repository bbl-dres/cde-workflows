// Registry: route name (js/router.js) → page view; dialogs keyed by state.ui.dialog.
// A page view exports { render(ctx), mount?(root, ctx), title?(ctx), full? }.
import dashboard from './dashboard.js';
import projects from './projects.js';
import overview from './overview.js';
import section from './section.js';
import tasks from './tasks.js';
import settings from './settings.js';
import delivery from './delivery.js';
import s01 from './s01.js';
import s02b from './s02b.js';
import order from './order.js';
import s03c from './s03c.js';
import s03d from './s03d.js';
import columns from './columns.js';
import documents from './documents.js';
import loin from './loin.js';
import timeline from './timeline.js';
import home from './home.js';
import review from './review.js';
import qs from './qs.js';
import varb from './varb.js';
import { html } from '../ui.js';
import { pageHead } from '../shell.js';

const studyPages = { undefined: home, review, qs, 'variant-b': varb };
const study = {
  full: true,
  title: () => 'Design-Studie',
  render: ctx => (studyPages[ctx.route.params.page] || home).render(ctx),
};

const notfound = {
  title: () => 'Nicht gefunden',
  render: ctx => html`${pageHead('Seite nicht gefunden', [{ label: 'Startseite', href: '/' }, 'Nicht gefunden'])}<div class="card" style="padding:24px;max-width:640px">Die Adresse <code>${ctx.route.path}</code> gibt es nicht. <a href="#/" data-nav="/">Zur Startseite</a></div>`,
};

export const views = {
  home: dashboard,
  projects,
  overview,
  projectTasks: { ...s02b, title: ctx => `Aufgaben · ${ctx.project.name}` },
  ilp: { ...s01, title: ctx => `Informationslieferplan · ${ctx.project.name}` },
  delivery,
  settings,
  section,
  documents,
  loin,
  timeline,
  tasks,
  study,
  notfound,
};

export const dialogs = {
  order,
  columns,
  import: {
    when: ctx => ctx.route.name === 'delivery' && ctx.route.params.code === 'kv-32' && (ctx.route.params.tab || 'erfassung') === 'erfassung',
    render: ctx => (ctx.state.imp.step === 2 ? s03d : s03c).overlay(ctx),
  },
};
