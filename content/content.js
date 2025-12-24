import { scrapeLots, isListingPage, isDetailPage as isGenericDetailPage, scrapeSingleLot } from '../src/services/scraper.js';
import { scrapeDrouotPage, debugPageStructure } from '../src/services/scraper-drouot.js';
import { isDetailPage } from '../src/services/scraper-detail.js';
import { setupApiInterception, setupXhrInterception, performFullSearch, isSearchPage, extractSearchQuery } from './content-api.js';
import { sendToBackground } from '../src/services/messaging.js';
import { MessageType, ItemState } from '../src/constants.js';

console.log('[Drouot Monitor] ========================================');
console.log('[Drouot Monitor] Search params:', window.location.search);
console.log('[Drouot Monitor] ========================================');

const isDrouot = window.location.href.includes('drouot.com');
const useApiMode = isDrouot; // Use API mode for Drouot, DOM scraping for others

console.log('[Drouot Monitor] Is Drouot site?', isDrouot);

if (isDrouot) {
  console.log('[Drouot Monitor] 🚀 Activating API interception mode (DOM scraping disabled)');

  try {
    setupApiInterception();
    console.log('[Drouot Monitor] ✅ API interception setup complete');
  } catch (error) {
    console.error('[Drouot Monitor] ❌ Error setting up API interception:', error);
  }

  try {
    setupXhrInterception();
    console.log('[Drouot Monitor] ✅ XHR interception setup complete');
  } catch (error) {
    console.error('[Drouot Monitor] ❌ Error setting up XHR interception:', error);
  }

  // Check if this is a search page on initial load
  console.log('[Drouot Monitor] About to call checkAndHandleSearchPage()...');
  try {
    checkAndHandleSearchPage();
  } catch (error) {
    console.error('[Drouot Monitor] ❌ Error in checkAndHandleSearchPage:', error);
  }

  // Listen for URL changes (SPA navigation) - multiple methods for reliability
  let lastUrl = window.location.href;

  // Method 1: MutationObserver on title
  const urlObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log('[Drouot Monitor] 🔄 URL changed (MutationObserver) from', lastUrl, 'to', currentUrl);
      lastUrl = currentUrl;
      setTimeout(() => {
        checkAndHandleSearchPage();
      }, 500);
    }
  });

  if (document.querySelector('title')) {
    urlObserver.observe(document.querySelector('title'), {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Method 2: Poll URL every 500ms (backup method)
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log('[Drouot Monitor] 🔄 URL changed (polling) from', lastUrl, 'to', currentUrl);
      lastUrl = currentUrl;
      setTimeout(() => {
        checkAndHandleSearchPage();
      }, 300);
    }
  }, 500);

  // Method 3: Listen to popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    console.log('[Drouot Monitor] 🔙 Browser navigation detected (popstate)');
    setTimeout(() => {
      checkAndHandleSearchPage();
    }, 500);
  });
}

/**
 * Check if current page is a search page and handle it
 */
function checkAndHandleSearchPage() {
  console.log('[Drouot Monitor] ========================================');
  console.log('[Drouot Monitor] checkAndHandleSearchPage() called');
  console.log('[Drouot Monitor] Current URL:', window.location.href);
  console.log('[Drouot Monitor] Current pathname:', window.location.pathname);
  console.log('[Drouot Monitor] Checking if search page...');

  const searchPageResult = isSearchPage();
  console.log('[Drouot Monitor] isSearchPage() returned:', searchPageResult);

  if (searchPageResult) {
    console.log('[Drouot Monitor] ✅ This is a search page, extracting query...');
    const query = extractSearchQuery();
    console.log('[Drouot Monitor] extractSearchQuery() returned:', query);

    if (query) {
      console.log(`[Drouot Monitor] 🔍 Search page detected with query: "${query}"`);
      console.log(`[Drouot Monitor] ⏱️ Will trigger full search in 1.5 seconds...`);

      // Trigger full search after a short delay to let page load
      setTimeout(() => {
        console.log(`[Drouot Monitor] 🚀 Triggering full search now for: "${query}"`);
        handleSearchPage(query);
      }, 1500);
    } else {
      console.warn('[Drouot Monitor] ⚠️ Search page detected but no query extracted!');
    }
  } else {
    console.log('[Drouot Monitor] ℹ️ Not a search page, using normal API interception');
  }
  console.log('[Drouot Monitor] ========================================');
}

