/**
 * Scraper for Drouot detail pages (/fr/l/[ID])
 * Extracts complete lot information including auction house
 */

import { parseDate } from '../utils/date.js';
import { parsePriceRange } from '../utils/price.js';

/**
 * Check if current page is a lot detail page
 */
export function isDetailPage() {
  const url = window.location.href;
  return url.includes('/fr/l/') || url.includes('/lot/');
}

/**
 * Scrape complete lot details from detail page
 */
export function scrapeDetailPage(document) {
  console.log('[Drouot Monitor] Scraping detail page...');

  try {
    const lot = extractDetailLot(document);

    if (lot) {
      console.log('[Drouot Monitor] Detail page scraped successfully:', lot.title);
      console.log('[Drouot Monitor] Auction house found:', lot.auctionHouse);
      return lot;
    }
  } catch (error) {
    console.error('[Drouot Monitor] Error scraping detail page:', error);
  }

  return null;
}

/**
 * Extract complete lot information from detail page
 */
function extractDetailLot(document) {
  // Extract ID from URL
  const url = window.location.href;
  const idMatch = url.match(/\/l\/(\d+)/);
  const externalId = idMatch ? idMatch[1] : '';

  if (!externalId) {
    console.warn('[Drouot Monitor] Could not extract lot ID from URL');
    return null;
  }

  // Extract data using multiple strategies
  const lot = {
    externalId,
    url: url,
    title: extractTitle(document),
    description: extractDescription(document),
    category: extractCategory(document),
    estimateMin: 0,
    estimateMax: 0,
    currency: 'EUR',
    auctionDate: extractAuctionDate(document),
    auctionHouse: extractAuctionHouse(document),
    auctionLocation: extractAuctionLocation(document),
    imageUrl: extractMainImage(document),
    images: extractAllImages(document),
    scrapedFrom: url,
    firstSeenAt: Date.now(),
    lastSeenAt: Date.now(),
    detailScrapedAt: Date.now() // Mark as enriched
  };

  // Extract price
  const price = extractDetailPrice(document);
  lot.estimateMin = price.min;
  lot.estimateMax = price.max;

  // Generate unique ID
  lot.id = generateLotId(lot);

  console.log('[Drouot Monitor] Extracted lot:', {
    id: lot.id,
    title: lot.title.substring(0, 50),
    auctionHouse: lot.auctionHouse,
    price: `${lot.estimateMin}-${lot.estimateMax}€`
  });

  return lot;
}

/**
 * Extract title
 */
function extractTitle(document) {
  // Try h1 first
  const h1 = document.querySelector('h1');
  if (h1) return h1.textContent.trim();

  // Try title tag
  const title = document.title;
  if (title && !title.includes('Drouot.com')) {
    return title.split('|')[0].trim();
  }

  return 'Titre non disponible';
}

/**
 * Extract description
 */
function extractDescription(document) {
  // Look for description paragraphs
  const selectors = [
    '[class*="description"]',
    '[class*="detail"]',
    'article p',
    '.content p',
    'main p'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      const texts = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 20);

      if (texts.length > 0) {
        return texts.join('\n\n');
      }
    }
  }

  return '';
}

/**
 * Extract category
 */
function extractCategory(document) {
  // Look in breadcrumb
  const breadcrumb = document.querySelector('.breadcrumb, [class*="breadcrumb"]');
  if (breadcrumb) {
    const items = breadcrumb.querySelectorAll('li, a, span');
    if (items.length > 0) {
      // Last item is usually the category
      return items[items.length - 1].textContent.trim();
    }
  }

  // Look for category label
  const categorySelectors = [
    '[class*="category"]',
    '[class*="categorie"]',
    '[data-category]'
  ];

  for (const selector of categorySelectors) {
    const el = document.querySelector(selector);
    if (el) return el.textContent.trim();
  }

  // Fallback: extract from URL
  const urlCateg = extractCategoryFromURL();
  if (urlCateg) return urlCateg;

  return '';
}

function extractCategoryFromURL() {
  const url = window.location.href;

  // Check for categId parameter
  const categIdMatch = url.match(/categId=(\d+)/);
  if (categIdMatch) {
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
    return categoryMap[categIdMatch[1]] || '';
  }

  return '';
}

/**
 * Extract price details
 */
