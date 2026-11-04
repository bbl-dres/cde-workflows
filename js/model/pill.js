// Status pill colours of the CDE Bund (bg, border, text, icon).
// Ant Design tag palette (ant-tag-purple / gold / green / red / default) as in the CDE Bund;
// «In Bearbeitung» keeps the grey-blue of the Lieferplan tile (no Ant equivalent).
export const PILL = {
  'Offen':          ['#f9f0ff', '#d3adf7', '#531dab', 'file-text'],
  'In Bearbeitung': ['#e4e9ef', '#aeb9c6', '#2c3b4d', 'pencil'],
  'Eingereicht':    ['#fffbe6', '#ffe58f', '#d48806', 'send'],
  'In Prüfung':     ['#fffbe6', '#ffe58f', '#d48806', 'search'],
  'Freigegeben':    ['#f6ffed', '#b7eb8f', '#389e0d', 'circle-check'],
  'Abgeschlossen':  ['#f6ffed', '#b7eb8f', '#389e0d', 'circle-check'],
  'Überfällig':     ['#fff1f0', '#ffa39e', '#cf1322', 'circle-alert'],
  'Zurückgewiesen': ['#fff1f0', '#ffa39e', '#cf1322', 'undo-2'],
  'Nicht bestellt': ['#fafafa', '#d9d9d9', '#595959', 'minus'],
  'Entwurf': { label: 'Entwurf', bg: '#6b7280', bd: '#6b7280', c: '#fff', icon: 'pencil' },
  'Ausstehend':     ['#f9f0ff', '#d3adf7', '#531dab', 'file-text'],
  'Geliefert':      ['#f6ffed', '#b7eb8f', '#389e0d', 'circle-check'],
};

export const pillSpec = status => {
  const p = PILL[status] || PILL['Offen'];
  return { label: status, bg: p[0], bd: p[1], c: p[2], icon: p[3] };
};
