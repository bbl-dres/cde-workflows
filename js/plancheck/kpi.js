// =============================================
// plan-check engine · SIA 416 / DIN 277 key figures (ported from plan-check js/kpi.js, German labels embedded)
// =============================================

import { fmtNum } from './util.js';

export const DASH = '—';

/** DIN 277 usage groups (areas per group come from the room stamp, which the prototype does not read yet). */
export const DIN277_GROUPS = [
    ['HNF 1', 'Wohnen und Aufenthalt'], ['HNF 2', 'Büroarbeit'], ['HNF 3', 'Produktion'], ['HNF 4', 'Lagern, Verteilen, Verkaufen'], ['HNF 5', 'Bildung, Unterricht, Kultur'],
    ['HNF 6', 'Heilen, Pflegen'], ['NNF 7', 'Sonstige Nutzungen'], ['FF 8', 'Betriebstechnische Anlagen'], ['VF 9', 'Verkehrserschliessung und -sicherung'], ['BUF 10', 'Verschiedene Nutzungen'],
];

export const SIA_LABELS = {
    GF: 'Geschossfläche', KF: 'Konstruktionsfläche', NGF: 'Nettogeschossfläche', NF: 'Nutzfläche',
    HNF: 'Hauptnutzfläche', NNF: 'Nebennutzfläche', VF: 'Verkehrsfläche', FF: 'Funktionsfläche', GV: 'Gebäudevolumen',
    EBF: 'Energiebezugsfläche (SIA 416/1)',   // GF inside the thermal envelope; the caller sets k.ebf (heated floor → GF, unheated → 0)
};

/** SIA 416 totals in m². gf/kf are null without floor polygons; hasRooms guards the room-based figures. */
export function computeKpis(roomData, areaData) {
    const hasRooms = roomData.length > 0;
    const hasAreaPolys = areaData.length > 0;
    const catSum = { HNF: 0, NNF: 0, VF: 0, FF: 0 };
    for (const r of roomData) {
        if (r.isDuplicate) continue;
        const cat = r.siaCategory in catSum ? r.siaCategory : 'HNF';
        catSum[cat] += r.area;
    }
    const { HNF: hnf, NNF: nnf, VF: vf, FF: ff } = catSum;
    const nf = hnf + nnf;
    const ngf = nf + vf + ff;
    const gf = hasAreaPolys ? areaData.reduce((s, a) => s + a.area, 0) : null;
    const kf = (gf !== null && hasRooms) ? gf - ngf : null;
    const r2 = v => (v == null ? null : Math.round(v * 100) / 100);
    return { hnf: r2(hnf), nnf: r2(nnf), vf: r2(vf), ff: r2(ff), nf: r2(nf), ngf: r2(ngf), gf: r2(gf), kf: r2(kf), hasRooms, hasAreaPolys };
}

/** Area rows { abbr, label, value, total } in m² (null = not available) plus economy ratios. */
export function buildKpiSections(k) {
    const ifRooms = v => (k.hasRooms ? v : null);
    const areaRow = (abbr, value) => ({ abbr, label: SIA_LABELS[abbr], value, total: k.gf });
    return {
        areas: [
            areaRow('GF', k.gf), areaRow('EBF', k.ebf ?? null), areaRow('KF', k.kf), areaRow('NGF', ifRooms(k.ngf)), areaRow('NF', ifRooms(k.nf)),
            areaRow('HNF', ifRooms(k.hnf)), areaRow('NNF', ifRooms(k.nnf)), areaRow('VF', ifRooms(k.vf)), areaRow('FF', ifRooms(k.ff)),
        ],
        volume: [{ abbr: 'GV', label: SIA_LABELS.GV, value: null, total: null }],
        din277: DIN277_GROUPS.map(([abbr, label]) => ({ abbr, label, value: (k.din277 || {})[abbr] ?? null, total: k.gf })),
        economy: [
            { abbr: 'NGF / GF', label: 'Nettogeschossfläche / Geschossfläche', ratio: (k.gf && k.hasRooms) ? k.ngf / k.gf : null },
            { abbr: 'KF / GF', label: 'Konstruktionsfläche / Geschossfläche', ratio: (k.gf && k.kf != null) ? k.kf / k.gf : null },
            { abbr: 'NF / NGF', label: 'Nutzfläche / Nettogeschossfläche', ratio: (k.hasRooms && k.ngf > 0) ? k.nf / k.ngf : null },
            { abbr: 'HNF / NGF', label: 'Hauptnutzfläche / Nettogeschossfläche', ratio: (k.hasRooms && k.ngf > 0) ? k.hnf / k.ngf : null },
        ],
    };
}

/** "517.1 m²" or the dash placeholder for null/zero. */
export function formatArea(v) {
    if (v == null || v === 0) return DASH;
    return fmtNum(v, Math.abs(v) >= 100 ? 0 : 1) + ' m²';
}

/** "42%" or the dash placeholder. */
export function formatShare(value, total) {
    if (value == null || value === 0 || total == null || total <= 0) return DASH;
    return Math.round((value / total) * 100) + ' %';
}

export function formatRatio(ratio) {
    return ratio == null ? DASH : ratio.toFixed(2);
}

/** Objektübersicht: entity type, count and the first layers it appears on. */
export function buildEntityRows(entities) {
    return (entities || []).map(e => ({ type: e.type, count: e.count, layers: (e.layers || []).slice(0, 3).join(', ') + ((e.layers || []).length > 3 ? ' …' : '') }));
}
