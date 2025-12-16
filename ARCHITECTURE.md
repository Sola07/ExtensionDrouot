# Drouot Monitor - Chrome Extension Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       CHROME EXTENSION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │   CONTENT    │    │   BACKGROUND │    │     POPUP       │  │
│  │   SCRIPT     │◄──►│   SERVICE    │◄──►│   (React UI)    │  │
│  │              │    │   WORKER     │    │                 │  │
│  └──────────────┘    └──────────────┘    └─────────────────┘  │
│         │                    │                     │           │
│         │                    │                     │           │
│         ▼                    ▼                     ▼           │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           chrome.storage.local (IndexedDB)             │   │
│  │  - Items (lots)                                        │   │
│  │  - User filters                                        │   │
│  │  - Item states (NEW/SEEN/FAVORITE/IGNORED)            │   │
│  │  - User preferences                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Scrapes
                              ▼
                    ┌──────────────────┐
                    │  Drouot.com      │
                    │  (Auction pages) │
                    └──────────────────┘
```

## 2. Component Architecture

### 2.1 Content Script (`content.js`)
**Runs on**: All Drouot.com pages
**Responsibilities**:
- Parse DOM to extract lot information
- Detect new lots on page load/navigation
- Highlight matching items with visual badges
- Hide/gray out non-matching items
- Inject UI overlays (badges, quick actions)
- Listen for user actions (mark as seen, favorite)

**Key Functions**:
- `scrapeLots()` - Extract lot data from DOM
- `highlightMatchingItems()` - Add visual indicators
- `applyFilters()` - Determine which items to show
- `updateItemState()` - Handle user interactions

### 2.2 Background Service Worker (`background.js`)
**Runs**: Persistent background process
**Responsibilities**:
- Centralized state management
- Filter matching logic
- Badge notification updates
- Message routing between components
- Periodic cleanup of old data
- Handle chrome.storage operations

**Key Functions**:
- `processNewLots()` - Match lots against user filters
- `updateBadgeCount()` - Show count of new items
- `syncItemStates()` - Manage NEW/SEEN states
- `cleanupOldData()` - Remove outdated items

### 2.3 Popup UI (`popup.html` + React)
**Triggered**: User clicks extension icon
**Responsibilities**:
- Display new, seen, and favorite items
- Manage user filters and preferences
- Show item details with images
- Quick actions (mark seen, favorite, ignore)
- Filter configuration interface

**Views**:
- **New Items**: Unviewed matching lots
- **All Matching**: All items matching filters
- **Favorites**: User-starred items
- **History**: Previously seen items
- **Settings**: Filter configuration

### 2.4 Storage Layer
**Technology**: `chrome.storage.local` (unlimited quota)
**Structure**: See STORAGE_SCHEMA.md

## 3. Data Flow

### 3.1 Scraping → Matching → State → UI

```
┌──────────────┐
│ User visits  │
│ Drouot page  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Content Script   │
│ scrapeLots()     │ ──► Extract: ID, title, description, category,
└──────┬───────────┘     price, date, auction house, URL, image
       │
       ▼
┌──────────────────┐
│ Send to          │
│ Background       │ ──► { type: 'NEW_LOTS', lots: [...] }
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Background       │
│ processNewLots() │ ──► 1. Check for duplicates
└──────┬───────────┘     2. Apply user filters
       │                 3. Calculate match score
       │                 4. Store in chrome.storage
       ▼
┌──────────────────┐
│ Filter Matching  │ ──► - Category match
│                  │     - Keyword inclusion/exclusion
└──────┬───────────┘     - Price range
       │                 - Date range
       │                 - Auction house
       ▼
┌──────────────────┐
│ Determine State  │ ──► NEW (first time matching)
│                  │     SEEN (user viewed)
└──────┬───────────┘     FAVORITE (user starred)
       │                 IGNORED (user dismissed)
       ▼
┌──────────────────┐
│ Update UI        │ ──► 1. Update badge count
│                  │     2. Notify content script
└──────┬───────────┘     3. Refresh popup if open
       │
       ▼
┌──────────────────┐
│ Content Script   │ ──► Highlight items with badges:
│ Highlights       │     🆕 New | ⭐ Favorite | 👀 Seen
└──────────────────┘
```

### 3.2 User Action Flow

```
User clicks "Mark as Seen" in popup or on page
                │
                ▼
       ┌─────────────────┐
       │ Send message     │
       │ to Background    │
       └────────┬─────────┘
                │
                ▼
       ┌─────────────────┐
       │ Update storage:  │
       │ state = "SEEN"   │
       │ viewed_at = now  │
       └────────┬─────────┘
                │
                ▼
       ┌─────────────────┐
       │ Broadcast update │ ──► Content script removes 🆕
       │ to all tabs      │ ──► Popup moves to "Seen" list
       └────────┬─────────┘ ──► Badge count decreases
                │
                ▼
            [UI Updated]
