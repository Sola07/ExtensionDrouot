# 🚀 Migration vers l'API Drouot + Nouveau Design

## ✅ Ce qui a été fait

### 1. **Nouveau Scraper API**
Au lieu de parser le HTML, l'extension **intercepte maintenant les appels API** de Drouot !

#### Avantages :
- ✅ **Maisons de vente dès le départ** - Plus besoin de cliquer sur chaque lot
- ✅ **Données complètes** - Prix exacts, descriptions, images haute qualité
- ✅ **Plus fiable** - Pas de cassure si Drouot change son HTML
- ✅ **Plus rapide** - Données JSON structurées
- ✅ **Tous les filtres de Drouot** fonctionnent automatiquement

#### Fichiers créés :
- `src/services/scraper-api.js` - Parse les réponses de l'API Drouot
- `content/content-api.js` - Intercepte les appels `fetch()` et `XMLHttpRequest`

#### Comment ça marche :
```javascript
// L'extension intercepte cet appel automatiquement :
https://api.drouot.com/drouot/gingolem/neoGingo/lot/search?lang=fr&cat=650&page=1

// Et extrait les lots avec TOUTES les infos :
{
  "auctioneerId": 88,
  "auctioneerName": "Boisgirard - Antonini",
  "lowEstim": 800,
  "highEstim": 1200,
  "description": "CARTIER...",
  "photo": {...}
}
```

---

### 2. **Nouveau Design Style Drouot**

Les cards ressemblent maintenant exactement à celles de Drouot ! 🎨

#### Caractéristiques :
- **Image 1:1** en plein écran
- **Badge LIVE** en haut à gauche avec date/heure
- **Bouton cœur** en haut à droite (favoris)
- **Badge NEW** en bas à gauche pour les nouveaux lots
- **Style minimaliste** : beaucoup d'espace blanc, typographie épurée
- **"Estimation"** + **prix en gros et gras**

#### Fichiers modifiés :
- `src/components/ItemCard.jsx` - Nouveau composant card
- `src/components/ItemCard.css` - Style Drouot minimaliste
- `src/components/ItemList.css` - Grille responsive 1-2-3 colonnes

#### Design :
```
┌─────────────────────────┐
│ [LIVE 17 DÉC | 11:00] ♥ │
│                         │
│     [GRANDE IMAGE]      │
│                         │
│ [NEW]                   │
├─────────────────────────┤
│ 284                     │
│ USM - HALLER Deux...    │
│                         │
│ Estimation              │
│ 400 € - 600 €          │
└─────────────────────────┘
```

---

## 🧪 Comment tester

### 1. Rechargez l'extension
```
chrome://extensions/
→ Drouot Monitor → 🔄 Reload
```

### 2. Allez sur Drouot
```
https://drouot.com/fr?categId=650
(ou n'importe quelle catégorie)
```

### 3. Ouvrez la console (F12)
Vous devriez voir :
```
[Drouot Monitor] 🚀 Activating API interception mode
[Drouot Monitor] 🎯 Intercepted Drouot API call: ...
[Drouot Monitor] ✅ Extracted 100 lots from API
[Drouot Monitor] Auction houses found: { "Boisgirard - Antonini": 33, ... }
```

### 4. Ouvrez le popup
- Vous voyez les lots avec le **nouveau design**
- Les **maisons de vente** sont déjà remplies !
- Le **filtre par maison** fonctionne immédiatement

---

## 🔍 Debugging

### Vérifier l'interception API

Dans la console Drouot (F12) :
```javascript
// Vérifier les lots stockés avec maisons de vente
chrome.storage.local.get(['lots'], (result) => {
  const lots = Object.values(result.lots || {});
  console.log(`Total lots: ${lots.length}`);

  // Compter les maisons
  const houses = {};
  lots.forEach(lot => {
    houses[lot.auctionHouse] = (houses[lot.auctionHouse] || 0) + 1;
  });

  console.log('Maisons trouvées:', houses);
});
```

### Vérifier les appels API

Onglet **Network** → **Fetch/XHR** :
- Vous devriez voir des appels à `api.drouot.com/drouot/gingolem/neoGingo/lot/search`
- Cliquez dessus → **Preview** → Vous verrez le JSON avec tous les lots

---

## 📊 Comparaison : Avant vs Après

| Fonctionnalité | Avant (HTML) | Après (API) |
|----------------|--------------|-------------|
| **Maisons de vente** | ❌ "Drouot" partout | ✅ Noms réels dès le départ |
| **Enrichissement** | ⚠️ Clic par clic | ✅ Automatique |
| **Prix** | ⚠️ Approximatif | ✅ Exacts (lowEstim/highEstim) |
| **Description** | ⚠️ Partielle | ✅ Complète |
| **Images** | ⚠️ Basse qualité | ✅ Haute qualité |
| **Robustesse** | ❌ Casse si HTML change | ✅ API stable |
| **Filtres Drouot** | ❌ Pas supportés | ✅ Tous fonctionnent |

---

## 🎯 Prochaines étapes

### V2 - Améliorations possibles :

1. **Pagination automatique**
   - Détecter les changements de page sur Drouot
   - Charger automatiquement les lots de toutes les pages

2. **Filtre par date avancé**
   - Slider de dates
   - Affichage par semaine / mois

3. **Notifications push**
   - Alerte quand un lot matching apparaît
   - Badge navigateur avec le nombre de nouveaux lots

4. **Synchronisation cloud**
   - Sauvegarder les favoris dans le cloud
   - Accès multi-appareils

---

## 🐛 Problèmes connus

### L'API ne se déclenche pas ?

**Cause** : L'interception ne fonctionne que si l'API est appelée APRÈS le chargement de l'extension.

**Solution** : Rechargez la page Drouot après avoir rechargé l'extension.

### Pas de maisons de vente ?

**Vérifiez** :
1. Console : Voyez-vous `🎯 Intercepted Drouot API call` ?
2. Network : Voyez-vous l'appel à `api.drouot.com` ?
3. Storage : Les lots ont-ils un `auctioneerId` ?

---

## 🎨 Personnalisation du design

### Changer les couleurs

Dans `ItemCard.css` :
```css
/* Badge LIVE */
.badge-type.badge-live {
  color: #ff4444; /* Rouge */
}

/* Favoris actifs */
.drouot-card-favorite.active {
  color: #de2826; /* Rouge Drouot */
}
```

### Ajuster la taille des cards

Dans `ItemList.css` :
```css
@media (min-width: 900px) {
  .item-list {
    grid-template-columns: repeat(3, 1fr); /* 3 colonnes */
  }
}
```

---

**Le système est maintenant complètement basé sur l'API Drouot ! 🎉**
