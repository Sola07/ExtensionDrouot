/**
 * Date parsing utilities for French date formats
 */

const FRENCH_MONTHS = {
  'janvier': 0,
  'février': 1,
  'fevrier': 1,
  'mars': 2,
  'avril': 3,
  'mai': 4,
  'juin': 5,
  'juillet': 6,
  'août': 7,
  'aout': 7,
  'septembre': 8,
  'octobre': 9,
  'novembre': 10,
  'décembre': 11,
  'decembre': 11
};

/**
 * Parse various French date formats
 * @param {string} dateString
 * @returns {Date|null}
 */
export function parseDate(dateString) {
  if (!dateString) return null;

  // Clean the string
  const cleaned = dateString.trim().toLowerCase();

  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Format: "15 janvier 2024" or "15 janvier 2024 14h30"
  const frenchDateMatch = cleaned.match(/(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/);
  if (frenchDateMatch) {
    const day = parseInt(frenchDateMatch[1]);
    const month = FRENCH_MONTHS[frenchDateMatch[2]];
    const year = parseInt(frenchDateMatch[3]);
    return new Date(year, month, day);
  }

  // Format: "15/01/2024" (DD/MM/YYYY)
  const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const month = parseInt(slashMatch[2]) - 1;
    const year = parseInt(slashMatch[3]);
    return new Date(year, month, day);
  }

  // Format: "2024-01-15" (YYYY-MM-DD)
  const dashMatch = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    const year = parseInt(dashMatch[1]);
    const month = parseInt(dashMatch[2]) - 1;
    const day = parseInt(dashMatch[3]);
    return new Date(year, month, day);
  }

  return null;
}

/**
 * Format date to French format
 * @param {Date|number} date
 * @returns {string}
 */
export function formatDate(date) {
  if (typeof date === 'number') {
    date = new Date(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate();
  const monthNames = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format date to short format (DD/MM/YYYY)
 * @param {Date|number} date
 * @returns {string}
 */
export function formatDateShort(date) {
  if (typeof date === 'number') {
    date = new Date(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Get relative time string (e.g., "il y a 2 jours")
 * @param {Date|number} date
 * @returns {string}
 */
export function getRelativeTime(date) {
  if (typeof date === 'number') {
    date = new Date(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  if (diffHour < 24) return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
  if (diffDay < 7) return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  if (diffDay < 30) return `il y a ${Math.floor(diffDay / 7)} semaine${Math.floor(diffDay / 7) > 1 ? 's' : ''}`;
  if (diffDay < 365) return `il y a ${Math.floor(diffDay / 30)} mois`;

  return `il y a ${Math.floor(diffDay / 365)} an${Math.floor(diffDay / 365) > 1 ? 's' : ''}`;
}

/**
 * Check if date is in the future
 * @param {Date|number} date
 * @returns {boolean}
 */
export function isFutureDate(date) {
  if (typeof date === 'number') {
    date = new Date(date);
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() > Date.now();
}
