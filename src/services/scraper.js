import { parseDate } from '../utils/date.js';
import { parsePriceRange } from '../utils/price.js';

/**
 * Generic DOM scraping patterns for auction sites
 * These selectors work across multiple auction site structures
 */
const SCRAPING_PATTERNS = {
  lotContainers: [
    '.lot-item',
    '.auction-lot',
    '[data-lot-id]',
    'article[class*="lot"]',
    '.result-item',
    '[itemtype*="Product"]',
    '[class*="card"]',
    '.item'
  ],

  title: [
    'h1',
    'h2',
    'h3',
    '.lot-title',
    '.item-title',
    '[itemprop="name"]',
    '.title',
    '[class*="title"]'
  ],

  description: [
    '.lot-description',
    '.description',
    '[itemprop="description"]',
    '.lot-details',
    '.item-description',
    '[class*="description"]',
    'p'
  ],

  category: [
    '.lot-category',
    '.category',
    '[data-category]',
    '.breadcrumb li:last-child',
    '[itemprop="category"]',
    '[class*="category"]'
  ],

  price: [
    '.lot-estimate',
    '.estimate',
    '.price',
    '[itemprop="price"]',
    '.lot-price',
    '[class*="estimate"]',
    '[class*="price"]'
  ],

  auctionDate: [
    '.auction-date',
    '.sale-date',
    'time',
    '[datetime]',
    '[data-date]',
    '[itemprop="startDate"]',
    '[class*="date"]'
  ],

  auctionHouse: [
    '.auction-house',
    '.house-name',
    '.seller',
    '[data-auction-house]',
    '.maison-vente',
    '[itemprop="seller"]',
    '[class*="house"]',
    '[class*="seller"]'
  ],

  image: [
    '.lot-image img',
    '.item-image img',
    'img[itemprop="image"]',
    '.gallery img:first-child',
    'img[alt*="lot"]',
    'img:first-of-type'
  ],

  externalId: [
    '[data-lot-id]',
    '[data-id]',
    '[id*="lot"]',
    '[data-item-id]'
  ],

  url: [
    'a[href*="/lot/"]',
    'a[href*="/l/"]',
    'a.lot-link',
    'a[class*="lot"]'
  ]
};

/**
 * Extract field value from container using multiple selectors
 */
function extractField(container, selectors, defaultValue = '') {
  for (const selector of selectors) {
    try {
      const element = container.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }

      // Check attributes if selector contains []
      const attrMatch = selector.match(/\[(.*?)\]/);
      if (attrMatch) {
        const attr = attrMatch[1].split('=')[0];
        if (container.hasAttribute(attr)) {
          return container.getAttribute(attr);
        }
      }
    } catch (e) {
      // Skip invalid selectors
      continue;
    }
  }

  return defaultValue;
}

/**
 * Extract price with min/max
 */
function extractPrice(container) {
  const priceSelectors = SCRAPING_PATTERNS.price;

  for (const selector of priceSelectors) {
    try {
      const element = container.querySelector(selector);
      if (element) {
        const text = element.textContent;
        const { min, max } = parsePriceRange(text);

        if (min > 0 || max > 0) {
          return { min, max };
        }
      }
    } catch (e) {
      continue;
    }
  }

  return { min: 0, max: 0 };
}

/**
 * Extract auction date
 */
function extractDate(container) {
  const dateSelectors = SCRAPING_PATTERNS.auctionDate;

  for (const selector of dateSelectors) {
    try {
      const element = container.querySelector(selector);
      if (element) {
        // Try datetime attribute first
        if (element.hasAttribute('datetime')) {
          const date = new Date(element.getAttribute('datetime'));
          if (!isNaN(date.getTime())) {
            return date.getTime();
          }
        }

        // Try parsing text
        const text = element.textContent;
        const date = parseDate(text);
        if (date) {
          return date.getTime();
        }
      }
    } catch (e) {
      continue;
    }
  }

  return Date.now(); // Default to current time
}

/**
 * Extract image URL
 */
