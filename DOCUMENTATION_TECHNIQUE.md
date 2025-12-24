# Documentation Technique Exhaustive - Extension Chrome Drouot Monitor

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture générale](#architecture-générale)
3. [Composants principaux](#composants-principaux)
4. [Flux de données](#flux-de-données)
5. [Services et modules](#services-et-modules)
6. [Système de scraping](#système-de-scraping)
7. [Système de filtrage](#système-de-filtrage)
8. [Stockage des données](#stockage-des-données)
9. [Communication inter-composants](#communication-inter-composants)
10. [Build et déploiement](#build-et-déploiement)
11. [Sécurité et performance](#sécurité-et-performance)

---

## Vue d'ensemble

### Description

**Drouot Monitor** est une extension Chrome qui permet de surveiller automatiquement les ventes aux enchères sur Drouot.com. L'extension fonctionne de manière passive en analysant les pages visitées par l'utilisateur, extrait les informations sur les lots, applique des filtres personnalisés et maintient un système de suivi des items (NOUVEAU, VU, FAVORI, IGNORÉ).

### Technologies utilisées

- **Manifest V3** : Version moderne des extensions Chrome
- **React 18** : Interface utilisateur du popup
- **Webpack 5** : Build et bundling
- **chrome.storage.local** : Stockage local illimité (IndexedDB)
- **Content Scripts** : Injection dans les pages Drouot
- **Service Worker** : Traitement en arrière-plan
- **date-fns** : Manipulation des dates

### Permissions requises

```json
{
  "permissions": [
    "storage",      // chrome.storage.local
    "tabs",         // Suivi des onglets actifs
    "notifications", // Notifications pour nouveaux lots
    "alarms"        // Nettoyage périodique
  ],
  "host_permissions": [
    "*://*.drouot.com/*"  // Accès aux pages Drouot
  ]
}
```

---

## Architecture générale

### Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTENSION CHROME                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │   CONTENT     │    │  BACKGROUND   │    │    POPUP     │ │
│  │   SCRIPT      │◄──►│   SERVICE     │◄──►│  (React UI)  │ │
│  │               │    │   WORKER      │    │              │ │
│  └──────────────┘    └──────────────┘    └─────────────┘ │
│         │                    │                    │         │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │      chrome.storage.local (IndexedDB)                 │ │
│  │  • Lots (items scrapés)                                │ │
│  │  • User States (NEW/SEEN/FAVORITE/IGNORED)            │ │
│  │  • Filters (filtres utilisateur)                     │ │
│  │  • Preferences (préférences UI)                       │ │
│  │  • Indexes (index:new, index:seen, etc.)              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Scraping passif
                            ▼
                  ┌──────────────────┐
                  │   Drouot.com      │
                  │  (Pages visitées) │
                  └──────────────────┘
```

### Points d'entrée

1. **Content Script** (`content/content.js`)
   - S'exécute sur toutes les pages `*.drouot.com/*`
   - Scrape le DOM ou intercepte les appels API
   - Ajoute des badges visuels sur les lots

2. **Background Service Worker** (`background.js`)
   - S'exécute en arrière-plan de manière persistante
   - Traite les lots scrapés
   - Applique les filtres
   - Gère le badge de notification

3. **Popup UI** (`popup/popup.jsx`)
   - Interface React déclenchée au clic sur l'icône
   - Affiche les lots filtrés
   - Gère les paramètres utilisateur

---

## Composants principaux

### 1. Content Script (`content/content.js`)

**Responsabilités :**
- Détection du type de page (liste, détail, recherche)
- Scraping DOM ou interception API selon le contexte
- Ajout de badges visuels (🆕 Nouveau, ⭐ Favori, 👀 Vu)
- Gestion de la navigation SPA (Single Page Application)
- Enrichissement progressif des données

**Fonctionnement :**

```javascript
// Mode API (préféré pour Drouot)
if (isDrouot) {
  setupApiInterception();  // Intercepte fetch/XHR
  setupXhrInterception();
  checkAndHandleSearchPage(); // Détecte les pages de recherche
}

// Mode DOM (fallback)
if (!useApiMode) {
  scrapePage(); // Scrape le DOM directement
  // Observer les changements DOM (SPA navigation)
  const observer = new MutationObserver(debouncedScrape);
}
```

**Détection de navigation SPA :**
- MutationObserver sur le titre de la page
- Polling de l'URL toutes les 500ms
- Écoute des événements `popstate`

### 2. Background Service Worker (`background.js`)

**Responsabilités :**
- Traitement centralisé des lots scrapés
- Application des filtres utilisateur
- Calcul des scores de correspondance
- Mise à jour du badge de notification
- Gestion des états utilisateur (NEW → SEEN → FAVORITE)
- Nettoyage périodique des données anciennes

**Gestion des messages :**

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MessageType.NEW_LOTS:
      handleNewLots(message.lots, message.isEnriched, message.skipFilters);
      break;
    case MessageType.UPDATE_STATE:
      handleUpdateState(message.lotId, message.state);
      break;
    case MessageType.GET_ITEMS:
      getItems(message.filter);
      break;
    // ... autres types
  }
});
```

**Traitement des nouveaux lots :**

1. Vérification des doublons (par ID)
2. Application des filtres (si `skipFilters = false`)
3. Calcul du score de correspondance
4. Enregistrement dans le stockage
5. Création de l'état NEW si nouveau
6. Mise à jour du badge
7. Notification aux composants UI

### 3. Popup UI (`popup/popup.jsx`)

**Structure React :**

```
App.jsx
├── Header (logo, boutons actions)
├── ItemList (liste des lots)
│   └── ItemCard (carte individuelle)
└── Settings (configuration des filtres)
```

**Composants principaux :**

- **App.jsx** : Composant racine, gestion de l'état global
- **ItemList.jsx** : Liste paginée des lots
- **ItemCard.jsx** : Carte d'affichage d'un lot
- **Settings.jsx** : Configuration des filtres
- **CityFilter.jsx** : Filtre par ville
- **QuickFilter.jsx** : Filtres rapides
- **TabNavigation.jsx** : Navigation par onglets

**Cycle de vie :**

```javascript
useEffect(() => {
  loadItems(ITEM_SCOPE); // Chargement initial
}, []);

useEffect(() => {
  // Écoute des messages de refresh
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MessageType.REFRESH_UI) {
      loadItems(ITEM_SCOPE);
    }
  });
}, []);
```

---

## Flux de données

### 1. Scraping → Traitement → Stockage → UI

```
┌─────────────────┐
│ Utilisateur     │
│ visite Drouot   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Content Script          │
│ • Détecte le type page  │
│ • Scrape DOM ou API     │
│ • Extrait lots          │
└────────┬────────────────┘
         │
         │ Message: NEW_LOTS
         ▼
┌─────────────────────────┐
│ Background Worker        │
│ • Vérifie doublons      │
│ • Applique filtres      │
│ • Calcule score         │
│ • Enregistre lot        │
│ • Crée état NEW         │
└────────┬────────────────┘
         │
         │ Stockage
         ▼
┌─────────────────────────┐
│ chrome.storage.local     │
│ • lots[id] = lot        │
│ • userStates[id] = NEW  │
│ • index:new.push(id)    │
└────────┬────────────────┘
         │
         │ Refresh UI
         ▼
┌─────────────────────────┐
│ Popup + Content Script   │
│ • Badge mis à jour      │
│ • Liste rafraîchie      │
│ • Badges sur page       │
└─────────────────────────┘
```

### 2. Action utilisateur → Mise à jour état

```
Utilisateur clique "Marquer comme vu"
         │
         ▼
┌─────────────────────────┐
│ Popup/Content Script    │
│ Envoie UPDATE_STATE      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Background Worker        │
│ • Met à jour userState   │
│ • NEW → SEEN             │
│ • Met à jour index       │
│ • Décrémente badge       │
└────────┬────────────────┘
         │
         │ Broadcast REFRESH_UI
         ▼
┌─────────────────────────┐
│ Tous les composants      │
│ • Badge retiré           │
│ • Lot déplacé vers SEEN  │
│ • Compteurs mis à jour   │
└─────────────────────────┘
```

### 3. Enrichissement progressif

Lorsqu'un utilisateur visite une page de détail d'un lot :

```
Page détail (/fr/l/12345)
         │
         ▼
┌─────────────────────────┐
│ Content Script          │
│ scrapeDetailPage()       │
│ • Extrait données complètes│
│ • Maison de vente        │
│ • Description détaillée  │
│ • Images multiples       │
└────────┬────────────────┘
         │
         │ Message: NEW_LOTS (isEnriched=true)
         ▼
┌─────────────────────────┐
│ Background Worker        │
│ • Fusionne avec lot existant│
│ • Préserve timestamps    │
│ • Met à jour données     │
│ • Recalcule score        │
└─────────────────────────┘
```

---

## Services et modules

### 1. Storage Service (`src/services/storage.js`)

**Classe singleton** qui encapsule toutes les opérations `chrome.storage.local`.

**Méthodes principales :**

```javascript
// Lots
await storage.getLot(id);
await storage.getAllLots();
await storage.saveLot(lot);
await storage.updateLot(id, updates);
await storage.deleteLot(id);

// États utilisateur
await storage.getUserState(lotId);
await storage.setUserState(lotId, ItemState.NEW);
await storage.updateUserState(lotId, updates);

// Requêtes indexées
await storage.getNewItems();
await storage.getSeenItems();
await storage.getFavoriteItems();

// Filtres et préférences
await storage.getFilters();
await storage.saveFilters(filters);
await storage.getPreferences();
await storage.savePreferences(prefs);

// Métadonnées
await storage.getMetadata();
await storage.updateCounts();
```

**Stratégie d'indexation :**

Pour des requêtes rapides, des index séparés sont maintenus :

```javascript
{
  "index:new": ["lot1", "lot2", ...],
  "index:seen": ["lot3", "lot4", ...],
  "index:favorite": ["lot5", ...],
  "index:ignored": ["lot6", ...]
}
```

Lors d'un changement d'état, les index sont mis à jour automatiquement.

### 2. Filter Service (`src/services/filter.js`)

**Fonction principale : `matchesFilters(lot, filters)`**

Vérifie si un lot correspond aux critères utilisateur :

1. **Catégorie** : Le lot doit être dans `filters.categories`
2. **Mots-clés inclusion** : OR logique (au moins un mot-clé)
3. **Mots-clés exclusion** : AND logique (aucun mot-clé exclu)
4. **Prix** : Moyenne dans la plage `[priceMin, priceMax]`
5. **Date** : Date de vente dans `[dateFrom, dateTo]`
6. **Maison de vente** : Dans `filters.auctionHouses`
7. **Ville** : Dans `filters.cities`
8. **Images** : Si `onlyWithImages`, doit avoir une image

**Calcul du score (`calculateMatchScore`) :**

```javascript
score = 10  // Base

// Catégorie : +15
// Mots-clés : +10 par mot-clé trouvé
// Mots-clés dans titre : +5 bonus
// Proximité prix : jusqu'à +15
// Récence : jusqu'à +10
// Urgence vente : jusqu'à +15
// Image : +5
// Maison de vente : +10
// Ville : +10

return Math.min(100, score);
```

### 3. Messaging Service (`src/services/messaging.js`)

**API de communication entre composants :**

```javascript
// Content Script → Background
await sendToBackground(MessageType.NEW_LOTS, { lots });

// Background → Tous les onglets
await sendToAllTabs(MessageType.REFRESH_UI);

// Background → Popup
await sendToPopup(MessageType.REFRESH_UI);

// Background → Onglet spécifique
await sendToTab(tabId, MessageType.REFRESH_UI);
```

**Types de messages :**

- `NEW_LOTS` : Nouveaux lots scrapés
- `UPDATE_STATE` : Changement d'état utilisateur
- `GET_ITEMS` : Récupération de lots filtrés
- `UPDATE_FILTERS` : Mise à jour des filtres
- `REFRESH_UI` : Rafraîchir l'interface
- `CLEAR_DATA` : Effacer tous les lots

### 4. Scraper Services

#### 4.1 Scraper API (`src/services/scraper-api.js`)

Intercepte les réponses API de Drouot et extrait les lots.

**Endpoint intercepté :**
```
https://api.drouot.com/drouot/gingolem/neoGingo/lot/search
```

**Structure de réponse attendue :**
```json
{
  "numFound": 150,
  "lots": [
    {
      "id": "12345",
      "title": "Titre du lot",
      "description": "...",
      "estimateMin": 800,
      "estimateMax": 1200,
      "auctionDate": "2024-12-17T14:00:00Z",
      "auctionHouse": "Artcurial",
      "imageUrl": "...",
      "city": "Paris"
    }
  ]
}
```

#### 4.2 Scraper Drouot (`src/services/scraper-drouot.js`)

Scraping DOM spécifique à Drouot pour les pages de liste.

**Stratégie :**
1. Trouve tous les liens `/fr/l/[ID]`
2. Extrait l'ID du lot depuis l'URL
3. Parse le texte du lien (date + titre)
4. Remonte dans le DOM pour trouver image, prix, maison de vente
5. Génère un ID unique basé sur `externalId + auctionHouse`

**Extraction de la maison de vente :**
- Recherche dans le texte du conteneur
- Liste de maisons connues (Artcurial, Ader, Tajan, etc.)
- Recherche dans les éléments frères
- Extraction depuis l'URL si disponible

#### 4.3 Scraper Detail (`src/services/scraper-detail.js`)

Scraping des pages de détail pour enrichir les données.

**Données extraites :**
- Titre complet (h1)
- Description détaillée
- Catégorie (breadcrumb)
- Prix d'estimation
- Date et heure de vente
- Maison de vente (texte de la page)
- Localisation de la vente
- Images (principale + galerie)

### 5. Content API (`content/content-api.js`)

**Interception des appels API :**

Utilise un script injecté (`injected-api-bridge.js`) pour intercepter `fetch` et `XMLHttpRequest` dans le contexte de la page (bypass CSP).

**Fonctionnement :**

```javascript
// 1. Injection du script bridge
injectInterceptionScript();

// 2. Le script intercepte fetch/XHR
// 3. Envoie les réponses via postMessage
window.postMessage({
  source: 'drouot-monitor-api',
  type: 'DROUOT_MONITOR_API_RESPONSE',
  payload: { url, body }
});

// 4. Content script écoute et traite
window.addEventListener('message', async (event) => {
  const lots = await parseApiResponse(apiData);
  await sendToBackground(MessageType.NEW_LOTS, { lots });
});
```

**Recherche complète avec pagination :**

```javascript
await performFullSearch(query, {}, async (batch, info) => {
  // Traite chaque batch de lots
  await sendBatchToBackground(batch);
  updateSearchIndicator(`Enregistrement ${info.processed}/${info.total}...`);
});
```

- Récupère le total depuis la première page
- Pagine avec 100 lots par page
- Traite jusqu'à 5 pages en parallèle
- Affiche un indicateur de progression

---

## Système de scraping

### Modes de scraping

#### Mode 1 : Interception API (préféré)

**Avantages :**
- Données structurées et complètes
- Pas de parsing DOM fragile
- Performance optimale
- Fonctionne avec les SPAs

**Déclenchement :**
- Automatique sur toutes les pages Drouot
- Intercepte les appels `fetch` et `XHR`
- Filtre les réponses de l'API de recherche

#### Mode 2 : Scraping DOM (fallback)

**Utilisé quand :**
- L'interception API échoue
- Page non-Drouot (compatibilité future)
- Debug et développement

**Stratégie :**
1. Trouve les conteneurs de lots (selectors CSS)
2. Extrait les données depuis le DOM
3. Parse les dates, prix, textes
4. Génère des IDs uniques

### Détection du type de page

```javascript
// Page de recherche
isSearchPage() → /s, /search/, /recherche/

// Page de détail
isDetailPage() → /fr/l/[ID]

// Page de liste
isListingPage() → Autres pages avec lots
```

### Gestion de la navigation SPA

Drouot utilise une SPA (Single Page Application), donc l'URL change sans rechargement complet.

**Méthodes de détection :**

1. **MutationObserver** sur `<title>`
2. **Polling** de `window.location.href` toutes les 500ms
3. **Écoute** des événements `popstate` (retour/avant)

Lors d'un changement d'URL :
- Détecte le nouveau type de page
- Relance le scraping approprié
- Met à jour les badges

### Enrichissement progressif

**Stratégie :**

1. **Scraping initial** (liste) : Données minimales
   - ID, titre, prix, date, image

2. **Enrichissement** (détail) : Données complètes
   - Description détaillée
   - Maison de vente précise
   - Localisation
   - Images multiples

3. **Fusion** dans le background :
   - Préserve les timestamps originaux
   - Met à jour uniquement les champs enrichis
   - Recalcule le score avec les nouvelles données

---

## Système de filtrage

### Structure des filtres

```javascript
{
  enabled: true,              // Activer/désactiver tous les filtres
  categories: ["Mobilier"],    // Catégories sélectionnées
  includeKeywords: ["louis xvi"],  // Mots-clés à inclure (OR)
  excludeKeywords: ["reproduction"], // Mots-clés à exclure (AND)
  priceMin: 100,
  priceMax: 5000,
  dateFrom: timestamp,
  dateTo: timestamp,
  auctionHouses: ["Artcurial"], // Maisons de vente
  cities: ["Paris"],           // Villes
  onlyWithImages: false,
  excludeCategories: []        // Catégories à exclure
}
```

### Logique de correspondance

**Ordre d'évaluation :**

1. Si `enabled = false` → **Tout correspond**
2. Catégorie → Doit être dans `categories` (sauf si vide)
3. Catégories exclues → Ne doit PAS être dans `excludeCategories`
4. Mots-clés inclusion → **OR** : Au moins un mot-clé trouvé
5. Mots-clés exclusion → **AND** : Aucun mot-clé exclu trouvé
6. Prix → Moyenne dans `[priceMin, priceMax]`
7. Date → Dans `[dateFrom, dateTo]`
8. Maison de vente → Dans `auctionHouses` (sauf si vide)
9. Ville → Dans `cities` (sauf si vide)
10. Images → Si `onlyWithImages`, doit avoir `imageUrl`

**Tous les critères doivent être satisfaits** (logique AND entre les étapes).

### Calcul du score

Le score (0-100) détermine l'ordre d'affichage dans le popup.

**Composants du score :**

| Critère | Points | Détails |
|---------|--------|---------|
| Base | +10 | Tous les lots correspondants |
| Catégorie | +15 | Correspondance exacte |
| Mots-clés | +10 | Par mot-clé trouvé |
| Mots-clés titre | +5 | Bonus si dans le titre |
| Proximité prix | 0-15 | Plus proche du milieu = plus de points |
| Récence | 0-10 | Plus récent = plus de points |
| Urgence vente | 0-15 | Plus proche de la date = plus de points |
| Image | +5 | Présence d'image |
| Maison de vente | +10 | Correspondance |
| Ville | +10 | Correspondance |

**Exemple :**
- Lot correspondant avec 2 mots-clés dans le titre
- Catégorie correspondante
- Prix proche du milieu
- Vente dans 5 jours
- Avec image
- Maison de vente correspondante

Score = 10 + 15 + 20 + 10 + 12 + 5 + 10 + 5 + 10 = **97/100**

### Réévaluation des lots

Lors d'un changement de filtres :

```javascript
async function reEvaluateAllLots() {
  const allLots = await storage.getAllLots();
  const filters = await storage.getFilters();

  for (const lot of allLots) {
    const matches = matchesFilters(lot, filters);
    if (matches) {
      // Recalcule le score
      lot.matchScore = calculateMatchScore(lot, filters);
      lot.matchReason = getMatchReasons(lot, filters);
      await storage.updateLot(lot.id, lot);

      // Crée un état NEW si pas encore d'état
      const state = await storage.getUserState(lot.id);
      if (!state) {
        await storage.setUserState(lot.id, ItemState.NEW);
      }
    }
  }
}
```

---

## Stockage des données

### Structure de stockage

```javascript
{
  // Données principales
  "lots": {
    "drouot_abc123_artcurial": { /* Lot object */ }
  },

  "userStates": {
    "drouot_abc123_artcurial": {
      "lotId": "drouot_abc123_artcurial",
      "state": "NEW",
      "createdAt": 1703001600000,
      "lastStateChange": 1703001600000,
      "viewCount": 0
    }
  },

  // Indexes pour requêtes rapides
  "index:new": ["drouot_abc123_artcurial", ...],
  "index:seen": [...],
  "index:favorite": [...],
  "index:ignored": [...],

  // Configuration
  "filters": { /* UserFilters */ },
  "preferences": { /* UserPreferences */ },
  "metadata": {
    "version": "1.0.0",
    "totalLots": 234,
    "newCount": 12,
    "seenCount": 200,
    "favoriteCount": 8,
    "ignoredCount": 14
  }
}
```

### Modèle de données Lot

```typescript
interface Lot {
  // Identification
  id: string;                    // ID unique généré
  externalId: string;            // ID Drouot
  url: string;                   // URL du lot

  // Contenu
  title: string;
  description: string;
  category: string;

  // Prix
  estimateMin: number;
  estimateMax: number;
  currency: string;              // "EUR"

  // Vente
  auctionDate: number;            // Timestamp
  auctionHouse: string;           // Maison de vente
  auctionLocation?: string;       // Ville/localisation
  city?: string;                 // Ville extraite

  // Média
  imageUrl?: string;
  images?: string[];

  // Métadonnées
  firstSeenAt: number;
  lastSeenAt: number;
  scrapedFrom: string;
  detailScrapedAt?: number;       // Si enrichi depuis détail

  // Matching
  matchScore?: number;            // 0-100
  matchReason?: string[];         // Raisons de correspondance
  listOrder?: number;             // Ordre dans la liste
}
```

### Génération d'ID unique

```javascript
function generateLotId(lot) {
  // Combine externalId + auctionHouse + titre
  const raw = `${lot.externalId}_${lot.auctionHouse}_${lot.title.substring(0, 20)}`;
  return `drouot_${hashString(raw)}`;
}
```

**Pourquoi cette stratégie :**
- Même lot peut apparaître sur différentes maisons → IDs différents
- Hash garantit un ID stable même si le titre change légèrement
- Préfixe `drouot_` pour éviter les collisions

### Gestion des doublons

```javascript
// Vérification avant sauvegarde
const existingIds = await storage.getAllLotIds();
if (existingIds.includes(lot.id)) {
  // Lot existe déjà
  if (isEnriched) {
    // Fusionne les données enrichies
    mergeEnrichedData(existingLot, newLot);
  } else {
    // Met à jour seulement lastSeenAt
    await storage.updateLot(lot.id, { lastSeenAt: Date.now() });
  }
} else {
  // Nouveau lot
  await storage.saveLot(lot);
  await storage.setUserState(lot.id, ItemState.NEW);
}
```

### Nettoyage automatique

**Règles de nettoyage :**

```javascript
async function cleanupOldItems(olderThanDays = 90) {
  const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  for (const lot of allLots) {
    const state = await storage.getUserState(lot.id);

    // GARDE si :
    // 1. Vente dans le futur
    if (lot.auctionDate > Date.now()) continue;

    // 2. Item favori
    if (state?.state === ItemState.FAVORITE) continue;

    // 3. Activité récente
    if (state?.lastStateChange > cutoff) continue;

    // Sinon, SUPPRIME
    await storage.deleteLot(lot.id);
  }
}
```

**Planification :**
- Nettoyage quotidien via `chrome.alarms`
- Configurable dans les préférences (`autoCleanupDays`)

---

## Communication inter-composants

### Architecture de messagerie

```
Content Script ←→ Background ←→ Popup
     │              │
     └──────────────┘
```

**Tous les messages passent par le Background** (hub central).

### Types de messages

Définis dans `src/constants.js` :

```javascript
export const MessageType = {
  NEW_LOTS: 'NEW_LOTS',                    // Lots scrapés
  UPDATE_STATE: 'UPDATE_STATE',            // Changement d'état
  GET_NEW_COUNT: 'GET_NEW_COUNT',          // Compte des nouveaux
  GET_ITEMS: 'GET_ITEMS',                  // Récupération de lots
  UPDATE_FILTERS: 'UPDATE_FILTERS',        // Mise à jour filtres
  SCRAPING_ERROR: 'SCRAPING_ERROR',        // Erreur de scraping
  REFRESH_UI: 'REFRESH_UI',                // Rafraîchir UI
  FETCH_AUCTION_HOUSE_PAGE: 'FETCH_AUCTION_HOUSE_PAGE',
  CLEAR_DATA: 'CLEAR_DATA',                // Effacer données
  FULL_SEARCH: 'FULL_SEARCH'               // Recherche complète
};
```

### Exemples de communication

#### Content Script → Background

```javascript
// Envoi de lots scrapés
const response = await sendToBackground(MessageType.NEW_LOTS, {
  lots: scrapedLots,
  isEnriched: false,
  skipFilters: false
});

// Mise à jour d'état
await sendToBackground(MessageType.UPDATE_STATE, {
  lotId: 'drouot_123',
  state: ItemState.SEEN
});
```

#### Background → Content Script

```javascript
// Rafraîchir les badges
await sendToAllTabs(MessageType.REFRESH_UI, {
  lotId: 'drouot_123',
  state: ItemState.SEEN
});
```

#### Popup → Background

```javascript
// Récupérer les lots
const response = await chrome.runtime.sendMessage({
  type: MessageType.GET_ITEMS,
  filter: 'new'
});

// Mettre à jour les filtres
await chrome.runtime.sendMessage({
  type: MessageType.UPDATE_FILTERS,
  filters: newFilters
});
```

#### Background → Popup

```javascript
// Notifier le popup (si ouvert)
await sendToPopup(MessageType.REFRESH_UI);
```

### Gestion des réponses asynchrones

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Retourner true pour réponse asynchrone
  handleAsyncMessage(message).then(sendResponse);
  return true; // Indique une réponse asynchrone
});
```

---

## Build et déploiement

### Configuration Webpack

**Fichier : `webpack.config.js`**

```javascript
module.exports = {
  entry: {
    popup: './popup/popup.jsx',
    background: './background.js',
    content: './content/content.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader'  // Transpile React/ES6
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './popup/popup.html',
      filename: 'popup.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: 'assets' },
        { from: 'content/content.css' },
        { from: 'content/injected-api-bridge.js' }
      ]
    })
  ]
};
```

### Scripts npm

```json
{
  "scripts": {
    "dev": "webpack --mode development --watch",
    "build": "webpack --mode production",
    "clean": "rm -rf dist"
  }
}
```

### Processus de build

1. **Transpilation** : Babel transforme JSX/ES6 → ES5
2. **Bundling** : Webpack combine les modules
3. **Minification** : En mode production
4. **Copie** : Assets, manifest, CSS copiés vers `dist/`
5. **Génération** : `popup.html` généré avec les scripts injectés

### Structure du dossier `dist/`

```
dist/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── content.js
├── content.css
├── injected-api-bridge.js
└── assets/
    ├── icon16.png
    ├── icon48.png
    ├── icon128.png
    └── ...
```

### Chargement dans Chrome

1. Ouvrir `chrome://extensions/`
2. Activer "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/`

### Développement

```bash
# Mode watch (rebuild automatique)
npm run dev

# Après chaque changement :
# 1. Webpack rebuild automatiquement
# 2. Recharger l'extension dans Chrome
# 3. Rafraîchir la page Drouot
```

---

## Sécurité et performance

### Sécurité

#### 1. Content Security Policy (CSP)

**Manifest V3** impose des restrictions strictes :

- ❌ Pas d'`eval()`
- ❌ Pas de code inline
- ✅ Scripts depuis `chrome.runtime.getURL()`
- ✅ Messages sécurisés via `postMessage`

**Solution pour l'interception API :**
- Script injecté depuis `web_accessible_resources`
- Communication via `window.postMessage`
- Pas de code dynamique

#### 2. Isolation des contextes

- **Content Script** : Isolé du contexte de la page
- **Injected Script** : Exécuté dans le contexte de la page
- **Background** : Isolé, pas d'accès DOM

#### 3. Validation des données

```javascript
// Validation avant traitement
if (!lot.id || !lot.title) {
  console.warn('Lot invalide ignoré');
  return;
}

// Sanitization des URLs
const safeUrl = lot.url.startsWith('http')
  ? lot.url
  : `https://drouot.com${lot.url}`;
```

#### 4. Pas de données externes

- ✅ Toutes les données restent locales
- ✅ Aucun tracking/analytics
- ✅ Aucune requête externe (sauf Drouot pour scraping)

### Performance

#### 1. Optimisations de scraping

**Debouncing :**
```javascript
const debouncedScrape = debounce(scrapePage, 500);
// Évite les scrapes multiples lors de changements DOM rapides
```

**Déduplication :**
```javascript
// Vérifie les IDs avant traitement
const existingIds = await storage.getAllLotIds();
const newLots = scrapedLots.filter(lot => !existingIds.includes(lot.id));
```

**Traitement par batch :**
```javascript
// Traite les lots par groupes de 50
for (let i = 0; i < lots.length; i += 50) {
  const batch = lots.slice(i, i + 50);
  await processBatch(batch);
}
```

#### 2. Optimisations de stockage

**Indexation :**
- Indexes séparés pour requêtes fréquentes
- Évite de parcourir tous les lots

**Cache en mémoire :**
```javascript
class StorageService {
  constructor() {
    this.cache = {
      filters: null,
      preferences: null
    };
  }

  async getFilters() {
    if (this.cache.filters) return this.cache.filters;
    // ... chargement depuis storage
  }
}
```

**Opérations batch :**
```javascript
// Une seule écriture pour plusieurs lots
await storage.saveLots([lot1, lot2, lot3]);
// Au lieu de 3 écritures séparées
```

#### 3. Optimisations UI

**Lazy loading :**
- Popup charge seulement les lots visibles
- Pagination pour grandes listes

**Mise à jour sélective :**
```javascript
// Ne rafraîchit que les composants affectés
if (message.lotId) {
  updateSpecificItem(message.lotId);
} else {
  refreshAll();
}
```

**Debouncing des actions utilisateur :**
```javascript
// Évite les clics multiples rapides
const debouncedStateChange = debounce(handleStateChange, 300);
```

### Limites et contraintes

#### Stockage

- **Quota** : Illimité pour `chrome.storage.local`
- **Taille estimée** : ~2KB par lot
- **Capacité** : ~10,000 lots = ~20MB (largement suffisant)

#### Performance scraping

- **Temps par page** : <100ms (DOM) ou <50ms (API)
- **Temps de filtrage** : <10ms par lot
- **Mémoire** : ~20MB pour 10,000 lots

#### Limitations Chrome

- **Service Worker** : Peut être suspendu après inactivité
- **Content Script** : S'exécute à chaque navigation
- **Popup** : Fermé automatiquement lors de la navigation

---

## Conclusion

Cette extension Chrome utilise une architecture moderne et performante pour surveiller passivement les ventes Drouot. Elle combine :

- **Scraping intelligent** : API interception + DOM fallback
- **Filtrage avancé** : Multi-critères avec scoring
- **Stockage efficace** : Indexation pour requêtes rapides
- **UI réactive** : React avec mise à jour en temps réel
- **Sécurité** : Respect des CSP et isolation des contextes

L'extension est conçue pour être **maintenable**, **extensible** et **performante**, avec une séparation claire des responsabilités entre les composants.