function extractDetailPrice(document) {
  const bodyText = document.body.textContent;

  // Look for "Estimation" or "Estimate" labels
  const estimationMatch = bodyText.match(/Estimation[:\s]*(\d[\d\s.,]*)\s*[-–€]\s*(\d[\d\s.,]*)\s*€/i);
  if (estimationMatch) {
    const min = parseInt(estimationMatch[1].replace(/[\s.,]/g, ''));
    const max = parseInt(estimationMatch[2].replace(/[\s.,]/g, ''));
    return { min, max };
  }

  // Look for any price range
  const priceMatch = bodyText.match(/(\d[\d\s.,]*)\s*[-–]\s*(\d[\d\s.,]*)\s*€/);
  if (priceMatch) {
    const min = parseInt(priceMatch[1].replace(/[\s.,]/g, ''));
    const max = parseInt(priceMatch[2].replace(/[\s.,]/g, ''));
    return { min, max };
  }

  // Single price
  const singleMatch = bodyText.match(/(\d[\d\s.,]*)\s*€/);
  if (singleMatch) {
    const price = parseInt(singleMatch[1].replace(/[\s.,]/g, ''));
    return { min: price, max: price };
  }

  return { min: 0, max: 0 };
}

/**
 * Extract auction date
 */
function extractAuctionDate(document) {
  const bodyText = document.body.textContent;

  // Look for date with time
  const dateMatch = bodyText.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\s+(\d{1,2}):(\d{2})/i);

  if (dateMatch) {
    const months = {
      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    const day = parseInt(dateMatch[1]);
    const month = months[dateMatch[2].toLowerCase()];
    const year = parseInt(dateMatch[3]);
    const hour = parseInt(dateMatch[4]);
    const minute = parseInt(dateMatch[5]);

    return new Date(year, month, day, hour, minute).getTime();
  }

  return Date.now();
}

/**
 * Extract auction house - MOST IMPORTANT!
 */
function extractAuctionHouse(document) {
  const bodyText = document.body.textContent;

  // Extended list of auction houses
  const houses = [
    'Artcurial',
    'Drouot Estimations',
    'Ader',
    'Tajan',
    'Cornette de Saint Cyr',
    'Millon',
    'Aguttes',
    'Piasa',
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
    'Millon Belgique',
    'Bonhams',
    'Christie\'s',
    'Sotheby\'s'
  ];

  // Search in page text
  for (const house of houses) {
    if (bodyText.includes(house)) {
      console.log(`[Drouot Monitor] ✓ Found auction house in detail: ${house}`);
      return house;
    }
  }

  // Look for common patterns
  const houseMatch = bodyText.match(/Maison de vente[:\s]*([A-Za-zÀ-ÿ\s&+']+)/i);
  if (houseMatch) {
    const found = houseMatch[1].trim();
    console.log(`[Drouot Monitor] ✓ Found auction house via pattern: ${found}`);
    return found;
  }

  console.warn('[Drouot Monitor] ⚠ Auction house not found in detail page');
  return 'Drouot';
}

/**
 * Extract auction location
 */
function extractAuctionLocation(document) {
  const bodyText = document.body.textContent;

  // Look for location patterns
  const locationMatch = bodyText.match(/(?:Lieu|Location|Salle)[:\s]*([^,\n]{3,50})/i);
  if (locationMatch) {
    return locationMatch[1].trim();
  }

  return '';
}

/**
 * Extract main image
 */
function extractMainImage(document) {
  // Try multiple selectors for main image
  const selectors = [
    'img[class*="main"]',
    'img[class*="hero"]',
    'img[class*="primary"]',
    '.gallery img:first-child',
    'main img:first-of-type',
    'article img:first-of-type'
  ];

  for (const selector of selectors) {
    const img = document.querySelector(selector);
    if (img && img.src && !img.src.includes('favicon') && !img.src.includes('logo')) {
      return img.src;
    }
  }

  // Fallback: first large image
  const allImages = document.querySelectorAll('img');
  for (const img of allImages) {
    if (img.naturalWidth > 200 && img.src && !img.src.includes('favicon')) {
      return img.src;
    }
  }

  return '';
}

/**
 * Extract all images
 */
function extractAllImages(document) {
  const images = [];
  const imgElements = document.querySelectorAll('img');

  for (const img of imgElements) {
    if (img.src &&
        !img.src.includes('favicon') &&
        !img.src.includes('logo') &&
        img.naturalWidth > 100) {
      images.push(img.src);
    }
  }

  return images.slice(0, 10); // Max 10 images
}

/**
 * Generate unique lot ID
 */
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