// State
let scrapedLots = [];
let lotStates = {};
let isSearching = false;
let currentSearchQuery = null;
let searchProgressIndicator = null;

// Expose debug function globally
window.drouotMonitorDebug = debugPageStructure;

/**
 * Handle search page - perform full search with pagination
 */
async function handleSearchPage(query) {
  // If already searching for the SAME query, skip
  if (isSearching && currentSearchQuery === query) {
    console.log('[Drouot Monitor] Already searching for this query, skipping...');
    return;
  }

  // If searching for a DIFFERENT query, warn that the old search will be interrupted
  if (isSearching && currentSearchQuery !== query) {
    console.log(`[Drouot Monitor] ⚠️ Interrupting search for "${currentSearchQuery}" to search for "${query}"`);
    // The new search will proceed, old one will be abandoned
  }

  isSearching = true;
  currentSearchQuery = query;

  try {
    // Show progress indicator
    showSearchIndicator('Préparation de la recherche...');

    // Clear existing data for this search
    console.log('[Drouot Monitor] Clearing previous search data...');
    await sendToBackground(MessageType.CLEAR_DATA);

    // Perform full search
    let totalResults = 0;
    let processedLots = 0;

    const sendBatchToBackground = async (batch) => {
      if (!batch || batch.length === 0) return;
      await sendToBackground(MessageType.NEW_LOTS, {
        lots: batch,
        isEnriched: true,
        skipFilters: true
      });
    };

    const result = await performFullSearch(query, {}, async (batch, info) => {
      totalResults = info.total;
      processedLots = info.processed;
      await sendBatchToBackground(batch);
      updateSearchIndicator(`Enregistrement de ${processedLots}/${info.total} lots...`);
    });

    if (totalResults === 0 && result?.total) {
      totalResults = result.total;
    }

    // Check if we're still searching for this query (user might have changed it)
    if (currentSearchQuery !== query) {
      console.log('[Drouot Monitor] Query changed during search, abandoning this result');
      return;
    }

    if (totalResults > 0) {
      updateSearchIndicator(`✅ ${processedLots} lots chargés !`, true);

      setTimeout(() => {
        hideSearchIndicator();
      }, 3000);
    } else {
      updateSearchIndicator('Aucun résultat trouvé', true);
      setTimeout(() => {
        hideSearchIndicator();
      }, 3000);
    }

  } catch (error) {
    console.error('[Drouot Monitor] Error during full search:', error);
    updateSearchIndicator(`❌ Erreur: ${error.message}`, true);
    setTimeout(() => {
      hideSearchIndicator();
    }, 5000);
  } finally {
    isSearching = false;
    currentSearchQuery = null;
  }
}

/**
 * Show search progress indicator on page
 */
function showSearchIndicator(message) {
  if (searchProgressIndicator) {
    updateSearchIndicator(message);
    return;
  }

  const indicator = document.createElement('div');
  indicator.className = 'drouot-monitor-search-indicator';
  indicator.innerHTML = `
    <div class="dm-search-content">
      <div class="dm-search-spinner"></div>
      <div class="dm-search-message">${message}</div>
    </div>
  `;

  document.body.appendChild(indicator);
  searchProgressIndicator = indicator;

  // Listen for progress updates
  window.addEventListener('message', handleProgressUpdate);
}

/**
 * Update search indicator message
 */
function updateSearchIndicator(message, isComplete = false) {
  if (!searchProgressIndicator) return;

  const messageEl = searchProgressIndicator.querySelector('.dm-search-message');
  const spinner = searchProgressIndicator.querySelector('.dm-search-spinner');

  if (messageEl) {
    messageEl.textContent = message;
  }

  if (isComplete && spinner) {
    spinner.style.display = 'none';
  }
}

