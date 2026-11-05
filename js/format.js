// Number formatting, de-CH throughout (1’234.5, Prozent mit Leerschlag), as in the design study.
// The Intl.NumberFormat instances are created once: toLocaleString() per cell made the view model ~10× slower.

const nf = (min, max) => new Intl.NumberFormat('de-CH', { minimumFractionDigits: min, maximumFractionDigits: max });
const NF0 = nf(0, 0), NF1 = nf(1, 1), NF2 = nf(2, 2), NF01 = nf(0, 1);
const bad = n => n == null || typeof n !== 'number' || !isFinite(n);

export const FMT = n => (bad(n) ? '' : NF0.format(Math.round(n) || 0));   // || 0: no «-0» for small negative values
export const FMT1 = n => (bad(n) ? '' : NF1.format(n));
export const FMT2 = n => (bad(n) ? '' : NF2.format(n));
export const FMT01 = n => (bad(n) ? '' : NF01.format(n));   // up to one decimal: 22, 1.5, 4

// Parse user input ("1’234", "1'234", "1 234", "1234,5") into a number or null.
export const num = x => {
  if (x == null || x === '') return null;
  if (typeof x === 'number') return isFinite(x) ? x : null;
  const t = String(x).replace(/[’'\s]/g, '').replace(',', '.').replace('−', '-');
  return /^[-+]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;   // strict: «12abc», «5 %», «0x10» stay text and count as missing
};

/** Whole percentages of the parts of a total that add up to 100 (largest remainder): «64 %, 7 %, 16 %, 3 %, 10 %» instead of a sum of 99 or 101. */
export function wholeShares(values) {
  const total = values.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return values.map(() => 0);
  const raw = values.map(v => Math.max(0, v) / total * 100), out = raw.map(Math.floor);
  let rest = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (rest-- > 0) out[i]++; });
  return out;
}

// Display a stored value: numbers formatted, strings as typed.
export const disp = x => typeof x === 'number' ? FMT(x) : (x ?? '');
export const disp1 = x => typeof x === 'number' ? FMT1(x) : (x ?? '');
export const disp2 = x => typeof x === 'number' ? FMT2(x) : (x ?? '');
export const disp01 = x => typeof x === 'number' ? FMT01(x) : (x ?? '');


// CHF 24.60 Mio
export const mio = (v, digits = 2) => 'CHF ' + (digits === 0 ? NF0 : digits === 1 ? NF1 : NF2).format(v / 1e6) + ' Mio';
