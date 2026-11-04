import { html, icon, raw, fieldLabel, selectField, textField } from '../ui.js';

// 02 Datenlieferung bestellen (Projektleitung): the design study's dialog «Aufgabenplan hinzufügen» with
// template cards. Kept as reference; the application uses the «Erstellen» drawer of the CDE Bund (order.js).
export default {

  overlay(ctx) {
    const { vm } = ctx;
    return html`<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="s02-title">
      <div class="dialog order-dialog">
        <div class="dialog-head">
          <div><div class="dialog-title" id="s02-title">Aufgabenplan hinzufügen</div><div class="dialog-sub">Typ: Datenformular</div></div>
          <button type="button" class="dialog-close" data-action="orderCancel" aria-label="Schliessen">${icon('x', 18, '#5b6573')}</button>
        </div>

        <div class="dialog-body">
          <div class="rel">
            ${fieldLabel('Vorlage', true)}
            <div class="order-cards" role="radiogroup" aria-label="Vorlage">
              ${vm.orderCards.map(o => html`
                <div class="choice-card" role="radio" aria-checked="${o.on ? 'true' : 'false'}" tabindex="0" data-action="setOrderType" data-arg="${o.key}" style="border:${o.bd};background:${o.bg}">
                  <div class="choice-card-title">${o.title}</div>
                  <div class="choice-card-desc">${raw(o.desc)}</div>
                </div>`)}
            </div>
            ${ctx.marker(1, 'top:-4px;left:64px')}
          </div>

          <div class="order-grid">
            <div>${fieldLabel('Gliederung', true)}${selectField(vm.glText, { style: 'background:' + vm.glBg })}</div>
            <div>${fieldLabel('SIA-Phase', true)}${selectField('32 Bauprojekt')}</div>
          </div>

          <div class="order-grid rel">
            <div>${fieldLabel('Lieferverantwortlicher', true)}${selectField(vm.supplier, { avatar: vm.supplierInitials })}</div>
            <div>${fieldLabel('Prüfung durch')}${selectField('Paula Muster', { avatar: 'PM' })}</div>
            ${ctx.marker(3, 'top:-4px;left:192px')}
          </div>

          <div class="order-grid">
            <div>${fieldLabel('Fällig am', true)}${textField('30.04.2027')}</div>
            <div>${fieldLabel('Zielsystem')}${textField(vm.target, { readonly: true })}</div>
          </div>

          <div class="order-rule rel">
            <div class="order-rule-head">
              <span>Bestellung: <strong style="color:${vm.ruleColor}">${vm.ruleOrder}</strong></span>
              <span>Kontrolle: <strong style="color:${vm.ruleColor}">${vm.ruleCheck}</strong></span>
            </div>
            <div class="order-rule-text">${vm.ruleText}</div>
            ${ctx.marker(2, 'top:-10px;right:-10px')}
          </div>

          <div>${fieldLabel('Bemerkung')}<div class="textarea" style="height:58px">Optional</div></div>
        </div>

        <div class="dialog-foot">
          <button type="button" class="btn btn-secondary" data-action="orderCancel">Abbrechen</button>
          <button type="button" class="btn btn-primary" data-action="orderSubmit" style="padding:7px 18px">Bestellen</button>
        </div>
      </div>
    </div>`;
  },
};
