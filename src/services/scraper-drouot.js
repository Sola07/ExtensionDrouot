/**
 * Drouot-specific scraper
 * Attempts to extract lots from Drouot's JavaScript data or DOM
 */

import { parseDate } from '../utils/date.js';
import { parsePriceRange } from '../utils/price.js';

/**
 * Try to extract lots from window globals (Drouot may expose data)
 */
function extractFromGlobals() {
  const lots = [];

  // Common variable names used by SPAs
  const possibleGlobals = [
    'window.__INITIAL_STATE__',
    'window.__NUXT__',
    'window.__NEXT_DATA__',
    'window.apolloState',
    'window.lots',
    'window.Lots',
    'window.items',
    'window.ventes'
  ];

  for (const globalPath of possibleGlobals) {
    try {
      const parts = globalPath.split('.');
      let obj = window;

      for (let i = 1; i < parts.length; i++) {
        obj = obj[parts[i]];
        if (!obj) break;
      }

      if (obj && typeof obj === 'object') {
        console.log('[Drouot Monitor] Found global data:', globalPath, obj);

        // Try to parse this object structure
        const parsed = parseGlobalData(obj);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // Continue to next
    }
  }

  return lots;
}

/**
 * Parse global data object into lots array
 */
function parseGlobalData(data) {
  const lots = [];

  // Recursive search for lot-like objects
  function findLots(obj, depth = 0) {
    if (depth > 5) return; // Prevent infinite recursion

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (isLotObject(item)) {
          lots.push(parseLotObject(item));
        } else {
          findLots(item, depth + 1);
        }
      }
    } else if (obj && typeof obj === 'object') {
      // Check if this object has lot-like properties
      if (isLotObject(obj)) {
        lots.push(parseLotObject(obj));
      } else {
        // Recurse into properties
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            findLots(obj[key], depth + 1);
          }
        }
      }
    }
  }

  findLots(data);
  return lots;
}

/**
 * Check if object looks like a lot
 */
function isLotObject(obj) {
  if (!obj || typeof obj !== 'object') return false;

  // Check for common lot properties
  const hasId = obj.id || obj.lotId || obj.lotNumber;
  const hasTitle = obj.title || obj.name || obj.description || obj.titre;
  const hasPrice = obj.price || obj.estimate || obj.estimation || obj.startingPrice;

  return hasId || (hasTitle && hasPrice);
}

/**
 * Parse lot object from global data
 */
function parseLotObject(obj) {
  const lot = {
    externalId: String(obj.id || obj.lotId || obj.lotNumber || obj.saleId || ''),
    title: obj.title || obj.name || obj.titre || obj.description || 'Lot sans titre',
    description: obj.description || obj.desc || obj.details || '',
    category: obj.category || obj.categorie || obj.type || '',
    estimateMin: parseFloat(obj.estimateMin || obj.priceMin || obj.startingPrice || 0),
    estimateMax: parseFloat(obj.estimateMax || obj.priceMax || obj.estimate || 0),
    currency: obj.currency || 'EUR',
    auctionDate: parseAuctionDate(obj.date || obj.saleDate || obj.auctionDate || obj.endTime),
    auctionHouse: obj.auctionHouse || obj.house || obj.seller || 'Drouot',
    imageUrl: obj.image || obj.imageUrl || obj.photo || obj.thumbnail || '',
    url: obj.url || obj.link || window.location.href,
    scrapedFrom: window.location.href,
    firstSeenAt: Date.now(),
    lastSeenAt: Date.now()
  };

  // Generate ID
  lot.id = generateLotId(lot);

  return lot;
}

function parseAuctionDate(dateValue) {
  if (!dateValue) return Date.now();

  if (typeof dateValue === 'number') {
    // Unix timestamp (seconds or milliseconds)
    return dateValue > 10000000000 ? dateValue : dateValue * 1000;
  }

  if (typeof dateValue === 'string') {
    const parsed = parseDate(dateValue);
    return parsed ? parsed.getTime() : Date.now();
  }

  return Date.now();
}

