// =============================================
// plan-check engine · entry point: checkDwg(buffer) parses a DWG, prepares the drawing, runs the
// 40 rules of the CAD-Richtlinie BBL V1.0 and returns both the in-memory drawing (for the viewer) and a
// compact, serialisable result (for the application state, sessionStorage and data/plans.json).
//
// Origin: https://github.com/bbl-dres/plan-check (MIT), see LICENSE and THIRD_PARTY.md in this folder.
// The DWG parser is LibreDWG compiled to WebAssembly (GPL-3.0) in js/vendor/libredwg-web/.
// =============================================

import { parseDwg, prepareDrawing, loadLibreDwg, MAX_FILE_SIZE } from './dwg.js';
import { validate, layerStatus } from './validate.js';
import { computeKpis } from './kpi.js';
import { RULES, splitRulesByOutcome } from './rules.js';

export { RULES, CATEGORIES, splitRulesByOutcome, summarizeValidation } from './rules.js';
export { loadLibreDwg, MAX_FILE_SIZE } from './dwg.js';
export { computeKpis, buildKpiSections, formatArea, formatShare, formatRatio, SIA_LABELS } from './kpi.js';
export { fmtNum, fmtArea, fmtSize } from './util.js';

const MAX_HANDLES = 400;   // handles kept per aggregated issue (enough to locate; keeps the state small)

/** Compact result without geometry: everything the pages show, safe for JSON. */
export function toResult(file, parsed, drawing, validation) {
    const { rooms, areas, issues, summary } = validation;
    const kpi = computeKpis(rooms, areas);
    return {
        file: { name: file.name, size: file.size ?? null },
        version: parsed.version, elapsed: parsed.elapsed,
        entityCount: drawing.entityCount, layerCount: drawing.layerCount,
        unit: drawing.insunits,
        summary: { ...summary },
        issues: issues.map(i => ({
            code: i.code, severity: i.severity, category: i.category, message: i.message,
            ...(i.roomId ? { roomId: i.roomId } : {}),
            ...(i.handle ? { handle: i.handle } : {}),
            ...(i.layer ? { layer: i.layer } : {}),
            ...(i.handles ? { handles: i.handles.slice(0, MAX_HANDLES) } : {}),
        })),
        rooms: rooms.map(r => ({ id: r.id, aoid: r.aoid, area: r.area, status: r.status, handle: r.handle, duplicate: r.isDuplicate || undefined })),
        areas: areas.map(a => ({ id: a.id, aoid: a.aoid, area: a.area, status: a.status, handle: a.handle })),
        layers: drawing.layerInfo.map(l => ({ name: l.name, count: l.count, color: l.colorHex, ok: layerStatus(l.name) === 'ok' })),
        entities: drawing.entitySummary.map(e => ({ type: e.type, count: e.count })),
        kpi: { hnf: kpi.hnf, nnf: kpi.nnf, vf: kpi.vf, ff: kpi.ff, nf: kpi.nf, ngf: kpi.ngf, gf: kpi.gf, kf: kpi.kf },
    };
}

/**
 * Full check of a DWG file. buffer: ArrayBuffer; file: { name, size }; log(msg, type) optional.
 * Returns { drawing, validation, result }. Throws with a German message when the file cannot be read.
 */
export async function checkDwg(buffer, file = {}, log = () => {}) {
    if (!/\.dwg$/i.test(file.name || '')) throw new Error('Nur .dwg-Dateien.');
    if (buffer.byteLength > MAX_FILE_SIZE) throw new Error('Datei zu gross (max. 50 MB).');
    const parsed = await parseDwg(buffer, file, log);
    log('Zeichnungsdaten werden aufbereitet...');
    const drawing = prepareDrawing(parsed.entities, parsed.layers, parsed.db, log);
    const validation = validate(drawing, log);
    const result = toResult({ name: file.name, size: file.size ?? buffer.byteLength }, parsed, drawing, validation);
    log(`Score: ${result.summary.passedRules}/${result.summary.totalRules} Prüfregeln bestanden (${result.summary.score}%)`, result.summary.scoreClass);
    return { drawing, validation, result };
}

/** Rule rows for a result: failed first (errors, warnings), then passed; each { code, severity, text, count, status }. */
export function ruleRows(result) {
    const { failed, passed } = splitRulesByOutcome(result ? result.issues : []);
    const row = ({ rule, count }) => ({
        code: rule.code, severity: rule.severity, text: rule.text, category: rule.code.split('_')[0], count,
        status: count === 0 ? 'pass' : rule.severity === 'error' ? 'fail' : 'warn',
    });
    return { failed: failed.map(row), passed: passed.map(row), total: RULES.length };
}
