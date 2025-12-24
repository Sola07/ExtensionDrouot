import { storage } from './src/services/storage.js';
import { matchesFilters, calculateMatchScore, getMatchReasons, areFiltersEmpty } from './src/services/filter.js';
import { sendToAllTabs, sendToPopup } from './src/services/messaging.js';
import { MessageType, ItemState } from './src/constants.js';

console.log('[Drouot Monitor] Background service worker started');

// Initialize storage on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Drouot Monitor] Extension installed/updated');
  await storage.initialize();
  await updateBadge();
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Drouot Monitor] Received message:', message.type);

  switch (message.type) {
    case MessageType.NEW_LOTS:
      handleNewLots(message.lots, message.isEnriched, message.skipFilters).then(sendResponse);
      return true; // Async response

    case MessageType.UPDATE_STATE:
      handleUpdateState(message.lotId, message.state).then(sendResponse);
      return true;

    case MessageType.GET_NEW_COUNT:
      getNewCount().then(sendResponse);
      return true;

    case MessageType.GET_ITEMS:
      getItems(message.filter).then(sendResponse);
      return true;

    case MessageType.UPDATE_FILTERS:
      handleUpdateFilters(message.filters).then(sendResponse);
      return true;

    case MessageType.SCRAPING_ERROR:
      handleScrapingError(message).then(sendResponse);
      return true;

    case MessageType.FETCH_AUCTION_HOUSE_PAGE:
      handleFetchAuctionHousePage(message.url).then(sendResponse);
      return true;

    case MessageType.CLEAR_DATA:
      handleClearAllLots().then(sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Process new lots from content script
 */
async function handleNewLots(newLots, isEnriched = false, skipFilters = false) {
  console.log(`[Drouot Monitor] Processing ${newLots.length} ${isEnriched ? 'enriched' : 'new'} lots${skipFilters ? ' (no filtering)' : ''}`);

  try {
    // Get existing lots and filters
    const existingIds = await storage.getAllLotIds();
    const filters = await storage.getFilters();

    let addedCount = 0;
    let updatedCount = 0;
    let enrichedCount = 0;

    for (const lot of newLots) {
      const exists = existingIds.includes(lot.id);

      if (exists) {
        // If this is enriched data from detail page, merge with existing
        if (isEnriched && lot.detailScrapedAt) {
          const existingLot = await storage.getLot(lot.id);

          // Merge enriched data with existing data
          const enrichedLot = {
            ...existingLot,
            ...lot,
            // Preserve original timestamps
            firstSeenAt: existingLot.firstSeenAt,
            // Update only if we have better data
            auctionHouse: lot.auctionHouse !== 'Drouot' ? lot.auctionHouse : existingLot.auctionHouse,
            description: lot.description || existingLot.description,
            category: lot.category || existingLot.category,
            estimateMin: lot.estimateMin > 0 ? lot.estimateMin : existingLot.estimateMin,
            estimateMax: lot.estimateMax > 0 ? lot.estimateMax : existingLot.estimateMax,
            lastSeenAt: Date.now()
          };

          // Recalculate score with enriched data
          enrichedLot.matchScore = calculateMatchScore(enrichedLot, filters);
          enrichedLot.matchReason = getMatchReasons(enrichedLot, filters);

          await storage.saveLot(enrichedLot);
          enrichedCount++;

          console.log(`[Drouot Monitor] ✨ Enriched lot: ${enrichedLot.title}`);
          console.log(`[Drouot Monitor] 🏛️ Auction house: ${enrichedLot.auctionHouse}`);
          console.log(`[Drouot Monitor] 💰 Price: ${enrichedLot.estimateMin}-${enrichedLot.estimateMax}€`);
        } else {
          // Just update lastSeenAt for existing lot
          await storage.updateLot(lot.id, { lastSeenAt: Date.now() });
          updatedCount++;
        }
      } else {
        // New lot - check if it matches filters (unless skipFilters is true)
        const matches = skipFilters || matchesFilters(lot, filters);

        if (matches || skipFilters) {
          // Calculate score and reasons
          lot.matchScore = calculateMatchScore(lot, filters);
          lot.matchReason = getMatchReasons(lot, filters);

          // Save lot
          await storage.saveLot(lot);

          // Create NEW user state
          await storage.setUserState(lot.id, ItemState.NEW);

          addedCount++;

          if (addedCount <= 5 || addedCount % 50 === 0) {
            console.log(`[Drouot Monitor] New lot ${addedCount}: ${lot.title}`);
          }

          // Check for high-score notification (only if not skipping filters)
          if (!skipFilters) {
            const prefs = await storage.getPreferences();
            if (prefs.notifyOnHighScore && lot.matchScore >= prefs.highScoreThreshold) {
              showNotification(lot);
            }
          }
        }
      }
    }

    // Update counts and badge
    await storage.updateCounts();
    await updateBadge();

    // Notify UI to refresh
    await sendToAllTabs(MessageType.REFRESH_UI);
    await sendToPopup(MessageType.REFRESH_UI);

    if (enrichedCount > 0) {
      console.log(`[Drouot Monitor] ✨ Enriched ${enrichedCount} lots with detail data`);
    }
    console.log(`[Drouot Monitor] Added ${addedCount} new lots, updated ${updatedCount} existing lots`);

    return {
      success: true,
      added: addedCount,
      updated: updatedCount,
      enriched: enrichedCount
    };
  } catch (error) {
    console.error('[Drouot Monitor] Error processing new lots:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update item state (NEW -> SEEN, etc.)
 */
async function handleUpdateState(lotId, newState) {
  console.log(`[Drouot Monitor] Updating state for ${lotId} to ${newState}`);

  try {
    await storage.setUserState(lotId, newState);
    await storage.updateCounts();
    await updateBadge();

    // Notify UI to refresh
    await sendToAllTabs(MessageType.REFRESH_UI, { lotId, state: newState });
    await sendToPopup(MessageType.REFRESH_UI, { lotId, state: newState });

    return { success: true };
  } catch (error) {
    console.error('[Drouot Monitor] Error updating state:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get count of NEW items
 */
async function getNewCount() {
  const metadata = await storage.getMetadata();
  return { count: metadata.newCount };
}

/**
 * Get items by filter
 */
async function getItems(filter = 'new') {
  try {
    let items = [];
    const filters = await storage.getFilters();

    switch (filter) {
      case 'new':
        items = await storage.getNewItems();
        break;
      case 'seen':
        items = await storage.getSeenItems();
        break;
      case 'favorite':
        items = await storage.getFavoriteItems();
        break;
      case 'all':
        items = await storage.getAllLots();
        break;
      default:
        items = await storage.getNewItems();
    }

    const filtersActive = filters.enabled && !areFiltersEmpty(filters);
    const shouldApplyFilters = filtersActive && (filter === 'new' || filter === 'all');
    if (shouldApplyFilters) {
      items = items.filter(item => matchesFilters(item, filters));
    }

    if (filter === 'all') {
      items = items.sort((a, b) => {
        const orderA = a.listOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.listOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA === orderB) {
          return (a.firstSeenAt || 0) - (b.firstSeenAt || 0);
        }
        return orderA - orderB;
      });
    }

    return { success: true, items };
  } catch (error) {
    console.error('[Drouot Monitor] Error getting items:', error);
    return { success: false, error: error.message, items: [] };
  }
}

/**
 * Update filters
 */
async function handleUpdateFilters(filters) {
  console.log('[Drouot Monitor] Updating filters');

  try {
    await storage.saveFilters(filters);

    // Re-evaluate all lots against new filters
    await reEvaluateAllLots();

    return { success: true };
  } catch (error) {
    console.error('[Drouot Monitor] Error updating filters:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Re-evaluate all lots against current filters
 */
async function reEvaluateAllLots() {
  console.log('[Drouot Monitor] Re-evaluating all lots...');

  const allLots = await storage.getAllLots();
  const filters = await storage.getFilters();

  for (const lot of allLots) {
    const matches = matchesFilters(lot, filters);

    if (matches) {
      // Recalculate score
      const matchScore = calculateMatchScore(lot, filters);
      const matchReason = getMatchReasons(lot, filters);

      await storage.updateLot(lot.id, { matchScore, matchReason });

      // If lot doesn't have a state yet, create NEW state
      const state = await storage.getUserState(lot.id);
      if (!state) {
        await storage.setUserState(lot.id, ItemState.NEW);
      }
    }
  }

  await storage.updateCounts();
  await updateBadge();

  console.log('[Drouot Monitor] Re-evaluation complete');
}

/**
 * Handle scraping error
 */
async function handleScrapingError(errorData) {
  console.error('[Drouot Monitor] Scraping error:', errorData);

  // Could log to analytics or show notification
  // For now, just log

  return { success: true };
}

/**
 * Fetch auction house page HTML (bypasses CORS from content script)
 */
async function handleFetchAuctionHousePage(url) {
  console.log(`[Drouot Monitor] Background fetching: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[Drouot Monitor] Fetch failed with status: ${response.status}`);
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }

    const html = await response.text();

    return {
      success: true,
      html: html
    };

  } catch (error) {
    console.error('[Drouot Monitor] Error fetching page:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleClearAllLots() {
  try {
    await storage.clearLots();
    await updateBadge();
    await sendToAllTabs(MessageType.REFRESH_UI);
    await sendToPopup(MessageType.REFRESH_UI);
    return { success: true };
  } catch (error) {
    console.error('[Drouot Monitor] Error clearing lots:', error);
    return { success: false, error: error.message };
  }
}

/** 
 * Update extension badge with NEW count
 */
async function updateBadge() {
  const metadata = await storage.getMetadata();
  const count = metadata.newCount;

  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF6B6B' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Show notification for high-score lot
 */
async function showNotification(lot) {
  const prefs = await storage.getPreferences();

  if (!prefs.notificationsEnabled) return;

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon128.png',
      title: 'Nouveau lot intéressant !',
      message: `${lot.title}\nEstimation: ${lot.estimateMin}-${lot.estimateMax}€\nScore: ${lot.matchScore}`,
      priority: 2
    });
  } catch (e) {
    console.error('[Drouot Monitor] Error showing notification:', e);
  }
}

/**
 * Schedule periodic cleanup
 */
chrome.alarms.create('cleanup', { periodInMinutes: 60 * 24 }); // Daily

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    console.log('[Drouot Monitor] Running scheduled cleanup');
    const prefs = await storage.getPreferences();
    const deletedCount = await storage.cleanupOldItems(prefs.autoCleanupDays);
    console.log(`[Drouot Monitor] Cleaned up ${deletedCount} old items`);
  }
});

// Update badge on startup
updateBadge();
