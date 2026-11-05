// =============================================
// Prüfbericht (PDF) of a checked floor plan: cover with the delivery data and the summary, table of contents, chapters
// Prüfregeln, Fehlermeldungen, Layer (with the drawing), Räume and Flächen (with the overlays), Kennzahlen SIA 416.
// Port of js/export.js of plan-check (MIT, https://github.com/bbl-dres/plan-check) to the result shape of this
// prototype. jsPDF and jspdf-autotable (both MIT) are loaded from jsDelivr on first use, with SRI hashes.
// =============================================
import { ruleRows, buildKpiSections, buildEntityRows, formatArea, formatShare, formatRatio, fmtNum, fmtSize } from './index.js';

const SCRIPTS = [
  ['https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js', 'sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/'],
  ['https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js', 'sha384-Xl/CUCfJbzsngMp0CFxkmF0VW/8C160IsGujqeQlIhaGxKz2+JsIGORFqtCPeldF'],
];
const PAGE = { width: 210, height: 297, marginX: 14, contentTop: 28, bottomMargin: 18 };
const IMAGE_MAX_PX = 1600;          // report images are downscaled to keep the PDF small
const DASH = '—';
const LINKS = [
  ['Prototyp CDE Bund · Datenlieferungen', 'https://github.com/bbl-dres/cde-workflows'],
  ['Prüfplattform Flächenmanagement (plan-check)', 'https://bbl-dres.github.io/plan-check/'],
  ['Downloads BBL Bauten', 'https://www.bbl.admin.ch/de/downloads-bauten'],
];
const THEME = {
  primary: [16, 56, 79], primaryLight: [228, 233, 239], text: [38, 38, 38], muted: [107, 114, 128], border: [217, 217, 217], zebra: [246, 247, 249],
  error: [155, 44, 68], warning: [138, 97, 0], success: [47, 125, 99], successLight: [226, 239, 237],
};
const LABEL = { ok: 'OK', error: 'Fehler', warning: 'Warnung', unknown: 'Unbekannt', pass: 'OK', fail: 'Fehler', warn: 'Warnung' };

const scriptPromises = new Map();
/** Loads a UMD script once (with its SRI hash); a failed load can be retried. */
function loadScript(src, integrity) {
  if (!scriptPromises.has(src)) {
    scriptPromises.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; script.integrity = integrity; script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => { scriptPromises.delete(src); reject(new Error(`Skript konnte nicht geladen werden: ${src}`)); };
      document.head.appendChild(script);
    }));
  }
  return scriptPromises.get(src);
}
async function loadJsPdf() {
  for (const [src, sri] of SCRIPTS) await loadScript(src, sri);
  return window.jspdf.jsPDF;
}

export const formatDateTime = date => date.toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' });

/** Downscaled PNG of a canvas: { data, aspect }. */
export function canvasImage(canvas) {
  const scale = Math.min(1, IMAGE_MAX_PX / canvas.width);
  let source = canvas;
  if (scale < 1) {
    source = document.createElement('canvas');
    source.width = Math.round(canvas.width * scale);
    source.height = Math.round(canvas.height * scale);
    source.getContext('2d').drawImage(canvas, 0, 0, source.width, source.height);
  }
  return { data: source.toDataURL('image/png'), aspect: source.height / source.width };
}

/**
 * The rows of the report from a check result (js/plancheck/index.js toResult) and the delivery:
 * { project, code, name, floor, status, reviewer, due, guideline, uploadedAt, fileName } — pure, testable without a browser.
 * `fileName` is the name of the delivered file (a floor that shows a sample result carries its own file name).
 */
