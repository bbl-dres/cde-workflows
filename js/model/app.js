// Application-level view model: projects, cross-project tasks, dashboard figures, notifications.
import { pillSpec } from './pill.js';
import { link } from '../links.js';

const DONE = new Set(['Abgeschlossen', 'Freigegeben']);
// 'dd.mm.yyyy[ hh:mm]' → sortable number yyyymmdd
export const dateKey = s => { const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(s || ''); return m ? Number(m[3] + m[2] + m[1]) : 0; };

export function appModel(state, data, project, user, base) {
  const today = dateKey(data.projects.today);
  const projects = data.projects.projects;
  const favorites = new Set(state.favorites || []);
  const isMember = p => p.members.includes(user.key);

  // ---- Tasks across projects (Musterhausen rows carry the live workflow statuses) ----
  const allTasks = [];
  projects.forEach(p => {
    const rows = p.detailed ? base.auRows : (p.tasks || []).map((r, i) => { const status = (r.delivery && base.formStatusOf(p.id, r.delivery)) || r.status; return { ...r, status, pill: pillSpec(status), typW: r.typ === 'Datenformular' ? 600 : 400, bg: i % 2 ? '#f6f7f9' : '#fff' }; });
    rows.forEach(t => allTasks.push({
      ...t, projectId: p.id, projectName: p.name,
      href: t.delivery ? link.delivery(p.id, t.delivery) : link.projectTasks(p.id),
    }));
  });
  const open = t => !DONE.has(t.status);
  const overdue = t => open(t) && dateKey(t.ende) > 0 && dateKey(t.ende) < today;
  const mine = allTasks.filter(t => t.zug === user.name || t.fuer === user.name || (!user.internal && t.zug === user.org));
  const assigned = allTasks.filter(t => t.zug === user.name || (!user.internal && t.zug === user.org));
  const everything = allTasks.filter(t => projects.find(p => p.id === t.projectId && isMember(p)));
  const dash = {
    open: mine.filter(open).length,
    onTrack: mine.filter(t => open(t) && !overdue(t)).length,
    late: mine.filter(overdue).length,
  };

  // ---- Projects ----
  const projectRows = projects.map(p => ({
    ...p, favorite: favorites.has(p.id), member: isMember(p), href: link.project(p.id),
    formCount: p.detailed ? base.ilpRows.filter(r => r.isForm).length : (p.deliveries || []).filter(d => d.isForm).length,
  }));
  const myProjects = projectRows.filter(p => p.member);
  const insights = {
    issues: myProjects.reduce((a, p) => a + (p.issues || 0), 0),
    tasks: dash.open,
    dataDrops: myProjects.reduce((a, p) => a + p.formCount, 0),
    communication: myProjects.reduce((a, p) => a + (p.communication || 0), 0),
  };

  // ---- Notifications for the current user ----
  const read = new Set(state.notifRead || []);
  const notifs = data.notifications
    .filter(n => !n.for || n.for.includes(user.key))
    .map(n => ({
      ...n, unread: n.unread && !read.has(n.id),
      href: n.delivery ? link.delivery(n.project, n.delivery, n.tab)
        : n.section ? `/projects/${n.project}/${n.section}`
        : n.settings ? link.settings(n.project, n.settings)
        : link.project(n.project),
    }));
  const unreadCount = notifs.filter(n => n.unread).length;

  // ---- Current project: Informationslieferplan and tasks ----
  let ilpRows, auRows;
  if (project.detailed) { ilpRows = base.ilpRows; auRows = base.auRows; }
  else {
    ilpRows = (project.deliveries || []).map(r => { const status = base.formStatusOf(project.id, r.code) || r.status; return { ...r, status, pill: pillSpec(status) }; });
    auRows = allTasks.filter(t => t.projectId === project.id);
  }
  ilpRows = ilpRows.map(r => ({ ...r, href: link.delivery(project.id, r.code) }));
  auRows = auRows.map(t => ({ ...t, href: t.href || (t.delivery ? link.delivery(project.id, t.delivery) : link.projectTasks(project.id)) }));
  const count = st => ilpRows.filter(r => r.status === st).length;
  const ilpCount = { total: ilpRows.length, work: count('In Bearbeitung'), check: count('In Prüfung'), done: count('Abgeschlossen'), over: count('Überfällig') };
  const ilpTiles = data.ilp.tiles.map(t => ({ ...t, value: ilpCount[t.key] }));
  const deliveryByCode = code => ilpRows.find(r => r.code.toLowerCase() === String(code).toLowerCase()) || null;

  // ---- Info-Management: Dokumente, LOIN; Aktivitäten › Logs (audit log derived from the project data) ----
  const docSrc = data.documents.byProject[project.id] || data.documents.byProject.default;
  const documents = { groups: data.documents.groups, rows: docSrc.map((d, i) => ({ ...d, id: `doc-${i}`, pill: pillSpec(d.status), href: link.section(project.id, 'dok') })) };
  const loinSrc = data.loin.byProject[project.id] || { keys: [], elements: [], sets: [], parameters: [] };
  const loin = {
    groups: data.loin.groups,
    keys: loinSrc.keys.map(k => ({ group: k.group, cells: [k.name, k.set, k.element, k.valid] })),
    elements: loinSrc.elements.map(e => ({ cells: [e.name, e.ifc, String(e.keys)] })),
    sets: loinSrc.sets.map(x => ({ cells: [x.name, String(x.parameters), String(x.elements)] })),
    parameters: loinSrc.parameters.map(p => ({ cells: [p.name, p.type, p.unit, p.set] })),
  };
  // deterministic pseudo-GUID (FNV-1a over four salted passes) so the log looks like the real audit log
  const guid = str => { const h = salt => { let v = 2166136261; for (const c of salt + str) { v ^= c.charCodeAt(0); v = Math.imul(v, 16777619) >>> 0; } return v.toString(16).padStart(8, '0'); }; const a = h('a'), b = h('b'), c = h('c'), d = h('d'); return `${a}-${b.slice(0, 4)}-4${b.slice(5)}-${c.slice(0, 4)}-${c.slice(4)}${d}`; };
  const pGuid = guid('project:' + project.id);
  const userName = key => (data.users.users.find(u => u.key === key) || { name: key }).name;
  const logs = [
    { entity: project.name, action: 'Create', type: 'Project', id: pGuid, projectName: '-', user: project.responsible, at: project.createdAt + ' 09:12' },
    ...(project.members || []).map(m => ({ entity: userName(m), action: 'Create', type: 'Member', id: guid('member:' + m), projectName: project.name, user: project.responsible, at: project.createdAt + ' 09:30' })),
    ...ilpRows.map(r => ({ entity: r.name, action: 'Create', type: 'DeliveryTask', id: guid('ilp:' + r.code), projectName: project.name, user: project.responsible, at: project.createdAt + ' 10:00' })),
    ...auRows.map(t => ({ entity: t.name, action: 'Update', type: t.typ === 'Datenformular' ? 'DataForm' : t.typ === 'Modell-Issue' ? 'ModelIssue' : 'Todo', id: guid('task:' + t.name), projectName: project.name, user: t.zug, at: t.upd })),
  ].map(l => ({ ...l, projectId: pGuid, message: '-' })).sort((a, b) => dateKey(b.at) - dateKey(a.at));

  // ---- Activities (project feed) ----
  const activities = auRows.map(t => ({ date: t.upd, text: `${t.zug}: ${t.name} · ${t.status}`, href: t.href }))
    .sort((a, b) => dateKey(b.date) - dateKey(a.date));

  return {
    user, project, today: data.projects.today,
    projects: projectRows, myProjects,
    allTasks, taskRows: { all: mine, assigned, everything }, dash, insights,
    notifs, unreadCount,
    ilpRows, ilpTiles, auRows, deliveryByCode, activities, documents, loin, logs,
    members: project.members.map(k => data.users.users.find(u => u.key === k)).filter(Boolean),
  };
}