/**
 * Hide search indicator
 */
function hideSearchIndicator() {
  if (searchProgressIndicator) {
    searchProgressIndicator.remove();
    searchProgressIndicator = null;
    window.removeEventListener('message', handleProgressUpdate);
  }
}

/**
 * Handle progress updates from performFullSearch
 */
function handleProgressUpdate(event) {
  if (event.source !== window) return;

  const { data } = event;
  if (!data || data.source !== 'drouot-monitor-search' || data.type !== 'SEARCH_PROGRESS') {
    return;
  }

  const { current, total, currentPage, totalPages } = data.payload;
  const percentage = Math.round((current / total) * 100);

  updateSearchIndicator(`Chargement: ${current}/${total} lots (page ${currentPage}/${totalPages}) - ${percentage}%`);
}

/**
 * Main scraping function
 */
async function scrapePage() {
  console.log('[Drouot Monitor] Starting page scrape...');

  try {
    let lots = [];

    // On detail pages, preserve the active search and do not send new lots
    if (isDetailPage()) {
      console.log('[Drouot Monitor] Detail page detected - preserving current search results');
      return;
    }

    // Otherwise scrape listing page
    lots = scrapeDrouotPage(document);

    if (lots.length === 0) {
      console.log('[Drouot Monitor] Drouot scraper found nothing, trying generic scraper...');

      if (isGenericDetailPage()) {
        console.log('[Drouot Monitor] Generic detail page detected - preserving search results');
        return;
      } else if (isListingPage()) {
        console.log('[Drouot Monitor] Listing page detected');
        lots = scrapeLots(document);
      } else {
        // Generic scraping attempt
        console.log('[Drouot Monitor] Generic page, attempting scrape');
        lots = scrapeLots(document);
      }
    }

    if (lots.length === 0) {
      console.warn('[Drouot Monitor] No lots found on page');
      console.warn('[Drouot Monitor] Run window.drouotMonitorDebug() in console for structure analysis');
      return;
    }

    console.log(`[Drouot Monitor] Found ${lots.length} lots`);
    scrapedLots = lots;

    // Send to background for processing
    const response = await sendToBackground(MessageType.NEW_LOTS, { lots });

    if (response.success) {
      console.log(`[Drouot Monitor] Background processed: ${response.added} new, ${response.updated} updated`);

      // Add visual indicators
      await addBadgesToPage();
    }
  } catch (error) {
    console.error('[Drouot Monitor] Scraping error:', error);

    // Report error to background
    await sendToBackground(MessageType.SCRAPING_ERROR, {
      error: error.message,
      url: window.location.href
    });
  }
}

/**
 * Add visual badges to lots on the page
 */
async function addBadgesToPage() {
  console.log('[Drouot Monitor] Adding badges to page...');

  // Get lot states from background
  const response = await sendToBackground(MessageType.GET_ITEMS, { filter: 'all' });
  if (!response.success) return;

  const allLots = response.items;

  // Create map of lot ID -> state
  lotStates = {};
  for (const lot of allLots) {
    if (lot.state) {
      lotStates[lot.id] = lot.state.state;
    }
  }

  // Find lot containers on page
  const containers = document.querySelectorAll('.lot-item, .auction-lot, [data-lot-id], article[class*="lot"]');

  for (const container of containers) {
    // Find matching scraped lot
    const lot = findLotForContainer(container);
    if (!lot) continue;

    const state = lotStates[lot.id];
    if (!state) continue;

    // Add badge
    addBadge(container, state, lot);

    // Add highlighting
    highlightContainer(container, state);
  }

  console.log(`[Drouot Monitor] Added badges to ${containers.length} containers`);
}

/**
 * Find scraped lot matching a container
 */
