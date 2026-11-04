// Workflow stepper model. idx = index of the current step (>= labels.length means all done).
// warnIdx marks the current step red (e.g. «Zurückgewiesen»).
export const mkSteps = (labels, idx, warnIdx = -1) => labels.map((label, i) => {
  const done = i < idx || idx >= labels.length, cur = i === idx;
  return {
    label, date: '', done, cur,
    sym: done ? '✓' : String(i + 1),
    dotBg: done ? '#4c8c75' : '#fff',
    dotBorder: done ? '#4c8c75' : cur ? (warnIdx === i ? '#c4506a' : 'var(--navy)') : '#c9cfd6',
    dotColor: done ? '#fff' : cur ? 'var(--navy)' : '#6b7480',
    lineBg: i === labels.length - 1 ? 'transparent' : (i < idx ? '#4c8c75' : '#dfe3e8'),
    labelColor: (done || cur) ? '#1f2937' : '#6b7480',
    weight: cur ? 600 : 400,
  };
});
