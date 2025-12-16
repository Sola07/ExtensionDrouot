# ✨ Système d'Enrichissement Progressif des Données

## 🎯 Problème Résolu

**Constat** : Les noms des maisons de vente ne sont PAS visibles dans la liste Drouot. Ils n'apparaissent que sur la **page détail** de chaque lot.

**Solution** : Scraping progressif en 2 étapes :
1. **Scraping liste** → Données basiques (titre, date, ID)
2. **Scraping détail** → Données complètes (maison, prix exact, description)

---

## 🔄 Comment Ça Fonctionne

### Étape 1 : Page Liste (Scraping Initial)

Vous visitez : `https://drouot.com/fr?categId=199`

```
[Drouot Monitor] Found 100 lot links
[Drouot Monitor] Found 100 unique lots
[Drouot Monitor] Added 100 new lots
```

**Données scrapées** :
- ✅ Titre
- ✅ Date d'enchère
- ✅ URL vers le lot
- ✅ ID externe
- ❌ Maison de vente → "Drouot" (par défaut)
- ❌ Prix exact → 0 (non disponible)
- ❌ Description → Vide

### Étape 2 : Page Détail (Enrichissement)

Vous cliquez sur un lot dans le popup → Ouvre la page Drouot du lot

```
[Drouot Monitor] ✨ Detail page detected - enriching data...
[Drouot Monitor] ✅ Detail data scraped and sent for enrichment
[Drouot Monitor] ✨ Enriched lot: Commode Louis XVI
[Drouot Monitor] 🏛️ Auction house: Artcurial
[Drouot Monitor] 💰 Price: 800-1200€
```

**Données enrichies** :
- ✨ Maison de vente → "Artcurial" (détecté !)
- ✨ Prix exact → 800-1200€
- ✨ Description complète
- ✨ Catégorie
- ✨ Localisation
- ✨ Images supplémentaires

---

## 📊 Flux Détaillé

```
┌─────────────────────────────────────────────────────┐
│ 1. Page Liste Drouot                               │
│    https://drouot.com/fr?categId=199                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Content Script scrape 100 lots                  │
│    - Titre, date, URL, ID                          │
│    - Maison = "Drouot" (défaut)                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Background stocke les lots                      │
│    État: NEW (non vus)                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Popup affiche 100 lots NEW                      │
│    Badge: "100" nouveaux                           │
│    Filtre maison: Non disponible encore            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼ (Utilisateur clique sur un lot)
┌─────────────────────────────────────────────────────┐
│ 5. Page Détail ouverte                             │
│    https://drouot.com/fr/l/31577684-commode...      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Content Script détecte page détail              │
│    Scrape TOUTES les infos                         │
│    Maison: "Artcurial" trouvée !                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. Background enrichit le lot existant             │
│    Fusion: données basiques + détaillées           │
│    Préserve: firstSeenAt, état NEW/SEEN            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 8. Popup mis à jour                                 │
│    Lot enrichi avec maison "Artcurial"             │
│    Filtre maison: Maintenant disponible !          │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Test du Système

### 1. Test Initial

```bash
# 1. Rechargez l'extension
chrome://extensions/ → Drouot Monitor → 🔄 Reload

# 2. Allez sur une page liste Drouot
https://drouot.com/fr?categId=199
```

**Console (F12)** :
```
[Drouot Monitor] Scraping Drouot page with specific parser...
[Drouot Monitor] Found 100 lot links
[Drouot Monitor] Found 100 unique lots
[Drouot Monitor] Added 100 new lots
```

**Popup** :
- 100 lots NEW
- Maisons = "Drouot" partout
- Filtre maison: Pas encore utile

### 2. Test Enrichissement

```bash
# 3. Dans le popup, cliquez sur un lot
# → Ouvre la page détail du lot sur Drouot
```

**Console sur la page détail** :
```
[Drouot Monitor] ✨ Detail page detected - enriching data...
[Drouot Monitor] ✓ Found auction house in detail: Artcurial
[Drouot Monitor] ✅ Detail data scraped and sent for enrichment
```

**Background console** (chrome://extensions → Inspect) :
```
[Drouot Monitor] ✨ Enriched 1 lots with detail data
[Drouot Monitor] 🏛️ Auction house: Artcurial
[Drouot Monitor] 💰 Price: 800-1200€
```

**Popup mis à jour** :
- Le lot affiche maintenant "Artcurial"
- Prix exact visible
- Description complète

### 3. Test Filtre Progressif

```bash
# 4. Cliquez sur 5-10 lots différents
# Chaque clic enrichit un lot

