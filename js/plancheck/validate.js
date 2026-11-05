// =============================================
// plan-check engine · room/area extraction and the rule engine (CAD-Richtlinie BBL V1.0)
// Ported from plan-check js/validation.js without the side-panel UI: validate(drawing) is pure.
// =============================================

import {
    polygonAreaM2, pointInPolygonTolerant, hasSelfIntersection, canonicalPolygonHash, visualCenter,
    boundsOfPoints, boundsContain, createBounds, mergeBounds, isFiniteBounds,
} from './geometry.js';
import { RULES, createIssue, summarizeValidation } from './rules.js';
import { INSUNITS_MM, UNIT_NAMES } from './dwg.js';

// Layer names from CAD-Richtlinie BBL V1.0 (domain identifiers, German by definition)
export const ROOM_LAYER = 'R_RAUMPOLYGON';
export const DEDUCTION_LAYER = 'R_RAUMPOLYGON-ABZUG';
export const AOID_LAYER = 'R_AOID';
export const AREA_LAYER = 'R_GESCHOSSPOLYGON';
export const FRAME_LAYER = 'V_PLANLAYOUT';
export const HATCH_LAYER = 'A_SCHRAFFUR';
export const DIMENSION_LAYER = 'V_BEMASSUNG';

const CAFM_LAYERS = {
    required: [ROOM_LAYER, AOID_LAYER, AREA_LAYER, 'A_ARCHITEKTUR', HATCH_LAYER, DIMENSION_LAYER, FRAME_LAYER],
    optional: [DEDUCTION_LAYER, 'A_ELEKTRO', 'A_HEIZUNG-KUEHLUNG', 'A_LUEFTUNG', 'A_SANITAER', 'V_ACHSEN', 'V_REFERENZPUNKT', 'V_TEXT'],
};
export const CAFM_LAYER_SET = new Set([...CAFM_LAYERS.required, ...CAFM_LAYERS.optional]);

/** AutoCAD defaults plus the layer the checking authority adds itself (R_RAUMSTEMPEL). */
export const SYSTEM_LAYERS = new Set(['0', 'Defpoints', 'R_RAUMSTEMPEL']);

/** Layers on which text entities are allowed. */
export const TEXT_LAYERS = new Set([FRAME_LAYER, 'V_ACHSEN', 'V_TEXT', AOID_LAYER]);

/** 'ok' for CAFM and system layers, 'unknown' for everything else. */
export const layerStatus = name => (CAFM_LAYER_SET.has(name) || SYSTEM_LAYERS.has(name) ? 'ok' : 'unknown');

const MIN_ROOM_AREA_M2 = 0.25;
const BULGE_EPSILON = 1e-6;
const FRAME_TOLERANCE_MM = 100;
const BOUNDARY_TOLERANCE_MM = 0.5;   // AOID base points snapped onto a room edge still count as inside
const SAMPLE_SIZE = 3;               // how many examples an aggregated message lists
const AOID_PATTERN = /^\d{4}\.[A-Za-z0-9]{1,4}\.\d{2}\.\d{3}$/;   // WWWW.GG.EE.RRR
const PARKING_AOID_PATTERN = /^\d{4}\.\d+\.\d{3}$/;
const POLYLINE_TYPES = new Set(['LWPOLYLINE', 'POLYLINE2D']);
const FORBIDDEN_ENTITY_TYPES = new Set(['MLINE', 'ELLIPSE', 'SPLINE', 'OLE2FRAME', 'OLEFRAME']);
const TEXT_WIDTH_PER_CHAR = 0.6;

