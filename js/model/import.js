import { KEYS } from './mock.js';
import { samplePayload, planImport, SHEET } from '../excel.js';

// 03c/03d Excel importieren: Datei wählen, Vorschau, Übernehmen. The dialog belongs to one Datenformular (imp.form = kv | ks | thg)
// and shows what the chosen file would change (js/excel.js). Without a file the cost forms use the sample file of the prototype.
const ST = {
  'Unverändert': ['#f0f2f5', '#e1e5ea', '#5b6573'],
  'Geändert': ['#f8f1d2', '#e6dca6', '#5a4508'],
  'Hinweis': ['#f9e2e7', '#e8c3cc', '#6b1d2e'],
  'Ignoriert': ['#fff', '#c9cfd6', '#5b6573'],
};
const COST_FORMAT = gl => [['A', `Code ${gl}`, 'Schlüssel'], ['B', 'Bezeichnung', 'optional'], ['C', 'Menge', 'ausser «pauschal»'], ['D', 'Einheit', 'optional'], ['E', 'Kosten CHF', 'Pflicht'], ['F', 'Kennwert CHF/m² GF', 'optional']];
const THG_FORMAT = [['1', `Blatt «${SHEET.head}»`, 'Schlüssel in Spalte A'], ['2', `Blatt «${SHEET.src}»`, 'ID in Spalte A'], ['3', `Blatt «${SHEET.betr}»`, 'Nr in Spalte A']];
const size = n => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Form of the import dialog and what it reads: the chosen file, else the sample file (cost forms only). */
export function importSource(s, data, P) {
  const I = s.imp || {}, kind = I.form && data.forms.kinds[I.form] ? I.form : 'kv';
  const file = I.file && I.file.payload && I.file.payload.kind === kind ? I.file : null;
  const payload = file ? file.payload : P && P.forms[kind] && KEYS[kind] ? samplePayload(kind, P, data) : null;
  return { kind, file, payload, name: file ? file.name : payload ? data.ebkp.import.file : '' };
}

export function importModel(s, data, P, gl = 'eBKP-H') {
  if (!s.ui || s.ui.dialog !== 'import' || !P) return {};   // the dialog is the only reader
  const I = s.imp || {}, { kind, file, payload, name } = importSource(s, data, P), T = data.forms.kinds[kind], isTHG = kind === 'thg';
  const plan = payload && P.forms[kind] ? planImport(kind, payload, P, data, I.mode) : { rows: [], changed: 0, values: 0, hints: 0, colQ: 'Menge', colV: isTHG ? 'Wert' : 'Kosten CHF' };
  const all = plan.rows, f = I.filter, done = !!I.done;
  const impRows = all
    .filter(r => f === 'alle' || (f === 'geaendert' && r.st === 'Geändert') || (f === 'hinweise' && (r.st === 'Hinweis' || r.st === 'Ignoriert')))
    .map(r => { const c = ST[r.st]; return { ...r, stBg: c[0], stBd: c[1], stC: c[2], vW: r.st === 'Geändert' ? 600 : 400, bg: r.st === 'Geändert' ? '#fdfaf0' : r.st === 'Hinweis' ? '#fcf1f3' : '#fff' }; });
  const tab = (key, label, count) => ({ key, label, count, active: f === key, bd: f === key ? 'var(--navy)' : '#c9cfd6', bg: f === key ? 'var(--navy)' : '#fff', c: f === key ? '#fff' : '#1f2937' });
  const step = (n, on, ok) => ({ sym: ok ? '✓' : String(n), bg: ok ? '#4c8c75' : '#fff', bd: ok ? '#4c8c75' : on ? 'var(--navy)' : '#c9cfd6', c: ok ? '#fff' : on ? 'var(--navy)' : '#6b7480', w: on && !ok ? 600 : 400, t: (on || ok) ? '#1f2937' : '#6b7480' });
  return {
    impRows, impAll: all.length, impChanged: plan.changed, impKind: kind, impCode: T.code, impTitle: T.title, impColQ: plan.colQ, impColV: plan.colV,
    impHasFile: !!payload, impIsSample: !!payload && !file, impFile: name, impFileSize: file ? size(file.size) : '48 KB', impSheet: payload ? payload.sheet : '',
    impFormat: isTHG ? THG_FORMAT : COST_FORMAT(gl),
    impFormatNote: isTHG ? 'Die Kopfzeilen bleiben stehen. Eine Zeile ohne ID ist eine neue Emissionsquelle. Leere Zellen ändern nichts.' : 'Der Code ist der Schlüssel. Zeilen mit unbekanntem Code werden ignoriert. Leere Zellen ändern nichts.',
    impTplText: isTHG ? 'Enthält die Blätter Grundlagen, Erstellung und Betrieb mit ihren Spaltenköpfen.' : `Enthält alle Kostenelemente der Erfassung in der Gliederung ${gl}, mit Einheiten und Spaltenköpfen.`,
    impTabs: [tab('alle', 'Alle', all.length), tab('geaendert', 'Geändert', plan.changed), tab('hinweise', 'Hinweise', plan.hints)],
    impModes: [['ueber', 'Mit Werten aus Datei überschreiben'], ['leer', 'Nur leere Felder füllen']].map(([k, label]) => ({ key: k, label, checked: I.mode === k })),
    impOpen: !done, impDone: done,
    impSummary: done ? '' : `${all.length} Zeilen gelesen · ${all.length - plan.hints - plan.changed} unverändert · ${plan.changed} geändert · ${plan.hints} Hinweise`,
    impBtn: plan.values ? `Übernehmen (${plan.values} ${plan.values === 1 ? 'Änderung' : 'Änderungen'})` : 'Übernehmen', impCancel: done ? 'Schliessen' : 'Zurück',
    impDoneText: `${I.applied} ${I.applied === 1 ? 'Wert' : 'Werte'} übernommen`, impCanUndo: !!I.undo,
    impStep1: step(1, false, true), impStep2: step(2, true, done), impStep3: step(3, done, false),
  };
}
