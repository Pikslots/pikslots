/**
 * Minimal CSV serialisation helpers.
 *
 * Values are quoted when they contain a comma, quote or line break, and
 * spreadsheet formula prefixes are neutralised so exported user input cannot
 * be interpreted as a formula by Excel / Google Sheets (CSV injection).
 */

export const CSV_BOM = '\uFEFF';

// Leading characters Excel treats as the start of a formula. `-` is only
// dangerous when it does not start a number, so it is handled separately.
const FORMULA_PREFIXES = ['=', '+', '@', '\t', '\r'];
const NEGATIVE_FORMULA_PATTERN = /^-[^0-9.]/;

export type CsvValue = string | number | boolean | null | undefined;

export function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';

  let text = typeof value === 'string' ? value : String(value);

  if (
    FORMULA_PREFIXES.includes(text.charAt(0)) ||
    NEGATIVE_FORMULA_PATTERN.test(text)
  ) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(columns: string[], rows: CsvValue[][]): string {
  const lines = [columns.map(escapeCsvValue).join(',')];

  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','));
  }

  return lines.join('\r\n');
}