const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const MSG = {
    polyNotClosed: 'Raumpolygon ist nicht geschlossen',
    polyNotClosedFlag: 'Raumpolygon: Endpunkte fallen zusammen, aber das Attribut «geschlossen» ist nicht gesetzt',
    polyHasArcs: 'Raumpolygon enthält Bogensegmente',
    polyTooFewVerts: 'Polygon hat weniger als 3 Eckpunkte',
    polyTooSmall: a => `Raumfläche sehr klein (${a} m² < 0.25 m²)`,
    polySelfIntersect: 'Raumpolygon hat Selbstüberschneidung',
    polyDuplicate: 'Mögliches doppeltes Polygon (identische Geometrie)',
    polyNotLwpolyline: (layer, type) => `Element auf ${layer} ist keine LWPOLYLINE (Typ: ${type})`,
    polyNone: 'Kein Raumpolygon auf R_RAUMPOLYGON vorhanden',
    gpolyNone: 'Kein Geschosspolygon vorhanden',
    gpolyNotClosed: 'Geschosspolygon ist nicht geschlossen',
    gpolyNotClosedFlag: 'Geschosspolygon: Endpunkte fallen zusammen, aber das Attribut «geschlossen» ist nicht gesetzt',
    gpolyHasArcs: 'Geschosspolygon enthält Bogensegmente',
    gpolyDuplicate: 'Mögliches doppeltes Geschosspolygon',
    gpolyNotLwpolyline: (layer, type) => `Element auf ${layer} ist keine LWPOLYLINE (Typ: ${type})`,
};

const POLYGON_RULE_SPECS = {
    room: { layer: ROOM_LAYER, prefix: 'poly', none: 'POLY_008', wrongType: 'POLY_006', notClosed: 'POLY_001', arcs: 'POLY_002', tooFewVertices: 'POLY_003', tooSmall: 'POLY_004', selfIntersect: 'POLY_007', duplicate: 'POLY_005' },
    area: { layer: AREA_LAYER, prefix: 'gpoly', none: 'GPOLY_004', wrongType: 'GPOLY_003', notClosed: 'GPOLY_001', arcs: 'GPOLY_002', duplicate: 'GPOLY_005' },
};

// =============================================
// Extraction
// =============================================

/** Groups render items by layer and kind so the rules do not rescan the whole list. */
export function indexRenderList(renderList) {
    const byLayer = new Map();
    const byKind = new Map();
    for (const item of renderList) {
        (byLayer.get(item.layer) || byLayer.set(item.layer, []).get(item.layer)).push(item);
        (byKind.get(item.kind) || byKind.set(item.kind, []).get(item.kind)).push(item);
    }
    return {
        byLayer, byKind,
        onLayer: layer => byLayer.get(layer) || [],
        ofKind: kind => byKind.get(kind) || [],
    };
}

function closedPolylinesOn(index, layer) {
    return index.onLayer(layer).filter(i => i.kind === 'poly' && POLYLINE_TYPES.has(i.entityType) && i.closed);
}

const round2 = v => Math.round(v * 100) / 100;

function polygonEntry(item, id, unitScale) {
    const rawArea = polygonAreaM2(item.verts, unitScale);
    return {
        id, handle: item.handle, layer: item.layer, entityType: item.entityType,
        vertices: item.verts, bounds: boundsOfPoints(item.verts), labelPoint: visualCenter(item.verts),
        rawArea, area: round2(rawArea), status: 'ok',
    };
}

/** Smallest polygon entry containing the point (handles nested rooms). */
function smallestContaining(entries, x, y, eps) {
    let best = null;
    for (const entry of entries) {
        if ((!best || entry.rawArea < best.rawArea) && pointInPolygonTolerant(x, y, entry.vertices, entry.bounds, eps)) best = entry;
    }
    return best;
}

/** Approximate centre of a text item from its anchor, alignment and rotation. */
function textCenter(item) {
    const width = item.text.length * item.height * TEXT_WIDTH_PER_CHAR * (item.widthFactor || 1);
    const along = item.halign === 'center' ? 0 : item.halign === 'right' ? -width / 2 : width / 2;
    const rot = item.rotation || 0;
    return { x: item.x + Math.cos(rot) * along, y: item.y + Math.sin(rot) * along };
}

function pickAoidLabel(matches) {
    const valid = matches.filter(m => AOID_PATTERN.test(m.text) || PARKING_AOID_PATTERN.test(m.text));
    const pool = valid.length ? valid : matches;
    return pool.reduce((best, m) => (!best || m.text.length < best.length ? m.text : best), '');
}

