# 🔍 Debug : Vérifier les Maisons de Vente

## Problème
Le filtre par maison de vente n'apparaît pas dans le popup.

## Causes possibles

1. **L'API n'est pas interceptée** - L'extension n'a pas capté les appels API
2. **Toutes les maisons sont "Drouot"** - Le filtre masque les "Drouot" par défaut
3. **Pas de lots scrapés** - Aucune donnée dans le storage

---

## ✅ Test 1 : Vérifier l'interception API

### Ouvrez la console sur Drouot (F12)

Rechargez la page et cherchez :
```
[Drouot Monitor] 🚀 Activating API interception mode
[Drouot Monitor] 🎯 Intercepted Drouot API call: ...
[Drouot Monitor] ✅ Extracted 100 lots from API
```

**Si vous NE voyez PAS ces messages** → L'interception ne fonctionne pas.

**Solution** :
1. Rechargez l'extension : `chrome://extensions/` → Reload
2. **PUIS** rechargez la page Drouot (l'ordre est important !)

---

## ✅ Test 2 : Vérifier les lots dans le storage

### Dans la console Drouot (F12), exécutez :

```javascript
chrome.storage.local.get(['lots'], (result) => {
  const lots = Object.values(result.lots || {});

  console.log(`📊 Total lots: ${lots.length}`);

  // Compter les maisons
  const houses = {};
  lots.forEach(lot => {
    const house = lot.auctionHouse || 'Unknown';
    houses[house] = (houses[house] || 0) + 1;
  });

  console.log('🏛️ Maisons trouvées:', houses);

  // Afficher 3 exemples de lots
  console.log('\n📋 Exemples de lots:');
  lots.slice(0, 3).forEach((lot, i) => {
    console.log(`\nLot ${i + 1}:`);
    console.log('  - Titre:', lot.title?.substring(0, 50));
    console.log('  - Maison:', lot.auctionHouse);
    console.log('  - Source:', lot.source);
    console.log('  - ID Maison:', lot.auctionHouserId);
  });
});
```

### Résultats attendus

**✅ Bon cas (API fonctionne)** :
```
📊 Total lots: 100
🏛️ Maisons trouvées: {
  "Boisgirard - Antonini": 33,
  "Pescheteau-Badin": 113,
  "Ader": 1,
  ...
}

Lot 1:
  - Titre: CARTIER Importante BAGUE "nœud" en or jaune...
  - Maison: Boisgirard - Antonini
  - Source: api
  - ID Maison: 88
```

**❌ Mauvais cas (API ne fonctionne pas)** :
```
📊 Total lots: 100
🏛️ Maisons trouvées: {
  "Drouot": 100
}

Lot 1:
  - Titre: ...
  - Maison: Drouot
  - Source: undefined (ou absent)
  - ID Maison: undefined
```

---

## ✅ Test 3 : Forcer l'affichage du filtre (temporaire)

Si vous voulez voir le filtre **même avec "Drouot"**, modifiez temporairement `QuickFilter.jsx` :

### Ligne 12, changez :
```javascript
// AVANT
if (item.auctionHouse && item.auctionHouse !== 'Drouot') {

// APRÈS (temporaire pour debug)
if (item.auctionHouse) {
```

Cela affichera TOUTES les maisons, y compris "Drouot".

---

## ✅ Test 4 : Vérifier l'onglet Network

1. **Ouvrez DevTools** (F12)
2. **Onglet Network**
3. **Filtrez sur "Fetch/XHR"**
4. **Rechargez la page Drouot**
5. **Cherchez** : `api.drouot.com`

Vous devriez voir :
```
api.drouot.com/drouot/gingolem/neoGingo/lot/search?lang=fr&cat=650&page=1
```

Cliquez dessus → **Preview** → Vous devriez voir le JSON avec `lots` et `breakdowns.auctioneer`.

**Si vous NE voyez PAS cet appel** → Drouot n'utilise peut-être pas l'API sur cette page (rare).

---

## 🐛 Solutions aux problèmes courants

### Problème 1 : "L'API n'est jamais interceptée"

**Cause** : L'extension se charge APRÈS l'appel API.

**Solution** :
1. Rechargez l'extension
2. Ouvrez un NOUVEL onglet Drouot (pas F5, mais nouvel onglet)
3. OU : Cliquez sur "Suivant" pour charger page 2

### Problème 2 : "Tous les lots sont 'Drouot'"

**Cause** : Le mapping des maisons ne fonctionne pas.

**Vérifiez dans la console** :
```javascript
chrome.storage.local.get(['lots'], (result) => {
  const lots = Object.values(result.lots || {});
  const firstLot = lots[0];

  console.log('Premier lot:', firstLot);
  console.log('  - auctioneerId:', firstLot?.auctioneerId);
  console.log('  - auctionHouserId:', firstLot?.auctionHouserId);
  console.log('  - auctionHouse:', firstLot?.auctionHouse);
});
```

Si `auctioneerId` est présent mais `auctionHouse` est "Drouot", le mapping a échoué.

### Problème 3 : "Aucun lot du tout"

**Cause** : Le scraper ne fonctionne pas.

**Vérifiez** :
```javascript
chrome.storage.local.get(null, (result) => {
  console.log('Tout le storage:', result);
});
```

---

## 📊 Tableau de diagnostic

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Pas de message d'interception dans console | Extension chargée après l'API | Recharger extension + nouvel onglet |
| Lots = "Drouot" partout | API non interceptée OU mapping échoué | Vérifier Network + storage |
| Aucun lot | Scraper ne fonctionne pas | Vérifier console pour erreurs |
| Filtre invisible | Tous lots = "Drouot" | Normal, attendre API ou modifier QuickFilter |

---

## 🎯 Prochaine étape

**Exécutez Test 2** (vérifier storage) et **envoyez-moi les résultats** :
- Combien de lots ?
- Quelles maisons ?
- Le `source` dit-il `"api"` ?

Avec ça je pourrai diagnostiquer exactement le problème ! 🔍
