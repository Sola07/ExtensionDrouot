import { scrapeLots, isListingPage, isDetailPage as isGenericDetailPage, scrapeSingleLot } from '../src/services/scraper.js';
import { scrapeDrouotPage, debugPageStructure } from '../src/services/scraper-drouot.js';
import { isDetailPage, scrapeDetailPage } from '../src/services/scraper-detail.js';
import { setupApiInterception, setupXhrInterception } from './content-api.js';
import { sendToBackground } from '../src/services/messaging.js';
import { MessageType, ItemState } from '../src/constants.js';

console.log('[Drouot Monitor] Content script loaded on', window.location.href);

// Setup API interception on Drouot
if (window.location.href.includes('drouot.com')) {
  console.log('[Drouot Monitor] 🚀 Activating API interception mode');
  setupApiInterception();
  setupXhrInterception();
}

// State
let scrapedLots = [];
let lotStates = {};

// Expose debug function globally
window.drouotMonitorDebug = debugPageStructure;

/**
 * Main scraping function
 */
async function scrapePage() {
  console.log('[Drouot Monitor] Starting page scrape...');

  try {
    let lots = [];

    // Check if this is a detail page first
    if (isDetailPage()) {
      console.log('[Drouot Monitor] ✨ Detail page detected - enriching data...');
      const detailLot = scrapeDetailPage(document);

      if (detailLot) {
        lots = [detailLot];

        // Send enriched data to background
        await sendToBackground(MessageType.NEW_LOTS, {
          lots,
          isEnriched: true
        });

        console.log('[Drouot Monitor] ✅ Detail data scraped and sent for enrichment');
        return;
      }
    }

    // Otherwise scrape listing page
    lots = scrapeDrouotPage(document);

    if (lots.length === 0) {
      console.log('[Drouot Monitor] Drouot scraper found nothing, trying generic scraper...');

      if (isGenericDetailPage()) {
        console.log('[Drouot Monitor] Generic detail page detected');
        const lot = scrapeSingleLot(document);
        if (lot) lots = [lot];
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

// Scrape on page load
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

// Add manual scrape button (for debugging)
if (window.location.href.includes('drouot.com')) {
  const button = document.createElement('button');
  button.textContent = '🔄';
  button.title = 'Re-scraper la page';
  button.className = 'drouot-monitor-rescrape-btn';
  button.onclick = scrapePage;
  document.body.appendChild(button);
}

console.log('[Drouot Monitor] Content script initialized');
