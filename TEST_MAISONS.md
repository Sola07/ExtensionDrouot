# 🔍 Test : Détection des Maisons de Vente

## Comment ça doit fonctionner

### Flux Normal :

1. **Vous allez sur Drouot** (ex: https://drouot.com/fr?categId=199)
2. **Extension scrape les lots** visibles sur la page
3. **Détecte les maisons** de chaque lot (Artcurial, Ader, etc.)
4. **Popup affiche** :
   - Tous les lots scrapés
   - Filtre avec UNIQUEMENT les maisons présentes dans ces lots

### Exemple :

```
Page Drouot montre 18 lots :
- 5 lots Artcurial
- 3 lots Ader
- 7 lots Drouot Estimations
- 3 lots Tajan

Popup affiche :
🏛️ Filtrer par maison de vente
[Toutes (18)] [Artcurial (5)] [Ader (3)]
[Drouot Estimations (7)] [Tajan (3)]
```

Le filtre est **dynamique** : il montre uniquement les maisons présentes dans les lots que vous voyez.

---

## 🧪 Test Rapide

### 1. Ouvrez la console sur Drouot (F12)

### 2. Exécutez ce script pour voir les maisons détectées :

```javascript
// Vérifier les liens de lots
const lotLinks = document.querySelectorAll('a[href*="/fr/l/"]');
console.log(`Total de liens : ${lotLinks.length}`);

// Vérifier le texte de chaque conteneur
lotLinks.forEach((link, i) => {
  const container = link.parentElement?.parentElement?.parentElement;
  const text = container?.textContent || link.textContent;
  console.log(`\nLot ${i + 1}:`, link.href);
  console.log('Texte:', text.substring(0, 200));

  // Chercher des noms de maisons
  const maisons = ['Artcurial', 'Ader', 'Tajan', 'Millon', 'Drouot Estimations', 'Aguttes'];
  const found = maisons.find(m => text.includes(m));
  console.log('Maison trouvée:', found || 'Aucune');
});
```

### 3. Résultat attendu :

Vous devriez voir :
```
Lot 1: https://drouot.com/fr/l/...
Texte: 17 DÉC. - 14:00 Table OPPENHEIM Artcurial ...
Maison trouvée: Artcurial

Lot 2: https://drouot.com/fr/l/...
Texte: 19 DÉC. - 11:00 Commode Louis XVI Ader ...
Maison trouvée: Ader
```

---

## 🐛 Si les maisons ne sont PAS détectées

Cela signifie que **le nom de la maison n'apparaît pas dans le texte du conteneur**.

### Solutions :

#### Option 1 : Inspecter manuellement
1. Sur Drouot, faites **clic droit sur un lot** → Inspecter
2. Cherchez où apparaît le nom de la maison (Artcurial, Ader, etc.)
3. Notez la structure HTML

#### Option 2 : Cliquer sur le lot
Si le nom n'est pas en liste, il faut peut-être cliquer sur le lot pour voir la page détail où la maison est indiquée.

---

## 🔧 Debug Avancé

### Vérifier ce que l'extension a scrapé :

```javascript
// Dans la console sur Drouot
chrome.storage.local.get(['lots'], (result) => {
  const lots = result.lots || {};
  console.log('Lots stockés:', Object.keys(lots).length);

  // Afficher les 5 premiers lots
  Object.values(lots).slice(0, 5).forEach(lot => {
    console.log('\n---');
    console.log('Titre:', lot.title);
    console.log('Maison:', lot.auctionHouse);
    console.log('Prix:', lot.estimateMin, '-', lot.estimateMax);
    console.log('URL:', lot.url);
  });
});
```

### Résultat attendu :

```
Lots stockés: 18

---
Titre: Meret OPPENHEIM (1913-1985)
Maison: Artcurial  ← Devrait être détecté
Prix: 0 - 0
URL: https://drouot.com/fr/l/31577684-...
```

---

## ❓ Questions de Diagnostic

1. **Voyez-vous des lots dans le popup ?**
   - Si NON → Le scraper ne fonctionne pas
   - Si OUI → Continuez

2. **Les lots affichés ont-ils une "Maison" indiquée ?**
   - Regardez dans l'ItemCard, il devrait y avoir un badge avec la maison
   - Si "Drouot" partout → Les maisons ne sont pas détectées

3. **Le filtre "Maison de vente" apparaît-il dans le popup ?**
   - Si NON → Peut-être qu'une seule maison ou aucune n'est détectée
   - Si OUI mais vide → Toutes les maisons sont "Drouot"

---

## 🎯 Mon Hypothèse

Je pense que **les noms des maisons n'apparaissent pas dans le HTML de la liste**.

Sur Drouot, la structure est probablement :
- **Page liste** : Titre, date, prix (mais PAS la maison)
- **Page détail** : Toutes les infos incluant la maison

### Solution potentielle :

Il faudrait peut-être **cliquer sur chaque lot** pour récupérer la maison depuis la page détail. Mais ça serait trop lent.

**Alternative** : L'utilisateur configure dans Settings les maisons qui l'intéressent, et l'extension filtre AVANT d'afficher (au lieu de filtrer après dans le popup).

---

## 📊 Prochain Test

**Partagez avec moi** :

1. Le résultat du script de test ci-dessus
2. Une capture d'écran du popup (si des lots apparaissent)
3. Un exemple de lot sur Drouot où vous VOYEZ la maison de vente

Avec ça, je pourrai ajuster le scraper pour détecter correctement les maisons ! 🎯
