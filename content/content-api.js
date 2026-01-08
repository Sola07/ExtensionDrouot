/**
 * API Interceptor for Drouot
 * Intercepts fetch calls to Drouot API and extracts lot data
 */

import { parseApiResponse, isApiResponse, debugApiStructure } from '../src/services/scraper-api.js';
import { sendToBackground } from '../src/services/messaging.js';
import { MessageType } from '../src/constants.js';

const BRIDGE_SOURCE = 'drouot-monitor-api';
const BRIDGE_TYPE = 'DROUOT_MONITOR_API_RESPONSE';

console.log('[Drouot Monitor] API Interceptor loaded on', window.location.href);

/**
 * Perform a full search with pagination
 * Fetches ALL results across all pages for a given search query
 * @param {string} query - Search query
 * @param {Object} searchParams - Additional search parameters
 * @returns {Promise<{total: number, lots: Array}>}
 */
export async function performFullSearch(query, searchParams = {}, onBatch) {
  console.log(`[Drouot Monitor] 🔍 Starting full search for: "${query}"`);

  try {
    // Build search URL with parameters
    const lang = searchParams.lang || 'fr';
    const facet = searchParams.facet !== undefined ? searchParams.facet : true;

    // First call to get total count (page 1)
    const firstPageUrl = `https://api.drouot.com/drouot/gingolem/neoGingo/lot/search?lang=${lang}&q=${encodeURIComponent(query)}&page=1&facet=${facet}`;

    console.log(`[Drouot Monitor] Fetching first page to get total count...`);
    console.log(`[Drouot Monitor] URL: ${firstPageUrl}`);
    const firstResponse = await fetch(firstPageUrl);

    if (!firstResponse.ok) {
      throw new Error(`API returned ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    console.log('[Drouot Monitor] 📦 API Response:', firstData);

    const total = firstData.numFound || 0;
    const pageSize = 100;
    const totalPages = Math.ceil(total / pageSize);

    console.log(`[Drouot Monitor] 📊 Total results: ${total} (${totalPages} pages)`);

    if (firstData.lots) {
      console.log(`[Drouot Monitor] 📦 First page has ${firstData.lots.length} lots in array`);
    } else {
      console.warn('[Drouot Monitor] ⚠️ No "lots" array in API response!');
      console.log('[Drouot Monitor] API response keys:', Object.keys(firstData));
    }

    if (total === 0) {
      return { total: 0, lots: [] };
    }

    // Parse first page lots
    let collectedLots = onBatch ? null : [];
    let processedLots = 0;

    const processBatch = async (lots, currentPage) => {
      if (!lots || lots.length === 0) return;
      const startIndex = processedLots;
      const orderedLots = lots.map((lot, idx) => ({
        ...lot,
        listOrder: startIndex + idx
      }));

      if (onBatch) {
        await onBatch(orderedLots, {
          total,
          totalPages,
          currentPage,
          processed: startIndex + orderedLots.length
        });
      } else {
        collectedLots.push(...orderedLots);
      }

      processedLots += orderedLots.length;
    };

    const firstLots = await parseApiResponse(firstData);
    console.log(`[Drouot Monitor] ✅ Page 1/${totalPages} - ${firstLots.length} lots`);
    await processBatch(firstLots, 1);

    if (totalPages <= 1) {
      return { total, lots: collectedLots || firstLots };
    }

    // Fetch remaining pages in parallel (with concurrency limit)
    const maxConcurrent = 5;
    const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2); // Start at page 2

    // Process pages in batches
    for (let i = 0; i < remainingPages.length; i += maxConcurrent) {
      const batch = remainingPages.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async page => {
        const pageUrl = `https://api.drouot.com/drouot/gingolem/neoGingo/lot/search?lang=${lang}&q=${encodeURIComponent(query)}&page=${page}&facet=${facet}`;

        try {
          const response = await fetch(pageUrl);
          if (!response.ok) {
            console.warn(`[Drouot Monitor] Failed to fetch page ${page}: ${response.status}`);
            return [];
          }

          const data = await response.json();
          const lots = await parseApiResponse(data);
          console.log(`[Drouot Monitor] ✅ Page ${page}/${totalPages} - ${lots.length} lots`);
          return lots;
        } catch (error) {
          console.error(`[Drouot Monitor] Error fetching page ${page}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (let j = 0; j < batchResults.length; j++) {
        const pageLots = batchResults[j];
        const pageNumber = batch[j];
        await processBatch(pageLots, pageNumber);
      }

      // Show progress
      const currentProgress = Math.min(1 + batchResults.length + i, totalPages);
      console.log(`[Drouot Monitor] 📈 Progress: ${currentProgress}/${totalPages} pages`);

      // Send progress update to page
      window.postMessage({
        source: 'drouot-monitor-search',
        type: 'SEARCH_PROGRESS',
        payload: {
          current: processedLots,
          total: total,
          currentPage: currentProgress,
          totalPages: totalPages
        }
      }, '*');
    }

    console.log(`[Drouot Monitor] ✅ Full search complete: ${processedLots} lots collected`);
    return { total, lots: collectedLots || [] };

  } catch (error) {
    console.error('[Drouot Monitor] Error during full search:', error);
    throw error;
  }
}

/**
 * Extract search query from URL
 * @returns {string|null} - Search query or null
 */
export function extractSearchQuery() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  const search = window.location.search;

  console.log('[Drouot Monitor] Extracting search query from:', { url, pathname, search });

  // PRIORITY 1: Check URL params (most common for /s pages)
  // Example: https://drouot.com/fr/s?query=tableaux
  const urlParams = new URLSearchParams(search);
  let query = urlParams.get('query') || urlParams.get('q') || urlParams.get('search');
  if (query) {
    console.log('[Drouot Monitor] ✅ Extracted from URL params:', query);
    return query.trim();
  }
  // this seems unused
  // PRIORITY 2: Check for /search/ or /recherche/ URLs
  if (url.includes('/search/') || url.includes('/recherche/')) {
    // Try to extract from path (e.g., /search/omega)
    const pathMatch = pathname.match(/\/(?:search|recherche)\/([^/?]+)/);
    if (pathMatch && pathMatch[1]) {
      query = decodeURIComponent(pathMatch[1]).trim();
      console.log('[Drouot Monitor] ✅ Extracted from path:', query);
      return query;
    }
  }

  console.log('[Drouot Monitor] ❌ No search query found in URL');
  return null;
}

/**
 * Check if current page is a search page
 */
export function isSearchPage() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  const isSearch = pathname.includes('/s')

  console.log('[Drouot Monitor] Is search page?', isSearch, 'Path:', pathname);
  return isSearch;
}
