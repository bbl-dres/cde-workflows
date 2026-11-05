// Excel round trip of the Datenformulare: «Excel herunterladen» writes the values of a form into a workbook, the delivery team
// edits it, «Excel importieren» reads the same sheets back (export → edit → import). The layout is plain on purpose: one header
// row per sheet, one row per Kostenelement, Emissionsquelle or Energiedienstleistung; the first column is the key.
//
//   sheetsOf(kind, P, data, { empty })       → [{ name, rows (array of arrays), widths }]     what the workbook contains
//   readWorkbook(kind, { name: rows }, data)  → payload                                         what a file says (throws on a foreign file)
//   planImport(kind, payload, P, data, mode)  → { rows (preview), patch, changed, values, hints }   what an import would change
//   applyImport(kind, patch, P)               → patch for the project state                     the change itself
//
// All of that is pure and runs without a browser (tests). SheetJS is only needed to turn rows into an .xlsx file and back
// (workbookBlob, sheetsOfFile); it is loaded from the CDN on first use, like jsPDF for the Prüfbericht.
import { num, FMT, FMT2 } from './format.js';
import { KEYS, egOf, needsQty } from './model/mock.js';

const XLSX_SRC = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';   // SheetJS Community Edition, Apache-2.0
const XLSX_SRI = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let xlsxPromise = null;
/** SheetJS from the CDN (881 KB), once per session and only when a file is written or read. */
export function loadXLSX() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_SRC; script.integrity = XLSX_SRI; script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => { xlsxPromise = null; script.remove(); reject(new Error('Die Excel-Bibliothek konnte nicht geladen werden (keine Verbindung zum CDN).')); };
      document.head.appendChild(script);
    });
  }
  return xlsxPromise;
}
/** Sheets (see sheetsOf) as an .xlsx Blob. */
export async function workbookBlob(sheets) {
  const XLSX = await loadXLSX(), wb = XLSX.utils.book_new();
  for (const sh of sheets) { const ws = XLSX.utils.aoa_to_sheet(sh.rows); ws['!cols'] = sh.widths.map(wch => ({ wch })); XLSX.utils.book_append_sheet(wb, ws, sh.name); }
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: XLSX_MIME });
}
/** Sheets of an .xlsx file as { name: rows (array of arrays) }. */
export async function sheetsOfFile(file) {
  const XLSX = await loadXLSX();
  let wb;
  try { wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }); } catch { throw new Error('Die Datei ist keine lesbare Excel-Datei (.xlsx).'); }
  return Object.fromEntries(wb.SheetNames.map(n => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true })]));
}
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Header rows. A column is found by its label up to the bracket, so the hint in brackets may change and columns may move.
export const COST_HEAD = ['Code', 'Bezeichnung', 'Menge', 'Einheit', 'Kosten CHF', 'Kennwert CHF/m² GF (leer = berechnet)'];
export const HEAD_HEAD = ['Schlüssel', 'Angabe', 'Wert'];
export const SRC_HEAD = ['ID', 'Elementgruppe', 'Tool-Code', 'Emissionsquelle', 'Ökobilanzdaten', 'Hersteller (x)', 'Referenzgrösse', 'Einheit', 'kg CO₂-eq/m² EBF·a'];
export const BETR_HEAD = ['Nr', 'Energiedienstleistung', 'Energieträger', 'Projektwert (x)', 'Nutzenergie', 'Anteil %', 'η / JAZ', 'Endenergie (leer = berechnet)', 'kg CO₂-eq/kWh (leer = Standard)'];
export const SHEET = { head: 'Grundlagen', src: 'Erstellung', betr: 'Betrieb' };
const PV_KEYS = [['pv_y', 'PV-Ertrag kWh/a'], ['pv_ev', 'Eigenverbrauch %']];
const BETR_FIELDS = [['n', 4, 'Nutzenergie'], ['a', 5, 'Anteil'], ['eta', 6, 'η / JAZ'], ['end', 7, 'Endenergie'], ['kf', 8, 'Koeffizient']];   // [state key suffix, column, label]
const UNIT_ALIAS = { m2: 'm²', m3: 'm³', 'm3/h': 'm³/h', 'stk': 'St', 'stk.': 'St', 'st.': 'St', 'stück': 'St', 'm2 gf': 'm²', 'm² gf': 'm²', fr: 'CHF', 'fr.': 'CHF', pl: 'pauschal', 'gl.': 'pauschal', psch: 'pauschal', pauschale: 'pauschal' };   // spellings of practice and of earlier exports

