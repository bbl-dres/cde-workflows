// 09 Vorlagen für Datenformulare (Einstellungen · Informationsanforderungen)
export function templatesModel(s, data) {
  const T = data.templates.templates, sel = T[s.tplSel] ? s.tplSel : data.templates.initialSelected, t = T[sel];
  return {
    tplRows: Object.entries(T).map(([k, v]) => ({ key: k, ...v, on: !!s.tplOn[k], selected: k === sel, bg: k === sel ? '#eef1f5' : '#fff', bl: k === sel ? 'var(--navy)' : 'transparent' })),
    tplSel: sel, tplName: t.name,
    tplMeta: `Version ${t.ver} · Gliederung ${t.gl} · Zielsystem ${t.ziel} · Pflicht ${t.pflicht}`,
    tplPos: [...t.pos.map(c => ({ c, req: true, bg: 'var(--navy)', col: '#fff', bd: 'var(--navy)' })), ...t.opt.map(c => ({ c, req: false, bg: '#fff', col: '#3d4650', bd: '#c9cfd6' }))],
    tplFields: t.fields, tplRules: t.rules,
  };
}
