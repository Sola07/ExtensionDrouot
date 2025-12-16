/**
 * API Interceptor for Drouot
 * Intercepts fetch calls to Drouot API and extracts lot data
 */

import { parseApiResponse, isApiResponse, debugApiStructure } from '../src/services/scraper-api.js';
import { sendToBackground } from '../src/services/messaging.js';
import { MessageType } from '../src/constants.js';

console.log('[Drouot Monitor] API Interceptor loaded on', window.location.href);

let isIntercepting = false;

/**
 * Setup API interception
 */
export function setupApiInterception() {
  if (isIntercepting) {
    console.log('[Drouot Monitor] API interception already active');
    return;
  }

  console.log('[Drouot Monitor] Setting up API interception...');

  // Store original fetch
  const originalFetch = window.fetch;

  // Override fetch
  window.fetch = async function(...args) {
    const url = args[0];

    // Call original fetch
    const response = await originalFetch.apply(this, args);

    // Check if this is a Drouot API call we care about
    if (typeof url === 'string' && isApiResponse(url)) {
      console.log('[Drouot Monitor] 🎯 Intercepted Drouot API call:', url);

      // Clone response to read it
      const clonedResponse = response.clone();

      try {
        const data = await clonedResponse.json();

        // Debug structure
        debugApiStructure(data);

        // Parse lots
        const lots = parseApiResponse(data);

        if (lots.length > 0) {
          console.log(`[Drouot Monitor] ✅ Extracted ${lots.length} lots from API`);

          // Send to background
          await sendToBackground(MessageType.NEW_LOTS, {
            lots,
            isEnriched: true // API data is already complete
          });

          console.log('[Drouot Monitor] 📤 Sent lots to background');
        }
      } catch (error) {
        console.error('[Drouot Monitor] Error parsing API response:', error);
      }
    }

    return response;
  };

  isIntercepting = true;
  console.log('[Drouot Monitor] ✅ API interception active');
}

/**
 * Also intercept XHR (in case Drouot uses XMLHttpRequest)
 */
export function setupXhrInterception() {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    this._method = method;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', async function() {
      const url = this._url;

      if (typeof url === 'string' && isApiResponse(url)) {
        console.log('[Drouot Monitor] 🎯 Intercepted XHR API call:', url);

        try {
          const data = JSON.parse(this.responseText);

          debugApiStructure(data);

          const lots = parseApiResponse(data);

          if (lots.length > 0) {
            console.log(`[Drouot Monitor] ✅ Extracted ${lots.length} lots from XHR`);

            await sendToBackground(MessageType.NEW_LOTS, {
              lots,
              isEnriched: true
            });

            console.log('[Drouot Monitor] 📤 Sent lots to background');
          }
        } catch (error) {
          console.error('[Drouot Monitor] Error parsing XHR response:', error);
        }
      }
    });

    return originalXHRSend.apply(this, args);
  };

  console.log('[Drouot Monitor] ✅ XHR interception active');
}

// Auto-setup on load
if (window.location.href.includes('drouot.com')) {
  setupApiInterception();
  setupXhrInterception();
}
