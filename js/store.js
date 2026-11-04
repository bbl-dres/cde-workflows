// Minimal state store with sessionStorage persistence.
// The whole app re-renders on every change (see app.js), so state is a plain immutable-ish object.
// Transient fields (a running plan check, the toast) are not persisted: they would survive a reload as stale locks.

const KEY = 'cde-bund-prototyp-state';
const TRANSIENT = new Set(['busy', 'toast', 'search', 'searchOpen', 'searchIdx']);
const UNSAFE_SEGMENT = new Set(['__proto__', 'constructor', 'prototype']);

export function createStore(initial) {
  const version = initial.__v;
  let state = load() || structuredClone(initial);
  const subs = new Set();

  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.__v !== version) return null;
      // Shallow merge: keys added to the initial state since the session was saved get their defaults.
      return { ...structuredClone(initial), ...s, ui: { ...initial.ui, ...(s.ui || {}) } };
    } catch { return null; }
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state, (k, v) => (TRANSIENT.has(k) ? null : v))); } catch { /* private mode etc. */ } }
  function emit() { save(); subs.forEach(fn => fn(state)); }

  const store = {
    get: () => state,
    /** Shallow patch: set({ a: 1 }) or set(s => ({ ... })) */
    set(patch) { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; emit(); },
    /** Patch a nested object: setIn('imp', { filter: 'alle' }) */
    setIn(key, sub) { state = { ...state, [key]: { ...(state[key] || {}), ...sub } }; emit(); },
    reset() { state = structuredClone(initial); emit(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
  return store;
}

/** Clear the persisted state (used by the error page before a reload). */
export function clearPersisted() { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } }

/**
 * Apply a patch with dotted keys ({ 'ui.dialog': 'order', 'projects.musterhausen.forms.thg.step': 5 }) to a copy of the state.
 * Intermediate objects are created when missing; prototype segments are rejected. With `typed`, a value may only replace a
 * value of the same kind (null/undefined, same typeof, array ↔ array), so a deep link cannot turn an array into a number.
 */
export function patchDotted(state, patch, { typed = false } = {}) {
  const st = structuredClone(state);
  for (const [k, v] of Object.entries(patch || {})) {
    const path = k.split('.');
    if (path.some(seg => UNSAFE_SEGMENT.has(seg) || seg === '')) continue;
    let t = st;
    for (let i = 0; i < path.length - 1; i++) {
      if (typeof t[path[i]] !== 'object' || t[path[i]] === null || Array.isArray(t[path[i]])) {
        if (typed && t[path[i]] != null) { t = null; break; }
        t[path[i]] = {};
      }
      t = t[path[i]];
    }
    if (!t) continue;
    const last = path[path.length - 1], cur = t[last];
    if (typed && cur != null && (typeof cur !== typeof v || Array.isArray(cur) !== Array.isArray(v))) continue;
    t[last] = v;
  }
  return st;
}
