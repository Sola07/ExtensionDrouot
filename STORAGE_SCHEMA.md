# Storage Schema - Drouot Monitor

## Overview

The extension uses `chrome.storage.local` for all data persistence. This provides:
- Unlimited storage quota (unlike localStorage's 5-10MB limit)
- Async API for better performance
- Automatic syncing with Chrome's IndexedDB backend
- No server required for MVP

## 1. Storage Structure

```typescript
// Root storage structure
{
  "lots": {
    [lotId: string]: Lot
  },
  "userStates": {
    [lotId: string]: UserState
  },
  "filters": UserFilters,
  "preferences": UserPreferences,
  "metadata": StorageMetadata
}
```

## 2. Data Models

### 2.1 Lot (Scraped Item)

```typescript
interface Lot {
  // Identification
  id: string;                    // Unique ID (hash of externalId + auctionHouse)
  externalId: string;            // Drouot's lot ID
  url: string;                   // Direct link to lot page

  // Core data
  title: string;
  description: string;
  category: string;              // e.g., "Mobilier", "Art Contemporain"

  // Pricing
  estimateMin: number;           // In EUR
  estimateMax: number;           // In EUR
  currency: string;              // Default: "EUR"

  // Auction details
  auctionDate: number;           // Unix timestamp (ms)
  auctionHouse: string;          // "Maison de vente" - KEY CUSTOM FIELD
  auctionLocation?: string;      // Optional location

  // Media
  imageUrl?: string;             // Main image URL
  images?: string[];             // Additional images

  // Metadata
  firstSeenAt: number;           // Unix timestamp (ms)
  lastSeenAt: number;            // Unix timestamp (ms)
  scrapedFrom: string;           // URL where it was found

  // Matching
  matchScore?: number;           // Optional scoring (0-100)
  matchReason?: string[];        // Why it matched filters
}

// Example
{
  "id": "drouot_12345_artcurial",
  "externalId": "12345",
  "url": "https://www.drouot.com/l/12345",
  "title": "Fauteuil Louis XVI en bois doré",
  "description": "Fauteuil d'époque Louis XVI en bois doré...",
  "category": "Mobilier",
  "estimateMin": 800,
  "estimateMax": 1200,
  "currency": "EUR",
  "auctionDate": 1735689600000,
  "auctionHouse": "Artcurial",
  "auctionLocation": "Paris",
  "imageUrl": "https://drouot.com/images/12345.jpg",
  "firstSeenAt": 1703001600000,
  "lastSeenAt": 1703001600000,
  "scrapedFrom": "https://www.drouot.com/ventes/123",
  "matchScore": 85,
  "matchReason": ["Category: Mobilier", "Price range: 800-1200€"]
}
```

### 2.2 UserState (Per-User Item State)

```typescript
type ItemState = "NEW" | "SEEN" | "FAVORITE" | "IGNORED";

interface UserState {
  lotId: string;                 // Reference to Lot.id
  state: ItemState;              // Current state

  // Timestamps
  createdAt: number;             // When first became NEW
  viewedAt?: number;             // When marked SEEN
  favoritedAt?: number;          // When marked FAVORITE
  ignoredAt?: number;            // When marked IGNORED

  // User notes
  notes?: string;                // Optional user notes
  tags?: string[];               // Custom user tags

  // Tracking
  viewCount: number;             // How many times viewed
  lastStateChange: number;       // Last state transition timestamp
}

// Example
{
  "lotId": "drouot_12345_artcurial",
  "state": "NEW",
  "createdAt": 1703001600000,
  "lastStateChange": 1703001600000,
  "viewCount": 0
}
```

### 2.3 UserFilters

```typescript
interface UserFilters {
  // Categories (multi-select)
  categories: string[];          // e.g., ["Mobilier", "Art Contemporain"]

  // Keywords
  includeKeywords: string[];     // OR logic: match ANY
  excludeKeywords: string[];     // AND logic: exclude ALL

  // Price range
  priceMin: number;              // In EUR
  priceMax: number;              // In EUR

  // Date range
  dateFrom: number;              // Unix timestamp (ms)
  dateTo: number;                // Unix timestamp (ms)

  // Auction houses (custom filter!)
  auctionHouses: string[];       // e.g., ["Artcurial", "Sotheby's"]

  // Advanced (optional)
  excludeCategories?: string[];  // Explicitly exclude categories
  onlyWithImages?: boolean;      // Only show lots with images
  minMatchScore?: number;        // Minimum score (0-100)

  // Metadata
  enabled: boolean;              // Quick enable/disable all filters
  lastUpdated: number;           // When filters were last changed
}

// Example - Default filters
{
  "categories": ["Mobilier", "Arts de la table"],
  "includeKeywords": ["louis xvi", "empire", "baccarat"],
  "excludeKeywords": ["reproduction", "style de"],
  "priceMin": 100,
  "priceMax": 5000,
  "dateFrom": 1703001600000,     // Today
  "dateTo": 1735689600000,       // +1 year
  "auctionHouses": ["Artcurial", "Drouot Estimations"],
  "onlyWithImages": true,
  "minMatchScore": 50,
  "enabled": true,
  "lastUpdated": 1703001600000
}
```

### 2.4 UserPreferences

```typescript
interface UserPreferences {
  // UI preferences
  theme: "light" | "dark" | "auto";
  language: "fr" | "en";

  // Notifications
  notificationsEnabled: boolean;
  notifyOnNewMatch: boolean;
  notifyOnHighScore: boolean;     // Items with score > threshold
  highScoreThreshold: number;     // Default: 80

  // Display
  itemsPerPage: number;           // Pagination size
  sortBy: "date" | "price" | "score" | "auctionDate";
  sortOrder: "asc" | "desc";
  showSeenItems: boolean;         // Show SEEN items in main list

  // Content script
  highlightMatchingItems: boolean;
  hideNonMatchingItems: boolean;
  showBadgesOnPage: boolean;

  // Data management
  autoCleanupDays: number;        // Delete items older than X days
  maxStoredItems: number;         // Max items to keep (default: 10000)

  // Metadata
  version: string;                // App version
  installedAt: number;            // Installation timestamp
  lastActive: number;             // Last activity timestamp
}

// Example
{
  "theme": "auto",
  "language": "fr",
  "notificationsEnabled": true,
  "notifyOnNewMatch": true,
  "notifyOnHighScore": true,
  "highScoreThreshold": 80,
  "itemsPerPage": 20,
  "sortBy": "score",
  "sortOrder": "desc",
  "showSeenItems": false,
  "highlightMatchingItems": true,
  "hideNonMatchingItems": false,
  "showBadgesOnPage": true,
  "autoCleanupDays": 90,
  "maxStoredItems": 10000,
  "version": "1.0.0",
  "installedAt": 1703001600000,
  "lastActive": 1703001600000
}
```

### 2.5 StorageMetadata

```typescript
interface StorageMetadata {
  version: string;               // Schema version
  lastSync: number;              // Last storage operation
  totalLots: number;             // Count of stored lots
  newCount: number;              // Count of NEW items
  seenCount: number;             // Count of SEEN items
  favoriteCount: number;         // Count of FAVORITE items
  ignoredCount: number;          // Count of IGNORED items

  // Performance
  lastCleanup: number;           // Last cleanup run
  storageUsed: number;           // Bytes used (approximate)

  // Stats
  totalScraped: number;          // Total lots scraped (all time)
  lastScrapedAt: number;         // Last scraping timestamp
  scrapedPages: number;          // Pages scraped (session)
}

// Example
{
  "version": "1.0.0",
  "lastSync": 1703001600000,
  "totalLots": 234,
  "newCount": 12,
  "seenCount": 200,
  "favoriteCount": 8,
  "ignoredCount": 14,
  "lastCleanup": 1702915200000,
  "storageUsed": 524288,
  "totalScraped": 1523,
  "lastScrapedAt": 1703001600000,
  "scrapedPages": 15
}
```

## 3. Storage Operations

### 3.1 Core Operations

```typescript
// Storage service interface
interface StorageService {
  // Lots
  getLot(id: string): Promise<Lot | null>;
  getLots(ids: string[]): Promise<Lot[]>;
  getAllLots(): Promise<Lot[]>;
  saveLot(lot: Lot): Promise<void>;
  saveLots(lots: Lot[]): Promise<void>;
  deleteLot(id: string): Promise<void>;

  // User states
  getUserState(lotId: string): Promise<UserState | null>;
  getUserStates(lotIds: string[]): Promise<UserState[]>;
  getAllUserStates(): Promise<UserState[]>;
  setUserState(lotId: string, state: ItemState): Promise<void>;
  updateUserState(lotId: string, updates: Partial<UserState>): Promise<void>;

  // Filters
  getFilters(): Promise<UserFilters>;
  saveFilters(filters: UserFilters): Promise<void>;

  // Preferences
  getPreferences(): Promise<UserPreferences>;
  savePreferences(prefs: UserPreferences): Promise<void>;

  // Queries
  getNewItems(): Promise<Array<Lot & { state: UserState }>>;
  getSeenItems(): Promise<Array<Lot & { state: UserState }>>;
  getFavoriteItems(): Promise<Array<Lot & { state: UserState }>>;
  getMatchingItems(filters: UserFilters): Promise<Lot[]>;

  // Cleanup
  cleanupOldItems(olderThanDays: number): Promise<number>;
  clearAllData(): Promise<void>;

  // Metadata
  getMetadata(): Promise<StorageMetadata>;
  updateMetadata(updates: Partial<StorageMetadata>): Promise<void>;
}
```

### 3.2 Indexing Strategy

For fast queries, we'll maintain separate indexes:

```typescript
// Storage keys
{
  "lots": { [id]: Lot },           // Main lot storage
  "userStates": { [lotId]: UserState }, // User states

  // Indexes for fast lookup
  "index:new": string[],           // Array of lot IDs with NEW state
  "index:seen": string[],          // Array of lot IDs with SEEN state
  "index:favorite": string[],      // Array of lot IDs with FAVORITE state
  "index:ignored": string[],       // Array of lot IDs with IGNORED state

  "index:byDate": string[],        // Sorted by firstSeenAt (DESC)
  "index:byAuctionDate": string[], // Sorted by auctionDate (ASC)
  "index:byScore": string[],       // Sorted by matchScore (DESC)

  "filters": UserFilters,
  "preferences": UserPreferences,
  "metadata": StorageMetadata
}
```

### 3.3 Deduplication Logic

```typescript
function generateLotId(lot: Partial<Lot>): string {
  // Use external ID + auction house to ensure uniqueness
  // Same lot can appear on different auction houses
  const raw = `${lot.externalId}_${lot.auctionHouse}`;
  return `drouot_${hashString(raw)}`;
}

function isDuplicate(newLot: Lot, existingLots: Lot[]): boolean {
  // Check by ID first
  if (existingLots.some(l => l.id === newLot.id)) return true;

  // Fuzzy match by title + auction date (in case ID changes)
  return existingLots.some(l =>
    similarityScore(l.title, newLot.title) > 0.9 &&
    Math.abs(l.auctionDate - newLot.auctionDate) < 86400000 // 1 day
  );
}
```

## 4. Migration Strategy

For future schema changes:

```typescript
interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (oldData: any) => Promise<any>;
}

const migrations: Migration[] = [
  {
    fromVersion: "1.0.0",
    toVersion: "1.1.0",
    migrate: async (data) => {
      // Example: Add new field to all lots
      const lots = data.lots || {};
      Object.values(lots).forEach((lot: any) => {
        lot.newField = "default value";
      });
      return data;
    }
  }
];

async function runMigrations(currentVersion: string) {
  const data = await chrome.storage.local.get(null);
  let version = data.metadata?.version || "1.0.0";

  for (const migration of migrations) {
    if (version === migration.fromVersion) {
      const migratedData = await migration.migrate(data);
      await chrome.storage.local.set(migratedData);
      version = migration.toVersion;
    }
  }
}
```

## 5. Storage Limits & Cleanup

### 5.1 Quota Management

- `chrome.storage.local`: UNLIMITED (Manifest V3)
- Typical usage estimate:
  - 1 lot = ~2KB (with description + image URL)
  - 10,000 lots = ~20MB
  - Safe to store years of data

### 5.2 Cleanup Rules

```typescript
async function cleanupOldItems(days: number = 90) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const allLots = await getAllLots();
  const allStates = await getAllUserStates();

  const toDelete = allLots.filter(lot => {
    const state = allStates.find(s => s.lotId === lot.id);

    // Keep if:
    // 1. Auction is in the future
    if (lot.auctionDate > Date.now()) return false;

    // 2. Item is FAVORITE
    if (state?.state === "FAVORITE") return false;

    // 3. Item was recently active
    if (state?.lastStateChange > cutoff) return false;

    // Otherwise, delete
    return true;
  });

  for (const lot of toDelete) {
    await deleteLot(lot.id);
  }

  return toDelete.length;
}
```

## 6. Example Storage Contents

```json
{
  "lots": {
    "drouot_abc123_artcurial": {
      "id": "drouot_abc123_artcurial",
      "externalId": "abc123",
      "title": "Fauteuil Louis XVI",
      "category": "Mobilier",
      "estimateMin": 800,
      "estimateMax": 1200,
      "auctionDate": 1735689600000,
      "auctionHouse": "Artcurial",
      "firstSeenAt": 1703001600000,
      "lastSeenAt": 1703001600000,
      "url": "https://drouot.com/l/abc123"
    }
  },
  "userStates": {
    "drouot_abc123_artcurial": {
      "lotId": "drouot_abc123_artcurial",
      "state": "NEW",
      "createdAt": 1703001600000,
      "lastStateChange": 1703001600000,
      "viewCount": 0
    }
  },
  "index:new": ["drouot_abc123_artcurial"],
  "index:seen": [],
  "index:favorite": [],
  "filters": {
    "categories": ["Mobilier"],
    "includeKeywords": ["louis xvi"],
    "excludeKeywords": ["reproduction"],
    "priceMin": 100,
    "priceMax": 5000,
    "dateFrom": 1703001600000,
    "dateTo": 1735689600000,
    "auctionHouses": ["Artcurial"],
    "enabled": true,
    "lastUpdated": 1703001600000
  },
  "preferences": {
    "theme": "auto",
    "language": "fr",
    "notificationsEnabled": true,
    "sortBy": "score",
    "sortOrder": "desc",
    "highlightMatchingItems": true
  },
  "metadata": {
    "version": "1.0.0",
    "lastSync": 1703001600000,
    "totalLots": 1,
    "newCount": 1,
    "seenCount": 0,
    "favoriteCount": 0
  }
}
```

## 7. Performance Considerations

### 7.1 Batch Operations
- Group multiple writes into single `storage.set()` call
- Debounce rapid state changes (e.g., rapid favoriting)

### 7.2 Lazy Loading
- Popup loads only visible items initially
- Load more on scroll (pagination)

### 7.3 Caching
- Cache filters/preferences in memory
- Invalidate on storage change events

### 7.4 Query Optimization
- Use indexes for common queries (NEW, SEEN, FAVORITE)
- Avoid loading all lots at once - use filtered queries
