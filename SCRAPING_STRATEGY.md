# Scraping Strategy - Drouot Monitor

## 1. Overview

The extension uses **passive DOM scraping** - it only extracts data from pages the user actively visits. No background fetching, no API calls, fully legal and respectful of Drouot's servers.

## 2. Target Pages

### 2.1 Auction Listing Pages
Pages showing multiple lots (search results, category pages, upcoming auctions)

**Example URLs**:
- `https://www.drouot.com/ventes/*`
- `https://www.drouot.com/recherche/*`
- `https://www.drouot.com/categories/*`

**What to scrape**: List of lots with basic info

### 2.2 Individual Lot Pages
Detailed pages for single lots

**Example URLs**:
- `https://www.drouot.com/l/*`
- `https://www.drouot.com/lot/*`

**What to scrape**: Full lot details including extended description

### 2.3 Auction House Pages
Pages for specific auction houses

**Example URLs**:
- `https://www.drouot.com/maisons/*`

**What to scrape**: Auction house name, metadata

## 3. DOM Scraping Logic

### 3.1 Generic Scraper Patterns

Since we don't have exact Drouot HTML, we'll use **flexible selectors** that work across common auction site patterns:

```javascript
const SCRAPING_PATTERNS = {
  // Lot containers (try multiple selectors)
  lotContainers: [
    '.lot-item',
    '.auction-lot',
    '[data-lot-id]',
    'article[class*="lot"]',
    '.result-item',
    '[itemtype*="Product"]'
  ],

  // Title
  title: [
    'h1',
    'h2',
    '.lot-title',
    '.item-title',
    '[itemprop="name"]',
    '.title'
  ],

  // Description
  description: [
    '.lot-description',
    '.description',
    '[itemprop="description"]',
    '.lot-details',
    '.item-description'
  ],

  // Category
  category: [
    '.lot-category',
    '.category',
    '[data-category]',
    '.breadcrumb li:last-child',
    '[itemprop="category"]'
  ],

  // Price/Estimate
  price: [
    '.lot-estimate',
    '.estimate',
    '.price',
    '[itemprop="price"]',
    '.lot-price',
    '[class*="estimate"]'
  ],

  // Auction date
  auctionDate: [
    '.auction-date',
    '.sale-date',
    'time',
    '[datetime]',
    '[data-date]',
    '[itemprop="startDate"]'
  ],

  // Auction house
  auctionHouse: [
    '.auction-house',
    '.house-name',
    '.seller',
    '[data-auction-house]',
    '.maison-vente',
    '[itemprop="seller"]'
  ],

  // Image
  image: [
    '.lot-image img',
    '.item-image img',
    'img[itemprop="image"]',
    '.gallery img:first-child',
    'img[alt*="lot"]'
  ],

  // External ID
  externalId: [
    '[data-lot-id]',
    '[data-id]',
    '[id*="lot"]'
  ],

  // URL (from link or current page)
  url: [
    'a[href*="/lot/"]',
    'a[href*="/l/"]',
    'a.lot-link'
  ]
};
```

### 3.2 Scraping Algorithm

```javascript
function scrapeLots(document) {
  const lots = [];

  // Try each container selector until we find matches
  let containers = [];
  for (const selector of SCRAPING_PATTERNS.lotContainers) {
    containers = document.querySelectorAll(selector);
    if (containers.length > 0) break;
  }

  if (containers.length === 0) {
    console.warn('No lot containers found on page');
    return lots;
  }

  // Extract data from each container
  for (const container of containers) {
    try {
      const lot = {
        externalId: extractField(container, SCRAPING_PATTERNS.externalId),
        title: extractField(container, SCRAPING_PATTERNS.title),
        description: extractField(container, SCRAPING_PATTERNS.description),
        category: extractField(container, SCRAPING_PATTERNS.category),
        estimateMin: extractPrice(container, 'min'),
        estimateMax: extractPrice(container, 'max'),
        auctionDate: extractDate(container),
        auctionHouse: extractField(container, SCRAPING_PATTERNS.auctionHouse),
        imageUrl: extractImage(container),
        url: extractUrl(container),
        scrapedFrom: window.location.href,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now()
      };

      // Generate unique ID
      lot.id = generateLotId(lot);

      // Validate required fields
      if (lot.title && lot.externalId) {
        lots.push(lot);
      }
    } catch (error) {
      console.error('Error scraping lot:', error);
    }
  }

  return lots;
}
```

### 3.3 Field Extraction Helpers

