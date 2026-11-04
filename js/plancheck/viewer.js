// =============================================
// plan-check engine · canvas plan viewer: pan, zoom, selection, issue highlighting, room/area overlays
// Ported from plan-check js/renderer.js + js/camera.js + js/selection.js into one class that owns its camera.
// The CDE prototype re-renders its DOM on every state change, so the viewer keeps camera, data and selection
// and is re-attached to a fresh canvas with attach(container, canvas).
// =============================================

import { hexToRgb, fmtArea } from './util.js';
import { polygonAreaM2, pointInPolygon, pointInPolygonTolerant, distancePointToSegment, distancePointToPolyline, bulgeArc, angleOnArc, boundsIntersect, createBounds, mergeBounds, isFiniteBounds } from './geometry.js';

const SCALE_STEPS = [
    { mm: 1, label: '1 mm' }, { mm: 2, label: '2 mm' }, { mm: 5, label: '5 mm' },
    { mm: 10, label: '1 cm' }, { mm: 20, label: '2 cm' }, { mm: 50, label: '5 cm' },
    { mm: 100, label: '10 cm' }, { mm: 200, label: '20 cm' }, { mm: 500, label: '50 cm' },
    { mm: 1000, label: '1 m' }, { mm: 2000, label: '2 m' }, { mm: 5000, label: '5 m' },
    { mm: 10000, label: '10 m' }, { mm: 20000, label: '20 m' }, { mm: 50000, label: '50 m' },
    { mm: 100000, label: '100 m' }, { mm: 200000, label: '200 m' }, { mm: 500000, label: '500 m' },
];
const SCALE_BAR_MAX_PX = 150;
const MIN_ZOOM = 0.001, MAX_ZOOM = 10000;
const FIT_FRACTION = 0.92, FOCUS_FRACTION = 0.5;
const TEXT_FONT_SCALE = 1.4, TEXT_LINE_HEIGHT = 1.67, TEXT_WIDTH_PER_CHAR = 0.6, MIN_TEXT_PX = 1.5;
const NEAR_WHITE = 200, LIGHT_BG_LINE_COLOR = '#1a1a1a';
const HIGHLIGHT_GLOW_MAX_ITEMS = 50, INTERIOR_HIT_FACTOR = 0.99;
const LABEL_FONT_PX = 11, LABEL_CHAR_WIDTH = 0.6, LABEL_HEIGHT_FACTOR = 2.4;
const TAP_THRESHOLD_PX = 8, HIT_TOLERANCE_PX = 8, WHEEL_ZOOM_IN = 1.18, WHEEL_ZOOM_OUT = 0.85, ZOOM_STEP = 1.4;
const BASE_STYLE = { pointPx: 3, hatchAlpha: 0.25, solidAlpha: 1, minTextPx: MIN_TEXT_PX };
const HIGHLIGHT_STYLE = { pointPx: 6, hatchAlpha: 0.4, solidAlpha: 0.5, minTextPx: 0 };

const rgba = (hex, a) => `rgba(${hexToRgb(hex).join(', ')}, ${a})`;
/** Overlay colours follow the CDE tokens (navy, Ant tag palette). */
const OV = {
    highlight: '#0099CC', highlightGlow: 'rgba(0, 153, 204, 0.6)',
    selected: { fill: rgba('#10384f', 0.35), stroke: '#10384f' },
    error: { fill: rgba('#cf1322', 0.3), stroke: '#cf1322' },
    warning: { fill: rgba('#d48806', 0.3), stroke: '#d48806' },
    ok: { fill: rgba('#389e0d', 0.25), stroke: '#389e0d' },
    labelBg: 'rgba(255, 255, 255, 0.9)', labelText: '#262626', labelSecondary: '#6b7280',
    font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontMono: "'Noto Sans Mono', ui-monospace, Consolas, monospace",
};