/** Rooms, floor areas and deductions from the polyline layers, with AOID texts assigned to rooms. */
export function extractPolygons(index, unitScale) {
    const eps = BOUNDARY_TOLERANCE_MM / unitScale;
    const rooms = closedPolylinesOn(index, ROOM_LAYER).map((item, i) =>
        ({ ...polygonEntry(item, i + 1, unitScale), aoid: '', aoidText: '', aoidMatches: [], siaCategory: 'HNF', deductionArea: 0, isDuplicate: false }));
    const areas = closedPolylinesOn(index, AREA_LAYER).map((item, i) => ({ ...polygonEntry(item, i + 1, unitScale), aoid: '' }));
    const deductions = closedPolylinesOn(index, DEDUCTION_LAYER).map((item, i) => polygonEntry(item, i + 1, unitScale));

    // Identical room polygons count once towards the areas
    const seen = new Map();
    for (const room of rooms) {
        const hash = canonicalPolygonHash(room.vertices);
        if (seen.has(hash)) { room.isDuplicate = true; room.duplicateOf = seen.get(hash).handle; }
        else seen.set(hash, room);
    }

    // Deduction polygons reduce the area of the room they lie in
    let appliedDeductions = 0;
    for (const deduction of deductions) {
        const host = smallestContaining(rooms, deduction.labelPoint.x, deduction.labelPoint.y, eps);
        if (!host) continue;
        host.deductionArea += deduction.rawArea;
        host.area = round2(Math.max(0, host.rawArea - host.deductionArea));   // overlapping or oversized deductions cannot make a room negative
        appliedDeductions++;
    }

    // AOID texts: first by insertion point, then by text centre for texts whose base point sits outside
    const texts = index.onLayer(AOID_LAYER).filter(i => i.kind === 'text');
    const outsideTexts = [];
    const unmatched = [];
    for (const txt of texts) {
        const room = smallestContaining(rooms, txt.baseX, txt.baseY, eps);
        if (room) room.aoidMatches.push({ handle: txt.handle, text: txt.text.trim(), basePointInside: true });
        else unmatched.push(txt);
    }
    for (const txt of unmatched) {
        const c = textCenter(txt);
        const room = smallestContaining(rooms, c.x, c.y, eps);
        if (room) room.aoidMatches.push({ handle: txt.handle, text: txt.text.trim(), basePointInside: false });
        else outsideTexts.push(txt);
    }
    for (const room of rooms) {
        room.aoidText = pickAoidLabel(room.aoidMatches);
        room.aoid = room.aoidText || `R${room.id}`;
    }

    // Floor polygons are labelled with the shortest text of any layer inside them
    const allTexts = index.ofKind('text');
    for (const area of areas) {
        let label = '';
        for (const txt of allTexts) {
            if (pointInPolygonTolerant(txt.baseX, txt.baseY, area.vertices, area.bounds, eps) && (!label || txt.text.length < label.length)) label = txt.text.trim();
        }
        area.aoid = label || area.layer;
    }

    return { rooms, areas, deductions, appliedDeductions, outsideTexts };
}

// =============================================
// Rules
// =============================================

function runLayerRules(drawing) {
    const issues = [];
    const names = new Set(drawing.layerInfo.map(l => l.name));
    const byLower = new Map(drawing.layerInfo.map(l => [l.name.toLowerCase(), l.name]));
    const requiredNames = new Set(RULES.filter(r => r.layer).map(r => r.layer));

    for (const rule of RULES) {
        if (!rule.layer || names.has(rule.layer)) continue;
        const similar = byLower.get(rule.layer.toLowerCase());
        issues.push(similar
            ? createIssue(rule.code, `Layer ${rule.layer} fehlt; vorhanden ist «${similar}» (Gross-/Kleinschreibung prüfen)`, { layer: similar })
            : createIssue(rule.code, `Pflicht-Layer fehlt: ${rule.layer} nicht vorhanden`, { layer: rule.layer }));
    }

    const cafmByLower = new Map([...CAFM_LAYER_SET].map(n => [n.toLowerCase(), n]));
    for (const l of drawing.layerInfo) {
        if (CAFM_LAYER_SET.has(l.name) || SYSTEM_LAYERS.has(l.name)) continue;
        const canonical = cafmByLower.get(l.name.toLowerCase());
        if (canonical && requiredNames.has(canonical)) continue; // already reported by the LAYER_00x rule
        issues.push(canonical
            ? createIssue('LAYER_008', `Layer ${canonical} fehlt; vorhanden ist «${l.name}» (Gross-/Kleinschreibung prüfen)`, { layer: l.name })
            : createIssue('LAYER_008', `Unbekannter Layer: ${l.name} ist nicht in der zulässigen Layerliste`, { layer: l.name }));
    }
    return issues;
}

