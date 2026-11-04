// Number formatting, de-CH throughout (1’234.5, Prozent mit Leerschlag), as in the design study.

export const FMT = n => (n == null || isNaN(n)) ? '' : Math.round(n).toLocaleString('de-CH');

export const FMT1 = n => (n == null || isNaN(n) || !isFinite(n))
  ? '' : n.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const FMT2 = n => (n == null || isNaN(n) || !isFinite(n))
  ? '' : n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Parse user input ("1’234", "1'234", "1 234", "1234,5") into a number or null.
export const num = x => {
  if (x == null || x === '') return null;
  if (typeof x === 'number') return x;
  const n = parseFloat(String(x).replace(/[’'\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

// Display a stored value: numbers formatted, strings as typed.
export const disp = x => typeof x === 'number' ? FMT(x) : (x ?? '');

// Signed percentage with one decimal: +12.3 %
export const pctS = d => (d > 0 ? '+' : '') + (d * 100).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';

// CHF 24.60 Mio
export const mio = (v, digits = 2) => 'CHF ' + (v / 1e6).toLocaleString('de-CH', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' Mio';
