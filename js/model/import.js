import { FMT } from '../format.js';

// 03c/03d Excel importieren: Datei wählen, Vorschau, Übernehmen
export function importModel(s, data) {
  const I = s.imp || { step: 1, filter: 'alle', mode: 'ueber' }, E = data.ebkp, CH = E.import.changes;
  const ST = {
    'Unverändert': ['#f0f2f5', '#e1e5ea', '#5b6573'],
    'Geändert': ['#f8f1d2', '#e6dca6', '#5a4508'],
    'Hinweis': ['#f9e2e7', '#e8c3cc', '#6b1d2e'],
    'Ignoriert': ['#fff', '#c9cfd6', '#5b6573'],
  };
  const leaves = [];
  E.ebkp.forEach(g => g.kids.forEach(k => leaves.push(k)));
  E.extra.forEach(k => leaves.push(k));
  const all = leaves.map(k => {
    let st = 'Unverändert', fq = k.qty ?? null, fv = k.cost, note = '';
    if (CH[k.code] != null) { st = 'Geändert'; fv = CH[k.code]; note = 'bisher ' + FMT(k.cost); }
    if ((E.import.missingQty || []).includes(k.code)) { st = 'Hinweis'; fq = null; note = 'Menge fehlt in Datei'; }
    return { code: k.code, name: k.name, fq: fq == null ? (k.unit ? '–' : '') : FMT(fq), fv: FMT(fv), st, note };
  });
  (E.import.ignored || []).forEach(x => all.push({ code: x.code, name: x.name, fq: '', fv: FMT(x.cost), st: 'Ignoriert', note: x.note }));
  const changed = all.filter(r => r.st === 'Geändert').length;
  const hints = all.filter(r => r.st === 'Hinweis' || r.st === 'Ignoriert').length;
  const kind = I.form && data.forms.kinds[I.form] ? I.form : 'kv';
  const f = I.filter;
  const impRows = all
    .filter(r => f === 'alle' || (f === 'geaendert' && r.st === 'Geändert') || (f === 'hinweise' && (r.st === 'Hinweis' || r.st === 'Ignoriert')))
    .map(r => { const c = ST[r.st]; return { ...r, stBg: c[0], stBd: c[1], stC: c[2], vW: r.st === 'Geändert' ? 600 : 400, bg: r.st === 'Geändert' ? '#fdfaf0' : r.st === 'Hinweis' ? '#fcf1f3' : '#fff' }; });
  const tab = (key, label, count) => ({ key, label, count, active: f === key, bd: f === key ? 'var(--navy)' : '#c9cfd6', bg: f === key ? 'var(--navy)' : '#fff', c: f === key ? '#fff' : '#1f2937' });
  const applied = I.mode === 'ueber' ? changed : 0;
  const done = I.done;
  const step = (n, on, done) => ({ sym: done ? '✓' : String(n), bg: done ? '#4c8c75' : '#fff', bd: done ? '#4c8c75' : on ? 'var(--navy)' : '#c9cfd6', c: done ? '#fff' : on ? 'var(--navy)' : '#6b7480', w: on && !done ? 600 : 400, t: (on || done) ? '#1f2937' : '#6b7480' });
  return {
    impRows, impAll: all.length, impChanged: changed, impKind: kind, impCode: data.forms.kinds[kind].code,
    impTabs: [tab('alle', 'Alle', all.length), tab('geaendert', 'Geändert', changed), tab('hinweise', 'Hinweise', hints)],
    impModes: [['ueber', 'Mit Werten aus Datei überschreiben'], ['leer', 'Nur leere Felder füllen']].map(([k, label]) => ({ key: k, label, checked: I.mode === k })),
    impOpen: !done, impDone: done, impFile: E.import.file, impFileSize: '48 KB',
    impSummary: done ? '' : `${all.length} Zeilen gelesen · ${all.length - hints - changed} unverändert · ${changed} geändert · ${hints} Hinweise`,
    impBtn: applied ? `Übernehmen (${applied} Änderungen)` : 'Übernehmen', impCancel: done ? 'Schliessen' : 'Zurück',
    impDoneText: `${I.applied} ${I.applied === 1 ? 'Wert' : 'Werte'} übernommen`,
    impStep1: step(1, false, true), impStep2: step(2, true, done), impStep3: step(3, done, false),
  };
}
