import { performFullSearch, isSearchPage, extractSearchQuery } from './content-api.js';
import { sendToBackground } from '../src/services/messaging.js';
import { MessageType, ItemState } from '../src/constants.js';

console.log('[Drouot Monitor] ========================================');
console.log('[Drouot Monitor] Search params:', window.location.search);
console.log('[Drouot Monitor] ========================================');

const isDrouot = window.location.href.includes('drouot.com');
const useApiMode = isDrouot; // Use API mode for Drouot, DOM scraping for others

console.log('[Drouot Monitor] Is Drouot site?', isDrouot);


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

  // Seems unused
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


/**
 * Check if current page is a search page and handle it
 */
function checkAndHandleSearchPage() {
  console.log('[Drouot Monitor] checkAndHandleSearchPage() called');


  const searchPageResult = isSearchPage();

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

  // Find lot containers on page
  const containers = document.querySelectorAll('.lot-item, .auction-lot, [data-lot-id], article[class*="lot"]');

  for (const container of containers) {
    // Find matching scraped lot
    const lot = findLotForContainer(container);
    if (!lot) continue;

    const state = lotStates[lot.id];
    if (!state) continue;
  }

  console.log(`[Drouot Monitor] Added badges to ${containers.length} containers`);


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
    }
  );
  actions.appendChild(favBtn);

  badge.appendChild(actions);

  // Position badge
  container.style.position = 'relative';
  container.insertBefore(badge, container.firstChild);


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