function generateLotId(lot) {
  const raw = `${lot.externalId}_${lot.auctionHouse}_${lot.title.substring(0, 20)}`;
  return `drouot_${hashString(raw)}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Drouot-specific DOM selectors
 */
const DROUOT_SELECTORS = {
  containers: [
    '[class*="lot-card"]',
    '[class*="auction-item"]',
    '[class*="sale-item"]',
    '[data-lot]',
    '[data-sale]',
    '.card',
    'article',
    '[class*="item"]'
  ]
};

/**
 * Main scraping function - Drouot-specific
 */
export function scrapeDrouotPage(document) {
  console.log('[Drouot Monitor] Scraping Drouot page with specific parser...');

  const lots = [];

  // Find all lot links (pattern: /fr/l/[ID]-[slug])
  const lotLinks = document.querySelectorAll('a[href*="/fr/l/"]');
  console.log(`[Drouot Monitor] Found ${lotLinks.length} lot links`);

  lotLinks.forEach((link) => {
    try {
      const lot = scrapeLotFromLink(link);
      if (lot && lot.title) {
        lots.push(lot);
      }
    } catch (e) {
      console.error('[Drouot Monitor] Error scraping lot:', e);
    }
  });

  // Deduplicate by ID
  const uniqueLots = Array.from(
    new Map(lots.map(lot => [lot.id, lot])).values()
  );

  console.log(`[Drouot Monitor] Found ${uniqueLots.length} unique lots`);
  return uniqueLots;
}

/**
 * Scrape lot data from a link element
 */
function scrapeLotFromLink(link) {
  // Extract ID from href: /fr/l/31577684-meret-oppenheim...
  const href = link.getAttribute('href');
  const idMatch = href.match(/\/l\/(\d+)/);
  const externalId = idMatch ? idMatch[1] : '';

  // Get text content (contains date and title)
  // Example: " 17 DÉC. - 14:00 Meret OPPENHEIM (1913 -"
  const text = link.textContent.trim();

  // Parse date and title
  const { date, title } = parseDateAndTitle(text);

  // Find parent container to get more info (go up further to find auction house)
  let container = link.parentElement;
  let depth = 0;
  while (container && depth < 8) {
    // Stop when we find a substantial container
    if (container.querySelector('img') && container.textContent.length > 100) break;
    container = container.parentElement;
    depth++;
  }

  // Extract image
  let imageUrl = '';
  if (container) {
    const img = container.querySelector('img');
    if (img && img.src && !img.src.includes('favicon') && !img.src.includes('apple-touch-icon')) {
      imageUrl = img.src;
    }
  }

  // Extract price from container
  const { min, max } = extractPriceFromContainer(container || link.parentElement);

  // Extract auction house - try multiple strategies
  const auctionHouse = extractAuctionHouseFromContainer(container || link.parentElement) ||
                       extractAuctionHouseFromSiblings(link) ||
                       extractAuctionHouseFromURL(href) ||
                       'Drouot';

  // Extract category from URL if available
  const category = extractCategoryFromURL() || '';

  const lot = {
    externalId: externalId || `unknown_${Date.now()}`,
    url: href.startsWith('http') ? href : `https://drouot.com${href}`,
    title: title || text.substring(0, 100),
    description: '', // Not available in list view
    category: category,
    estimateMin: min,
    estimateMax: max,
    currency: 'EUR',
    auctionDate: date,
    auctionHouse: auctionHouse,
    imageUrl: imageUrl,
    scrapedFrom: window.location.href,
    firstSeenAt: Date.now(),
    lastSeenAt: Date.now()
  };

  // Generate unique ID
  lot.id = generateLotId(lot);

  return lot;
}

/**
 * Parse date and title from text
 * Example: " 17 DÉC. - 14:00 Meret OPPENHEIM (1913 -"
 */
function parseDateAndTitle(text) {
  // French month mapping
  const months = {
    'JAN': 0, 'FÉV': 1, 'FÉVR': 1, 'MAR': 2, 'MARS': 2, 'AVR': 3, 'AVRIL': 3,
    'MAI': 4, 'JUIN': 5, 'JUIL': 6, 'JUILLET': 6, 'AOÛ': 7, 'AOÛT': 7,
    'SEP': 8, 'SEPT': 8, 'OCT': 9, 'NOV': 10, 'DÉC': 11, 'DEC': 11
  };

  // Try to match: "17 DÉC. - 14:00"
  const dateMatch = text.match(/(\d{1,2})\s+(JAN|FÉV|FÉVR|MAR|MARS|AVR|AVRIL|MAI|JUIN|JUIL|JUILLET|AOÛ|AOÛT|SEP|SEPT|OCT|NOV|DÉC|DEC)\.?\s*-?\s*(\d{1,2}):(\d{2})/i);

  let date = Date.now();
  let title = text;

  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const monthStr = dateMatch[2].toUpperCase().replace('.', '');
    const month = months[monthStr];
    const hour = parseInt(dateMatch[3]);
    const minute = parseInt(dateMatch[4]);

    // Assume current year, adjust if month has passed
    const now = new Date();
    let year = now.getFullYear();

    const auctionDate = new Date(year, month, day, hour, minute);

    // If date is in the past, assume next year
    if (auctionDate < now) {
      year++;
      auctionDate.setFullYear(year);
    }

    date = auctionDate.getTime();

    // Remove date from title
    title = text.replace(dateMatch[0], '').trim();
  }

  return { date, title };
}

/**
 * Extract price from container
 */
function extractPriceFromContainer(container) {
  if (!container) return { min: 0, max: 0 };

  // Look for price patterns in text
  const text = container.textContent;

  // Pattern: "800 - 1 200 €" or "800-1200€"
  const rangeMatch = text.match(/(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)\s*€/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1].replace(/\s/g, ''));
    const max = parseInt(rangeMatch[2].replace(/\s/g, ''));
    return { min, max };
  }

  // Single price: "1 500 €"
  const singleMatch = text.match(/(\d[\d\s]*)\s*€/);
  if (singleMatch) {
    const price = parseInt(singleMatch[1].replace(/\s/g, ''));
    return { min: price, max: price };
  }

  return { min: 0, max: 0 };
}

