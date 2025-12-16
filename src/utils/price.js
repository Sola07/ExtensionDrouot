/**
 * Price parsing and formatting utilities
 */

/**
 * Parse price from various formats
 * Handles: "1000€", "1 000 EUR", "1,000.50", etc.
 * @param {string} priceString
 * @returns {number}
 */
export function parsePrice(priceString) {
  if (!priceString || typeof priceString !== 'string') return 0;

  // Remove currency symbols and extra whitespace
  const cleaned = priceString
    .replace(/[€$£]/g, '')
    .replace(/EUR|USD|GBP/gi, '')
    .trim();

  // Remove spaces and replace comma with dot
  // Handle both European (1.000,50) and US (1,000.50) formats
  let normalized = cleaned.replace(/\s/g, '');

  // Check if it's European format (comma as decimal separator)
  if (normalized.match(/\d+\.\d+,\d+/)) {
    // European: 1.000,50 -> 1000.50
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.match(/\d+,\d{3}/)) {
    // US format with comma as thousand separator: 1,000.50
    normalized = normalized.replace(/,/g, '');
  } else if (normalized.match(/\d+,\d{1,2}$/)) {
    // European format without thousand separator: 1000,50
    normalized = normalized.replace(',', '.');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse price range from string like "800 - 1200 €"
 * @param {string} priceString
 * @returns {{min: number, max: number}}
 */
export function parsePriceRange(priceString) {
  if (!priceString) return { min: 0, max: 0 };

  // Try to match range format: "800 - 1200", "800-1200", "800 à 1200"
  const rangeMatch = priceString.match(/(\d[\d\s,.]*)\s*[-àto]\s*(\d[\d\s,.]*)/i);

  if (rangeMatch) {
    const min = parsePrice(rangeMatch[1]);
    const max = parsePrice(rangeMatch[2]);
    return { min, max };
  }

  // Single price - use as both min and max
  const price = parsePrice(priceString);
  return { min: price, max: price };
}

/**
 * Format price to French format with currency
 * @param {number} price
 * @param {string} currency
 * @returns {string}
 */
export function formatPrice(price, currency = 'EUR') {
  if (typeof price !== 'number' || isNaN(price)) return '-';

  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);

  return formatted;
}

/**
 * Format price range
 * @param {number} min
 * @param {number} max
 * @param {string} currency
 * @returns {string}
 */
export function formatPriceRange(min, max, currency = 'EUR') {
  if (min === max || max === 0) {
    return formatPrice(min, currency);
  }

  const minFormatted = formatPrice(min, currency);
  const maxFormatted = formatPrice(max, currency);

  return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Get average price from min/max
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function getAveragePrice(min, max) {
  if (min === 0 && max === 0) return 0;
  if (min === max) return min;
  return (min + max) / 2;
}