function tracePolyline(ctx, verts, closed) {
    const n = verts.length;
    if (n === 0) return;
    ctx.moveTo(verts[0].x, verts[0].y);
    const segments = closed ? n : n - 1;
    for (let i = 1; i <= segments; i++) {
        const prev = verts[i - 1];
        const v = verts[i % n];
        const arc = prev.bulge ? bulgeArc(prev.x, prev.y, v.x, v.y, prev.bulge) : null;
        if (arc) ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, arc.clockwise);
        else ctx.lineTo(v.x, v.y);
    }
}

function drawText(ctx, item, zoom, style) {
    if (item.height * zoom < style.minTextPx) return;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.scale(1, -1); // undo the world Y flip for glyphs
    if (item.rotation) ctx.rotate(-item.rotation);
    ctx.font = `${item.height * TEXT_FONT_SCALE}px Arial, sans-serif`;
    ctx.textAlign = item.halign;
    ctx.textBaseline = item.valign;
    if (item.widthFactor && item.widthFactor !== 1) ctx.scale(item.widthFactor, 1);
    const lines = item.lines || [item.text];
    const lineHeight = item.height * TEXT_LINE_HEIGHT * (item.lineSpacing || 1);
    let y0 = 0;
    if (lines.length > 1) {
        if (item.valign === 'middle') y0 = -(lines.length - 1) / 2 * lineHeight;
        else if (item.valign !== 'top') y0 = -(lines.length - 1) * lineHeight;
    }
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 0, y0 + i * lineHeight);
    ctx.restore();
}

function drawItem(ctx, item, zoom, style) {
    switch (item.kind) {
        case 'line':
            ctx.beginPath(); ctx.moveTo(item.x1, item.y1); ctx.lineTo(item.x2, item.y2); ctx.stroke();
            break;
        case 'poly':
            ctx.beginPath(); tracePolyline(ctx, item.verts, item.closed); ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath(); ctx.arc(item.cx, item.cy, item.r, 0, Math.PI * 2); ctx.stroke();
            break;
        case 'arc':
            // Canvas draws "clockwise" in its Y-down space; the world Y flip turns that into a CCW DWG arc
            ctx.beginPath(); ctx.arc(item.cx, item.cy, item.r, item.startAngle, item.endAngle, false); ctx.stroke();
            break;
        case 'text':
            drawText(ctx, item, zoom, style);
            break;
        case 'point': {
            const size = style.pointPx / zoom;
            ctx.fillRect(item.x - size / 2, item.y - size / 2, size, size);
            break;
        }
        case 'solid':
            ctx.beginPath(); tracePolyline(ctx, item.verts, true); ctx.closePath();
            if (style.solidAlpha < 1) { ctx.save(); ctx.globalAlpha = style.solidAlpha; ctx.fill(); ctx.restore(); ctx.stroke(); }
            else ctx.fill();
            break;
        case 'hatch':
            ctx.beginPath();
            for (const path of item.paths) { tracePolyline(ctx, path, true); ctx.closePath(); }
            ctx.stroke();
            if (item.solid) { ctx.save(); ctx.globalAlpha = style.hatchAlpha; ctx.fill('evenodd'); ctx.restore(); }
            break;
    }
}

