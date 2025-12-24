import { StorageKey, DEFAULT_PREFERENCES, DEFAULT_FILTERS, ItemState } from '../constants.js';

/**
 * Storage service for chrome.storage.local operations
 * Provides a clean API for all data persistence
 */
class StorageService {
  constructor() {
    this.cache = {
      filters: null,
      preferences: null
    };
  }

  // === LOTS ===

  async getLot(id) {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    return lots[id] || null;
  }

  async getLots(ids) {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    return ids.map(id => lots[id]).filter(Boolean);
  }

  async getAllLots() {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    return Object.values(lots);
  }

  async getAllLotIds() {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    return Object.keys(lots);
  }

  async saveLot(lot) {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    lots[lot.id] = lot;
    await chrome.storage.local.set({ [StorageKey.LOTS]: lots });
  }

  async saveLots(newLots) {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};

    for (const lot of newLots) {
      lots[lot.id] = lot;
    }

    await chrome.storage.local.set({ [StorageKey.LOTS]: lots });
  }

  async updateLot(id, updates) {
    const lot = await this.getLot(id);
    if (!lot) return;

    const updatedLot = { ...lot, ...updates };
    await this.saveLot(updatedLot);
  }

  async deleteLot(id) {
    const result = await chrome.storage.local.get([StorageKey.LOTS]);
    const lots = result[StorageKey.LOTS] || {};
    delete lots[id];
    await chrome.storage.local.set({ [StorageKey.LOTS]: lots });

    // Also delete user state
    await this.deleteUserState(id);
  }

  // === USER STATES ===

  async getUserState(lotId) {
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};
    return states[lotId] || null;
  }

  async getUserStates(lotIds) {
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};
    return lotIds.map(id => states[id]).filter(Boolean);
  }

  async getAllUserStates() {
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};
    return Object.values(states);
  }

  async setUserState(lotId, state) {
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};

    const existingState = states[lotId];
    const now = Date.now();

    const newState = {
      lotId,
      state,
      createdAt: existingState?.createdAt || now,
      lastStateChange: now,
      viewCount: existingState?.viewCount || 0,
      notes: existingState?.notes,
      tags: existingState?.tags
    };

    // Set specific timestamp based on state
    if (state === ItemState.SEEN) {
      newState.viewedAt = now;
      newState.viewCount = (existingState?.viewCount || 0) + 1;
    } else if (state === ItemState.FAVORITE) {
      newState.favoritedAt = now;
    } else if (state === ItemState.IGNORED) {
      newState.ignoredAt = now;
    }

    states[lotId] = newState;
    await chrome.storage.local.set({ [StorageKey.USER_STATES]: states });

    // Update indexes
    await this.updateIndexes(lotId, state);
  }

  async updateUserState(lotId, updates) {
    const state = await this.getUserState(lotId);
    if (!state) return;

    const updatedState = { ...state, ...updates, lastStateChange: Date.now() };
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};
    states[lotId] = updatedState;
    await chrome.storage.local.set({ [StorageKey.USER_STATES]: states });
  }

  async deleteUserState(lotId) {
    const result = await chrome.storage.local.get([StorageKey.USER_STATES]);
    const states = result[StorageKey.USER_STATES] || {};
    delete states[lotId];
    await chrome.storage.local.set({ [StorageKey.USER_STATES]: states });

    // Remove from all indexes
    await this.removeFromIndexes(lotId);
  }

  // === INDEXES ===

  async updateIndexes(lotId, state) {
    // Get all indexes
    const result = await chrome.storage.local.get([
      StorageKey.INDEX_NEW,
      StorageKey.INDEX_SEEN,
      StorageKey.INDEX_FAVORITE,
      StorageKey.INDEX_IGNORED
    ]);

    let newIndex = result[StorageKey.INDEX_NEW] || [];
    let seenIndex = result[StorageKey.INDEX_SEEN] || [];
    let favoriteIndex = result[StorageKey.INDEX_FAVORITE] || [];
    let ignoredIndex = result[StorageKey.INDEX_IGNORED] || [];

    // Remove from all indexes first
    newIndex = newIndex.filter(id => id !== lotId);
    seenIndex = seenIndex.filter(id => id !== lotId);
    favoriteIndex = favoriteIndex.filter(id => id !== lotId);
    ignoredIndex = ignoredIndex.filter(id => id !== lotId);

    // Add to appropriate index
    switch (state) {
      case ItemState.NEW:
        newIndex.push(lotId);
        break;
      case ItemState.SEEN:
        seenIndex.push(lotId);
        break;
      case ItemState.FAVORITE:
        favoriteIndex.push(lotId);
        break;
      case ItemState.IGNORED:
        ignoredIndex.push(lotId);
        break;
    }

    await chrome.storage.local.set({
      [StorageKey.INDEX_NEW]: newIndex,
      [StorageKey.INDEX_SEEN]: seenIndex,
      [StorageKey.INDEX_FAVORITE]: favoriteIndex,
      [StorageKey.INDEX_IGNORED]: ignoredIndex
    });
  }

  async removeFromIndexes(lotId) {
    const result = await chrome.storage.local.get([
      StorageKey.INDEX_NEW,
      StorageKey.INDEX_SEEN,
      StorageKey.INDEX_FAVORITE,
      StorageKey.INDEX_IGNORED
    ]);

    await chrome.storage.local.set({
      [StorageKey.INDEX_NEW]: (result[StorageKey.INDEX_NEW] || []).filter(id => id !== lotId),
      [StorageKey.INDEX_SEEN]: (result[StorageKey.INDEX_SEEN] || []).filter(id => id !== lotId),
      [StorageKey.INDEX_FAVORITE]: (result[StorageKey.INDEX_FAVORITE] || []).filter(id => id !== lotId),
      [StorageKey.INDEX_IGNORED]: (result[StorageKey.INDEX_IGNORED] || []).filter(id => id !== lotId)
    });
  }

  // === QUERIES ===

  async getNewItems() {
    const result = await chrome.storage.local.get([StorageKey.INDEX_NEW]);
    const newIds = result[StorageKey.INDEX_NEW] || [];

    const lots = await this.getLots(newIds);
    const states = await this.getUserStates(newIds);

    return lots.map(lot => ({
      ...lot,
      state: states.find(s => s.lotId === lot.id)
    }));
  }

  async getSeenItems() {
    const result = await chrome.storage.local.get([StorageKey.INDEX_SEEN]);
    const seenIds = result[StorageKey.INDEX_SEEN] || [];

    const lots = await this.getLots(seenIds);
    const states = await this.getUserStates(seenIds);

    return lots.map(lot => ({
      ...lot,
      state: states.find(s => s.lotId === lot.id)
    }));
  }

  async getFavoriteItems() {
    const result = await chrome.storage.local.get([StorageKey.INDEX_FAVORITE]);
    const favIds = result[StorageKey.INDEX_FAVORITE] || [];

    const lots = await this.getLots(favIds);
    const states = await this.getUserStates(favIds);

    return lots.map(lot => ({
      ...lot,
      state: states.find(s => s.lotId === lot.id)
    }));
  }

  async getIgnoredItems() {
    const result = await chrome.storage.local.get([StorageKey.INDEX_IGNORED]);
    const ignoredIds = result[StorageKey.INDEX_IGNORED] || [];

    const lots = await this.getLots(ignoredIds);
    const states = await this.getUserStates(ignoredIds);

    return lots.map(lot => ({
      ...lot,
      state: states.find(s => s.lotId === lot.id)
    }));
  }

  // === FILTERS ===

  async getFilters() {
    if (this.cache.filters) return this.cache.filters;

    const result = await chrome.storage.local.get([StorageKey.FILTERS]);
    const storedFilters = result[StorageKey.FILTERS] || {};
    const filters = { ...DEFAULT_FILTERS, ...storedFilters };

    this.cache.filters = filters;
    return filters;
  }

  async saveFilters(filters) {
    this.cache.filters = filters;
    await chrome.storage.local.set({ [StorageKey.FILTERS]: filters });
  }

  // === PREFERENCES ===

  async getPreferences() {
    if (this.cache.preferences) return this.cache.preferences;

    const result = await chrome.storage.local.get([StorageKey.PREFERENCES]);
    const prefs = result[StorageKey.PREFERENCES] || DEFAULT_PREFERENCES;

    this.cache.preferences = prefs;
    return prefs;
  }

  async savePreferences(prefs) {
    this.cache.preferences = prefs;
    await chrome.storage.local.set({ [StorageKey.PREFERENCES]: prefs });
  }

  // === METADATA ===

  async getMetadata() {
    const result = await chrome.storage.local.get([StorageKey.METADATA]);
    return result[StorageKey.METADATA] || {
      version: '1.0.0',
      lastSync: Date.now(),
      totalLots: 0,
      newCount: 0,
      seenCount: 0,
      favoriteCount: 0,
      ignoredCount: 0
    };
  }

  async updateMetadata(updates) {
    const metadata = await this.getMetadata();
    const updated = { ...metadata, ...updates, lastSync: Date.now() };
    await chrome.storage.local.set({ [StorageKey.METADATA]: updated });
  }

  async updateCounts() {
    const result = await chrome.storage.local.get([
      StorageKey.INDEX_NEW,
      StorageKey.INDEX_SEEN,
      StorageKey.INDEX_FAVORITE,
      StorageKey.INDEX_IGNORED,
      StorageKey.LOTS
    ]);

    const lots = result[StorageKey.LOTS] || {};

    await this.updateMetadata({
      totalLots: Object.keys(lots).length,
      newCount: (result[StorageKey.INDEX_NEW] || []).length,
      seenCount: (result[StorageKey.INDEX_SEEN] || []).length,
      favoriteCount: (result[StorageKey.INDEX_FAVORITE] || []).length,
      ignoredCount: (result[StorageKey.INDEX_IGNORED] || []).length
    });
  }

  // === CLEANUP ===

  async cleanupOldItems(olderThanDays = 90) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const allLots = await this.getAllLots();
    const allStates = await this.getAllUserStates();

    let deletedCount = 0;

    for (const lot of allLots) {
      const state = allStates.find(s => s.lotId === lot.id);

      // Keep if:
      // 1. Auction is in the future
      if (lot.auctionDate > Date.now()) continue;

      // 2. Item is FAVORITE
      if (state?.state === ItemState.FAVORITE) continue;

      // 3. Item was recently active
      if (state?.lastStateChange > cutoff) continue;

      // Otherwise, delete
      await this.deleteLot(lot.id);
      deletedCount++;
    }

    await this.updateCounts();
    await this.updateMetadata({ lastCleanup: Date.now() });

    return deletedCount;
  }

  async clearAllData() {
    await chrome.storage.local.clear();
    this.cache = { filters: null, preferences: null };
  }

  async clearLots() {
    const filters = await this.getFilters();
    const prefs = await this.getPreferences();

    await chrome.storage.local.clear();

    await chrome.storage.local.set({
      [StorageKey.FILTERS]: filters,
      [StorageKey.PREFERENCES]: prefs
    });

    this.cache = {
      filters,
      preferences: prefs
    };

    await this.updateCounts();
  }

  // === INITIALIZATION ===

  async initialize() {
    // Set defaults if first run
    const filters = await this.getFilters();
    if (!filters.lastUpdated) {
      await this.saveFilters(DEFAULT_FILTERS);
    }

    const prefs = await this.getPreferences();
    if (!prefs.installedAt) {
      await this.savePreferences(DEFAULT_PREFERENCES);
    }

    // Initialize metadata
    await this.updateCounts();
  }
}

// Export singleton instance
export const storage = new StorageService();