function findLotForContainer(container) {
  const titleElement = container.querySelector('h1, h2, h3, .title, .lot-title');
  if (!titleElement) return null;

  const title = titleElement.textContent.trim();

  return scrapedLots.find(lot =>
    lot.title === title || title.includes(lot.title.substring(0, 30))
  );
}

/**
 * Add state badge to container
 */
function addBadge(container, state, lot) {
  // Remove existing badge
  const existingBadge = container.querySelector('.drouot-monitor-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // Create badge
  const badge = document.createElement('div');
  badge.className = 'drouot-monitor-badge';

  switch (state) {
    case ItemState.NEW:
      badge.textContent = '🆕 Nouveau';
      badge.classList.add('dm-new');
      break;
    case ItemState.FAVORITE:
      badge.textContent = '⭐ Favori';
      badge.classList.add('dm-favorite');
      break;
    case ItemState.SEEN:
      badge.textContent = '👀 Vu';
      badge.classList.add('dm-seen');
      break;
    case ItemState.IGNORED:
      badge.classList.add('dm-ignored');
      badge.style.display = 'none';
      break;
  }

  // Add quick action buttons
  const actions = document.createElement('div');
  actions.className = 'drouot-monitor-actions';

  if (state === ItemState.NEW) {
    const seenBtn = createActionButton('✓', 'Marquer comme vu', async () => {
      await sendToBackground(MessageType.UPDATE_STATE, {
        lotId: lot.id,
        state: ItemState.SEEN
      });
      badge.remove();
      highlightContainer(container, ItemState.SEEN);
    });
    actions.appendChild(seenBtn);
  }

  const favBtn = createActionButton(
    state === ItemState.FAVORITE ? '★' : '☆',
    state === ItemState.FAVORITE ? 'Retirer des favoris' : 'Ajouter aux favoris',
    async () => {
      const newState = state === ItemState.FAVORITE ? ItemState.SEEN : ItemState.FAVORITE;
      await sendToBackground(MessageType.UPDATE_STATE, {
        lotId: lot.id,
        state: newState
      });
      await addBadgesToPage(); // Refresh
    }
  );
  actions.appendChild(favBtn);

  badge.appendChild(actions);

  // Position badge
  container.style.position = 'relative';
  container.insertBefore(badge, container.firstChild);
}

/**
 * Create action button
 */
function createActionButton(text, title, onClick) {
  const btn = document.createElement('button');
  btn.className = 'drouot-monitor-action-btn';
  btn.textContent = text;
  btn.title = title;
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };
  return btn;
}

/**
 * Highlight container based on state
 */
function highlightContainer(container, state) {
  // Remove existing highlights
  container.classList.remove('dm-highlight-new', 'dm-highlight-favorite', 'dm-highlight-seen');

  switch (state) {
    case ItemState.NEW:
      container.classList.add('dm-highlight-new');
      break;
    case ItemState.FAVORITE:
      container.classList.add('dm-highlight-favorite');
      break;
    case ItemState.SEEN:
      container.classList.add('dm-highlight-seen');
      break;
  }
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced scrape function
const debouncedScrape = debounce(scrapePage, 500);

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.REFRESH_UI) {
    console.log('[Drouot Monitor] Refreshing UI...');
    addBadgesToPage();
  }
  sendResponse({ success: true });
});

// Scrape on page load (only if NOT using API mode)
if (!useApiMode) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrapePage);
  } else {
    scrapePage();
  }

  // Watch for DOM changes (for SPA navigation)
  const observer = new MutationObserver(debouncedScrape);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} else {
  console.log('[Drouot Monitor] ℹ️ DOM scraping disabled - using API interception only');
}

// Add manual scrape button (for debugging - only in DOM mode)
if (!useApiMode) {
  const button = document.createElement('button');
  button.textContent = '🔄';
  button.title = 'Re-scraper la page';
  button.className = 'drouot-monitor-rescrape-btn';
  button.onclick = scrapePage;
  document.body.appendChild(button);
}

console.log('[Drouot Monitor] Content script initialized');
