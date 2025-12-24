// Item states
export const ItemState = {
  NEW: 'NEW',
  SEEN: 'SEEN',
  FAVORITE: 'FAVORITE',
  IGNORED: 'IGNORED'
};

// Message types for chrome.runtime messaging
export const MessageType = {
  NEW_LOTS: 'NEW_LOTS',
  UPDATE_STATE: 'UPDATE_STATE',
  GET_NEW_COUNT: 'GET_NEW_COUNT',
  GET_ITEMS: 'GET_ITEMS',
  UPDATE_FILTERS: 'UPDATE_FILTERS',
  SCRAPING_ERROR: 'SCRAPING_ERROR',
  REFRESH_UI: 'REFRESH_UI',
  FETCH_AUCTION_HOUSE_PAGE: 'FETCH_AUCTION_HOUSE_PAGE',
  CLEAR_DATA: 'CLEAR_DATA',
  FULL_SEARCH: 'FULL_SEARCH'
};

// Storage keys
export const StorageKey = {
  LOTS: 'lots',
  USER_STATES: 'userStates',
  FILTERS: 'filters',
  PREFERENCES: 'preferences',
  METADATA: 'metadata',
  INDEX_NEW: 'index:new',
  INDEX_SEEN: 'index:seen',
  INDEX_FAVORITE: 'index:favorite',
  INDEX_IGNORED: 'index:ignored'
};

// Default user preferences
export const DEFAULT_PREFERENCES = {
  theme: 'auto',
  language: 'fr',
  notificationsEnabled: true,
  notifyOnNewMatch: true,
  notifyOnHighScore: true,
  highScoreThreshold: 80,
  itemsPerPage: 20,
  sortBy: 'score',
  sortOrder: 'desc',
  showSeenItems: false,
  highlightMatchingItems: true,
  hideNonMatchingItems: false,
  showBadgesOnPage: true,
  autoCleanupDays: 90,
  maxStoredItems: 10000,
  version: '1.0.0',
  installedAt: Date.now(),
  lastActive: Date.now()
};

// Default filters
export const DEFAULT_FILTERS = {
  categories: [],
  includeKeywords: [],
  excludeKeywords: [],
  cities: [],
  sortMode: 'default',
  priceMin: 0,
  priceMax: 999999,
  dateFrom: Date.now(),
  dateTo: Date.now() + (365 * 24 * 60 * 60 * 1000), // +1 year
  auctionHouses: [],
  onlyWithImages: false,
  minMatchScore: 0,
  enabled: true,
  lastUpdated: Date.now()
};

// Common Drouot categories
export const DROUOT_CATEGORIES = [
  'Mobilier',
  'Objets d\'art',
  'Tableaux',
  'Art Contemporain',
  'Bijoux',
  'Montres',
  'Livres',
  'Vins & Spiritueux',
  'Arts de la table',
  'Argenterie',
  'Haute Epoque',
  'Arts Décoratifs',
  'Céramique',
  'Sculpture',
  'Dessins',
  'Photographie',
  'Mode & Accessoires',
  'Jouets',
  'Instruments de musique',
  'Armes anciennes'
];

// Common auction houses (will be learned from scraped data)
export const KNOWN_AUCTION_HOUSES = [
  'Artcurial',
  'Drouot Estimations',
  'Ader',
  'Tajan',
  'Cornette de Saint Cyr',
  'Millon',
  'Aguttes',
  'Piasa'
];
