// Sidebar navigation of the CDE Bund project. Groups (Info-Management, Stammdaten) are
// expanded together when infoOpen is true, as in the design study.
export function buildNav(items, active, infoOpen) {
  const list = [];
  const push = (it, sub = false) => list.push({
    key: it.key, label: it.label, icon: it.icon, badge: it.badge, screen: it.screen, sub,
    active: it.key === active,
    chev: !!it.group, open: infoOpen,
  });
  items.forEach(it => {
    push(it);
    if (it.group && infoOpen) (it.children || []).forEach(c => push(c, true));
  });
  return list;
}