export function buildReportModel(result, delivery = {}) {
  const k = result.kpi || {}, hasRooms = result.rooms.length > 0;
  const ebf = k.ebf !== undefined ? k.ebf : k.gf != null && result.areas.length > 0 ? (delivery.heated === false ? 0 : k.gf) : null;   // EBF (SIA 380/1): the figure of the application (from the Flächenart of the rooms); without it the GF of a heated floor
  const kpi = buildKpiSections({ ...k, ebf, hasRooms, hasAreaPolys: result.areas.length > 0 });
  const fileName = delivery.fileName || result.file.name;
  return {
    fileName,
    baseName: String(fileName || 'Plan').replace(/\.[^.]+$/, ''),
    info: [
      ['Projekt', delivery.project || DASH], ['Lieferung', [delivery.code, delivery.name].filter(Boolean).join(' · ') || DASH], ['Geschoss', delivery.floor || DASH],
      ['Status', delivery.status || DASH], ['Prüfend', delivery.reviewer || DASH], ['Frist', delivery.due || DASH],
      ['Prüfgrundlage', delivery.guideline || 'CAD-Richtlinie BBL V1.0'],
      ['Dateiname', fileName || DASH], ['Dateigrösse', result.file.size ? fmtSize(result.file.size) : DASH], ['DWG-Version', result.version || DASH],
      ['Layer', result.layerCount ?? DASH], ['Objekte', result.entityCount ?? DASH], ['Hochgeladen', delivery.uploadedAt || DASH],
      ['Verarbeitungszeit', result.elapsed ? result.elapsed + ' s' : DASH],
    ],
    summary: result.summary,
    rules: ruleRows(result),
    issues: result.issues,
    layers: result.layers,
    rooms: result.rooms,
    areas: result.areas,
    kpi,
    kpiRaw: { ...k, hasRooms },
    entities: buildEntityRows(result.entities),
    links: LINKS,
  };
}

