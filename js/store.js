// Minimal state store with sessionStorage persistence.
// The whole app re-renders on every change (see app.js), so state is a plain immutable-ish object.

const KEY = 'cde-bund-prototyp-state';

export function createStore(initial) {
  const version = initial.__v;
  let state = load() || structuredClone(initial);
  const subs = new Set();

  function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.__v === version ? s : null;
    } catch { return null; }
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ } }
  function emit() { save(); subs.forEach(fn => fn(state)); }

  const store = {
    get: () => state,
    /** Shallow patch: set({ a: 1 }) or set(s => ({ ... })) */
    set(patch) { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; emit(); },
    /** Patch a nested object: setIn('imp', { filter: 'alle' }) */
    setIn(key, sub) { state = { ...state, [key]: { ...(state[key] || {}), ...sub } }; emit(); },
    /** Set one entry of a map: setMap('kvV', 'C2', '1’285’000') */
    setMap(key, code, value) { store.setIn(key, { [code]: value }); },
    reset() { state = structuredClone(initial); emit(); },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
  return store;
}
