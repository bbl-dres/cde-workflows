// =============================================
// plan-check engine · colour and number helpers (ported from plan-check js/utils.js, DOM-free)
// =============================================

/** Swiss number format: 1234.5 → "1’234.5"; non-finite values become "-". */
export function fmtNum(v, decimals = 0) {
    if (v == null || !isFinite(v)) return '-';
    const fixed = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();
    const [intPart, decPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '’');
    return decPart !== undefined ? grouped + '.' + decPart : grouped;
}

/** "517.1 m²" */
export function fmtArea(v, decimals = 1) {
    return fmtNum(v, decimals) + ' m²';
}

export function fmtSize(bytes) {
    if (!(bytes > 0)) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

// ── Colours ──

const ACI_FIXED = {
    1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 5: '#0000FF', 6: '#FF00FF',
    7: '#FFFFFF', 8: '#414141', 9: '#808080',
    250: '#333333', 251: '#5B5B5B', 252: '#848484', 253: '#ADADAD', 254: '#D6D6D6', 255: '#FFFFFF',
};
const ACI_VALUES = [1, 0.8, 0.6, 0.5, 0.3];
const aciCache = new Map();

function hsvToHex(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return '#' + [r, g, b].map(ch => Math.round((ch + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * AutoCAD Color Index → hex. Indices 10–249 follow the standard palette
 * (24 hues × 5 brightness levels, odd indices at half saturation). 0 and 256 are ByBlock/ByLayer
 * and are resolved by the caller; they fall back to grey here.
 */
export function aciToHex(index) {
    const i = Math.abs(Number(index) || 0);
    if (ACI_FIXED[i]) return ACI_FIXED[i];
    if (i < 10 || i > 249) return '#CCCCCC';
    let hex = aciCache.get(i);
    if (!hex) {
        const hue = Math.floor((i - 10) / 10) * 15;
        const value = ACI_VALUES[Math.floor((i % 10) / 2)];
        hex = hsvToHex(hue, i % 2 === 0 ? 1 : 0.5, value);
        aciCache.set(i, hex);
    }
    return hex;
}

/** 24-bit integer 0xRRGGBB → "#RRGGBB" */
export function rgbIntToHex(rgb) {
    return '#' + (rgb & 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
}

/** "#RRGGBB" → [r, g, b] */
export function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