/** Shared checks for the room and floor polygon layers. */
function runPolygonLayerRules(index, spec, unitScale) {
    const issues = [];
    const items = index.onLayer(spec.layer);
    const polys = items.filter(i => i.kind === 'poly');
    const msg = suffix => MSG[spec.prefix + suffix];

    if (polys.length === 0) {
        issues.push(createIssue(spec.none, msg('None')));
        return issues;
    }
    const wrongSeen = new Set();   // block content is one render item per reference: report each entity once
    for (const item of items) {
        if (item.entityType !== 'LWPOLYLINE' && !wrongSeen.has(item.handle)) {
            wrongSeen.add(item.handle);
            issues.push(createIssue(spec.wrongType, msg('NotLwpolyline')(spec.layer, item.entityType), { handle: item.handle }));
        }
    }
    for (const poly of polys) {
        const ref = { handle: poly.handle };
        if (!poly.closed) issues.push(createIssue(spec.notClosed, msg('NotClosed'), ref));
        else if (poly.implicitlyClosed) issues.push(createIssue(spec.notClosed, msg('NotClosedFlag'), ref));
        if (poly.verts.some(v => Math.abs(v.bulge || 0) > BULGE_EPSILON)) issues.push(createIssue(spec.arcs, msg('HasArcs'), ref));
        if (spec.tooFewVertices && poly.verts.length < 3) issues.push(createIssue(spec.tooFewVertices, msg('TooFewVerts'), ref));
        if (spec.tooSmall && poly.closed && poly.verts.length >= 3) {
            const area = polygonAreaM2(poly.verts, unitScale);
            if (area < MIN_ROOM_AREA_M2) issues.push(createIssue(spec.tooSmall, msg('TooSmall')(area.toFixed(2)), ref));
        }
        if (spec.selfIntersect && poly.closed && poly.verts.length >= 4 && hasSelfIntersection(poly.verts)) {
            issues.push(createIssue(spec.selfIntersect, msg('SelfIntersect'), ref));
        }
    }
    const seen = new Set();
    for (const poly of polys) {
        const hash = canonicalPolygonHash(poly.verts);
        if (seen.has(hash)) issues.push(createIssue(spec.duplicate, msg('Duplicate'), { handle: poly.handle }));
        else seen.add(hash);
    }
    return issues;
}

