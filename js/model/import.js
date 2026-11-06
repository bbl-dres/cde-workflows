import { KEYS } from './mock.js';
import { samplePayload, planImport, SHEET } from '../excel.js';

// 03c/03d Excel importieren: Datei wählen, Vorschau, Übernehmen. The dialog belongs to one Datenformular (imp.form = kv | ks | thg)
// and shows what the chosen file would change (js/excel.js). Without a file the cost forms use the sample file of the prototype.
const CHIP = { 'Unverändert': 'neutral', 'Geändert': 'changed', 'Hinweis': 'note', 'Ignoriert': 'ignored' };   // css .chip variants
const COST_FORMAT = gl => [['A', `Code ${gl}`, 'Schlüssel'], ['B', 'Bezeichnung', 'optional'], ['C', 'Menge', 'ausser «pauschal»'], ['D', 'Einheit', 'optional'], ['E', 'Kosten CHF', 'Pflicht'], ['F', 'Kennwert CHF/m² GF', 'optional']];
const THG_FORMAT = [['1', `Blatt «${SHEET.head}»`, 'Schlüssel in Spalte A'], ['2', `Blatt «${SHEET.src}»`, 'ID in Spalte A'], ['3', `Blatt «${SHEET.betr}»`, 'Nr in Spalte A']];
const size = n => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Form of the import dialog and what it reads: the chosen file, else the sample file (cost forms only). */
export function importSource(s, data, P, pid) {
  const I = s.imp || {}, kind = I.form && data.forms.kinds[I.form] ? I.form : 'kv';
  const file = I.file && I.file.payload && I.file.payload.kind === kind && (I.pid == null || I.pid === pid) ? I.file : null;   // a file belongs to the form and the project it was read for
  const payload = file ? file.payload : P && P.forms[kind] && KEYS[kind] ? samplePayload(kind, P, data) : null;
  return { kind, file, payload, name: file ? file.name : payload ? (data.ebkp.import.files || {})[kind] || data.ebkp.import.file : '' };
}

const n1 = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function importModel(s, data, P, pid, gl = 'eBKP-H') {
  if (!s.ui || s.ui.dialog !== 'import' || !P) return {};   // the dialog is the only reader
  const I = s.imp || {}, { kind, file, payload, name } = importSource(s, data, P, pid), T = data.forms.kinds[kind], isTHG = kind === 'thg';
  const plan = payload && P.forms[kind] ? planImport(kind, payload, P, data, I.mode) : { rows: [], changed: 0, values: 0, hints: 0, colQ: 'Menge', colV: isTHG ? 'Wert' : 'Kosten CHF' };
  const all = plan.rows, f = I.filter, done = !!I.done;
  const impRows = all
    .filter(r => f === 'alle' || (f === 'geaendert' && r.st === 'Geändert') || (f === 'hinweise' && (r.st === 'Hinweis' || r.st === 'Ignoriert')))
    .map(r => ({ ...r, chip: CHIP[r.st], vW: r.st === 'Geändert' ? 600 : 400, rowCls: r.st === 'Geändert' ? ' is-changed' : r.st === 'Hinweis' ? ' is-note' : '' }));
  const tab = (key, label, count) => ({ key, label, count, active: f === key });
  const step = (n, on, ok) => ({ sym: ok ? '✓' : String(n), state: ok ? 'done' : on ? 'cur' : 'todo' });
  return {
    impRows, impAll: all.length, impChanged: plan.changed, impKind: kind, impCode: T.code, impTitle: T.title, impColQ: plan.colQ, impColV: plan.colV,
    impHasFile: !!payload, impIsSample: !!payload && !file, impFile: name, impFileSize: file ? size(file.size) : '48 KB',
    impSheet: !payload ? '' : `${payload.sheets.length === 1 ? 'Blatt' : 'Blätter'} ${payload.sheets.map(x => `«${x}»`).join(', ')}`, impRowsText: n1(all.length, 'Zeile', 'Zeilen'),
    impFormat: isTHG ? THG_FORMAT : COST_FORMAT(gl),
    impFormatNote: isTHG ? 'Die Kopfzeilen bleiben stehen. Eine Zeile ohne ID ist eine neue Emissionsquelle. Leere Zellen ändern nichts.' : 'Der Code ist der Schlüssel. Zeilen mit unbekanntem Code werden ignoriert. Leere Zellen ändern nichts.',
    impTplText: isTHG ? 'Enthält die Blätter Grundlagen, Erstellung und Betrieb mit ihren Spaltenköpfen.' : `Enthält alle Kostenelemente der Erfassung in der Gliederung ${gl}, mit Einheiten und Spaltenköpfen.`,
    impTabs: [tab('alle', 'Alle', all.length), tab('geaendert', 'Geändert', plan.changed), tab('hinweise', 'Hinweise', plan.hints)],
    impModes: [['ueber', 'Mit Werten aus Datei überschreiben'], ['leer', 'Nur leere Felder füllen']].map(([k, label]) => ({ key: k, label, checked: I.mode === k })),
    impOpen: !done, impDone: done,
    impSummary: done ? '' : `${n1(all.length, 'Zeile', 'Zeilen')} gelesen · ${all.length - plan.hints - plan.changed} unverändert · ${plan.changed} geändert · ${n1(plan.hints, 'Hinweis', 'Hinweise')}`,
    impBtn: plan.values ? `Übernehmen (${n1(plan.values, 'Änderung', 'Änderungen')})` : 'Keine Änderungen', impCanApply: plan.values > 0, impCancel: done ? 'Schliessen' : 'Zurück',
    impDoneText: `${I.applied} ${I.applied === 1 ? 'Wert' : 'Werte'} übernommen`, impCanUndo: !!I.undo,
    impStep1: step(1, false, true), impStep2: step(2, true, done), impStep3: step(3, done, false),
  };
}