```javascript
// Extract text from element using multiple selectors
function extractField(container, selectors) {
  for (const selector of selectors) {
    const element = container.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }

  // Fallback: check container attributes
  for (const selector of selectors) {
    const attr = selector.match(/\[(.*?)\]/)?.[1];
    if (attr && container.hasAttribute(attr)) {
      return container.getAttribute(attr);
    }
  }

  return '';
}

// Extract price with min/max
function extractPrice(container, type = 'min') {
  const priceSelectors = SCRAPING_PATTERNS.price;

  for (const selector of priceSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      const text = element.textContent;

      // Try to parse "800 - 1200 €" format
      const match = text.match(/(\d[\d\s,.]*)\s*[-àto]\s*(\d[\d\s,.]*)/);
      if (match) {
        const min = parseFloat(match[1].replace(/[\s,]/g, ''));
        const max = parseFloat(match[2].replace(/[\s,]/g, ''));
        return type === 'min' ? min : max;
      }

      // Try single price "1000 €"
      const singleMatch = text.match(/(\d[\d\s,.]*)/);
      if (singleMatch) {
        const price = parseFloat(singleMatch[1].replace(/[\s,]/g, ''));
        return price;
      }
    }
  }

  return 0;
}

// Extract date
function extractDate(container) {
  const dateSelectors = SCRAPING_PATTERNS.auctionDate;

  for (const selector of dateSelectors) {
    const element = container.querySelector(selector);
    if (element) {
      // Try datetime attribute first
      if (element.hasAttribute('datetime')) {
        return new Date(element.getAttribute('datetime')).getTime();
      }

      // Try parsing text
      const text = element.textContent;
      const date = parseDate(text);
      if (date) return date.getTime();
    }
  }

  return Date.now();
}

// Extract image URL
function extractImage(container) {
  const imageSelectors = SCRAPING_PATTERNS.image;

  for (const selector of imageSelectors) {
    const img = container.querySelector(selector);
    if (img) {
      // Try src, data-src, srcset
      return img.src || img.dataset.src || img.srcset?.split(' ')[0] || '';
    }
  }

  // Check for background-image
  const bgElement = container.querySelector('[style*="background-image"]');
  if (bgElement) {
    const match = bgElement.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (match) return match[1];
  }

  return '';
}

// Extract lot URL
function extractUrl(container) {
  const urlSelectors = SCRAPING_PATTERNS.url;

  for (const selector of urlSelectors) {
    const link = container.querySelector(selector);
    if (link && link.href) {
      return link.href;
    }
  }

  // Fallback: current page if it's a detail page
  if (window.location.pathname.includes('/l/') ||
      window.location.pathname.includes('/lot/')) {
    return window.location.href;
  }

  return '';
}
```

### 3.4 Date Parsing

```javascript
function parseDate(dateString) {
  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Common French date formats
  const formats = [
    // "15 janvier 2024 14h30"
    /(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i,
    // "15/01/2024"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // "2024-01-15"
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ];

  const monthMap = {
    'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
    'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
    'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
  };

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format.source.includes('janvier')) {
        // French month name format
        const day = parseInt(match[1]);
        const month = monthMap[match[2].toLowerCase()];
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      } else if (format.source.includes('/')) {
        // DD/MM/YYYY format
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);
        return new Date(year, month, day);
      } else {
        // YYYY-MM-DD format
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        return new Date(year, month, day);
      }
    }
  }

  return null;
}
```

## 4. Scraping Triggers

### 4.1 Page Load
```javascript
// content.js
window.addEventListener('load', async () => {
  console.log('Drouot Monitor: Page loaded, starting scrape...');
  await scrapePage();
});
```