function runAoidRules(rooms, outsideTexts) {
    const issues = [];
    const roomRef = room => ({ roomId: room.id, handle: room.handle });

    for (const room of rooms) {
        if (room.isDuplicate) continue;   // a duplicated polygon is reported by POLY_005; its AOID text sits in the original
        if (room.aoidMatches.length === 0) issues.push(createIssue('AOID_001', `Raum ${room.aoid}: kein AOID-Text auf R_AOID innerhalb des Polygons`, roomRef(room)));
        if (room.aoidMatches.length > 1) issues.push(createIssue('AOID_004', `Raum ${room.aoid}: ${room.aoidMatches.length} Texte auf R_AOID innerhalb desselben Polygons`, roomRef(room)));
        if (room.aoidText && !AOID_PATTERN.test(room.aoidText) && !PARKING_AOID_PATTERN.test(room.aoidText)) {
            issues.push(createIssue('AOID_003', `AOID-Format ungültig: «${room.aoidText}» (erwartet: WWWW.GG.EE.RRR)`, roomRef(room)));
        }
        for (const match of room.aoidMatches) {
            if (!match.basePointInside) issues.push(createIssue('AOID_006', `AOID «${match.text}»: Basispunkt (Einfügepunkt) liegt ausserhalb des Raumpolygons`, roomRef(room)));
        }
    }

    // Duplicate AOIDs across distinct rooms (a duplicated polygon is reported by POLY_005 instead)
    const roomsByAoid = new Map();
    for (const room of rooms) {
        if (room.aoidText && !room.isDuplicate) (roomsByAoid.get(room.aoidText) || roomsByAoid.set(room.aoidText, []).get(room.aoidText)).push(room);
    }
    for (const [aoid, list] of roomsByAoid) {
        if (list.length < 2) continue;
        for (const room of list) issues.push(createIssue('AOID_002', `AOID «${aoid}» ist nicht eindeutig (${list.length}× vorhanden)`, roomRef(room)));
    }

    for (const txt of outsideTexts) {
        issues.push(createIssue('AOID_005', `AOID-Text «${txt.text.trim()}» auf R_AOID liegt ausserhalb aller Raumpolygone`, { handle: txt.handle }));
    }
    return issues;
}

/** The plan frame: the largest closed polyline on V_PLANLAYOUT, else the extent of everything on that layer. */
function planFrame(index, unitScale) {
    const items = index.onLayer(FRAME_LAYER);
    let frame = null, maxArea = 0;
    for (const item of items) {
        if (item.kind !== 'poly' || !item.closed || item.verts.length < 4) continue;
        const area = polygonAreaM2(item.verts, unitScale);
        if (area > maxArea) { maxArea = area; frame = item.bounds; }
    }
    if (frame) return frame;
    if (items.length === 0) return null;
    const extent = createBounds();
    for (const item of items) mergeBounds(extent, item.bounds);
    return isFiniteBounds(extent) ? extent : null;
}

function runGeomRules(drawing, index) {
    const issues = [];
    if (drawing.insunits !== null && drawing.insunits !== INSUNITS_MM) {
        issues.push(createIssue('GEOM_001', `Zeichnungseinheit ist nicht Millimeter (aktuell: ${UNIT_NAMES[drawing.insunits] ?? drawing.insunits})`));
    }
    if (drawing.nonZeroZEntities.length > 0) {
        const sample = drawing.nonZeroZEntities.slice(0, SAMPLE_SIZE).map(e => `${e.type}@${e.layer}`).join(', ');
        issues.push(createIssue('GEOM_002', `${pl(drawing.nonZeroZEntities.length, 'Element', 'Elemente')} mit Z-Koordinate ungleich 0 (z. B. ${sample})`, { handles: drawing.nonZeroZEntities.map(e => e.handle) }));
    }
    const forbidden = new Map();   // top-level entities plus the content of inserted blocks (drawn, so checked)
    for (const entry of drawing.entitySummary) if (FORBIDDEN_ENTITY_TYPES.has(entry.type)) forbidden.set(entry.type, entry.count);
    const inBlocks = new Map();
    for (const item of drawing.renderList || []) if (item.inBlock && FORBIDDEN_ENTITY_TYPES.has(item.entityType)) (inBlocks.get(item.entityType) || inBlocks.set(item.entityType, new Set()).get(item.entityType)).add(item.handle);
    for (const [type, handles] of inBlocks) forbidden.set(type, (forbidden.get(type) || 0) + handles.size);
    for (const [type, count] of forbidden) issues.push(createIssue('GEOM_003', `Unzulässiger Entitätstyp: ${type} (${count}× vorhanden${inBlocks.has(type) ? `, davon ${inBlocks.get(type).size} in Blöcken` : ''})`));
    for (const xref of drawing.xrefBlocks) {
        issues.push(createIssue('GEOM_004', `Externe Referenz (XREF): «${xref.name}»`));
    }
    const frame = planFrame(index, drawing.unitScale);
    if (frame) {
        const tolerance = FRAME_TOLERANCE_MM / drawing.unitScale;
        const outside = [];
        for (const [layer, items] of index.byLayer) {
            if (!CAFM_LAYER_SET.has(layer) || layer === FRAME_LAYER) continue;
            for (const item of items) {
                const b = item.kind === 'text' ? { minX: item.x, minY: item.y, maxX: item.x, maxY: item.y } : item.bounds;   // a text counts by its anchor: its envelope is a square around the anchor regardless of alignment
                if (!boundsContain(frame, b, tolerance)) outside.push(item.handle);
            }
        }
        if (outside.length > 0) issues.push(createIssue('GEOM_005', `${pl(outside.length, 'Element liegt', 'Elemente liegen')} ausserhalb des Planrahmens`, { handles: outside }));
    }
    return issues;
}