/** Builds the PDF; `capture(overlay)` returns { data, aspect } of the drawing with an overlay ('base', 'rooms', 'areas') or null. */
export async function buildPlanReport(model, { capture = () => null } = {}) {
  const jsPDF = await loadJsPdf();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });   // without compression the three plan images make 6–12 MB
  const theme = THEME;
  const { marginX, height, contentTop, bottomMargin } = PAGE;
  const right = PAGE.width - marginX, contentWidth = right - marginX;
  const labelColor = { OK: theme.success, Fehler: theme.error, Warnung: theme.warning, Unbekannt: theme.warning };
  const chapterPages = {};
  let tableNumber = 0;

  const setFont = (size, color, style = 'normal') => { doc.setFontSize(size); doc.setTextColor(...color); doc.setFont(undefined, style); };
  const fitText = (text, maxWidth) => {
    if (doc.getTextWidth(text) <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && doc.getTextWidth(s + '…') > maxWidth) s = s.slice(0, -1);
    return s + '…';
  };
  function pageHeader(title) {
    doc.setFillColor(...theme.primary);
    doc.rect(marginX, 8, contentWidth, 0.6, 'F');
    setFont(7.5, theme.muted);
    doc.text('Prüfbericht Planlieferung', marginX, 13);
    doc.text(fitText(model.fileName, contentWidth / 2), right, 13, { align: 'right' });
    if (title) {
      setFont(13, theme.text, 'bold');
      doc.text(title, marginX, 22);
      doc.setDrawColor(...theme.border); doc.setLineWidth(0.3); doc.line(marginX, 24, right, 24);
    }
  }
  function pageFooter() {
    const total = doc.internal.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      doc.setPage(page);
      doc.setDrawColor(...theme.border); doc.setLineWidth(0.2); doc.line(marginX, height - 14, right, height - 14);
      setFont(7.5, theme.muted);
      const org = 'Bundesamt für Bauten und Logistik BBL', sep = ' • ';
      doc.textWithLink(org, marginX, height - 10, { url: 'https://www.bbl.admin.ch/' });
      doc.text(sep, marginX + doc.getTextWidth(org), height - 10);
      doc.text('CDE Bund · Prototyp, fiktive Inhalte', marginX + doc.getTextWidth(org) + doc.getTextWidth(sep), height - 10);
      doc.text(`Seite ${page} / ${total}`, right, height - 10, { align: 'right' });
    }
  }
  function sectionSubtitle(label, y) {
    doc.setFillColor(...theme.primaryLight);
    doc.roundedRect(marginX, y - 4, contentWidth, 7, 1, 1, 'F');
    setFont(9, theme.primary, 'bold');
    doc.text(label, marginX + 3, y);
    return y + 6;
  }
  function tableCaption(text) {
    const y = doc.lastAutoTable.finalY + 3;
    setFont(7, theme.muted);
    doc.text(`Tab. ${++tableNumber}: ${text}`, marginX, y);
    return y + 4;
  }
  function addImage(image, y, maxHeight) {
    if (!image) return y;
    let w = contentWidth, h = contentWidth * image.aspect;
    if (h > maxHeight) { w = maxHeight / image.aspect; h = maxHeight; }
    const x = marginX + (contentWidth - w) / 2;
    doc.setDrawColor(...theme.border); doc.setLineWidth(0.3); doc.rect(x, y, w, h);
    doc.addImage(image.data, 'PNG', x + 0.3, y + 0.3, w - 0.6, h - 0.6);
    return y + h;
  }
  /** Starts a new page when fewer than `needed` mm remain; returns the y to continue at. */
  function ensureSpace(y, needed, title) {
    if (y + needed <= height - bottomMargin) return y;
    doc.addPage(); pageHeader(title);
    return contentTop;
  }
  /** Table with a status column coloured by label; continuation pages get the running header. */
  function table({ title, statusColumn, ...options }) {
    let pages = 0;
    doc.autoTable({
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, lineColor: theme.border, lineWidth: 0.2, textColor: theme.text },
      headStyles: { fillColor: theme.primaryLight, textColor: theme.primary, fontStyle: 'bold', lineWidth: 0.2, lineColor: theme.border },
      alternateRowStyles: { fillColor: theme.zebra },
      margin: { left: marginX, right: marginX, top: contentTop },
      didDrawPage: () => { if (++pages > 1) pageHeader(title); },
      didParseCell: data => {
        if (statusColumn != null && data.section === 'body' && data.column.index === statusColumn) {
          const color = labelColor[data.cell.raw];
          if (color) data.cell.styles.textColor = color;
        }
      },
      ...options,
    });
  }
  function chapter(key, title, draw) {
    doc.addPage();
    chapterPages[key] = doc.internal.getNumberOfPages();
    pageHeader(title);
    draw(title);
  }
  const statusLabel = status => LABEL[status] || status;
  const polygonRows = entries => entries.map((e, i) => [String(i + 1), statusLabel(e.status), String(e.id), e.aoid || DASH, fmtNum(e.area, 2)]);
  const polygonHead = [['#', 'Status', 'ID', 'Bezeichnung', 'Fläche (m²)']];
  const polygonColumns = { 0: { cellWidth: 10 }, 1: { cellWidth: 20 }, 2: { cellWidth: 14 }, 4: { cellWidth: 26, halign: 'right' } };
  const kpiHead = [['Kürzel', 'Bezeichnung', 'Fläche (m²)', '% GF']];
  const kpiColumns = { 0: { fontStyle: 'bold', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 16 } };
  const areaRow = r => [r.abbr, r.label, formatArea(r.value), formatShare(r.value, r.total)];

  // ── Cover ──
  const { summary } = model;
  const scoreColor = summary.scoreClass === 'success' ? theme.success : summary.scoreClass === 'warning' ? theme.warning : theme.error;
  setFont(22, theme.text, 'bold');
  doc.text('Prüfbericht Planlieferung', marginX, 22);
  setFont(10, theme.muted);
  doc.text(fitText(model.fileName, contentWidth), marginX, 30);
  doc.text(`Erstellt: ${formatDateTime(new Date())}`, marginX, 36);
  doc.setDrawColor(...theme.primary); doc.setLineWidth(0.5); doc.line(marginX, 40, marginX + 30, 40);
  table({ title: 'Prüfbericht', startY: 47, head: [['Eigenschaft', 'Wert']], body: model.info.map(([k, v]) => [k, String(v)]), columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 } } });

  const heading = (label, y) => {
    setFont(11, theme.text, 'bold');
    doc.text(label, marginX, y);
    doc.setDrawColor(...theme.border); doc.setLineWidth(0.2); doc.line(marginX, y + 2, right, y + 2);
    return y + 7;
  };
  let y = heading('Zusammenfassung', doc.lastAutoTable.finalY + 10);
  const drawCards = (cards, startY) => {
    const gap = 3, cardW = (contentWidth - gap * (cards.length - 1)) / cards.length, cardH = 16;
    cards.forEach((card, i) => {
      const x = marginX + i * (cardW + gap);
      doc.setDrawColor(...theme.border); doc.setLineWidth(0.2); doc.roundedRect(x, startY, cardW, cardH, 1.5, 1.5);
      setFont(14, card.color, 'bold'); doc.text(card.value, x + cardW / 2, startY + 8.5, { align: 'center' });
      setFont(7, theme.muted); doc.text(card.label, x + cardW / 2, startY + 13, { align: 'center' });
    });
    return startY + cardH;
  };
  const k = model.kpiRaw;
  y = drawCards([
    { label: `Score (${summary.passedRules}/${summary.totalRules})`, value: summary.score + ' %', color: scoreColor },
    { label: 'Räume', value: String(model.rooms.length), color: theme.primary },
    { label: 'Flächen', value: String(model.areas.length), color: theme.primary },
    { label: 'Layer', value: String(model.layers.length), color: theme.primary },
  ], y) + 3;
  y = drawCards([
    { label: 'GF', value: formatArea(k.gf), color: theme.primary },
    { label: 'NGF', value: k.hasRooms ? formatArea(k.ngf) : DASH, color: theme.primary },
    { label: 'Fehler', value: String(summary.errorCount), color: summary.errorCount > 0 ? theme.error : theme.success },
    { label: 'Warnungen', value: String(summary.warningCount), color: summary.warningCount > 0 ? theme.warning : theme.success },
  ], y);
  y = heading('Links', y + 10);
  for (const [label, url] of model.links) {
    setFont(7.5, theme.text, 'bold'); doc.text(label, marginX, y);
    setFont(6.5, theme.muted); doc.textWithLink(url, marginX, y + 3.5, { url });
    y += 9;
  }

  // ── Table of contents placeholder (filled once page numbers are known) ──
  doc.addPage();
  const tocPage = doc.internal.getNumberOfPages();

  // ── Prüfregeln ──
  chapter('rules', `Prüfregeln (${model.rules.passed.length}/${summary.totalRules})`, title => {
    const rows = list => list.map(r => [statusLabel(r.status), r.code, r.text + (r.count ? ` (${r.count}×)` : '')]);
    const head = [['Status', 'Regel', 'Beschreibung']];
    const columnStyles = { 0: { cellWidth: 20 }, 1: { fontStyle: 'bold', cellWidth: 28 } };
    let py = contentTop;
    if (model.rules.failed.length > 0) {
      py = sectionSubtitle(`Nicht bestanden (${model.rules.failed.length})`, py);
      table({ title, statusColumn: 0, startY: py, head, body: rows(model.rules.failed), columnStyles });
      py = doc.lastAutoTable.finalY + 8;
    }
    py = sectionSubtitle(`Bestanden (${model.rules.passed.length})`, ensureSpace(py, 30, title));
    table({ title, statusColumn: 0, startY: py, head, body: rows(model.rules.passed), columnStyles });
    tableCaption('Prüfregeln: automatisierte Prüfung nach CAD-Richtlinie BBL V1.0');
  });

  // ── Fehlermeldungen ──
  chapter('errors', `Fehlermeldungen (${model.issues.length})`, title => {
    if (model.issues.length === 0) {
      doc.setFillColor(...theme.successLight); doc.roundedRect(marginX, 32, contentWidth, 12, 2, 2, 'F');
      setFont(10, theme.success, 'bold'); doc.text('Keine Fehlermeldungen: alle Prüfregeln bestanden.', marginX + 4, 39.5);
      return;
    }
    table({
      title, statusColumn: 1, startY: contentTop,
      head: [['#', 'Status', 'Regel', 'Meldung']],
      body: model.issues.map((issue, i) => [String(i + 1), statusLabel(issue.severity), issue.code, issue.message]),
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 20 }, 2: { cellWidth: 28 } },
    });
    tableCaption('Fehlermeldungen: erkannte Verstösse und Warnungen');
  });

  // ── Layer ──
  chapter('layers', `Layer (${model.layers.length})`, title => {
    let ly = addImage(capture('base'), contentTop, 110) + 8;
    ly = sectionSubtitle(`Layer-Übersicht (${model.layers.length} Layer)`, ly);
    table({
      title, statusColumn: 1, startY: ly,
      head: [['#', 'Status', 'Layer', 'Objekte', 'Farbe']],
      body: model.layers.map((l, i) => [String(i + 1), l.ok ? LABEL.ok : LABEL.unknown, l.name, String(l.count), l.color || DASH]),
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 20 }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 20 } },
    });
    tableCaption('Layer: erkannte CAD-Layer mit Objektanzahl und CAFM-Status');
  });

  // ── Räume und Flächen ──
  const polygonChapter = (key, label, entries, overlay, emptyText, listLabel, caption) => {
    chapter(key, `${label} (${entries.length})`, title => {
      let py = addImage(capture(overlay), contentTop, 95) + 8;
      if (entries.length === 0) { setFont(9, theme.muted); doc.text(emptyText, marginX, py + 4); return; }
      py = sectionSubtitle(`${listLabel} (${entries.length})`, py);
      table({ title, statusColumn: 1, startY: py, head: polygonHead, body: polygonRows(entries), columnStyles: polygonColumns });
      tableCaption(caption);
    });
  };
  polygonChapter('rooms', 'Räume', model.rooms, 'rooms', 'Keine Räume erkannt.', 'Raumliste', 'Räume: Raumpolygone mit Flächenangaben (R_RAUMPOLYGON)');
  polygonChapter('areas', 'Flächen', model.areas, 'areas', 'Keine Flächenpolygone erkannt.', 'Flächenliste', 'Flächen: Geschossflächenpolygone (R_GESCHOSSPOLYGON)');

  // ── Kennzahlen ──
  chapter('kpi', 'Kennzahlen SIA 416', title => {
    const continuation = 'Kennzahlen (Fortsetzung)';
    let ky = sectionSubtitle('Gebäudeflächen', contentTop + 2);
    table({ title: continuation, startY: ky, head: kpiHead, body: model.kpi.areas.map(areaRow), columnStyles: kpiColumns });
    tableCaption('Gebäudeflächen nach SIA 416');
    ky = ensureSpace(doc.lastAutoTable.finalY + 10, 25, continuation);
    ky = sectionSubtitle('Gebäudevolumen', ky);
    table({ title: continuation, startY: ky, head: [['Kürzel', 'Bezeichnung', 'Volumen (m³)', '% GV']], body: model.kpi.volume.map(r => [r.abbr, r.label, DASH, DASH]), columnStyles: kpiColumns });
    tableCaption('Gebäudevolumen nach SIA 416');
    ky = ensureSpace(doc.lastAutoTable.finalY + 10, 80, continuation);
    ky = sectionSubtitle('Flächen DIN 277', ky);
    table({ title: continuation, startY: ky, head: kpiHead, body: model.kpi.din277.map(areaRow), columnStyles: kpiColumns });
    tableCaption('Flächen nach DIN 277 Nutzungsgruppen');
    ky = ensureSpace(doc.lastAutoTable.finalY + 10, 45, continuation);
    ky = sectionSubtitle('Wirtschaftlichkeitskennzahlen', ky);
    table({ title: continuation, startY: ky, head: [['Kennzahl', 'Bezeichnung', 'Wert']], body: model.kpi.economy.map(r => [r.abbr, r.label, formatRatio(r.ratio)]), columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 }, 2: { halign: 'right', cellWidth: 22 } } });
    tableCaption('Wirtschaftlichkeitskennzahlen');
    if (model.entities.length > 0) {
      ky = ensureSpace(doc.lastAutoTable.finalY + 10, 50, continuation);
      ky = sectionSubtitle('Objektübersicht', ky);
      table({ title: continuation, startY: ky, head: [['Typ', 'Anzahl', 'Layer']], body: model.entities.map(e => [e.type, String(e.count), e.layers]), columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 20, halign: 'right' } } });
      tableCaption('Objektübersicht: CAD-Entitäten nach Typ');
    }
  });

  // ── Table of contents ──
  doc.setPage(tocPage);
  pageHeader('Inhalt');
  const toc = [
    ['1', 'Prüfregeln', `${summary.totalRules} Prüfregeln geprüft`, chapterPages.rules],
    ['2', 'Fehlermeldungen', `${model.issues.length} Prüfergebnisse`, chapterPages.errors],
    ['3', 'Layer', `${model.layers.length} Layer erkannt`, chapterPages.layers],
    ['4', 'Räume', `${model.rooms.length} Räume mit Flächen`, chapterPages.rooms],
    ['5', 'Flächen', `${model.areas.length} Flächenpolygone`, chapterPages.areas],
    ['6', 'Kennzahlen', 'SIA 416', chapterPages.kpi],
  ];
  setFont(8, theme.muted);
  doc.text('Seite', right - 2, 29, { align: 'right' });
  let ty = 34;
  for (const [num, label, desc, page] of toc) {
    setFont(11, theme.primary, 'bold');
    doc.text(num, marginX + 2, ty);
    doc.textWithLink(label, marginX + 12, ty, { pageNumber: page });
    setFont(8, theme.muted); doc.text(desc, marginX + 12, ty + 5);
    const dots = '·'.repeat(40);
    doc.setTextColor(...theme.border); doc.text(dots, right - 10 - doc.getTextWidth(dots), ty);
    setFont(11, theme.text, 'bold'); doc.text(String(page), right - 2, ty, { align: 'right' });
    doc.setDrawColor(...theme.zebra); doc.line(marginX, ty + 8, right, ty + 8);
    ty += 14;
  }
  pageFooter();
  return doc;
}

/** Builds and downloads the report (`save: false` only returns the PDF as a Blob, for tests). */
export async function downloadPlanReport(model, { capture, save = true } = {}) {
  const doc = await buildPlanReport(model, { capture });
  if (save) doc.save(`${model.baseName}_Pruefbericht.pdf`);
  return doc.output('blob');
}
