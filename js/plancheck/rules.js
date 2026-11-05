// =============================================
// plan-check engine · rule catalogue (CAD-Richtlinie BBL V1.0, 40 rules in 10 categories)
// Ported from plan-check js/rules.js; the German descriptions of locales/de.json are embedded
// because the CDE prototype has no i18n layer.
// =============================================

/** Score thresholds in percent of passed rules. */
export const SCORE_GOOD = 90;
export const SCORE_FAIR = 60;

export const CATEGORIES = {
    LAYER: 'Layerstruktur', POLY: 'Raumpolygone', GPOLY: 'Geschosspolygone', AOID: 'AOID / Raumstempel',
    GEOM: 'Geometrie', TEXT: 'Textelemente', STYLE: 'Linientypen und Farben', LAYOUT: 'Planlayout',
    DIM: 'Bemassungen', HATCH: 'Schraffuren',
};

/** Every rule with its severity ('error' = Fehler, 'warning' = Warnung) and text; `layer` marks the required-layer rules. */
export const RULES = [
    { code: 'LAYER_001', severity: 'error', layer: 'R_RAUMPOLYGON', text: 'Pflicht-Layer fehlt: R_RAUMPOLYGON', ref: 'Kap. 5.2' },
    { code: 'LAYER_002', severity: 'error', layer: 'R_AOID', text: 'Pflicht-Layer fehlt: R_AOID', ref: 'Kap. 5.2' },
    { code: 'LAYER_003', severity: 'error', layer: 'R_GESCHOSSPOLYGON', text: 'Pflicht-Layer fehlt: R_GESCHOSSPOLYGON', ref: 'Kap. 5.2' },
    { code: 'LAYER_004', severity: 'warning', layer: 'A_ARCHITEKTUR', text: 'Pflicht-Layer fehlt: A_ARCHITEKTUR', ref: 'Kap. 5.2' },
    { code: 'LAYER_005', severity: 'warning', layer: 'V_PLANLAYOUT', text: 'Pflicht-Layer fehlt: V_PLANLAYOUT', ref: 'Kap. 5.2' },
    { code: 'LAYER_006', severity: 'warning', layer: 'V_BEMASSUNG', text: 'Pflicht-Layer fehlt: V_BEMASSUNG', ref: 'Kap. 5.2' },
    { code: 'LAYER_007', severity: 'warning', layer: 'A_SCHRAFFUR', text: 'Pflicht-Layer fehlt: A_SCHRAFFUR', ref: 'Kap. 5.2' },
    { code: 'LAYER_008', severity: 'warning', text: 'Unbekannter Layer vorhanden', ref: 'Kap. 5.2' },
    { code: 'POLY_001', severity: 'error', text: 'Raumpolygon ist nicht geschlossen', ref: 'Kap. 5.8' },
    { code: 'POLY_002', severity: 'error', text: 'Raumpolygon enthält Bogensegmente', ref: 'Kap. 5.8' },
    { code: 'POLY_003', severity: 'error', text: 'Polygon hat weniger als 3 Eckpunkte', ref: 'Kap. 5.8' },
    { code: 'POLY_004', severity: 'warning', text: 'Raumfläche sehr klein (< 0.25 m²)', ref: 'Kap. 5.8' },
    { code: 'POLY_005', severity: 'warning', text: 'Mögliches doppeltes Polygon', ref: 'Kap. 5.8' },
    { code: 'POLY_006', severity: 'error', text: 'Element auf R_RAUMPOLYGON ist keine LWPOLYLINE', ref: 'Kap. 5.8' },
    { code: 'POLY_007', severity: 'warning', text: 'Raumpolygon hat Selbstüberschneidung', ref: 'Kap. 5.8' },
    { code: 'POLY_008', severity: 'warning', text: 'Kein Raumpolygon vorhanden', ref: 'Kap. 5.8' },
    { code: 'GPOLY_001', severity: 'error', text: 'Geschosspolygon ist nicht geschlossen', ref: 'Kap. 5.9' },
    { code: 'GPOLY_002', severity: 'error', text: 'Geschosspolygon enthält Bogensegmente', ref: 'Kap. 5.9' },
    { code: 'GPOLY_003', severity: 'error', text: 'Element auf R_GESCHOSSPOLYGON ist keine LWPOLYLINE', ref: 'Kap. 5.9' },
    { code: 'GPOLY_004', severity: 'warning', text: 'Kein Geschosspolygon vorhanden', ref: 'Kap. 5.9' },
    { code: 'GPOLY_005', severity: 'warning', text: 'Mögliches doppeltes Geschosspolygon', ref: 'Kap. 5.9' },
    { code: 'AOID_001', severity: 'error', text: 'Raumpolygon hat keine AOID', ref: 'Kap. 5.10' },
    { code: 'AOID_002', severity: 'error', text: 'AOID ist nicht eindeutig', ref: 'Kap. 5.10' },
    { code: 'AOID_003', severity: 'warning', text: 'AOID-Format ungültig', ref: 'Kap. 2.5' },
    { code: 'AOID_004', severity: 'warning', text: 'Mehrere Texte auf R_AOID im Polygon', ref: 'Kap. 5.10' },
    { code: 'AOID_005', severity: 'warning', text: 'AOID-Text ausserhalb aller Raumpolygone', ref: 'Kap. 5.10' },
    { code: 'AOID_006', severity: 'warning', text: 'AOID-Basispunkt ausserhalb Polygon', ref: 'Kap. 5.10' },
    { code: 'GEOM_001', severity: 'error', text: 'Zeichnungseinheit ist nicht Millimeter', ref: 'Kap. 4.2' },
    { code: 'GEOM_002', severity: 'warning', text: 'Element hat Z-Koordinate ungleich 0', ref: 'Kap. 5.1' },
    { code: 'GEOM_003', severity: 'error', text: 'Unzulässiger Entitätstyp vorhanden', ref: 'Kap. 5.1' },
    { code: 'GEOM_004', severity: 'warning', text: 'Externe Referenz (XREF) vorhanden', ref: 'Kap. 4.7' },
    { code: 'GEOM_005', severity: 'warning', text: 'Element ausserhalb des Planrahmens', ref: 'Kap. 4.10' },
    { code: 'TEXT_001', severity: 'warning', text: 'Textelement auf unzulässigem Layer', ref: 'Kap. 5.5' },
    { code: 'TEXT_002', severity: 'warning', text: 'Schriftart ist nicht ARIAL', ref: 'Kap. 5.5' },
    { code: 'STYLE_001', severity: 'warning', text: 'Polylinienbreite ist nicht 0 mm', ref: 'Kap. 5.4' },
    { code: 'STYLE_002', severity: 'warning', text: 'Farbe ist nicht VONLAYER', ref: 'Kap. 5.4' },
    { code: 'LAYOUT_001', severity: 'warning', text: 'Layout-Tab (Paper Space) vorhanden', ref: 'Kap. 5.3' },
    { code: 'LAYOUT_002', severity: 'warning', text: 'Kein Planrahmen auf V_PLANLAYOUT erkannt', ref: 'Kap. 5.3' },
    { code: 'DIM_001', severity: 'warning', text: 'Keine Bemassungen auf V_BEMASSUNG', ref: 'Kap. 5.6' },
    { code: 'HATCH_001', severity: 'warning', text: 'Schraffur auf A_SCHRAFFUR ist nicht SOLID', ref: 'Kap. 5.7' },
];