const byCode = (a, b) => a.code.localeCompare(b.code);
const text = v => String(v ?? '').trim();
const flag = v => /^(x|ja|1|true|wahr)$/i.test(text(v));
const same = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);
const isDirect = (f, g) => (f.modes[g] || 'direct') === 'direct';
const headOf = (data, H, key) => (H[key] != null && H[key] !== '' ? H[key] : (data.thg.head.find(h => h[0] === key) || [])[2] ?? '');
const editableHead = data => data.thg.head.filter(h => h[2] != null);   // EBF and GF come from the Grundrisse
/** Unit of a file as one of the units of the form («m2» → «m²»): '' when the cell is empty, null when the form does not know the unit. */
const unitIn = (list, raw) => { const t = text(raw); if (!t) return ''; const a = (UNIT_ALIAS[t.toLowerCase()] || t).toLowerCase(); return list.find(u => u.toLowerCase() === a) ?? null; };

// ---- Export: the sheets of a form ----

function costSheet(kind, P, data, empty) {
  const [qKey, vKey] = KEYS[kind], Q = P[qKey] || {}, V = P[vKey] || {}, f = P.forms[kind], units = f.units || {}, kws = f.kws || {}, removed = f.removed || {};
  const val = v => (empty ? '' : num(v) ?? '');
  const rows = [COST_HEAD];
  for (const g of [...data.ebkp.ebkp].sort(byCode)) {
    const direct = !empty && isDirect(f, g.code);   // «zusammengefasst»: the Hauptgruppe carries the amount, its Kostenelemente are not part of the form
    rows.push([g.code, g.name, '', '', direct ? val((f.gvals || {})[g.code]) : '', val(kws[g.code])]);
    if (direct) continue;
    for (const k of g.kids.filter(x => !removed[x.code])) { const u = units[k.code] ?? (k.unit || 'pauschal'); rows.push([k.code, k.name, needsQty(u) ? val(Q[k.code]) : '', u, val(V[k.code]), val(kws[k.code])]); }
    for (const a of (f.added || []).filter(x => x.grp === g.code && x.code)) {
      const el = (data.ebkp.elements[g.code] || []).find(x => x[0] === a.code), u = units[`new-${a.id}`] ?? ((el && el[2]) || 'pauschal');
      rows.push([a.code, el ? el[1] : '', needsQty(u) ? val(a.q) : '', u, val(a.v), val(kws[`new-${a.id}`])]);
    }
  }
  return { name: data.forms.kinds[kind].code, rows, widths: [8, 46, 12, 12, 16, 34] };
}

function thgSheets(P, data, empty) {
  const H = P.thgHead || {}, B = P.thgBetr || {}, val = v => (empty ? '' : num(v) ?? '');
  const head = [HEAD_HEAD, ...editableHead(data).map(h => [h[0], h[1], empty ? '' : headOf(data, H, h[0])]), ...PV_KEYS.map(([k, label]) => [k, label, val(B[k])])];
  const src = [SRC_HEAD, ...(P.thgSrc || []).filter(s => s.code).map(s => [s.id, s.code, s.tcode || '', s.name || '', s.quelle || '', !empty && s.hs ? 'x' : '', val(s.q), s.unit || '', val(s.kw)])];
  const betr = [BETR_HEAD, ...data.thg.betrieb.map(([name, carrier], i) => [i + 1, name, carrier, !empty && B[`b${i}_proj`] ? 'x' : '', ...BETR_FIELDS.map(([k]) => val(B[`b${i}_${k}`]))])];
  return [{ name: SHEET.head, rows: head, widths: [12, 36, 46] }, { name: SHEET.src, rows: src, widths: [12, 14, 10, 44, 36, 14, 14, 10, 20] }, { name: SHEET.betr, rows: betr, widths: [5, 34, 34, 15, 12, 9, 9, 28, 30] }];
}

/** Sheets of a form with its values (`empty`: the same structure without values, the «Vorlage»). */
export function sheetsOf(kind, P, data, { empty = false } = {}) {
  return kind === 'thg' ? thgSheets(P, data, empty) : [costSheet(kind, P, data, empty)];
}
export const fileNameOf = (kind, project, data, empty) => `${data.forms.kinds[kind].code}_${empty ? 'Vorlage' : project.id}.xlsx`;

// ---- Import: read the sheets of a file ----

