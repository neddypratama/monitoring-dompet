/**
 * Utility functions for Rupiah currency formatting and parsing
 */

/**
 * Formats a number or numeric string to dot-separated thousands:
 * e.g. 17000000 -> "17.000.000"
 */
export function formatNumberDots(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Parses a formatted or raw string/number to integer:
 * e.g. "17.000.000" -> 17000000
 * e.g. "Rp 17.000.000" -> 17000000
 */
export function parseNumberDots(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.round(value);
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return 0;
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Standard Rupiah display with "Rp " prefix:
 * e.g. 17000000 -> "Rp 17.000.000"
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  const num = parseNumberDots(amount);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}
