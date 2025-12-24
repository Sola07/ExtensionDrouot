(function() {
  const script = document.currentScript;
  const bridgeSource = script?.dataset.bridgeSource || 'drouot-monitor-api';
  const bridgeType = script?.dataset.bridgeType || 'DROUOT_MONITOR_API_RESPONSE';

  if (window.__drouotMonitorApiIntercepted) {
    script?.remove();
    return;
  }
  window.__drouotMonitorApiIntercepted = true;

  const isApiUrl = url => {
    if (!url || typeof url !== 'string') return false;
    if (!url.includes('api.drouot.com')) return false;
    return url.includes('/lot/search') ||
      url.includes('/search?') ||
      /search\?lang=/.test(url);
  };

  const postPayload = (url, body) => {
    try {
      window.postMessage({
        source: bridgeSource,
        type: bridgeType,
        payload: { url, body }
      }, '*');
    } catch (error) {
      console.error('[Drouot Monitor] Error posting intercepted payload', error);
    }
  };

  const interceptFetch = () => {
    if (typeof window.fetch !== 'function') return;
    const originalFetch = window.fetch;

    window.fetch = function(...args) {
      const requestInfo = args[0];
      const url = typeof requestInfo === 'string'
        ? requestInfo
        : (requestInfo && typeof requestInfo === 'object' ? requestInfo.url : undefined);

      return originalFetch.apply(this, args).then(response => {
        if (isApiUrl(url)) {
          try {
            response.clone().text().then(body => {
              if (body) postPayload(url, body);
            }).catch(() => {});
          } catch (err) {
            console.error('[Drouot Monitor] Error cloning fetch response', err);
          }
        }
        return response;
      });
    };
  };

  const interceptXhr = () => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.__drouotMonitorUrl = url;
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function(...args) {
      if (!this.__drouotMonitorHooked) {
        this.__drouotMonitorHooked = true;
        this.addEventListener('load', function() {
          const url = this.__drouotMonitorUrl;
          if (!isApiUrl(url)) return;

          try {
            if (this.responseType === '' || this.responseType === 'text') {
              if (this.responseText) {
                postPayload(url, this.responseText);
              }
            } else if (this.responseType === 'json' && this.response) {
              postPayload(url, JSON.stringify(this.response));
            }
          } catch (err) {
            console.error('[Drouot Monitor] Error reading XHR response', err);
          }
        });
      }

      return originalSend.apply(this, args);
    };
  };

  console.log('[Drouot Monitor] Injected API bridge into page context');
  interceptFetch();
  interceptXhr();
  script?.remove();
})();
