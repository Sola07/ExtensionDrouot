import { getAveragePrice } from '../utils/price.js';

/**
 * Check if a lot matches user filters
 * @param {Object} lot - Lot object
 * @param {Object} filters - User filters
 * @returns {boolean}
 */
export function matchesFilters(lot, filters) {
  if (!filters.enabled) return true;

  // 1. Category filter
  if (filters.categories.length > 0) {
    if (!filters.categories.includes(lot.category)) {
      return false;
    }
  }

  // 2. Excluded categories
  if (filters.excludeCategories && filters.excludeCategories.length > 0) {
    if (filters.excludeCategories.includes(lot.category)) {
      return false;
    }
  }

  // 3. Keyword inclusion (OR logic - match ANY)
  if (filters.includeKeywords.length > 0) {
    const text = `${lot.title} ${lot.description}`.toLowerCase();
    const hasIncludedKeyword = filters.includeKeywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (!hasIncludedKeyword) {
      return false;
    }
  }

  // 4. Keyword exclusion (AND logic - exclude ALL)
  if (filters.excludeKeywords.length > 0) {
    const text = `${lot.title} ${lot.description}`.toLowerCase();
    const hasExcludedKeyword = filters.excludeKeywords.some(keyword =>
      text.includes(keyword.toLowerCase())
    );

    if (hasExcludedKeyword) {
      return false;
    }
  }

  // 5. Price range filter
  const avgPrice = getAveragePrice(lot.estimateMin, lot.estimateMax);
  if (avgPrice > 0) { // Only filter if price is available
    if (avgPrice < filters.priceMin || avgPrice > filters.priceMax) {
      return false;
    }
  }

  // 6. Date range filter
  if (lot.auctionDate < filters.dateFrom || lot.auctionDate > filters.dateTo) {
    return false;
  }

  // 7. Auction house filter (CUSTOM FIELD!)
  if (filters.auctionHouses.length > 0) {
    if (!filters.auctionHouses.includes(lot.auctionHouse)) {
      return false;
    }
  }

  // 8. City filter
  if (filters.cities && filters.cities.length > 0) {
    const lotCity = (lot.city || '').toLowerCase();
    const hasCityMatch = filters.cities.some(city => city.toLowerCase() === lotCity);
    if (!hasCityMatch) {
      return false;
    }
  }

  // 9. Only with images
  if (filters.onlyWithImages && !lot.imageUrl) {
    return false;
  }

  return true;
}

/**
 * Get match reasons for a lot
 * @param {Object} lot
 * @param {Object} filters
 * @returns {string[]}
 */
