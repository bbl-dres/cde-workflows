// Browser session of the plan checker: keeps parsed drawings in memory (they are too large for the state
// and sessionStorage), loads the sample plans from assets/plans and runs the check on uploaded files.
// Files are processed locally in the browser with js/plancheck (LibreDWG WebAssembly); nothing is uploaded.
import { checkDwg, MAX_FILE_SIZE } from './plancheck/index.js';

const cache = new Map();   // drawingKey → { status: 'loading' | 'ready' | 'error', drawing, rooms, areas, result, error, promise }
const log = [];            // last processing messages (shown under the viewer)
const MAX_LOG = 60;

function note(msg, type = 'info') {
    log.push({ t: new Date(), msg, type });
    if (log.length > MAX_LOG) log.shift();
}

/** Only the latest upload of a floor stays in memory (a parsed drawing is large). */
function evictFloor(floorKey, keep) {
    for (const k of [...cache.keys()]) if (k.startsWith(`upload:${floorKey}:`) && k !== keep) cache.delete(k);
}

async function run(key, buffer, file) {
    const entry = { status: 'loading', drawing: null, rooms: [], areas: [], result: null, error: null };
    cache.set(key, entry);
    entry.promise = (async () => {
        try {
            const { drawing, validation, result } = await checkDwg(buffer, file, note);
            Object.assign(entry, { status: 'ready', drawing, rooms: validation.rooms, areas: validation.areas, result });
        } catch (err) {
            note(err.message, 'error');
            Object.assign(entry, { status: 'error', error: err.message });
            throw err;
        }
        return entry;
    })();
    return entry.promise;
}

export const planSession = {
    /** Cache entry for a drawing key, or null when nothing was loaded yet in this browser session. */
    get: key => cache.get(key) || null,
    log: () => log.slice(),

    /** Fetches a plan shipped with the prototype (assets/plans/…) and checks it; cached by its path. */
    loadAsset(src) {
        const hit = cache.get(src);
        if (hit && hit.status !== 'error') return hit.promise || Promise.resolve(hit);   // a failed load (offline) is retried
        const entry = { status: 'loading', promise: null };
        cache.set(src, entry);
        entry.promise = (async () => {
            note(`Musterdatei wird geladen: ${src}`);
            let resp;
            try { resp = await fetch(src); } catch (err) { cache.delete(src); note(`Musterdatei nicht erreichbar: ${err.message}`, 'error'); throw new Error('Musterdatei nicht erreichbar (offline?)'); }
            if (!resp.ok) { const e = { ...entry, status: 'error', error: `Musterdatei nicht gefunden (${resp.status})` }; cache.set(src, e); note(e.error, 'error'); throw new Error(e.error); }
            const buffer = await resp.arrayBuffer();
            return run(src, buffer, { name: src.split('/').pop(), size: buffer.byteLength });
        })();
        return entry.promise;
    },

    /** Checks a File dropped or picked for a floor; the drawing is cached under the returned key. */
    async checkFile(floorKey, file) {
        const key = `upload:${floorKey}:${file.name}`;
        if (file.size > MAX_FILE_SIZE) throw new Error(`Datei zu gross (${Math.round(file.size / 1048576)} MB, maximal ${Math.round(MAX_FILE_SIZE / 1048576)} MB).`);
        evictFloor(floorKey, key);
        note(`Datei wird gelesen: ${file.name}`);
        const buffer = await file.arrayBuffer();
        const entry = await run(key, buffer, { name: file.name, size: file.size });
        return { key, entry };
    },

    /** Loads a shipped sample as if the user had uploaded it for the floor (demo path «Musterplan laden»). */
    async checkAsset(floorKey, src) {
        const entry = await planSession.loadAsset(src);
        const key = `upload:${floorKey}:${entry.result.file.name}`;
        evictFloor(floorKey, key);
        cache.set(key, entry);
        return { key, entry, src };
    },
};
