/**
 * Service for fetching auction house information from Drouot pages
 * Extracts city from JSON-LD structured data
 */

const CACHE_KEY = 'auctionHouseCities';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Get city for an auction house by ID
 * Uses cache first, then fetches from Drouot page if needed
 * @param {number} auctioneerId - The auction house ID
 * @param {string} auctionHouseName - The auction house name (for URL construction)
 * @returns {Promise<string|null>} - City name or null
 */
export async function getCityForAuctionHouseId(auctioneerId, auctionHouseName) {
  if (!auctioneerId) return null;

  // Check cache first
  const cachedCity = await getCachedCity(auctioneerId);
  if (cachedCity) {
    console.log(`[Drouot Monitor] Using cached city for auctioneer ${auctioneerId}: ${cachedCity}`);
    return cachedCity;
  }

  // Fetch from Drouot page
  console.log(`[Drouot Monitor] Fetching city for auctioneer ${auctioneerId}...`);
  const city = await fetchCityFromDrouotPage(auctioneerId, auctionHouseName);

  if (city) {
    // Cache the result
    await cacheCity(auctioneerId, city);
    console.log(`[Drouot Monitor] Cached city for auctioneer ${auctioneerId}: ${city}`);
  }

  return city;
}

/**
 * Get cached city from chrome.storage
 */
async function getCachedCity(auctioneerId) {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    const cache = result[CACHE_KEY] || {};

    const cached = cache[auctioneerId];
    if (!cached) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      console.log(`[Drouot Monitor] Cache expired for auctioneer ${auctioneerId}`);
      return null;
    }

    return cached.city;
  } catch (error) {
    console.error('[Drouot Monitor] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache city in chrome.storage
 */
async function cacheCity(auctioneerId, city) {
  try {
    const result = await chrome.storage.local.get([CACHE_KEY]);
    const cache = result[CACHE_KEY] || {};

    cache[auctioneerId] = {
      city,
      timestamp: Date.now()
    };

    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  } catch (error) {
    console.error('[Drouot Monitor] Error writing cache:', error);
  }
}

/**
 * Fetch city from Drouot auctioneer page by asking background script
 * Background script can bypass CORS restrictions
 */
async function fetchCityFromDrouotPage(auctioneerId, auctionHouseName) {
  try {
    // Generate slug from auction house name
    const slug = generateSlug(auctionHouseName);
    const url = `https://www.drouot.com/fr/auctioneer/${auctioneerId}/${slug}?tab=sales`;

    console.log(`[Drouot Monitor] Requesting background to fetch ${url}`);

    // Import dynamically to avoid circular dependency
    const { MessageType } = await import('../constants.js');

    // Ask background script to fetch the page
    const response = await chrome.runtime.sendMessage({
      type: MessageType.FETCH_AUCTION_HOUSE_PAGE,
      url: url
    });

    if (!response.success) {
      console.warn(`[Drouot Monitor] Background failed to fetch page: ${response.error}`);
      return null;
    }

    // Extract JSON-LD from HTML
    const city = extractCityFromHTML(response.html);
    return city;

  } catch (error) {
    console.error('[Drouot Monitor] Error fetching auctioneer page:', error);
    return null;
  }
}

/**
 * Extract city from HTML by parsing JSON-LD structured data
 */
function extractCityFromHTML(html) {
  try {
    // Find JSON-LD script tag
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    if (!jsonLdMatch) {
      console.warn('[Drouot Monitor] No JSON-LD found in page');
      return null;
    }

    const jsonLdText = jsonLdMatch[1].trim();
    const structuredData = JSON.parse(jsonLdText);

    // Extract city from address.addressLocality
    const city = structuredData?.address?.addressLocality;

    if (city) {
      console.log(`[Drouot Monitor] Found city in JSON-LD: ${city}`);
      return city;
    }

    console.warn('[Drouot Monitor] No addressLocality found in JSON-LD');
    return null;

  } catch (error) {
    console.error('[Drouot Monitor] Error parsing JSON-LD:', error);
    return null;
  }
}

/**
 * Generate URL slug from auction house name
 * Matches Drouot's slug format
 */
function generateSlug(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Batch fetch cities for multiple auction houses
 * Useful for initial load or when many houses are missing cities
 * @param {Array<{id: number, name: string}>} auctionHouses - Array of {id, name}
 * @returns {Promise<Map<number, string>>} - Map of auctioneerId -> city
 */
export async function batchFetchCities(auctionHouses) {
  console.log(`[Drouot Monitor] Batch fetching cities for ${auctionHouses.length} auction houses`);

  const cityMap = new Map();
  const fetchPromises = [];

  for (const house of auctionHouses) {
    // Limit concurrent requests to avoid overwhelming the server
    if (fetchPromises.length >= 3) {
      await Promise.race(fetchPromises);
    }

    const promise = getCityForAuctionHouseId(house.id, house.name)
      .then(city => {
        if (city) {
          cityMap.set(house.id, city);
        }
      })
      .finally(() => {
        const index = fetchPromises.indexOf(promise);
        if (index > -1) {
          fetchPromises.splice(index, 1);
        }
      });

    fetchPromises.push(promise);
  }

  // Wait for all remaining promises
  await Promise.all(fetchPromises);

  console.log(`[Drouot Monitor] Batch fetch complete: ${cityMap.size} cities found`);
  return cityMap;
}

/**
 * Clear the city cache
 */
export async function clearCityCache() {
  try {
    await chrome.storage.local.remove([CACHE_KEY]);
    console.log('[Drouot Monitor] City cache cleared');
  } catch (error) {
    console.error('[Drouot Monitor] Error clearing cache:', error);
  }
}