function extractImage(container) {
  const imageSelectors = SCRAPING_PATTERNS.image;

  for (const selector of imageSelectors) {
    try {
      const img = container.querySelector(selector);
      if (img) {
        // Try src, data-src, srcset
        const src = img.src || img.dataset.src || img.getAttribute('data-lazy-src');
        if (src && src.startsWith('http')) {
          return src;
        }

        // Try srcset
        if (img.srcset) {
          const firstSrc = img.srcset.split(',')[0].trim().split(' ')[0];
          if (firstSrc && firstSrc.startsWith('http')) {
            return firstSrc;
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Check for background-image
  try {
    const bgElement = container.querySelector('[style*="background-image"]');
    if (bgElement) {
      const match = bgElement.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Ignore
  }

  return '';
}

/**
 * Extract lot URL
 */
function extractUrl(container) {
  const urlSelectors = SCRAPING_PATTERNS.url;

  for (const selector of urlSelectors) {
    try {
      const link = container.querySelector(selector);
      if (link && link.href) {
        return link.href;
      }
    } catch (e) {
      continue;
    }
  }

  // Check if container itself is a link
  if (container.tagName === 'A' && container.href) {
    return container.href;
  }

  // Check parent link
  const parentLink = container.closest('a');
  if (parentLink && parentLink.href) {
    return parentLink.href;
  }

  // Fallback: current page if it's a detail page
  if (window.location.pathname.includes('/l/') ||
      window.location.pathname.includes('/lot/')) {
    return window.location.href;
  }

  return '';
}

/**
 * Extract external lot ID
 */
function extractExternalId(container, url) {
  // Try data attributes first
  const idSelectors = SCRAPING_PATTERNS.externalId;

  for (const selector of idSelectors) {
    try {
      const attr = selector.match(/\[(.*?)\]/)?.[1];
      if (attr && container.hasAttribute(attr)) {
        return container.getAttribute(attr);
      }

      if (container.id && container.id.includes('lot')) {
        return container.id.replace(/\D/g, '');
      }
    } catch (e) {
      continue;
    }
  }

  // Try to extract from URL
  if (url) {
    const urlMatch = url.match(/\/lot[s]?\/(\d+)/i) || url.match(/\/l\/(\w+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }
  }

  // Fallback: generate from title + date
  return '';
}

/**
 * Generate unique lot ID
 */
function generateLotId(lot) {
  const raw = `${lot.externalId}_${lot.auctionHouse}_${lot.title.substring(0, 20)}`;
  return `drouot_${hashString(raw)}`;
}

/**
 * Simple string hash function
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Main scraping function - extracts lots from current page
 */
export function scrapeLots(document) {
  const lots = [];

  // Try each container selector until we find matches
  let containers = [];
  for (const selector of SCRAPING_PATTERNS.lotContainers) {
    try {
      containers = document.querySelectorAll(selector);
      if (containers.length > 0) {
        console.log(`[Drouot Monitor] Found ${containers.length} lots using selector: ${selector}`);
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (containers.length === 0) {
    console.warn('[Drouot Monitor] No lot containers found on page');
    return lots;
  }

  // Extract data from each container
  for (const container of containers) {
    try {
      const url = extractUrl(container);
      const externalId = extractExternalId(container, url);
      const title = extractField(container, SCRAPING_PATTERNS.title);

      // Skip if no title (required field)
      if (!title) continue;

      const { min, max } = extractPrice(container);

      const lot = {
        externalId: externalId || `unknown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: url || window.location.href,
        title: title,
        description: extractField(container, SCRAPING_PATTERNS.description),
        category: extractField(container, SCRAPING_PATTERNS.category),
        estimateMin: min,
        estimateMax: max,
        currency: 'EUR',
        auctionDate: extractDate(container),
        auctionHouse: extractField(container, SCRAPING_PATTERNS.auctionHouse, 'Unknown'),
        imageUrl: extractImage(container),
        scrapedFrom: window.location.href,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now()
      };

      // Generate unique ID
      lot.id = generateLotId(lot);

      lots.push(lot);
    } catch (error) {
      console.error('[Drouot Monitor] Error scraping lot:', error);
    }
  }

  console.log(`[Drouot Monitor] Successfully scraped ${lots.length} lots`);
  return lots;
}

/**
 * Check if current page is a Drouot listing/search page
 */
export function isListingPage() {
  const url = window.location.href.toLowerCase();
  return url.includes('drouot.com') && (
    url.includes('/ventes') ||
    url.includes('/recherche') ||
    url.includes('/categories') ||
    url.includes('/search') ||
    url.includes('/results')
  );
}

/**
 * Check if current page is a Drouot lot detail page
 */
export function isDetailPage() {
  const url = window.location.href.toLowerCase();
  return url.includes('drouot.com') && (
    url.includes('/lot/') ||
    url.includes('/l/')
  );
}

/**
 * Scrape single lot from detail page
 */
export function scrapeSingleLot(document) {
  // On detail pages, the entire body might be the lot
  const lots = scrapeLots(document);

  if (lots.length > 0) {
    return lots[0];
  }

  // Fallback: try scraping from main content
  const mainContent = document.querySelector('main') || document.querySelector('.content') || document.body;
  return scrapeLots(mainContent)[0] || null;
}
