// Script de diagnostic Drouot - Copier-coller dans la console
// Sur la page drouot.com, ouvrez la console (F12) et collez ce script entier

(function() {
  console.log('\n\n=== DROUOT PAGE STRUCTURE DEBUG ===\n');

  // 1. Check for global variables
  console.log('1. VARIABLES GLOBALES JAVASCRIPT:\n');
  const globals = [
    '__INITIAL_STATE__',
    '__NUXT__',
    '__NEXT_DATA__',
    'apolloState',
    'lots',
    'Lots',
    'items',
    'ventes',
    'auctions',
    'catalog'
  ];

  globals.forEach(name => {
    if (window[name]) {
      console.log(`  ✓ window.${name}:`, window[name]);
      console.log(`     Type:`, typeof window[name]);
      console.log(`     Keys:`, Object.keys(window[name]).slice(0, 10));
    }
  });

  // Check all window properties containing "lot"
  console.log('\n2. PROPRIÉTÉS WINDOW CONTENANT "LOT":\n');
  Object.keys(window).forEach(key => {
    if (key.toLowerCase().includes('lot') && typeof window[key] === 'object') {
      console.log(`  ✓ window.${key}:`, window[key]);
    }
  });

  // 3. Find potential lot containers
  console.log('\n3. CONTENEURS DOM POTENTIELS:\n');
  const selectors = [
    'article',
    '.card',
    '[class*="item"]',
    '[class*="lot"]',
    '[class*="auction"]',
    '[class*="vente"]',
    '[data-lot]',
    '[data-id]'
  ];

  selectors.forEach(sel => {
    try {
      const count = document.querySelectorAll(sel).length;
      if (count > 0 && count < 50) {
        console.log(`  ${sel}: ${count} éléments`);
        const first = document.querySelector(sel);
        if (first) {
          console.log(`    Classes:`, first.className);
          console.log(`    ID:`, first.id);
          console.log(`    Attributes:`, Array.from(first.attributes).map(a => a.name).join(', '));
          console.log(`    Text preview:`, first.textContent.substring(0, 50) + '...');
        }
      }
    } catch(e) {}
  });

  // 4. Check page structure
  console.log('\n4. STRUCTURE DE LA PAGE:\n');
  console.log('  Body classes:', document.body.className);
  console.log('  Body ID:', document.body.id);
  console.log('  Main element:', document.querySelector('main')?.tagName);
  console.log('  App root:', document.querySelector('#app, #__next, #__nuxt')?.id);

  // 5. Look for React/Vue data
  console.log('\n5. FRAMEWORK DÉTECTÉ:\n');
  if (window.React || document.querySelector('[data-reactroot]')) {
    console.log('  ✓ React détecté');
  }
  if (window.Vue || window.__VUE__ || window.$nuxt) {
    console.log('  ✓ Vue détecté');
  }
  if (window.__NUXT__) {
    console.log('  ✓ Nuxt.js détecté');
    console.log('    Nuxt data:', window.__NUXT__);
  }
  if (window.$nuxt) {
    console.log('  ✓ Nuxt instance:', window.$nuxt);
  }

  // 6. Try to find lot-like elements by content
  console.log('\n6. RECHERCHE PAR CONTENU (€, prix, estimation):\n');
  const bodyText = document.body.innerHTML;
  const hasPriceSymbols = bodyText.includes('€') || bodyText.includes('EUR');
  console.log('  Page contient des prix (€):', hasPriceSymbols);

  const priceElements = document.querySelectorAll('*');
  let foundPrices = 0;
  priceElements.forEach(el => {
    const text = el.textContent;
    if (text.match(/\d+\s*[-–]\s*\d+\s*€/) && foundPrices < 5) {
      console.log(`  Prix trouvé dans <${el.tagName} class="${el.className}">:`, text.substring(0, 50));
      foundPrices++;
    }
  });

  // 7. Check for images that might be lot images
  console.log('\n7. IMAGES (potentiellement des lots):\n');
  const images = document.querySelectorAll('img');
  console.log(`  Total images: ${images.length}`);
  if (images.length > 0 && images.length < 100) {
    Array.from(images).slice(0, 5).forEach((img, i) => {
      console.log(`  Image ${i + 1}:`, {
        src: img.src.substring(0, 60) + '...',
        alt: img.alt,
        parent: img.parentElement?.tagName,
        parentClass: img.parentElement?.className
      });
    });
  }

  // 8. Look for links that might be lot links
  console.log('\n8. LIENS (potentiellement vers des lots):\n');
  const links = document.querySelectorAll('a[href*="/l/"], a[href*="/lot/"], a[href*="/vente/"]');
  console.log(`  Liens trouvés: ${links.length}`);
  Array.from(links).slice(0, 5).forEach((link, i) => {
    console.log(`  Lien ${i + 1}:`, {
      href: link.href,
      text: link.textContent.substring(0, 40),
      class: link.className
    });
  });

  // 9. Try to extract lot data from any global store
  console.log('\n9. TENTATIVE D\'EXTRACTION DES DONNÉES:\n');

  // Check Redux store
  if (window.__REDUX_DEVTOOLS_EXTENSION__) {
    console.log('  Redux DevTools détecté - vérifier l\'état dans l\'onglet Redux');
  }

  // Check for JSON in script tags
  const scripts = document.querySelectorAll('script[type="application/json"]');
  console.log(`  Scripts JSON: ${scripts.length}`);
  if (scripts.length > 0) {
    Array.from(scripts).slice(0, 3).forEach((script, i) => {
      try {
        const data = JSON.parse(script.textContent);
        console.log(`  Script JSON ${i + 1}:`, data);
      } catch(e) {}
    });
  }

  console.log('\n=== END DEBUG ===\n');
  console.log('📋 Copiez TOUT ce qui précède et partagez-le\n\n');
})();