/** White and near-white DWG colours are unreadable on the light background. */
function displayColor(color, cache) {
    let mapped = cache.get(color);
    if (mapped === undefined) {
        const [r, g, b] = hexToRgb(color);
        mapped = (/^#/.test(color) && r > NEAR_WHITE && g > NEAR_WHITE && b > NEAR_WHITE) ? LIGHT_BG_LINE_COLOR : color;
        cache.set(color, mapped);
    }
    return mapped;
}

const textOf = (el, s) => { el.textContent = s; return el; };

export class PlanViewer {
    constructor(opts = {}) {
        this.opts = opts;
        this.cam = { x: 0, y: 0, zoom: 1 };
        this.bgColor = '#ffffff';
        this.drawing = null;
        this.rooms = [];
        this.areas = [];
        this.overlay = 'base';          // 'base' | 'rooms' | 'areas'
        this.selectedItem = null;
        this.highlightedItems = null;
        this.selectedPolygon = null;
        this.hiddenLayers = new Set();
        this.hiddenRooms = new Set(); this.hiddenAreas = new Set();   // polygon ids hidden from the list (toggle-all, row checkboxes)
        this.container = null; this.canvas = null; this.ctx = null;
        this.viewWidth = 1; this.viewHeight = 1;
        this.renderPending = false;
        this.pointers = new Map();
        this.listeners = [];
        this.resizeObserver = null;
        this.wrapRect = null;
        this.popup = null; this.coords = null;
    }

    // ── Data ──

    /** data: { drawing, rooms, areas } from checkDwg(); resets camera and selection. */
    setData(data, { keepCamera = false } = {}) {
        this.drawing = data ? data.drawing : null;
        this.rooms = data ? data.rooms || [] : [];
        this.areas = data ? data.areas || [] : [];
        this.hiddenLayers = new Set(this.drawing ? this.drawing.hiddenLayers : []);
        this.hiddenRooms = new Set(); this.hiddenAreas = new Set();
        this.clearSelection(false);
        if (!keepCamera) this.zoomExtents();
        this.render();
    }

    setOverlay(mode) { this.overlay = mode; this.clearSelection(false); this.render(); }

    // ── DOM ──

    attach(container, canvas) {
        this.detach();
        this.container = container; this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.popup = container.querySelector('.plan-popup');
        this.coords = container.querySelector('.plan-coords');
        const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); this.listeners.push([target, type, fn, opts]); };
        on(container, 'wheel', e => this.onWheel(e), { passive: false });
        on(container, 'pointerdown', e => this.onPointerDown(e));
        on(container, 'pointermove', e => this.onPointerMove(e));
        on(container, 'pointerup', e => this.onPointerEnd(e));
        on(container, 'pointercancel', e => this.onPointerEnd(e));
        on(container, 'lostpointercapture', e => this.pointers.delete(e.pointerId));
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => { if (this.canvas) { this.resize(); this.scheduleRender(); } });
            this.resizeObserver.observe(container);
        }
        this.resize();
        if (this.drawing && !this.cam.fitted) this.zoomExtents();
        this.render();
    }

    detach() {
        for (const [t, type, fn, opts] of this.listeners) t.removeEventListener(type, fn, opts);
        this.listeners = [];
        if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
        this.container = null; this.canvas = null; this.ctx = null; this.popup = null; this.coords = null;
        this.pointers.clear();
    }

    resize() {
        if (!this.container || !this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        this.viewWidth = Math.max(1, rect.width); this.viewHeight = Math.max(1, rect.height);
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ── Camera ──

    clampZoom(z) { return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); }
    worldToScreen(wx, wy) { const { x, y, zoom } = this.cam; return [(wx - x) * zoom + this.viewWidth / 2, -(wy - y) * zoom + this.viewHeight / 2]; }
    screenToWorld(sx, sy) { const { x, y, zoom } = this.cam; return [(sx - this.viewWidth / 2) / zoom + x, -(sy - this.viewHeight / 2) / zoom + y]; }
    viewBounds() {
        const [x0, y0] = this.screenToWorld(0, 0), [x1, y1] = this.screenToWorld(this.viewWidth, this.viewHeight);
        return { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: Math.min(y0, y1), maxY: Math.max(y0, y1) };
    }
    anchorWorldPoint(wx, wy, sx, sy) {
        this.cam.x = wx - (sx - this.viewWidth / 2) / this.cam.zoom;
        this.cam.y = wy + (sy - this.viewHeight / 2) / this.cam.zoom;
    }
    zoomAt(sx, sy, factor) {
        const [wx, wy] = this.screenToWorld(sx, sy);
        this.cam.zoom = this.clampZoom(this.cam.zoom * factor);
        this.anchorWorldPoint(wx, wy, sx, sy);
    }
    zoomBy(factor) { this.zoomAt(this.viewWidth / 2, this.viewHeight / 2, factor); this.render(); }
    zoomIn() { this.zoomBy(ZOOM_STEP); }
    zoomOut() { this.zoomBy(1 / ZOOM_STEP); }
    zoomToBounds(bounds, fraction = FOCUS_FRACTION) {
        if (!isFiniteBounds(bounds)) return;
        const w = (bounds.maxX - bounds.minX) || 1, h = (bounds.maxY - bounds.minY) || 1;
        this.cam.x = (bounds.minX + bounds.maxX) / 2; this.cam.y = (bounds.minY + bounds.maxY) / 2;
        this.cam.zoom = this.clampZoom(Math.min(this.viewWidth / w, this.viewHeight / h) * fraction);
    }
    zoomExtents() { if (this.drawing) { this.zoomToBounds(this.drawing.bounds, FIT_FRACTION); this.cam.fitted = true; } }
    fit() { this.zoomExtents(); this.render(); }

    // ── Selection ──

    clearSelection(rerender = true) {
        this.selectedItem = null; this.selectedPolygon = null; this.highlightedItems = null;
        this.hidePopup();
        if (rerender) this.render();
        if (this.opts.onSelect) this.opts.onSelect(null);
    }

    selectPolygon(entry, { zoom = true } = {}) {
        this.selectedPolygon = entry; this.highlightedItems = null;
        this.selectedItem = this.drawing?.byHandle.get(entry.handle)?.[0] || null;
        if (zoom) this.zoomToBounds(entry.bounds);
        this.render();
        if (this.selectedItem) { const [sx, sy] = this.worldToScreen(entry.labelPoint.x, entry.labelPoint.y); this.showPopup(this.selectedItem, sx, sy, entry); }
        else this.hidePopup();
    }

    selectItem(item, screenX, screenY, { zoom = false } = {}) {
        this.selectedItem = item; this.selectedPolygon = null; this.highlightedItems = null;
        if (zoom) this.zoomToBounds(item.bounds);
        this.render();
        if (screenX == null) { const [sx, sy] = this.worldToScreen((item.bounds.minX + item.bounds.maxX) / 2, (item.bounds.minY + item.bounds.maxY) / 2); this.showPopup(item, sx, sy); }
        else this.showPopup(item, screenX, screenY);
    }

    highlightItems(items) {
        if (!items || items.length === 0) return;
        this.highlightedItems = items; this.selectedItem = items[0]; this.selectedPolygon = null;
        this.hidePopup();
        const bounds = createBounds();
        for (const item of items) mergeBounds(bounds, item.bounds);
        this.zoomToBounds(bounds);
        this.render();
    }

    /** Locate an issue of the result: by room id (overlay rooms) or by entity handles. */
    locateIssue(issue) {
        if (!this.drawing) return false;
        if (issue.roomId) {
            const room = this.rooms.find(r => r.id === issue.roomId);
            if (room) { if (this.overlay !== 'rooms') this.overlay = 'rooms'; this.selectPolygon(room); return true; }
        }
        const handles = issue.handles || (issue.handle ? [issue.handle] : []);
        const items = handles.flatMap(h => this.drawing.byHandle.get(h) || []);
        if (items.length === 0) return false;
        if (items.length > 1) this.highlightItems(items); else this.selectItem(items[0], null, null, { zoom: true });
        return true;
    }

    locateRoom(id) {
        const room = this.rooms.find(r => r.id === id);
        if (!room) return false;
        this.hiddenRooms.delete(id);
        if (this.overlay !== 'rooms') this.overlay = 'rooms';
        this.selectPolygon(room);
        return true;
    }

    locateArea(id) {
        const area = this.areas.find(a => a.id === id);
        if (!area) return false;
        this.hiddenAreas.delete(id);
        if (this.overlay !== 'areas') this.overlay = 'areas';
        this.selectPolygon(area);
        return true;
    }

    hiddenSet(kind) { return kind === 'layers' ? this.hiddenLayers : kind === 'rooms' ? this.hiddenRooms : this.hiddenAreas; }
    isHidden(kind, id) { return this.hiddenSet(kind).has(id); }

    /** Shows or hides layers ('layers', by name) or polygons ('rooms' | 'areas', by id) in a single render. */
    setVisible(kind, ids, visible) {
        const set = this.hiddenSet(kind);
        for (const id of ids) { if (visible) set.delete(id); else set.add(id); }
        if (!visible && kind !== 'layers' && kind === this.overlay && this.selectedPolygon && ids.includes(this.selectedPolygon.id)) this.clearSelection(false);
        this.render();
    }

    setLayerVisible(name, visible) { this.setVisible('layers', [name], visible); }

    // ── Rendering ──

    scheduleRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        requestAnimationFrame(() => { this.renderPending = false; this.render(); });
    }

    render() {
        if (!this.ctx) return;
        const ctx = this.ctx, cam = this.cam, width = this.viewWidth, height = this.viewHeight;
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, width, height);
        if (!this.drawing) return;

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(cam.zoom, -cam.zoom); // world Y up
        ctx.translate(-cam.x, -cam.y);
        ctx.lineWidth = 1 / cam.zoom;   // hairlines regardless of zoom

        const view = this.viewBounds();
        {
            // The base drawing is dimmed under the room / area overlays so the polygons stay readable
            const overlayOn = this.overlay === 'rooms' || this.overlay === 'areas';
            const colorCache = new Map();
            let currentColor = null;
            ctx.save();
            if (overlayOn) ctx.globalAlpha = 0.3;
            for (const item of this.drawing.renderList) {
                if (this.hiddenLayers.has(item.layer) || !boundsIntersect(item.bounds, view)) continue;
                const color = displayColor(item.color, colorCache);
                if (color !== currentColor) { ctx.strokeStyle = color; ctx.fillStyle = color; currentColor = color; }
                drawItem(ctx, item, cam.zoom, BASE_STYLE);
            }
            ctx.restore();
        }

        const highlighted = this.highlightedItems?.length ? this.highlightedItems : (this.selectedItem ? [this.selectedItem] : []);
        if (highlighted.length > 0) {
            ctx.save();
            ctx.strokeStyle = OV.highlight; ctx.fillStyle = OV.highlight; ctx.lineWidth = 3 / cam.zoom;
            if (highlighted.length <= HIGHLIGHT_GLOW_MAX_ITEMS) { ctx.shadowColor = OV.highlightGlow; ctx.shadowBlur = 10; }
            for (const item of highlighted) { if (!this.hiddenLayers.has(item.layer)) drawItem(ctx, item, cam.zoom, HIGHLIGHT_STYLE); }
            ctx.restore();
        }

        this.drawPolygonOverlays(ctx, cam);
        ctx.restore();
        this.drawScaleBar(ctx, height);
    }

    visibleOverlayEntries() {
        if (this.overlay !== 'rooms' && this.overlay !== 'areas') return [];
        const entries = this.overlay === 'rooms' ? this.rooms : this.areas, hidden = this.hiddenSet(this.overlay);
        return entries.filter(e => !this.hiddenLayers.has(e.layer) && !hidden.has(e.id));
    }

    drawPolygonOverlays(ctx, cam) {
        const entries = this.visibleOverlayEntries();
        if (entries.length === 0) return;
        const isSelected = e => this.selectedPolygon && this.selectedPolygon.handle === e.handle;
        for (const entry of entries) {
            const colors = isSelected(entry) ? OV.selected : (OV[entry.status] || OV.ok);
            ctx.beginPath(); tracePolyline(ctx, entry.vertices, true); ctx.closePath();
            ctx.fillStyle = colors.fill; ctx.fill();
            ctx.strokeStyle = colors.stroke; ctx.lineWidth = (isSelected(entry) ? 2.5 : 1.5) / cam.zoom; ctx.stroke();
        }
        // Labels: largest entries first, skipping labels that would overlap an earlier one on screen
        const placed = [];
        const worldFont = LABEL_FONT_PX / cam.zoom;
        for (const entry of [...entries].sort((a, b) => b.area - a.area)) {
            const [sx, sy] = this.worldToScreen(entry.labelPoint.x, entry.labelPoint.y);
            const labelW = entry.aoid.length * LABEL_FONT_PX * LABEL_CHAR_WIDTH + 12, labelH = LABEL_FONT_PX * LABEL_HEIGHT_FACTOR;
            const box = { x: sx - labelW / 2, y: sy - labelH / 2, w: labelW, h: labelH };
            if (placed.some(p => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y)) continue;
            placed.push(box);
            ctx.save();
            ctx.translate(entry.labelPoint.x, entry.labelPoint.y);
            ctx.scale(1, -1);
            ctx.fillStyle = OV.labelBg;
            ctx.beginPath();
            ctx.roundRect(-labelW / 2 / cam.zoom, -labelH / 2 / cam.zoom, labelW / cam.zoom, labelH / cam.zoom, 2 / cam.zoom);
            ctx.fill();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = `600 ${worldFont}px ${OV.font}`; ctx.fillStyle = OV.labelText;
            ctx.fillText(entry.aoid, 0, -worldFont * 0.2);
            ctx.font = `${worldFont * 0.7}px ${OV.font}`; ctx.fillStyle = OV.labelSecondary;
            ctx.fillText(fmtArea(entry.area, 1), 0, worldFont * 0.55);
            ctx.restore();
        }
    }

    drawScaleBar(ctx, height) {
        const pxPerMm = this.cam.zoom / (this.drawing.unitScale || 1);
        let best = SCALE_STEPS[0];
        for (const step of SCALE_STEPS) if (step.mm * pxPerMm <= SCALE_BAR_MAX_PX) best = step;
        const px = Math.round(best.mm * pxPerMm);
        const padX = 12, padY = 10, tickH = 6, fontSize = 11, gap = 4, x = padX, y = height - padY;
        ctx.save();
        ctx.font = `${fontSize}px ${OV.fontMono}`;
        const labelW = ctx.measureText(best.label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath(); ctx.roundRect(x - 4, y - (tickH + fontSize + 6) - 2, px + gap + labelW + 12, tickH + fontSize + 10, 3); ctx.fill();
        ctx.strokeStyle = OV.labelSecondary; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - tickH); ctx.lineTo(x, y); ctx.lineTo(x + px, y); ctx.lineTo(x + px, y - tickH); ctx.stroke();
        ctx.fillStyle = OV.labelSecondary; ctx.textBaseline = 'bottom';
        ctx.fillText(best.label, x + px + gap, y);
        ctx.restore();
    }

    // ── Hit testing ──

    hitTest(wx, wy, tolerance) {
        if (!this.drawing) return null;
        let best = null, bestDist = tolerance;
        const probe = { minX: wx - tolerance, maxX: wx + tolerance, minY: wy - tolerance, maxY: wy + tolerance };
        for (const item of this.drawing.renderList) {
            if (this.hiddenLayers.has(item.layer) || !boundsIntersect(item.bounds, probe)) continue;
            let d = Infinity;
            switch (item.kind) {
                case 'line': d = distancePointToSegment(wx, wy, item.x1, item.y1, item.x2, item.y2); break;
                case 'poly':
                    d = distancePointToPolyline(wx, wy, item.verts, item.closed);
                    if (item.closed && item.verts.length > 2 && pointInPolygon(wx, wy, item.verts)) d = Math.min(d, tolerance * INTERIOR_HIT_FACTOR);
                    break;
                case 'circle': d = Math.abs(Math.hypot(wx - item.cx, wy - item.cy) - item.r); break;
                case 'arc': {
                    const angle = Math.atan2(wy - item.cy, wx - item.cx);
                    if (angleOnArc(angle, item.startAngle, item.endAngle)) d = Math.abs(Math.hypot(wx - item.cx, wy - item.cy) - item.r);
                    else d = Math.min(
                        Math.hypot(wx - (item.cx + item.r * Math.cos(item.startAngle)), wy - (item.cy + item.r * Math.sin(item.startAngle))),
                        Math.hypot(wx - (item.cx + item.r * Math.cos(item.endAngle)), wy - (item.cy + item.r * Math.sin(item.endAngle))));
                    break;
                }
                case 'text': {
                    const w = item.text.length * item.height * TEXT_WIDTH_PER_CHAR * (item.widthFactor || 1);
                    const left = item.halign === 'center' ? item.x - w / 2 : item.halign === 'right' ? item.x - w : item.x;
                    const bottom = item.valign === 'top' ? item.y - item.height : item.valign === 'middle' ? item.y - item.height / 2 : item.y;
                    if (wx >= left && wx <= left + w && wy >= bottom && wy <= bottom + item.height) d = 0;
                    break;
                }
                case 'point': d = Math.hypot(wx - item.x, wy - item.y); break;
                case 'solid': d = distancePointToPolyline(wx, wy, item.verts, true); break;
                case 'hatch':
                    for (const path of item.paths) {
                        d = Math.min(d, distancePointToPolyline(wx, wy, path, true));
                        if (path.length > 2 && pointInPolygon(wx, wy, path)) d = Math.min(d, tolerance * INTERIOR_HIT_FACTOR);
                    }
                    break;
            }
            if (d < bestDist) { bestDist = d; best = item; }
        }
        return best;
    }

    // ── Popup ──

    showPopup(item, screenX, screenY, entry = null) {
        const pop = this.popup;
        if (!pop) return;
        pop.textContent = '';
        const row = (k, v) => {
            const r = document.createElement('div'); r.className = 'plan-popup-row';
            r.appendChild(textOf(document.createElement('span'), k));
            r.appendChild(textOf(document.createElement('span'), v));
            pop.appendChild(r);
        };
        const point = (x, y) => `${x.toFixed(2)}, ${y.toFixed(2)}`;
        const title = document.createElement('div'); title.className = 'plan-popup-title';
        title.appendChild(textOf(document.createElement('span'), entry ? entry.aoid : item.entityType));
        pop.appendChild(title);
        if (entry) { row('Fläche', fmtArea(entry.area, 2)); row('Status', { ok: 'OK', warning: 'Warnung', error: 'Fehler' }[entry.status] || entry.status); }
        row('Typ', item.entityType);
        row('Layer', item.layer);
        row('Farbe', item.color);
        if (item.handle) row('Handle', item.handle);
        switch (item.kind) {
            case 'line': row('Länge', Math.hypot(item.x2 - item.x1, item.y2 - item.y1).toFixed(2)); break;
            case 'poly': row('Eckpunkte', String(item.verts.length)); row('Geschlossen', item.closed ? 'Ja' : 'Nein'); break;
            case 'circle': row('Zentrum', point(item.cx, item.cy)); row('Radius', item.r.toFixed(2)); break;
            case 'arc': row('Radius', item.r.toFixed(2)); break;
            case 'text': row('Text', item.text.length > 30 ? item.text.slice(0, 30) + '…' : item.text); row('Höhe', item.height.toFixed(2)); break;
            case 'hatch': {
                const area = item.paths.reduce((s, p) => s + polygonAreaM2(p, this.drawing.unitScale), 0);
                row('Grenzen', String(item.paths.length)); if (area > 0) row('Fläche', fmtArea(area, 1));
                break;
            }
        }
        pop.classList.add('is-visible');
        pop.style.left = '0px'; pop.style.top = '0px';
        const rect = pop.getBoundingClientRect();
        let px = screenX + 12, py = screenY - 12;
        if (px + rect.width > this.viewWidth - 8) px = screenX - rect.width - 12;
        if (py + rect.height > this.viewHeight - 8) py = this.viewHeight - rect.height - 8;
        pop.style.left = Math.max(8, px) + 'px'; pop.style.top = Math.max(8, py) + 'px';
    }

    hidePopup() { if (this.popup) this.popup.classList.remove('is-visible'); }

    // ── Input ──

    localPoint(e) {
        if (!this.wrapRect) this.wrapRect = this.container.getBoundingClientRect();
        return [e.clientX - this.wrapRect.left, e.clientY - this.wrapRect.top];
    }

    onWheel(e) {
        if (!this.drawing || e.deltaY === 0 || e.target.closest('.plan-tools')) return;
        e.preventDefault();
        this.wrapRect = this.container.getBoundingClientRect();
        const [mx, my] = this.localPoint(e);
        this.hidePopup();
        this.zoomAt(mx, my, e.deltaY > 0 ? WHEEL_ZOOM_OUT : WHEEL_ZOOM_IN);
        this.scheduleRender();
    }

    onPointerDown(e) {
        if (e.target.closest('.plan-tools, .plan-popup') || e.button !== 0) return;
        this.container.setPointerCapture(e.pointerId);
        this.wrapRect = this.container.getBoundingClientRect();
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 1) {
            this.panStart = { x: e.clientX, y: e.clientY, camX: this.cam.x, camY: this.cam.y };
            this.pinchStart = null;
        } else if (this.pointers.size === 2) {
            const [a, b] = [...this.pointers.values()];
            const [midX, midY] = this.localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
            const [wx, wy] = this.screenToWorld(midX, midY);
            this.pinchStart = { dist: Math.hypot(b.x - a.x, b.y - a.y), zoom: this.cam.zoom, worldX: wx, worldY: wy };
            this.panStart = null;
        }
    }

    onPointerMove(e) {
        if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 2 && this.pinchStart) {
            const [a, b] = [...this.pointers.values()];
            const [midX, midY] = this.localPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
            this.cam.zoom = this.clampZoom(this.pinchStart.zoom * Math.hypot(b.x - a.x, b.y - a.y) / this.pinchStart.dist);
            this.anchorWorldPoint(this.pinchStart.worldX, this.pinchStart.worldY, midX, midY);
            this.scheduleRender();
        } else if (this.pointers.size === 1 && this.panStart) {
            this.cam.x = this.panStart.camX - (e.clientX - this.panStart.x) / this.cam.zoom;
            this.cam.y = this.panStart.camY + (e.clientY - this.panStart.y) / this.cam.zoom;
            this.scheduleRender();
        }
        if (this.drawing && this.coords && this.pointers.size <= 1) {
            const [mx, my] = this.localPoint(e);
            if (mx >= 0 && my >= 0 && mx <= this.viewWidth && my <= this.viewHeight) {
                const [wx, wy] = this.screenToWorld(mx, my);
                this.coords.textContent = `X ${wx.toFixed(1)}  Y ${wy.toFixed(1)}  Zoom ${this.cam.zoom.toFixed(2)}×`;
            }
        }
    }

    onPointerEnd(e) {
        const start = this.pointers.get(e.pointerId);
        this.pointers.delete(e.pointerId);
        if (e.type === 'pointercancel') this.pointers.clear();
        if (start && this.panStart && e.type === 'pointerup' && this.drawing) {
            const moved = Math.hypot(e.clientX - this.panStart.x, e.clientY - this.panStart.y);
            const [sx, sy] = this.localPoint(e);
            if (moved < TAP_THRESHOLD_PX && sx >= 0 && sy >= 0 && sx <= this.viewWidth && sy <= this.viewHeight) this.tap(sx, sy);
        }
        this.panStart = null; this.pinchStart = null;
        if (this.pointers.size === 1) {
            const remaining = [...this.pointers.values()][0];
            this.panStart = { x: remaining.x, y: remaining.y, camX: this.cam.x, camY: this.cam.y };
        }
    }

    tap(sx, sy) {
        const [wx, wy] = this.screenToWorld(sx, sy);
        if (this.overlay === 'rooms' || this.overlay === 'areas') {
            const entry = this.visibleOverlayEntries().find(e => pointInPolygonTolerant(wx, wy, e.vertices, e.bounds));
            if (entry) { this.selectPolygon(entry, { zoom: false }); if (this.opts.onSelect) this.opts.onSelect(entry); }
            else this.clearSelection();
            return;
        }
        const item = this.hitTest(wx, wy, HIT_TOLERANCE_PX / this.cam.zoom);
        if (item) this.selectItem(item, sx, sy); else this.clearSelection();
    }
}