export function getMatchReasons(lot, filters) {
  const reasons = [];

  // Category match
  if (filters.categories.length > 0 && filters.categories.includes(lot.category)) {
    reasons.push(`Catégorie: ${lot.category}`);
  }

  // Keyword matches
  if (filters.includeKeywords.length > 0) {
    const text = `${lot.title} ${lot.description}`.toLowerCase();
    const matchedKeywords = filters.includeKeywords.filter(kw =>
      text.includes(kw.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      reasons.push(`Mots-clés: ${matchedKeywords.join(', ')}`);
    }
  }

  // Price range
  const avgPrice = getAveragePrice(lot.estimateMin, lot.estimateMax);
  if (avgPrice > 0) {
    reasons.push(`Prix: ${avgPrice}€`);
  }

  // Auction house
  if (filters.auctionHouses.length > 0 && filters.auctionHouses.includes(lot.auctionHouse)) {
    reasons.push(`Maison de vente: ${lot.auctionHouse}`);
  }

  // City
  if (filters.cities && filters.cities.length > 0) {
    const lotCity = lot.city || 'Non spécifié';
    if (filters.cities.some(city => city.toLowerCase() === lotCity.toLowerCase())) {
      reasons.push(`Ville: ${lotCity}`);
    }
  }

  return reasons;
}

/**
 * Calculate match score for a lot (0-100)
 * Higher score = better match
 * @param {Object} lot
 * @param {Object} filters
 * @returns {number}
 */
export function calculateMatchScore(lot, filters) {
  let score = 0;

  // Base score for matching
  score += 10;

  // Category relevance (exact match)
  if (filters.categories.length > 0 && filters.categories.includes(lot.category)) {
    score += 15;
  }

  // Keyword relevance (more matches = higher score)
  if (filters.includeKeywords.length > 0) {
    const text = `${lot.title} ${lot.description}`.toLowerCase();
    const keywordMatches = filters.includeKeywords.filter(kw =>
      text.includes(kw.toLowerCase())
    ).length;

    score += keywordMatches * 10; // 10 points per keyword
  }

  // Keyword in title (bonus)
  if (filters.includeKeywords.length > 0) {
    const titleText = lot.title.toLowerCase();
    const titleMatches = filters.includeKeywords.filter(kw =>
      titleText.includes(kw.toLowerCase())
    ).length;

    score += titleMatches * 5; // Bonus for title matches
  }

  // Price preference (closer to middle of range = better)
  const avgPrice = getAveragePrice(lot.estimateMin, lot.estimateMax);
  if (avgPrice > 0 && filters.priceMin < filters.priceMax) {
    const priceTarget = (filters.priceMin + filters.priceMax) / 2;
    const priceRange = filters.priceMax - filters.priceMin;
    const priceDeviation = Math.abs(avgPrice - priceTarget) / priceRange;

    // 0 deviation = 15 points, 1.0 deviation = 0 points
    score += Math.max(0, Math.round(15 * (1 - priceDeviation)));
  }

  // Recency (newer = higher)
  const daysSinceFound = (Date.now() - lot.firstSeenAt) / (1000 * 60 * 60 * 24);
  if (daysSinceFound < 1) score += 10;
  else if (daysSinceFound < 3) score += 5;
  else if (daysSinceFound < 7) score += 2;

  // Auction urgency (sooner = higher)
  const daysUntilAuction = (lot.auctionDate - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilAuction < 3) score += 15;
  else if (daysUntilAuction < 7) score += 10;
  else if (daysUntilAuction < 14) score += 5;

  // Image bonus
  if (lot.imageUrl) {
    score += 5;
  }

  // Auction house match
  if (filters.auctionHouses.length > 0 && filters.auctionHouses.includes(lot.auctionHouse)) {
    score += 10;
  }

  // City match
  if (filters.cities && filters.cities.length > 0) {
    const lotCity = (lot.city || '').toLowerCase();
    if (filters.cities.some(city => city.toLowerCase() === lotCity)) {
      score += 10;
    }
  }

  // Cap at 100
  return Math.min(100, Math.round(score));
}

/**
 * Filter lots by user filters
 * @param {Object[]} lots
 * @param {Object} filters
 * @returns {Object[]} - Filtered lots with scores
 */
export function filterLots(lots, filters) {
  const filtered = lots
    .filter(lot => matchesFilters(lot, filters))
    .map(lot => ({
      ...lot,
      matchScore: calculateMatchScore(lot, filters),
      matchReason: getMatchReasons(lot, filters)
    }));

  if (filters.sortMode === 'estimate_asc') {
    return filtered.sort((a, b) => {
      const avgA = getAveragePrice(a.estimateMin, a.estimateMax) || Infinity;
      const avgB = getAveragePrice(b.estimateMin, b.estimateMax) || Infinity;
      return avgA - avgB;
    });
  }

  return filtered.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Check if filters are "empty" (will match everything)
 * @param {Object} filters
 * @returns {boolean}
 */
export function areFiltersEmpty(filters) {
  return !filters.enabled ||
    (filters.categories.length === 0 &&
     filters.includeKeywords.length === 0 &&
     (!filters.cities || filters.cities.length === 0) &&
     filters.auctionHouses.length === 0 &&
     filters.priceMin === 0 &&
     filters.priceMax === 999999);
}

/**
 * Get filter summary text
 * @param {Object} filters
 * @returns {string}
 */
export function getFilterSummary(filters) {
  const parts = [];

  if (filters.categories.length > 0) {
    parts.push(`${filters.categories.length} catégorie(s)`);
  }

  if (filters.includeKeywords.length > 0) {
    parts.push(`${filters.includeKeywords.length} mot(s)-clé(s)`);
  }

  if (filters.auctionHouses.length > 0) {
    parts.push(`${filters.auctionHouses.length} maison(s) de vente`);
  }

  if (filters.cities && filters.cities.length > 0) {
    parts.push(`${filters.cities.length} ville(s)`);
  }

  if (filters.priceMin > 0 || filters.priceMax < 999999) {
    parts.push(`prix: ${filters.priceMin}-${filters.priceMax}€`);
  }

  if (parts.length === 0) {
    return 'Aucun filtre actif';
  }

  return parts.join(' • ');
}
