# 🔍 Détection des Appels API Drouot

## Comment vérifier si Drouot utilise une API

### Méthode 1 : DevTools Network Tab

1. **Ouvrez Drouot** : https://drouot.com/fr?categId=199
2. **Ouvrez DevTools** : F12 → Onglet **Network**
3. **Filtrez** : Cliquez sur **Fetch/XHR** (pour voir seulement les appels API)
4. **Rechargez la page** : Ctrl+R ou Cmd+R
5. **Observez** : Cherchez des appels vers des endpoints API

### Indices à chercher

Cherchez des appels vers des URLs comme :
- `/api/lots`
- `/api/search`
- `/graphql`
- Endpoints contenant `lots`, `auctions`, `items`
- Appels retournant du JSON avec les données des lots

### Méthode 2 : Script d'interception

Copiez-collez ce script dans la **Console** de DevTools sur une page Drouot :

```javascript
// Script d'interception des appels API
console.log('🔍 Démarrage de l\'interception des appels réseau...\n');

// Intercepter fetch()
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];

  console.log('📡 FETCH appelé:', url);

  return originalFetch.apply(this, args)
    .then(response => {
      // Clone la réponse pour pouvoir la lire
      const clonedResponse = response.clone();

      // Si c'est du JSON, afficher le contenu
      if (response.headers.get('content-type')?.includes('application/json')) {
        clonedResponse.json().then(data => {
          console.log('✅ Réponse JSON de:', url);
          console.log('📦 Données:', data);

          // Détecter si c'est une API de lots
          if (data.lots || data.items || data.results || Array.isArray(data)) {
            console.log('🎯 API DE LOTS DÉTECTÉE !');
            console.log('Structure:', Object.keys(data));

            // Afficher le premier lot
            const lots = data.lots || data.items || data.results || data;
            if (lots.length > 0) {
              console.log('📋 Exemple de lot:', lots[0]);
              console.log('🏛️ Maison de vente:', lots[0].auctionHouse || lots[0].seller || lots[0].house || 'Non trouvé');
            }
          }
        }).catch(() => {});
      }

      return response;
    });
};

// Intercepter XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
  this._url = url;
  this._method = method;
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(...args) {
  console.log(`📡 XHR ${this._method}:`, this._url);

  this.addEventListener('load', function() {
    if (this.responseType === '' || this.responseType === 'text') {
      try {
        const data = JSON.parse(this.responseText);
        console.log('✅ Réponse XHR de:', this._url);
        console.log('📦 Données:', data);

        // Détecter si c'est une API de lots
        if (data.lots || data.items || data.results || Array.isArray(data)) {
          console.log('🎯 API DE LOTS DÉTECTÉE (XHR) !');
          console.log('Structure:', Object.keys(data));
        }
      } catch (e) {
        // Pas du JSON
      }
    }
  });

  return originalXHRSend.apply(this, args);
};

console.log('✅ Interception activée !');
console.log('👉 Naviguez sur le site ou rechargez la page pour voir les appels API\n');
```

### Méthode 3 : Inspecter le code source de la page

```javascript
// Chercher des indices dans le code JS de Drouot
// Regardez dans l'onglet Sources → Cherchez "api" ou "fetch"

// Ou exécutez ceci dans la console :
const scripts = document.querySelectorAll('script');
let apiEndpoints = [];

scripts.forEach(script => {
  const content = script.textContent;

  // Chercher des patterns d'API
  const apiMatches = content.match(/['"](\/api\/[^'"]+)['"]/g);
  if (apiMatches) {
    apiEndpoints.push(...apiMatches);
  }

  // Chercher des URLs avec 'lot' ou 'auction'
  const lotMatches = content.match(/['"](https?:\/\/[^'"]*(?:lot|auction)[^'"]*)['"]/g);
  if (lotMatches) {
    apiEndpoints.push(...lotMatches);
  }
});

console.log('🔍 Endpoints API trouvés:', [...new Set(apiEndpoints)]);
```

## Que chercher dans la réponse API ?

Si vous trouvez une API qui retourne les lots, cherchez ces champs :

```json
{
  "lots": [
    {
      "id": "31577684",
      "title": "Meret OPPENHEIM",
      "auctionHouse": "Artcurial",  ← C'EST ÇA QU'ON VEUT !
      "estimate": "800 - 1200",
      "date": "2024-12-17T14:00:00Z",
      "category": "Mobilier",
      "images": [...],
      "description": "...",
      ...
    }
  ]
}
```

## Cas possibles

### Cas 1 : API REST classique
```
GET https://drouot.com/api/lots?category=199&page=1
```
→ On peut appeler directement cette API dans notre extension !

### Cas 2 : GraphQL
```
POST https://drouot.com/graphql
Body: { query: "{ lots(category: 199) { id title auctionHouse ... } }" }
```
→ On peut faire des requêtes GraphQL optimisées !

### Cas 3 : Données embarquées dans le HTML
```html
<script>
  window.__INITIAL_DATA__ = { lots: [...] };
</script>
```
→ On peut extraire directement du JavaScript !

## Prochaine étape

1. **Exécutez le script d'interception** ci-dessus sur Drouot
2. **Rechargez la page** ou naviguez entre les catégories
3. **Regardez la console** pour voir les appels API détectés
4. **Partagez avec moi** ce que vous trouvez !

Si on trouve une API, je pourrai **réécrire le scraper** pour utiliser directement l'API au lieu du HTML. Ce sera **beaucoup plus fiable et complet** ! 🚀