function groupHandles(items, keyOf) {
    const groups = new Map();
    for (const item of items) {
        const key = keyOf(item);
        if (key == null) continue;
        (groups.get(key) || groups.set(key, []).get(key)).push(item.handle);
    }
    return groups;
}

function runTextRules(index) {
    const issues = [];
    // Dimension text and block content are not drafted text elements
    const texts = index.ofKind('text').filter(i => i.entityType !== 'DIMENSION' && !i.inBlock);
    for (const [layer, handles] of groupHandles(texts, i => (TEXT_LAYERS.has(i.layer) ? null : i.layer))) {
        issues.push(createIssue('TEXT_001', `${pl(handles.length, 'Textelement', 'Textelemente')} auf unzulässigem Layer «${layer}»`, { layer, handles }));
    }
    const wrongFont = texts.filter(i => i.layer !== FRAME_LAYER && i.fontName && !/arial/i.test(i.fontName));
    for (const [font, handles] of groupHandles(wrongFont, i => i.fontName)) {
        issues.push(createIssue('TEXT_002', `${pl(handles.length, 'Text verwendet', 'Texte verwenden')} Schriftart «${font}» statt ARIAL`, { handles }));
    }
    return issues;
}

function runStyleRules(index) {
    const issues = [];
    const widthSeen = new Set();
    const widthPolys = index.ofKind('poly').filter(i => i.width > 0 && i.handle && !widthSeen.has(i.handle) && widthSeen.add(i.handle));   // one entry per entity, not per block reference
    if (widthPolys.length > 0) {
        const layers = [...new Set(widthPolys.map(p => p.layer))].slice(0, SAMPLE_SIZE).join(', ');
        issues.push(createIssue('STYLE_001', `${pl(widthPolys.length, 'Polylinie', 'Polylinien')} mit Breite ungleich 0 mm (Layer: ${layers})`, { handles: widthPolys.map(p => p.handle) }));
    }
    const notByLayer = [], colorSeen = new Set();
    for (const [layer, items] of index.byLayer) {
        if (CAFM_LAYER_SET.has(layer)) for (const item of items) if (!item.byLayer && !colorSeen.has(item.handle)) { colorSeen.add(item.handle); notByLayer.push(item); }
    }
    if (notByLayer.length > 0) {
        const layers = [...new Set(notByLayer.map(p => p.layer))].slice(0, SAMPLE_SIZE).join(', ');
        issues.push(createIssue('STYLE_002', `${pl(notByLayer.length, 'Element', 'Elemente')} mit Farbe nicht VONLAYER (Layer: ${layers})`, { handles: notByLayer.map(p => p.handle) }));
    }
    return issues;
}

function runLayoutRules(drawing, index) {
    const issues = [];
    if (drawing.paperSpaceEntityCount > 0) {
        issues.push(createIssue('LAYOUT_001', `${pl(drawing.paperSpaceLayouts.length || 1, 'Layout-Tab', 'Layout-Tabs')} (Paper Space) vorhanden: ${drawing.paperSpaceLayouts.join(', ') || '-'} (${drawing.paperSpaceEntityCount} Objekte)`));
    }
    if (!planFrame(index, drawing.unitScale)) issues.push(createIssue('LAYOUT_002', 'Kein Planrahmen auf V_PLANLAYOUT erkannt'));
    return issues;
}

