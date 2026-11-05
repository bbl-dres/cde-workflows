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

// Display a stored value: numbers formatted, strings as typed.
export const disp = x => typeof x === 'number' ? FMT(x) : (x ?? '');
export const disp1 = x => typeof x === 'number' ? FMT1(x) : (x ?? '');
export const disp2 = x => typeof x === 'number' ? FMT2(x) : (x ?? '');
export const disp01 = x => typeof x === 'number' ? FMT01(x) : (x ?? '');


// CHF 24.60 Mio
export const mio = (v, digits = 2) => 'CHF ' + (digits === 0 ? NF0 : digits === 1 ? NF1 : NF2).format(v / 1e6) + ' Mio';