/**
 * Extract auction house from container
 */
function extractAuctionHouseFromContainer(container) {
  if (!container) return null;

  const text = container.textContent;

  // Extended list of auction houses (most common first)
  const houses = [
    'Artcurial',
    'Drouot Estimations',
    'Ader',
    'Tajan',
    'Cornette de Saint Cyr',
    'Millon',
    'Aguttes',
    'Piasa',
    'Bonhams',
    'Christie\'s',
    'Sotheby\'s',
    'Pierre Bergé',
    'Crait + Müller',
    'Rossini',
    'Beaussant Lefèvre',
    'Binoche et Giquello',
    'De Baecque',
    'Gros & Delettrez',
    'Kapandji Morhange',
    'Rieunier & Associés',
    'Sadde',
    'Tessier & Sarrou',
    'Audap & Mirabaud',
    'Millon Belgique'
  ];

  for (const house of houses) {
    if (text.includes(house)) {
      console.log(`[Drouot Monitor] Found auction house: ${house}`);
      return house;
    }
  }

  return null;
}

/**
 * Extract auction house from sibling elements
 */
function extractAuctionHouseFromSiblings(link) {
  // Look in previous and next siblings
  let sibling = link.previousElementSibling;
  for (let i = 0; i < 3 && sibling; i++) {
    const house = extractAuctionHouseFromContainer(sibling);
    if (house) return house;
    sibling = sibling.previousElementSibling;
  }

  sibling = link.nextElementSibling;
  for (let i = 0; i < 3 && sibling; i++) {
    const house = extractAuctionHouseFromContainer(sibling);
    if (house) return house;
    sibling = sibling.nextElementSibling;
  }

  return null;
}

/**
 * Extract auction house from URL or page context
 */
function extractAuctionHouseFromURL(href) {
  // Sometimes the auction house is in the URL or slug
  const houses = [
    'artcurial', 'ader', 'tajan', 'millon', 'aguttes', 'piasa'
  ];

  const lowerHref = href.toLowerCase();
  for (const house of houses) {
    if (lowerHref.includes(house)) {
      // Capitalize first letter
      return house.charAt(0).toUpperCase() + house.slice(1);
    }
  }

  return null;
}

/**
 * Extract category from page URL
 */
function extractCategoryFromURL() {
  const url = window.location.href;

  // Check for categId parameter
  const categIdMatch = url.match(/categId=(\d+)/);
  if (categIdMatch) {
    const categId = categIdMatch[1];

    // Map common category IDs (you can expand this based on Drouot's IDs)
    const categoryMap = {
      '199': 'Mobilier',
      '1': 'Bijoux',
      '204': 'Mode et vintage',
      '2': 'Montres',
      '3': 'Tableaux',
      '4': 'Arts d\'Asie',
      '5': 'Objets d\'art',
      '6': 'Livres',
      '7': 'Vins et Spiritueux'
    };

    return categoryMap[categId] || '';
  }

  return '';
}

/**
 * Debug function - inspect page structure
 */
export function debugPageStructure() {
  console.log('=== DROUOT PAGE STRUCTURE DEBUG ===');

  // 1. Check for global variables
  console.log('\n1. Global Variables:');
  const globals = ['__INITIAL_STATE__', '__NUXT__', '__NEXT_DATA__', 'apolloState', 'lots', 'Lots'];
  globals.forEach(name => {
    if (window[name]) {
      console.log(`  ✓ window.${name}:`, window[name]);
    }
  });

  // 2. Find potential lot containers
  console.log('\n2. Potential Lot Containers:');
  const selectors = ['article', '.card', '[class*="item"]', '[class*="lot"]', '[data-lot]'];
  selectors.forEach(sel => {
    const count = document.querySelectorAll(sel).length;
    if (count > 0) {
      console.log(`  ${sel}: ${count} elements`);
      if (count > 0 && count < 20) {
        const first = document.querySelector(sel);
        console.log('    First element:', first);
        console.log('    Classes:', first?.className);
        console.log('    Attributes:', Array.from(first?.attributes || []).map(a => `${a.name}="${a.value}"`));
      }
    }
  });

  // 3. Check page structure
  console.log('\n3. Page Structure:');
  console.log('  Body classes:', document.body.className);
  console.log('  Main content:', document.querySelector('main')?.tagName);
  console.log('  App root:', document.querySelector('#app, #__next, #__nuxt')?.id);

  // 4. Look for React/Vue data
  console.log('\n4. SPA Framework:');
  if (window.React || document.querySelector('[data-reactroot]')) {
    console.log('  ✓ React detected');
  }
  if (window.Vue || window.__VUE__) {
    console.log('  ✓ Vue detected');
  }
  if (window.__NUXT__) {
    console.log('  ✓ Nuxt.js detected');
  }

  console.log('\n=== END DEBUG ===');
}