# 5. Retournez au popup
```

**Filtre maison maintenant actif** :
```
🏛️ Filtrer par maison de vente
[Toutes (100)] [Artcurial (3)] [Ader (2)]
[Drouot (95)]
```

Au fur et à mesure que vous consultez des lots, le filtre devient plus précis !

---

## 📈 Enrichissement Progressif

### Scénario Typique

**Jour 1** : Première visite
- Vous scrapez 100 lots
- Tous ont "Drouot" comme maison
- Vous consultez 10 lots qui vous intéressent
- 10 lots enrichis → 3 Artcurial, 2 Ader, 5 autres maisons

**Jour 2** : Retour sur Drouot
- Les 10 lots consultés sont déjà enrichis
- Vous en consultez 5 nouveaux
- 15 lots enrichis au total

**Jour 7** : Après une semaine
- Vous avez consulté ~50 lots
- 50 lots enrichis avec maisons précises
- Le filtre est maintenant très utile !

---

## 🎯 Avantages de Cette Approche

### ✅ Avantages

1. **Respectueux de Drouot**
   - Pas de scraping automatique massif
   - Seulement les pages que vous visitez déjà

2. **Rapide**
   - Page liste : scraping instantané
   - Page détail : scraping instantané
   - Pas d'attente

3. **Intelligent**
   - Les lots que vous consultez souvent sont enrichis
   - Les lots ignorés restent basiques (économie)

4. **Progressif**
   - Plus vous utilisez, plus c'est précis
   - Pas besoin de tout enrichir d'un coup

### ⚠️ Limitations

1. **Non immédiat**
   - Les maisons ne sont pas visibles dès la liste
   - Il faut cliquer sur un lot pour l'enrichir

2. **Manuel**
   - Pas d'enrichissement automatique en arrière-plan
   - Vous devez visiter les pages

3. **Partiel**
   - Seuls les lots consultés sont enrichis
   - Les autres restent avec "Drouot"

---

## 🔮 Améliorations Futures (V2)

### Option A : Enrichissement Automatique Limité

Enrichir automatiquement les 5 premiers lots NEW en arrière-plan :

```javascript
// Après scraping liste, enrichir top 5
enrichTopNewLots(5);
```

**Avantages** :
- Les lots les plus pertinents sont enrichis automatiquement
- Le filtre maison est immédiatement utile

**Inconvénients** :
- Charge supplémentaire pour Drouot
- Peut être considéré comme agressif

### Option B : Enrichissement sur Hover

Enrichir quand vous survolez un lot dans le popup :

```javascript
onMouseEnter(lot) => enrichLot(lot.id);
```

**Avantages** :
- Proactif mais respectueux
- Enrichissement avant même le clic

**Inconvénients** :
- Peut enrichir des lots que vous ne consultez pas

### Option C : Enrichissement Batch

Bouton "Enrichir tous les nouveaux" dans le popup :

```
┌────────────────────────────────┐
│ [🔄 Enrichir tous les nouveaux]│
└────────────────────────────────┘
```

**Avantages** :
- Contrôle total de l'utilisateur
- Enrichissement sur demande

**Inconvénients** :
- Peut prendre du temps (1-2 min pour 100 lots)

---

## 🎨 Indicateur Visuel d'Enrichissement

Dans le popup, vous pouvez voir quels lots sont enrichis :

```jsx
// ItemCard.jsx - Badge enrichi
{lot.detailScrapedAt && (
  <span className="enriched-badge">✨ Enrichi</span>
)}
```

---

## 🔧 Debug

### Vérifier l'état d'enrichissement

```javascript
// Console sur Drouot ou dans le popup
chrome.storage.local.get(['lots'], (result) => {
  const lots = Object.values(result.lots || {});

  // Lots enrichis
  const enriched = lots.filter(l => l.detailScrapedAt);
  console.log(`Lots enrichis: ${enriched.length} / ${lots.length}`);

  // Afficher les maisons uniques
  const houses = [...new Set(enriched.map(l => l.auctionHouse))];
  console.log('Maisons détectées:', houses);
});
```

---

## ✅ Résumé

| Phase | Données | Maison | Filtre Utile ? |
|-------|---------|--------|----------------|
| **Scraping liste** | Basiques | "Drouot" | ❌ Non |
| **1 lot consulté** | 1 enrichi | 1 réelle | ⚠️ Limité |
| **10 lots consultés** | 10 enrichis | 3-5 réelles | ✅ Oui |
| **50+ lots consultés** | 50+ enrichis | 10+ réelles | ✅✅ Très utile |

**Le système devient plus intelligent au fur et à mesure que vous l'utilisez !**

---

## 🚀 Prochaine Étape

1. **Rechargez l'extension** : `chrome://extensions/` → Reload
2. **Visitez Drouot** : Page liste
3. **Cliquez sur quelques lots** → Les ouvre sur Drouot
4. **Retournez au popup** → Voyez les lots enrichis !
5. **Utilisez le filtre maison** → Maintenant fonctionnel pour les lots enrichis

---

**Le filtre par maison de vente fonctionne maintenant, progressivement ! 🎉**
