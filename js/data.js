// Loads the static mock data from /data/*.json. Needs a static file server (fetch does not work from file://).

const FILES = ['project', 'projects', 'users', 'notifications', 'navigation', 'ilp', 'tasks', 'templates', 'ebkp', 'sia416', 'portfolio', 'screens', 'study', 'documents', 'loin', 'plans', 'forms', 'thg'];

export async function loadData() {
  const pairs = await Promise.all(FILES.map(async f => {
    const r = await fetch(`data/${f}.json`);
    if (!r.ok) throw new Error(`data/${f}.json konnte nicht geladen werden (${r.status})`);
    return [f, await r.json()];
  }));
  return Object.fromEntries(pairs);
}