### 4.2 DOM Changes (SPA navigation)
```javascript
// Watch for dynamic content (if Drouot uses React/Vue)
const observer = new MutationObserver(debounce(async () => {
  console.log('Drouot Monitor: DOM changed, re-scraping...');
  await scrapePage();
}, 500));

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 4.3 Manual Trigger
```javascript
// Add button to page for manual scraping
function addManualScrapeButton() {
  const button = document.createElement('button');
  button.textContent = '🔄 Re-scan page';
  button.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999';
  button.onclick = scrapePage;
  document.body.appendChild(button);
}
```

## 5. Deduplication

### 5.1 Check Before Storing
```javascript
async function scrapePage() {
  const lots = scrapeLots(document);
  console.log(`Found ${lots.length} lots on page`);

  // Get existing lots from storage
  const existingIds = await storage.getAllLotIds();

  // Filter out duplicates
  const newLots = lots.filter(lot => !existingIds.includes(lot.id));

  // Update lastSeenAt for existing lots
  const existingLots = lots.filter(lot => existingIds.includes(lot.id));
  for (const lot of existingLots) {
    await storage.updateLot(lot.id, { lastSeenAt: Date.now() });
  }

  // Store new lots
  if (newLots.length > 0) {
    console.log(`Saving ${newLots.length} new lots`);
    await storage.saveLots(newLots);

    // Send to background for filter matching
    chrome.runtime.sendMessage({
      type: 'NEW_LOTS',
      lots: newLots
    });
  }
}
```

## 6. Error Handling

### 6.1 Graceful Degradation
```javascript
function scrapePage() {
  try {
    const lots = scrapeLots(document);

    if (lots.length === 0) {
      console.warn('No lots found - page structure may have changed');
      notifyUser('scraping-failed');
      return;
    }

    // Continue processing...
  } catch (error) {
    console.error('Scraping error:', error);

    // Log for debugging
    chrome.runtime.sendMessage({
      type: 'SCRAPING_ERROR',
      error: error.message,
      url: window.location.href
    });
  }
}
```

### 6.2 Partial Data Handling
```javascript
// Accept lots with partial data
function validateLot(lot) {
  // Required fields
  if (!lot.title) return false;

  // Optional but important - warn if missing
  if (!lot.auctionHouse) {
    console.warn('Lot missing auction house:', lot.title);
  }
  if (!lot.estimateMin && !lot.estimateMax) {
    console.warn('Lot missing price estimate:', lot.title);
  }

  return true;
}
```

## 7. Performance Optimization

### 7.1 Debouncing
```javascript
// Avoid scraping too frequently
const scrapePage = debounce(async () => {
  // ... scraping logic
}, 500); // Wait 500ms after last DOM change
```

### 7.2 Batch Storage Operations
```javascript
// Don't save lots one by one
async function saveLots(lots) {
  const batch = {};
  for (const lot of lots) {
    batch[`lots.${lot.id}`] = lot;
  }

  // Single storage write
  await chrome.storage.local.set(batch);
}
```

### 7.3 Lazy Image Loading
```javascript
// Don't load all images immediately
function extractImage(container) {
  const img = container.querySelector('img');
  if (!img) return '';

  // Prefer data-src (lazy loaded) over src
  return img.dataset.src || img.src;
}
```

## 8. Testing Scraper

### 8.1 Test on Sample HTML
```javascript
// Create test HTML
const testHTML = `
  <div class="lot-item" data-lot-id="123">
    <h2 class="lot-title">Test Lot</h2>
    <div class="lot-description">Description here</div>
    <div class="lot-estimate">800 - 1200 €</div>
    <div class="auction-house">Artcurial</div>
    <time datetime="2024-01-15">15 janvier 2024</time>
    <img src="/images/123.jpg" />
  </div>
`;

document.body.innerHTML = testHTML;
const lots = scrapeLots(document);
console.log(lots);
```

### 8.2 Debug Logging
```javascript
// Add verbose logging mode
const DEBUG = true;

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[Drouot Monitor] ${message}`, data);
  }
}

// Usage
debugLog('Scraped lots:', lots);
debugLog('Found containers:', containers.length);
```

## 9. Legal & Ethical Considerations

✅ **Legal**:
- Only scrapes pages user actively visits
- No automated crawling or background requests
- Respects robots.txt (implicitly - user's browser does)
- Personal use tool, no commercial data resale

✅ **Respectful**:
- No server load (user's browser already loaded the page)
- Debounced to avoid excessive processing
- No impact on Drouot's infrastructure

✅ **Privacy**:
- Data stays local (chrome.storage)
- No tracking or analytics
- No data sent to external servers

## 10. Fallback Strategies

If scraping fails (Drouot changes structure):

### 10.1 User Feedback
```javascript
chrome.runtime.sendMessage({
  type: 'SCRAPING_FAILED',
  url: window.location.href,
  html: document.body.innerHTML.slice(0, 1000) // First 1KB for debugging
});
```

### 10.2 Adaptive Selectors
```javascript
// Learn from successful scrapes
function learnSelectors(lots) {
  if (lots.length > 0) {
    chrome.storage.local.set({
      'learned_selectors': {
        container: foundContainerSelector,
        title: foundTitleSelector,
        // ... etc
      }
    });
  }
}
```

### 10.3 Manual Mapping UI
Allow users to help identify elements:
```javascript
// Popup UI: "Click the lot title on the page"
// User clicks element
// Extension learns: "Ah, titles are in <h2 class='custom-title'>"
```

## 11. Next Steps

1. **Test on real Drouot pages** - Adjust selectors based on actual HTML
2. **Handle edge cases** - Lots without prices, dates, images
3. **Multi-language support** - English/French date parsing
4. **Incremental improvements** - Learn from user feedback
