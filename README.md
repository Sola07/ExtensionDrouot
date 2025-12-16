# Drouot Monitor - Chrome Extension

> Automated auction monitoring tool for Drouot.com - Never miss a deal again!

## Features

- **Passive Scraping**: Automatically extracts lots from Drouot pages you visit
- **Advanced Filtering**: Filter by category, keywords, price, date, and auction house
- **NEW/SEEN State Tracking**: Track which items you've viewed
- **Visual Indicators**: Badges and highlights on Drouot pages
- **Smart Scoring**: Prioritizes items based on match quality
- **Local Storage**: All data stays on your device
- **React-powered UI**: Beautiful, responsive popup interface

## Setup

### Prerequisites

- Node.js 16+ and npm
- Chrome/Chromium browser

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/` folder

### Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

Then reload the extension in Chrome after changes.

## Usage

### First Time Setup

1. Click the extension icon
2. Go to Settings (⚙️)
3. Configure your filters:
   - Select categories (e.g., Mobilier, Art Contemporain)
   - Add include keywords (e.g., "louis xvi", "empire")
   - Add exclude keywords (e.g., "reproduction", "style de")
   - Set price range
   - Select auction houses (e.g., Artcurial, Drouot Estimations)
4. Save

### Daily Usage

1. **Browse Drouot.com naturally** - The extension works passively
2. **Extension scrapes lots** as you visit pages
3. **Badge shows NEW count** - Click to view
4. **Review matches** in popup
5. **Mark as seen** or **favorite** items
6. **Click item** to open on Drouot.com

### Visual Indicators

On Drouot pages, you'll see:
- 🆕 **NEW badges** - Unviewed matching items
- ⭐ **FAVORITE badges** - Items you starred
- 👀 **SEEN badges** - Previously viewed items
- **Highlighting** - Color-coded borders around matching items

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design.

### Key Components

- **Content Script** (`content/content.js`): Scrapes DOM, adds badges
- **Background Worker** (`background.js`): Processes lots, manages state
- **Popup UI** (`popup/`): React app for viewing and managing items
- **Storage Service** (`src/services/storage.js`): chrome.storage wrapper
- **Filter Engine** (`src/services/filter.js`): Matching algorithm

## Data Storage

All data is stored locally using `chrome.storage.local`:

- **Lots**: Scraped auction items
- **User States**: NEW/SEEN/FAVORITE/IGNORED per item
- **Filters**: Your configured filters
- **Preferences**: UI settings

See [STORAGE_SCHEMA.md](STORAGE_SCHEMA.md) for detailed schema.

## Filtering Logic

The extension matches lots against your filters using:

1. **Category matching** - Must be in selected categories
2. **Keyword inclusion** - Must contain at least one include keyword
3. **Keyword exclusion** - Must not contain any exclude keywords
4. **Price range** - Estimate must be within min/max
5. **Date range** - Auction date must be within range
6. **Auction house** - Must be from selected auction houses

See [SCRAPING_STRATEGY.md](SCRAPING_STRATEGY.md) for scraping details.

## Scoring System

Each matching lot receives a score (0-100) based on:

- Category match: +15
- Keyword matches: +10 per keyword
- Title matches: +5 bonus
- Price proximity: up to +15
- Recency: up to +10
- Auction urgency: up to +15
- Has image: +5
- Auction house match: +10

Higher scores appear first in the popup.

## File Structure

```
drouot-monitor/
├── manifest.json              # Extension manifest
├── background.js              # Service worker
├── content/
│   ├── content.js             # Content script
│   └── content.css            # Page styling
├── popup/
│   ├── popup.html             # Popup HTML
│   └── popup.jsx              # React entry
├── src/
│   ├── components/            # React components
│   │   ├── App.jsx
│   │   ├── ItemCard.jsx
│   │   ├── ItemList.jsx
│   │   ├── TabNavigation.jsx
│   │   └── Settings.jsx
│   ├── services/              # Business logic
│   │   ├── storage.js
│   │   ├── scraper.js
│   │   ├── filter.js
│   │   └── messaging.js
│   ├── utils/                 # Utilities
│   │   ├── date.js
│   │   └── price.js
│   └── constants.js           # Constants
├── assets/                    # Icons
├── package.json
├── webpack.config.js
└── README.md
```

## Development

### Adding New Features

1. **New filter type**: Add to `DEFAULT_FILTERS` in `constants.js`, update `matchesFilters()` in `filter.js`, add UI in `Settings.jsx`
2. **New item state**: Add to `ItemState` enum, update `storage.js` indexes
3. **New scraping pattern**: Add selectors to `SCRAPING_PATTERNS` in `scraper.js`

### Testing

Test on real Drouot pages:
- Listing pages: `https://www.drouot.com/ventes`
- Search results: `https://www.drouot.com/recherche`
- Lot details: `https://www.drouot.com/l/*`

### Debugging

- Check console logs in:
  - **Content script**: Page console (F12)
  - **Background**: Extension service worker (chrome://extensions → Details → Inspect)
  - **Popup**: Right-click popup → Inspect

## Troubleshooting

### No lots scraped

- Check console for errors
- Verify Drouot page structure hasn't changed
- Click 🔄 button on page to manually re-scrape

### Filters not working

- Ensure filters are enabled in Settings
- Check filter criteria aren't too restrictive
- Re-save filters to trigger re-evaluation

### Badge not updating

- Reload extension
- Check background service worker for errors
- Verify storage isn't corrupted: `chrome://extensions` → Developer tools

## Performance

- **Scraping**: <100ms per page
- **Filter matching**: <10ms per lot
- **Storage**: Unlimited (uses chrome.storage.local)
- **Memory**: ~20MB for 10,000 lots

## Privacy

- **No tracking**: Zero analytics or telemetry
- **Local-first**: All data stays on your device
- **No external requests**: Only scrapes pages you visit
- **Open source**: Inspect all code

## Legal

This extension:
- ✅ Only scrapes pages the user actively visits
- ✅ Does not make automated requests to Drouot
- ✅ Respects robots.txt (implicitly via browser)
- ✅ Is for personal use only
- ❌ Does not resell or share data

**Not affiliated with Drouot.com**

## Roadmap

See [MVP_ROADMAP.md](MVP_ROADMAP.md) for detailed roadmap.

### MVP (Current)
- [x] Scraping engine
- [x] Filter matching
- [x] State tracking (NEW/SEEN/FAVORITE)
- [x] Popup UI
- [x] Content script badges

### Post-MVP
- [ ] Multi-device sync (Firebase/Supabase)
- [ ] Email notifications
- [ ] Price tracking & alerts
- [ ] Export to CSV
- [ ] Browser extension for other auction sites

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
2. Check [SCRAPING_STRATEGY.md](SCRAPING_STRATEGY.md) for scraping info
3. Open an issue on GitHub

---

**Made with ❤️ for auction enthusiasts**
