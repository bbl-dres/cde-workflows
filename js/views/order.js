import { html, icon, raw, fieldLabel, selectField, textField } from '../ui.js';

// «Erstellen» drawer of the Informationslieferplan (as in the CDE Bund), extended by the requirement type
// «Datenformular» with a template dropdown (screen 02 of the study). Opens over the delivery plan.
const TEMPLATES = { kv: 'Kosten (KS / KV)', thg: 'Ökobilanz Bauemissionen' };
const CODES = { kv: 'KV-32', thg: 'THG-32' };
const NAMES = { kv: 'Kostenvoranschlag', thg: 'Ökobilanz Bauemissionen' };
const DESC = { kv: 'Betrag je Hauptgruppe eBKP-H, Bezugsmengen aus den Grundrissen (DWG), Ziel ePPM', thg: 'Menge + THG je Position nach Anleitung TP2 NettoNull, Ziel SUS' };

const radio = (label, on) => html`<span class="o-radio"><span class="radio-dot"><span style="background:${on ? 'var(--navy)' : 'transparent'}"></span></span>${label}</span>`;
const input = (value, opts = {}) => html`<div class="field${opts.readonly ? ' field-readonly' : ''}" style="${raw(opts.style || '')}">${value || html`<span class="muted-2" style="color:#a3abb4">${opts.placeholder || ''}</span>`}</div>`;

export default {
  when: ctx => ctx.route.name === 'ilp',
  render(ctx) {
    const { vm, state } = ctx;
    const t = state.orderType;
    const reqForm = (state.ui.orderReq || 'form') === 'form';
    return html`<div class="backdrop" data-action="orderCancel"></div>
    <aside class="drawer drawer-wide" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div class="drawer-head" style="justify-content:flex-start;gap:12px">
        <button type="button" class="dialog-close" data-action="orderCancel" aria-label="Schliessen">${icon('x', 18, '#5b6573')}</button>
        <span class="fs-16 fw-500" id="order-title">Erstellen</span>
      </div>
      <div class="drawer-body">
        <div class="o-grid">
          <div>${fieldLabel('Kürzel')}${input(CODES[t])}</div>
          <div>${fieldLabel('Name', true)}${input(t === 'kv' ? `${NAMES.kv} ${vm.gl}` : NAMES[t])}</div>
          <div>${fieldLabel('Fachmodellliste')}${selectField('', { style: 'color:#a3abb4' })}</div>
          <div class="rel">${fieldLabel('Lieferverantwortlicher', true)}${selectField(vm.supplier, { avatar: vm.supplierInitials })}${ctx.marker(3, 'top:-4px;left:166px')}</div>
        </div>
        <div>${fieldLabel('Beschreibung')}<div class="textarea" style="height:58px;color:#1f2937">${DESC[t]}</div></div>
        <hr class="o-hr">
        <div class="o-grid">
          <div>${fieldLabel('Liefer- resp. Startdatum', true)}<div class="field">${t === 'thg' ? '31.05.2027' : '30.04.2027'}<span class="flex-1"></span>${icon('calendar', 13, '#a3abb4')}</div></div>
          <div>${fieldLabel('Turnus', true)}<div class="o-radios">${radio('Nie', true)}${radio('Täglich')}${radio('Wöchentlich')}${radio('Monatlich')}</div></div>
        </div>

        <div class="o-section-head">
          <span class="flex-1 fs-14 fw-500">Geforderte Dokumente</span>
          <span class="btn btn-secondary btn-sm">${icon('download', 13, 'currentColor')}Vorlage herunterladen</span>
          <span class="btn btn-secondary btn-sm">${icon('upload', 13, 'currentColor')}Dokumentenliste importieren</span>
        </div>

        <div class="o-req rel">
          <div class="o-req-head">${icon('chevron-down', 14, '#3a4350')}<span class="flex-1">Neue Anforderung</span><span class="btn-icon" style="border-color:#e8a0ad">${icon('trash-2', 13, '#c8102e')}</span></div>
          <div class="o-grid">
            <div>${fieldLabel('Typ', true)}
              <select class="o-select" data-change="orderReqType" data-fid="order-reqtype" aria-label="Typ der Anforderung">
                <option value="doc" ${reqForm ? '' : raw('selected')}>Dokument</option>
                <option value="form" ${reqForm ? raw('selected') : ''}>Datenformular</option>
              </select>
            </div>
            ${reqForm ? html`<div class="rel">${fieldLabel('Vorlage', true)}
              <select class="o-select" data-change="setOrderType" data-fid="order-template" aria-label="Vorlage">
                ${Object.entries(TEMPLATES).map(([k, l]) => html`<option value="${k}" ${k === t ? raw('selected') : ''}>${l}</option>`)}
              </select>${ctx.marker(1, 'top:-4px;left:62px')}</div>`
            : html`<div>${fieldLabel('Dateiname', true)}<div class="field"><span class="flex-1" style="color:#a3abb4">Dateiname…</span><span class="fs-12 muted">DE</span>${icon('chevron-down', 12, '#8a939e')}</div></div>`}
          </div>
          ${reqForm ? html`
            <div class="o-grid">
              <div>${fieldLabel('Gliederung', true)}${selectField(vm.glText, { readonly: vm.glReadonly })}</div>
              <div>${fieldLabel('Zielsystem')}${textField(vm.target, { readonly: true })}</div>
            </div>
            <div class="o-grid">
              <div>${fieldLabel('SIA-Phase', true)}${selectField('32 Bauprojekt')}</div>
              <div>${fieldLabel('Prüfende', true)}${selectField('Paula Muster', { avatar: 'PM' })}</div>
            </div>
            <div class="order-rule rel">
              <div class="order-rule-head"><span>Bestellung: <strong style="color:${vm.ruleColor}">${vm.ruleOrder}</strong></span><span>Kontrolle: <strong style="color:${vm.ruleColor}">${vm.ruleCheck}</strong></span></div>
              <div class="order-rule-text">${vm.ruleText}</div>
              ${ctx.marker(2, 'top:-10px;right:-10px')}
            </div>`
          : html`
            <div>${fieldLabel('Ablageort', true)}${selectField('', { style: 'color:#a3abb4' })}</div>
            <div class="o-grid"><div>${fieldLabel('Info', true)}${input('', { placeholder: 'Info' })}</div><div>${fieldLabel('Prüfende', true)}${input('', { placeholder: 'Prüfende' })}</div></div>`}
        </div>
        <button type="button" class="o-add">+ Eintrag hinzufügen</button>

        <hr class="o-hr">
        <div class="fs-14 fw-500" style="margin-bottom:8px">Workflow</div>
        <div class="o-flow">${['Bestellt', 'In Bearbeitung', 'Eingereicht', 'In Prüfung', 'Freigegeben', 'Übertragen'].map((s, i) => html`${i ? html`<span class="muted-2">→</span>` : ''}<span class="o-flow-step">${s}</span>`)}</div>
        <div class="fs-12 muted" style="margin-top:8px">Der Lieferverantwortliche erhält eine Aufgabe vom Typ «Datenformular» und meldet sich über AGOV an.</div>
      </div>
      <div class="drawer-foot">
        <button type="button" class="btn btn-secondary" data-action="orderCancel">Abbrechen</button>
        <button type="button" class="btn btn-primary" data-action="orderSubmit">Erstellen</button>
      </div>
    </aside>`;
  },
};
