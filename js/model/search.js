import { link } from '../links.js';

// Topbar search: suggestions grouped by topic (Projekte, Lieferungen, Aufgaben, Dokumente) as in the CDE Bund,
// at most 5 per group and 12 in total; hits at the start of a text rank first. Pure function of the query and the data.
const LIMIT_GROUP = 5, LIMIT_TOTAL = 12;
const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const docsOf = (data, pid) => { const d = (data.documents.byProject || {})[pid]; const rows = Array.isArray(d) ? d : d && typeof d === 'object' ? Object.values(d).flat() : []; return rows.filter(r => r && typeof r === 'object' && r.name); };

export function searchModel(query, data) {
  const q = fold(query).trim();
  if (!q) return { query: '', groups: [], items: [], total: 0 };
  const rank = (...fields) => { let best = -1; for (const f of fields) { const k = fold(f).indexOf(q); if (k >= 0 && (best < 0 || k < best)) best = k; } return best; };
  const groups = [];
  const push = (key, label, items) => {
    const list = items.filter(it => it.rank >= 0).sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, 'de')).slice(0, LIMIT_GROUP);
    if (list.length) groups.push({ key, label, items: list });
  };
  const projects = data.projects.projects;
  push('projects', 'Projekte', projects.map(p => ({ rank: rank(p.name, p.number, p.location && p.location.place, p.designation), label: p.name, sub: [p.number, p.location && p.location.place].filter(Boolean).join(' · '), href: link.project(p.id) })));
  push('deliveries', 'Lieferungen', projects.flatMap(p => (p.detailed ? data.ilp.rows : (p.deliveries || [])).map(d => ({ rank: rank(d.code, d.name, d.desc, d.firm), label: `${d.code} · ${d.name}`, sub: p.name, href: link.delivery(p.id, d.code) }))));
  push('tasks', 'Aufgaben', projects.flatMap(p => (p.detailed ? data.tasks.rows : (p.tasks || [])).map(t => ({ rank: rank(t.name, t.desc, t.zug), label: t.name, sub: p.name, href: t.delivery ? link.delivery(p.id, t.delivery) : link.projectTasks(p.id) }))));
  push('documents', 'Dokumente', projects.flatMap(p => docsOf(data, p.id).map(d => ({ rank: rank(d.name), label: d.name, sub: p.name, href: link.section(p.id, 'dok') }))));
  let total = 0;
  for (const g of groups) { g.items = g.items.slice(0, Math.max(0, LIMIT_TOTAL - total)); total += g.items.length; }
  const kept = groups.filter(g => g.items.length);
  let i = 0;
  for (const g of kept) for (const it of g.items) it.idx = i++;
  return { query: String(query || '').trim(), groups: kept, items: kept.flatMap(g => g.items), total };
}
