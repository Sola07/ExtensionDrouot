/**
 * API-based scraper for Drouot
 * Intercepts API calls to get complete lot data with auction houses
 */

import { getCityForAuctionHouseId, batchFetchCities } from './auction-house-service.js';

/**
 * Parse API response and extract lots with auction house mapping
 * Now async to fetch cities dynamically
 */
export async function parseApiResponse(apiData) {
  console.log('[Drouot Monitor] Parsing API response...');

  if (!apiData || !apiData.lots || !Array.isArray(apiData.lots)) {
    console.warn('[Drouot Monitor] Invalid API response structure');
    return [];
  }

  // Build auction house map from breakdowns
  const auctionHouseMap = {};
  if (apiData.breakdowns && apiData.breakdowns.auctioneer) {
    Object.entries(apiData.breakdowns.auctioneer).forEach(([id, data]) => {
      auctionHouseMap[id] = data.name;
    });
  }

  console.log(`[Drouot Monitor] Found ${Object.keys(auctionHouseMap).length} auction houses in map`);

  // Collect unique auction houses for batch city fetching
  const uniqueHouses = [];
  const seenIds = new Set();

  apiData.lots.forEach(apiLot => {
    if (apiLot.auctioneerId && !seenIds.has(apiLot.auctioneerId)) {
      seenIds.add(apiLot.auctioneerId);
      uniqueHouses.push({
        id: apiLot.auctioneerId,
        name: auctionHouseMap[apiLot.auctioneerId] || 'Drouot'
      });
    }
  });

  // Batch fetch cities for all auction houses
  console.log(`[Drouot Monitor] Fetching cities for ${uniqueHouses.length} auction houses...`);
  const cityMap = await batchFetchCities(uniqueHouses);
  console.log(`[Drouot Monitor] Retrieved ${cityMap.size} cities`);

  // Transform API lots to our format with cities
  const lots = apiData.lots.map(apiLot => {
    const city = cityMap.get(apiLot.auctioneerId) || null;
    const lot = transformApiLot(apiLot, auctionHouseMap, city);
    return lot;
  });

  console.log(`[Drouot Monitor] Parsed ${lots.length} lots from API`);

  // Log some auction house stats
  const houseCounts = {};
  const cityCounts = {};
  lots.forEach(lot => {
    houseCounts[lot.auctionHouse] = (houseCounts[lot.auctionHouse] || 0) + 1;
    if (lot.city) {
      cityCounts[lot.city] = (cityCounts[lot.city] || 0) + 1;
    }
  });
  console.log('[Drouot Monitor] Auction houses found:', houseCounts);
  console.log('[Drouot Monitor] Cities found:', cityCounts);

  return lots;
}

/**
 * Transform single API lot to our lot format
 */
function transformApiLot(apiLot, auctionHouseMap, city = null) {
  // Get auction house name from map
  const auctionHouse = auctionHouseMap[apiLot.auctioneerId] || 'Drouot';

  // Build image URL with CDN format
  const imageUrl = apiLot.photo
    ? `https://cdn.drouot.com/d/image/lot?size=ftall&path=${apiLot.photo.path}`
    : '';

  // Build lot URL
  const lotUrl = `https://www.drouot.com/fr/l/${apiLot.id}-${apiLot.slug}`;

  // Convert timestamp to milliseconds
  const auctionDate = apiLot.date ? apiLot.date * 1000 : Date.now();

  // Create unique ID
  const lotId = `drouot_api_${apiLot.id}`;

  const lot = {
    id: lotId,
    externalId: apiLot.id.toString(),
    title: extractTitle(apiLot.description),
    description: apiLot.description || '',
    category: extractCategory(apiLot),
    estimateMin: apiLot.lowEstim || 0,
    estimateMax: apiLot.highEstim || 0,
    currentBid: apiLot.currentBid || 0,
    currency: apiLot.currencyId || 'EUR',
    auctionDate: auctionDate,
    auctionHouse: auctionHouse,
    auctionHouserId: apiLot.auctioneerId,
    city: city,
    auctionLocation: apiLot.timezone || '',
    saleType: apiLot.saleType || 'LIVE',
    saleStatus: apiLot.saleStatus || 'CREATED',
    saleId: apiLot.saleId,
    imageUrl: imageUrl,
    images: imageUrl ? [imageUrl] : [],
    url: lotUrl,
    scrapedFrom: lotUrl,
    firstSeenAt: Date.now(),
    lastSeenAt: Date.now(),
    detailScrapedAt: Date.now(), // Mark as fully enriched from API
    source: 'api' // Mark as API-sourced
  };

  return lot;
}

/**
 * Extract clean title from description
 */
function extractTitle(description) {
  if (!description) return 'Sans titre';

  // Take first line or first 100 chars
  const firstLine = description.split('\n')[0];
  return firstLine.length > 100
    ? firstLine.substring(0, 97) + '...'
    : firstLine;
}

/**
 * Extract category from API lot
 */
function extractCategory(apiLot) {
  if (apiLot.attributes && apiLot.attributes.category) {
    return apiLot.attributes.category;
  }

  return '';
}

/**
 * Check if this is an API response we should intercept
 */
export function isApiResponse(url) {
  // Match different Drouot API patterns:
  // - /lot/search?... (old format)
  // - /search?lang=fr&cat=... (new format)
  // - Any search endpoint on api.drouot.com
  return url.includes('api.drouot.com') &&
         (url.includes('/lot/search') ||
          url.includes('/search?') ||
          url.match(/search\?lang=/));
}

/**
 * Debug: Log API structure
 */
export function debugApiStructure(apiData) {
  console.log('[Drouot Monitor] API Response Structure:');
  console.log('- Total lots:', apiData.lots?.length || 0);
  console.log('- Total found:', apiData.numFound || 0);
  console.log('- Auction houses:', Object.keys(apiData.breakdowns?.auctioneer || {}).length);

  if (apiData.lots && apiData.lots.length > 0) {
    console.log('- Sample lot:', {
      id: apiData.lots[0].id,
      auctioneerId: apiData.lots[0].auctioneerId,
      lowEstim: apiData.lots[0].lowEstim,
      highEstim: apiData.lots[0].highEstim,
      description: apiData.lots[0].description?.substring(0, 50)
    });
  }

  if (apiData.breakdowns?.auctioneer) {
    const houses = Object.entries(apiData.breakdowns.auctioneer)
      .slice(0, 5)
      .map(([id, data]) => `${id}: ${data.name} (${data.hits})`);
    console.log('- Sample auction houses:', houses);
  }
}