export const RULES_BY_CODE = new Map(RULES.map(r => [r.code, r]));

/** Builds an issue; severity and category come from the catalogue so they cannot drift. */
export function createIssue(code, message, extra = {}) {
    const rule = RULES_BY_CODE.get(code);
    if (!rule) throw new Error(`Unbekannte Regel ${code}`);
    return { code, severity: rule.severity, category: code.split('_')[0], message, ...extra };
}

/** Counts, fired rules and the score for a list of issues. */
export function summarizeValidation(issues) {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.length - errorCount;
    const firedCodes = new Set(issues.map(i => i.code));
    const totalRules = RULES.length;
    const passedRules = totalRules - firedCodes.size;
    const score = Math.round((passedRules / totalRules) * 100);
    const scoreClass = score >= SCORE_GOOD ? 'success' : score >= SCORE_FAIR ? 'warning' : 'error';
    return { errorCount, warningCount, firedRules: firedCodes.size, totalRules, passedRules, score, scoreClass };
}

/** Rules split into failed (errors first, then warnings, then by code) and passed, each with its issue count. */
export function splitRulesByOutcome(issues) {
    const counts = {};
    for (const issue of issues) counts[issue.code] = (counts[issue.code] || 0) + 1;
    const failed = [], passed = [];
    for (const rule of RULES) {
        const count = counts[rule.code] || 0;
        (count > 0 ? failed : passed).push({ rule, count });
    }
    failed.sort((a, b) => (a.rule.severity !== b.rule.severity)
        ? (a.rule.severity === 'error' ? -1 : 1)
        : a.rule.code.localeCompare(b.rule.code));
    return { failed, passed };
}