function runDimensionRules(drawing) {
    return drawing.dimensionInfo.some(d => d.layer === DIMENSION_LAYER) ? [] : [createIssue('DIM_001', 'Keine Bemassungen auf V_BEMASSUNG vorhanden')];
}

function runHatchRules(index) {
    const nonSolid = index.onLayer(HATCH_LAYER).filter(i => i.kind === 'hatch' && !i.solid);
    if (nonSolid.length === 0) return [];
    const patterns = [...new Set(nonSolid.map(h => h.patternName || '?'))].join(', ');
    return [createIssue('HATCH_001', `${pl(nonSolid.length, 'Schraffur', 'Schraffuren')} auf A_SCHRAFFUR nicht vom Typ SOLID (${patterns})`, { handles: nonSolid.map(h => h.handle) })];
}

function runAllRules(drawing, index, rooms, outsideTexts) {
    return [
        ...runLayerRules(drawing),
        ...runPolygonLayerRules(index, POLYGON_RULE_SPECS.room, drawing.unitScale),
        ...runPolygonLayerRules(index, POLYGON_RULE_SPECS.area, drawing.unitScale),
        ...runAoidRules(rooms, outsideTexts),
        ...runGeomRules(drawing, index),
        ...runTextRules(index),
        ...runStyleRules(index),
        ...runLayoutRules(drawing, index),
        ...runDimensionRules(drawing),
        ...runHatchRules(index),
    ];
}

/** Sets room/area status from the issues that reference them (by room id or entity handle). */
function applyStatuses(issues, rooms, areas) {
    const roomsById = new Map(rooms.map(r => [r.id, r]));
    const byHandle = new Map([...rooms, ...areas].map(e => [e.handle, e]));
    const worsen = (entry, severity) => {
        if (!entry) return;
        if (severity === 'error') entry.status = 'error';
        else if (entry.status === 'ok') entry.status = 'warning';
    };
    for (const issue of issues) {
        if (issue.roomId) worsen(roomsById.get(issue.roomId), issue.severity);
        else if (issue.handle && (issue.category === 'POLY' || issue.category === 'GPOLY')) worsen(byHandle.get(issue.handle), issue.severity);
    }
}

// =============================================
// Orchestration
// =============================================

/**
 * Runs extraction and all 40 rules on a prepared drawing.
 * Returns { rooms, areas, deductions, appliedDeductions, issues, summary }.
 */
export function validate(drawing, log = () => {}) {
    const index = indexRenderList(drawing.renderList);
    log('Räume und Flächen werden extrahiert…');
    const { rooms, areas, deductions, appliedDeductions, outsideTexts } = extractPolygons(index, drawing.unitScale);
    log(`${pl(rooms.length, 'Raum', 'Räume')} auf ${ROOM_LAYER}, ${pl(areas.length, 'Geschossfläche', 'Geschossflächen')} erkannt`, 'success');
    if (deductions.length > 0) log(`${appliedDeductions} von ${pl(deductions.length, 'Abzugspolygon', 'Abzugspolygonen')} auf ${DEDUCTION_LAYER} von den Raumflächen abgezogen`);

    log(`${RULES.length} Prüfregeln werden ausgeführt…`);
    const issues = runAllRules(drawing, index, rooms, outsideTexts);
    applyStatuses(issues, rooms, areas);
    const summary = summarizeValidation(issues);
    if (summary.errorCount === 0 && summary.warningCount === 0) log('Validierung abgeschlossen: keine Fehler oder Warnungen', 'success');
    else log(`Validierung abgeschlossen: ${summary.errorCount} Fehler, ${summary.warningCount} Warnungen in ${pl(summary.firedRules, 'Prüfregel', 'Prüfregeln')}`, summary.errorCount > 0 ? 'error' : 'warn');
    return { rooms, areas, deductions, appliedDeductions, issues, summary, index };
}
