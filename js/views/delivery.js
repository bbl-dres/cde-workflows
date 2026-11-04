import { html, pill } from '../ui.js';
import { pageHead, tabs, emptyState } from '../shell.js';
import { FORM_TABS } from '../links.js';
import { renderForm, tabBadge } from './form.js';
import { mountPlan, unmountPlan } from './plan.js';

// Datenlieferung: #/projects/:pid/deliveries/:code/:tab — head with status pill, the six tabs of every Datenformular
// (Übersicht · Erfassung · Prüfung · Beteiligte · Dokumente · Verlauf, design 04.11.2026) and the tab body from views/form.js.
// KV-32, THG-32 and the floor plans DWG-UG … DWG-DG are Datenformulare; other deliveries show a generic page.
const TAB_LABEL = { uebersicht: 'Übersicht', erfassung: 'Erfassung', pruefung: 'Prüfung', beteiligte: 'Beteiligte', dokumente: 'Dokumente', verlauf: 'Verlauf' };

const verlauf = ev => html`<div class="card"><div class="card-head">Verlauf</div>${ev.map(([d, t]) => html`<div class="act-row"><span class="act-date">${d}</span><span>${t}</span></div>`)}</div>`;
const dokumente = () => html`<div class="card"><div class="card-head"><span class="flex-1">Dokumente</span><span class="btn btn-secondary btn-sm">Hochladen</span></div><div style="padding:28px 0">${emptyState('Keine Dokumente')}</div></div>`;

function generic(ctx, code) {
  const { vm } = ctx;
  const d = vm.deliveryByCode(code);
  if (!d) return html`${pageHead('Lieferung nicht gefunden', ctx.crumbs('Informationslieferplan'))}<div class="card" style="padding:24px">Im Projekt gibt es keine Lieferung «${code.toUpperCase()}».</div>`;
  const tab = ctx.route.params.tab || 'uebersicht';
  const T = [['uebersicht', 'Übersicht'], ['dokumente', 'Dokumente'], ['verlauf', 'Verlauf']];
  return html`
    ${pageHead(d.name, ctx.crumbs(ctx.user.internal ? 'Informationslieferplan' : 'Aufgaben', d.code), { extra: pill(d.pill), style: 'margin-bottom:6px' })}
    ${tabs(T.map(([key, label]) => ({ key, label, href: ctx.link.delivery(code, key) })), tab)}
    ${tab === 'verlauf' ? verlauf([['–', `Bestellt durch ${ctx.project.responsible}`], ['–', `Status: ${d.status}`]])
      : tab === 'dokumente' ? dokumente()
      : html`<div class="flex items-start gap-14">
        <div class="card flex-1 card-narrow"><div class="card-head">Lieferung</div><div style="padding:8px 12px 12px">${[['Kürzel', d.code], ['Name', d.name], ['Lieferverantwortlicher', d.firm], ['Gewerk', d.gewerk], ['Beschreibung', d.desc], ['Status', d.status]].map(([k, v], i) => html`<div class="meta-row" style="grid-template-columns:170px 1fr;background:${i % 2 ? 'transparent' : '#f6f7f9'}"><span class="meta-k">${k}</span><span>${v}</span></div>`)}</div></div>
        <div class="note note-grey" style="width:330px;display:block">Klassische Lieferung (Dokumente, Modelle): Ablage und Status im Informationslieferplan, ohne Datenformular.</div>
      </div>`}`;
}

const formOf = ctx => (ctx.project ? ctx.vm.formByCode(ctx.route.params.code) : null);
const tabOf = ctx => (FORM_TABS.includes(ctx.route.params.tab) ? ctx.route.params.tab : 'uebersicht');

export default {
  title: ctx => `${ctx.route.params.code.toUpperCase()} · ${ctx.project.name}`,
  render(ctx) {
    const code = ctx.route.params.code.toLowerCase();
    const F = formOf(ctx);
    if (!F) return generic(ctx, code);
    const tab = tabOf(ctx);
    const items = FORM_TABS.map(key => ({ key, label: TAB_LABEL[key], href: ctx.link.delivery(code, key), extra: tabBadge(F.badges[key]) }));
    return html`
      ${pageHead(F.title, ctx.crumbs(ctx.user.internal ? 'Informationslieferplan' : 'Aufgaben', F.code), { extra: pill(F.pill), style: 'margin-bottom:6px' })}
      ${tabs(items, tab)}
      ${F.rejected ? html`<div class="note note-rose fm-rejected">Zurückgewiesen durch ${F.reviewer}. Die Erfassung ist wieder offen.</div>` : ''}
      ${renderForm(ctx, F, tab)}`;
  },
  /** DWG deliveries own a canvas viewer and drag & drop on the Erfassung tab; everything else is declarative. */
  mount(root, ctx) {
    const F = formOf(ctx);
    if (F && F.kind === 'plan' && tabOf(ctx) === 'erfassung') mountPlan(root, ctx, F.plan); else unmountPlan();
  },
  unmount() { unmountPlan(); },
};