const label = v => text(v).replace(/\s*\(.*$/, '').toLowerCase();
/** Rows below the header row of a sheet, with the columns in the order of `head`. The header row is the first row whose
 *  first cell is the key column; a column that is not found by its label is taken from its position. */
function tableOf(rows, head) {
  const at = (rows || []).findIndex(r => label(r[0]) === label(head[0]));
  if (at < 0) return null;
  const found = rows[at].map(label), col = head.map((h, i) => { const j = found.indexOf(label(h)); return j < 0 ? i : j; });
  return rows.slice(at + 1).filter(r => r.some(c => text(c) !== '')).map(r => col.map(j => r[j] ?? ''));
}
const sheetNamed = (sheets, name) => { const k = Object.keys(sheets).find(n => n.trim().toLowerCase() === name.toLowerCase()); return k ? sheets[k] : null; };

/** What a workbook says, as plain values; throws with a German message when the file is not an export of this form. */
export function readWorkbook(kind, sheets, data) {
  if (kind === 'thg') {
    const head = tableOf(sheetNamed(sheets, SHEET.head), HEAD_HEAD), src = tableOf(sheetNamed(sheets, SHEET.src), SRC_HEAD), betr = tableOf(sheetNamed(sheets, SHEET.betr), BETR_HEAD);
    if (!head && !src && !betr) throw new Error('Keines der Blätter «Grundlagen», «Erstellung», «Betrieb» mit seiner Kopfzeile gefunden.');
    return {
      kind, sheet: [head && SHEET.head, src && SHEET.src, betr && SHEET.betr].filter(Boolean).join(', '),
      head: (head || []).map(r => ({ key: text(r[0]), value: text(r[2]) })).filter(r => r.key),
      src: (src || []).map(r => ({ id: text(r[0]), code: text(r[1]), tcode: text(r[2]), name: text(r[3]), quelle: text(r[4]), hs: flag(r[5]), q: num(r[6]), kw: num(r[8]) })).filter(r => r.id || r.code),
      betr: (betr || []).map(r => ({ nr: num(r[0]), proj: flag(r[3]), ...Object.fromEntries(BETR_FIELDS.map(([k, col]) => [k, num(r[col])])) })).filter(r => r.nr != null),
    };
  }
  const names = Object.keys(sheets), code = data.forms.kinds[kind].code;
  const name = names.find(n => n.trim().toLowerCase() === code.toLowerCase() && tableOf(sheets[n], COST_HEAD)) || names.find(n => tableOf(sheets[n], COST_HEAD));
  if (!name) throw new Error('Kein Blatt mit der Kopfzeile «Code, Bezeichnung, Menge, Einheit, Kosten CHF» gefunden.');
  return { kind, sheet: name, rows: tableOf(sheets[name], COST_HEAD).map(r => ({ code: text(r[0]).toUpperCase(), name: text(r[1]), q: num(r[2]), unit: text(r[3]), v: num(r[4]), kw: num(r[5]) })).filter(r => r.code) };
}

/** The sample file of the prototype (cost forms): the current values with the changes of data/ebkp.json › import, as if read from a file. */
export function samplePayload(kind, P, data) {
  const I = data.ebkp.import, f = P.forms[kind], open = { ...P, forms: { ...P.forms, [kind]: { ...f, modes: Object.fromEntries(Object.keys(f.modes).map(g => [g, 'detail'])) } } };   // the sample lists every Kostenelement, also of a Hauptgruppe that is «zusammengefasst»
  const base = readWorkbook(kind, Object.fromEntries(sheetsOf(kind, open, data).map(s => [s.name, s.rows])), data);
  const rows = base.rows.map(r => ({ ...r, v: I.changes[r.code] != null ? I.changes[r.code] : r.v, q: (I.missingQty || []).includes(r.code) ? null : r.q }));
  (I.ignored || []).forEach(x => rows.push({ code: x.code, name: x.name, q: null, unit: '', v: x.cost, kw: null }));
  return { ...base, rows };
}

// ---- Import: what a payload would change ----

/** `mode` 'ueber': a value of the file replaces a different one; 'leer': it only fills an empty field. An empty cell never clears a value. */
const takes = (mode, cur, next) => next != null && (mode === 'leer' ? cur == null : !same(cur, next));
const takesText = (mode, cur, next) => next !== '' && (mode === 'leer' ? !cur : cur !== next);
const was = (cur, what, fmt = FMT) => (cur == null ? `${what} neu` : `${what} bisher ${fmt(cur)}`);
/** A preview row; `n` = number of values the row changes. */
const row = (code, name, fq, fv, ch, hints = []) => ({ code, name, fq, fv, n: ch.length, st: ch.length ? 'Geändert' : hints.length ? 'Hinweis' : 'Unverändert', note: [...ch, ...hints].join(', ') });
const ignored = (code, name, fq, fv, note) => ({ code, name, fq, fv, n: 0, st: 'Ignoriert', note });

function planCost(kind, payload, P, data, mode) {
  const E = data.ebkp, UNITS = data.forms.kinds[kind].units || ['pauschal'];
  const [qKey, vKey] = KEYS[kind], Q = P[qKey] || {}, V = P[vKey] || {}, f = P.forms[kind], units = f.units || {}, kws = f.kws || {}, removed = f.removed || {}, gvals = f.gvals || {};
  const patch = { Q: {}, V: {}, units: {}, kws: {}, gvals: {}, added: {}, fresh: [], restore: [], groups: [] };
  const rows = [];
  for (const r of payload.rows) {
    const g = E.ebkp.find(x => x.code === r.code[0]);
    const fq = r.q == null ? '' : FMT(r.q), fv = r.v == null ? '' : FMT(r.v);
    if (g && r.code === g.code) {                                    // Hauptgruppe: its amount counts while the group is «zusammengefasst»; its Kennwert always
      const direct = isDirect(f, g.code), cur = num(gvals[g.code]), ch = [], hints = [];
      if (direct && takes(mode, cur, r.v)) { patch.gvals[g.code] = r.v; ch.push(cur == null ? 'Kosten neu' : `bisher ${FMT(cur)}`); }
      if (takes(mode, num(kws[g.code]), r.kw)) { patch.kws[g.code] = r.kw; ch.push(was(num(kws[g.code]), 'Kennwert')); }
      if (!direct && r.v != null) hints.push('Betrag ergibt sich aus den Kostenelementen');
      if (direct && r.v == null && cur == null) hints.push('Kosten fehlen in Datei');
      if (direct || ch.length || hints.length) rows.push(row(g.code, g.name, '', fv, ch, hints));
      continue;
    }
    const el = g && (E.elements[g.code] || []).find(x => x[0] === r.code);
    if (!el) { rows.push(ignored(r.code, r.name, fq, fv, 'Code nicht in eBKP-H')); continue; }
    const base = g.kids.find(k => k.code === r.code), add = (f.added || []).find(a => a.code === r.code);
    const inForm = !!((base && !removed[r.code]) || add), key = add ? `new-${add.id}` : r.code, name = r.name || el[1];
    const cur = !inForm ? { q: null, v: null, kw: null, unit: el[2] || 'pauschal' }
      : add ? { q: num(add.q), v: num(add.v), kw: num(kws[key]), unit: units[key] ?? (el[2] || 'pauschal') }
        : { q: num(Q[r.code]), v: num(V[r.code]), kw: num(kws[key]), unit: units[key] ?? (base.unit || 'pauschal') };
    const want = r.unit === cur.unit ? cur.unit : unitIn(UNITS, r.unit);   // '' = no unit in the file, null = a unit the form does not know
    const unit = want && (inForm ? takesText(mode, cur.unit, want) : want !== cur.unit) ? want : cur.unit, hasQty = needsQty(unit);
    const tu = unit !== cur.unit, tq = hasQty && takes(mode, cur.q, r.q), tv = takes(mode, cur.v, r.v), tk = takes(mode, cur.kw, r.kw);
    const hints = [];
    if (want === null) hints.push(`Einheit «${r.unit}» unbekannt`);
    if (!inForm) {                                                   // an Elementgruppe of the norm that is not in the form (or was removed): it comes in with the file
      if (r.v == null && r.q == null) continue;
      if (base) { patch.restore.push(r.code); if (hasQty && r.q != null) patch.Q[r.code] = r.q; if (r.v != null) patch.V[r.code] = r.v; if (tu) patch.units[r.code] = unit; if (r.kw != null) patch.kws[r.code] = r.kw; }
      else patch.fresh.push({ grp: g.code, code: r.code, q: hasQty && r.q != null ? r.q : '', v: r.v ?? '', unit: tu ? unit : null, kw: r.kw });
      patch.groups.push(g.code);
      rows.push({ ...row(r.code, name, hasQty ? fq || '–' : '', fv, ['neues Kostenelement'], hints), n: (hasQty && r.q != null ? 1 : 0) + (r.v != null ? 1 : 0) + (r.kw != null ? 1 : 0) });
      continue;
    }
    const ch = [];
    if (tv) ch.push(cur.v == null ? 'Kosten neu' : `bisher ${FMT(cur.v)}`);
    if (tq) ch.push(was(cur.q, 'Menge'));
    if (tu) ch.push(`Einheit bisher ${cur.unit}`);
    if (tk) ch.push(was(cur.kw, 'Kennwert'));
    if (add) { const p = {}; if (tq) p.q = r.q; if (tv) p.v = r.v; if (tq || tv) patch.added[add.id] = p; }
    else { if (tq) patch.Q[r.code] = r.q; if (tv) patch.V[r.code] = r.v; }
    if (tu) patch.units[key] = unit;
    if (tk) patch.kws[key] = r.kw;
    if (ch.length) patch.groups.push(g.code);
    if (hasQty && r.q == null) hints.push('Menge fehlt in Datei');
    if (r.v == null) hints.push('Kosten fehlen in Datei');
    rows.push(row(r.code, name, hasQty ? fq || '–' : '', fv, ch, hints));
  }
  return { rows, patch, colQ: 'Menge', colV: 'Kosten CHF' };
}

function planThg(payload, P, data, mode) {
  const TH = data.thg, H = P.thgHead || {}, B = P.thgBetr || {}, S = P.thgSrc || [];
  const patch = { head: {}, betr: {}, src: {}, fresh: [] };
  const rows = [];
  for (const r of payload.head) {
    const pv = PV_KEYS.find(k => k[0] === r.key), h = editableHead(data).find(x => x[0] === r.key);
    if (pv) { const v = num(r.value), cur = num(B[r.key]); if (takes(mode, cur, v)) { patch.betr[r.key] = v; rows.push(row('', pv[1], '', FMT(v), [cur == null ? 'neu' : `bisher ${FMT(cur)}`])); } continue; }
    if (!h) { rows.push(ignored('', r.key, '', r.value, 'Angabe unbekannt')); continue; }
    const cur = String(headOf(data, H, h[0]));
    if (!takesText(mode, cur, r.value)) continue;
    if (h[3] && !h[3].includes(r.value)) { rows.push(row('', h[1], '', r.value, [], ['nicht in der Auswahl, bleibt unverändert'])); continue; }
    patch.head[h[0]] = r.value;
    rows.push(row('', h[1], '', r.value, [`bisher ${cur || 'leer'}`]));
  }
  for (const r of payload.src) {
    const eg = egOf(data, r.code), cur = r.id ? S.find(s => s.id === r.id) : null, name = [r.tcode, r.name].filter(Boolean).join(' ');
    const fq = r.q == null ? '' : FMT(r.q), fv = r.kw == null ? '' : FMT2(r.kw);
    if (!eg) { rows.push(ignored(r.code, name, fq, fv, 'Elementgruppe unbekannt')); continue; }
    if (!cur) {                                                      // no ID, or an ID the form does not know: a new Emissionsquelle
      if (!r.name && r.q == null && r.kw == null) continue;
      patch.fresh.push({ grp: r.code[0], code: r.code, tcode: r.tcode, name: r.name || eg[1], quelle: r.quelle, unit: eg[2], q: r.q ?? '', kw: r.kw ?? '', hs: r.hs });
      rows.push({ ...row(r.code, name || eg[1], fq, fv, ['neue Emissionsquelle']), n: (r.q != null ? 1 : 0) + (r.kw != null ? 1 : 0) || 1 });
      continue;
    }
    const p = {}, ch = [];
    if (takes(mode, num(cur.kw), r.kw)) { p.kw = r.kw; ch.push(num(cur.kw) == null ? 'Kennwert neu' : `bisher ${FMT2(num(cur.kw))}`); }
    if (takes(mode, num(cur.q), r.q)) { p.q = r.q; ch.push(was(num(cur.q), 'Referenzgrösse')); }
    if (mode !== 'leer') {                                           // texts and flags are never «empty», so «nur leere Felder» leaves them
      if (r.code !== cur.code) { Object.assign(p, { code: r.code, grp: r.code[0], unit: eg[2] }); ch.push(`Elementgruppe bisher ${cur.code}`); }
      for (const [k, lab] of [['tcode', 'Tool-Code'], ['name', 'Bezeichnung'], ['quelle', 'Ökobilanzdaten']]) if (r[k] !== '' && r[k] !== (cur[k] || '')) { p[k] = r[k]; ch.push(lab); }
      if (r.hs !== !!cur.hs) { p.hs = r.hs; ch.push('Hersteller'); }
    }
    if (ch.length) patch.src[cur.id] = p;
    rows.push(row(r.code, name, fq, fv, ch));
  }
  for (const r of payload.betr) {
    const i = r.nr - 1, def = TH.betrieb[i];
    if (!def) { rows.push(ignored(`B${r.nr}`, '', '', '', 'Zeile unbekannt')); continue; }
    const ch = [];
    for (const [k, , lab] of BETR_FIELDS) { const key = `b${i}_${k}`, cur = num(B[key]); if (takes(mode, cur, r[k])) { patch.betr[key] = r[k]; ch.push(was(cur, lab, FMT2)); } }
    if (mode !== 'leer' && r.proj !== !!B[`b${i}_proj`]) { patch.betr[`b${i}_proj`] = r.proj; ch.push('Projektwert'); }
    rows.push(row(`B${r.nr}`, `${def[0]} · ${def[1]}`, r.n == null ? '' : FMT2(r.n), '', ch));
  }
  return { rows, patch, colQ: 'Menge', colV: 'Wert' };
}

/** Preview rows { code, name, fq, fv, n, st, note } of an import and the patch it would apply. */
export function planImport(kind, payload, P, data, mode = 'ueber') {
  const plan = kind === 'thg' ? planThg(payload, P, data, mode) : planCost(kind, payload, P, data, mode);
  return { ...plan, changed: plan.rows.filter(r => r.st === 'Geändert').length, values: plan.rows.reduce((a, r) => a + r.n, 0), hints: plan.rows.filter(r => r.st === 'Hinweis' || r.st === 'Ignoriert').length };
}

/** The part of the project state an import changes (kept for «Import zurücksetzen»). */
export function importScope(kind, P) {
  const f = P.forms[kind], pick = keys => Object.fromEntries(keys.filter(k => k in f).map(k => [k, f[k]]));
  if (kind === 'thg') return { values: { thgSrc: P.thgSrc, thgHead: P.thgHead, thgBetr: P.thgBetr }, form: pick(['modes', 'nNew']) };
  const [qKey, vKey] = KEYS[kind];
  return { values: { [qKey]: P[qKey], [vKey]: P[vKey] }, form: pick(['units', 'kws', 'removed', 'added', 'nNew', 'gvals', 'modes']) };
}

/** The patch of an import as a patch of the project state (values, form); groups touched are shown broken down. */
export function applyImport(kind, patch, P) {
  const f = P.forms[kind];
  let nNew = f.nNew || 0;
  if (kind === 'thg') {
    const fresh = patch.fresh.map(s => ({ id: `n${++nNew}`, ...s }));
    return {
      thgHead: { ...(P.thgHead || {}), ...patch.head }, thgBetr: { ...(P.thgBetr || {}), ...patch.betr },
      thgSrc: [...(P.thgSrc || []).map(s => (patch.src[s.id] ? { ...s, ...patch.src[s.id] } : s)), ...fresh],
      forms: { ...P.forms, thg: { ...f, nNew, modes: { ...f.modes, ...Object.fromEntries([...Object.values(patch.src), ...fresh].map(s => s.grp).filter(Boolean).map(g => [g, 'detail'])) } } },
    };
  }
  const [qKey, vKey] = KEYS[kind];
  const removed = { ...(f.removed || {}) }; patch.restore.forEach(c => { delete removed[c]; });
  const units = { ...(f.units || {}), ...patch.units }, kws = { ...(f.kws || {}), ...patch.kws };
  const fresh = patch.fresh.map(a => { const id = `kn${++nNew}`; if (a.unit) units[`new-${id}`] = a.unit; if (a.kw != null) kws[`new-${id}`] = a.kw; return { id, grp: a.grp, code: a.code, q: a.q, v: a.v }; });
  return {
    [qKey]: { ...(P[qKey] || {}), ...patch.Q }, [vKey]: { ...(P[vKey] || {}), ...patch.V },
    forms: { ...P.forms, [kind]: { ...f, units, kws, removed, nNew, gvals: { ...(f.gvals || {}), ...patch.gvals },
      added: [...(f.added || []).map(a => (patch.added[a.id] ? { ...a, ...patch.added[a.id] } : a)), ...fresh],
      modes: { ...f.modes, ...Object.fromEntries(patch.groups.map(g => [g, 'detail'])) } } },
  };
}