```

## 4. Key Algorithms

### 4.1 Filter Matching

```javascript
function matchesFilters(lot, userFilters) {
  // 1. Category match
  if (!userFilters.categories.includes(lot.category)) return false;

  // 2. Keyword inclusion (OR logic)
  const hasIncludedKeyword = userFilters.includeKeywords.some(kw =>
    lot.title.toLowerCase().includes(kw.toLowerCase()) ||
    lot.description.toLowerCase().includes(kw.toLowerCase())
  );
  if (userFilters.includeKeywords.length > 0 && !hasIncludedKeyword) {
    return false;
  }

  // 3. Keyword exclusion (AND logic)
  const hasExcludedKeyword = userFilters.excludeKeywords.some(kw =>
    lot.title.toLowerCase().includes(kw.toLowerCase()) ||
    lot.description.toLowerCase().includes(kw.toLowerCase())
  );
  if (hasExcludedKeyword) return false;

  // 4. Price range
  const avgPrice = (lot.estimateMin + lot.estimateMax) / 2;
  if (avgPrice < userFilters.priceMin || avgPrice > userFilters.priceMax) {
    return false;
  }

  // 5. Date range
  if (lot.auctionDate < userFilters.dateFrom ||
      lot.auctionDate > userFilters.dateTo) {
    return false;
  }

  // 6. Auction house (custom filter!)
  if (userFilters.auctionHouses.length > 0 &&
      !userFilters.auctionHouses.includes(lot.auctionHouse)) {
    return false;
  }

  return true;
}
```

### 4.2 Scoring System (Optional Priority)

```javascript
function calculateScore(lot, userFilters) {
  let score = 0;

  // Base score for matching
  score += 10;

  // Keyword relevance (more matches = higher score)
  const keywordMatches = userFilters.includeKeywords.filter(kw =>
    lot.title.toLowerCase().includes(kw.toLowerCase())
  ).length;
  score += keywordMatches * 5;

  // Price preference (closer to user's sweet spot)
  const avgPrice = (lot.estimateMin + lot.estimateMax) / 2;
  const priceTarget = (userFilters.priceMin + userFilters.priceMax) / 2;
  const priceDeviation = Math.abs(avgPrice - priceTarget) / priceTarget;
  score += Math.max(0, 10 - priceDeviation * 10);

  // Recency (newer = higher)
  const daysSinceFound = (Date.now() - lot.firstSeenAt) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 5 - daysSinceFound);

  // Auction urgency (sooner = higher)
  const daysUntilAuction = (lot.auctionDate - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntilAuction < 7) score += 10;
  else if (daysUntilAuction < 14) score += 5;

  return Math.round(score);
}
```

## 5. Security & Performance

### 5.1 Security
- **No external API calls**: Scraping is DOM-only, no server requests
- **HTTPS only**: Ensure all Drouot pages are HTTPS
- **CSP compliant**: React build must follow Chrome extension CSP
- **No eval()**: Avoid dynamic code execution
- **Sanitize HTML**: Clean user input and scraped content

### 5.2 Performance
- **Debounced scraping**: Wait 500ms after DOM changes before scraping
- **Incremental updates**: Only process new/changed lots
- **Lazy loading**: Popup loads data on-demand
- **Efficient storage**: Use indexed keys for fast lookups
- **Batch operations**: Group storage writes to reduce I/O

### 5.3 Rate Limiting
- **Respectful scraping**: Only scrape pages the user actively visits
- **No automation**: No background fetching of Drouot pages
- **User-driven**: All data collection is passive, triggered by user browsing

## 6. Extension Permissions

```json
{
  "permissions": [
    "storage",           // chrome.storage.local
    "tabs",              // Track active tab
    "notifications",     // Optional alerts
    "alarms"             // Cleanup scheduler
  ],
  "host_permissions": [
    "*://*.drouot.com/*" // Access Drouot pages
  ]
}
```

## 7. File Structure

```
drouot-monitor/
├── manifest.json
├── background.js
├── content/
│   ├── content.js
│   └── content.css
├── popup/
│   ├── popup.html
│   ├── popup.js (React entry)
│   └── popup.css
├── src/
│   ├── components/
│   │   ├── ItemCard.jsx
│   │   ├── FilterConfig.jsx
│   │   ├── ItemList.jsx
│   │   └── TabNavigation.jsx
│   ├── services/
│   │   ├── storage.js
│   │   ├── scraper.js
│   │   ├── filter.js
│   │   └── messaging.js
│   ├── utils/
│   │   ├── date.js
│   │   ├── price.js
│   │   └── scoring.js
│   └── constants.js
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── package.json
├── webpack.config.js
└── README.md
```

## 8. Technology Stack

- **Extension Framework**: Chrome Extension Manifest V3
- **UI Library**: React 18
- **Build Tool**: Webpack 5
- **Storage**: chrome.storage.local (IndexedDB under the hood)
- **Styling**: CSS Modules + Tailwind CSS
- **State Management**: React Context API
- **Date Handling**: date-fns
- **Testing**: Jest + React Testing Library

## 9. Development Workflow

1. **Local Development**:
   ```bash
   npm install
   npm run dev    # Watch mode for React + extension
   ```

2. **Load Extension**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `dist/` folder

3. **Testing**:
   - Visit Drouot.com pages
   - Check console for scraping logs
   - Open popup to verify UI
   - Test filters and state changes

4. **Build for Production**:
   ```bash
   npm run build  # Minified production build
   ```

## 10. Next Steps (Post-MVP)

- **Backend sync**: Optional Firebase/Supabase for multi-device
- **Advanced notifications**: Email/SMS for high-priority items
- **Analytics**: Track which filters find the best items
- **Export**: CSV/JSON export of watched items
- **Sharing**: Share filters with other users
- **Mobile app**: Companion iOS/Android app
