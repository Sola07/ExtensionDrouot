# Quick Start Guide - Drouot Monitor

Get up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd "/Users/fgs/Desktop/Extension Drouot"
npm install
```

This will install React, Webpack, and all necessary dependencies.

## Step 2: Create Placeholder Icons

Before building, you need icon files. Quick option:

```bash
mkdir -p assets

# Download placeholder icons (requires curl)
curl "https://via.placeholder.com/16/667eea/FFFFFF?text=D" -o assets/icon16.png
curl "https://via.placeholder.com/48/667eea/FFFFFF?text=D" -o assets/icon48.png
curl "https://via.placeholder.com/128/667eea/FFFFFF?text=D" -o assets/icon128.png
```

Or manually download from:
- https://via.placeholder.com/16/667eea/FFFFFF?text=D (save as `assets/icon16.png`)
- https://via.placeholder.com/48/667eea/FFFFFF?text=D (save as `assets/icon48.png`)
- https://via.placeholder.com/128/667eea/FFFFFF?text=D (save as `assets/icon128.png`)

## Step 3: Build the Extension

```bash
npm run build
```

This creates a `dist/` folder with the compiled extension.

## Step 4: Load in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside "Extension Drouot"
5. The extension should now appear in your toolbar!

## Step 5: Configure Filters

1. Click the Drouot Monitor icon in your toolbar
2. Click the **⚙️ Settings** button
3. Configure your filters:

   **Example configuration**:
   - **Categories**: Select "Mobilier", "Arts de la table", "Argenterie"
   - **Include keywords**: Add "louis xvi", "empire", "baccarat"
   - **Exclude keywords**: Add "reproduction", "style de"
   - **Price range**: 100€ - 5000€
   - **Auction houses**: Select "Artcurial", "Drouot Estimations"

4. Click **Enregistrer** (Save)

## Step 6: Test It Out

1. Visit Drouot.com: https://www.drouot.com/ventes
2. The extension will automatically scrape lots from the page
3. Check the browser console (F12) for logs: `[Drouot Monitor] Found X lots`
4. Click the extension icon to see matching items in the popup
5. Look for visual badges (🆕, ⭐, 👀) on the Drouot page

## Troubleshooting

### Build fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### No lots appearing
- Open browser console (F12) on Drouot page
- Look for `[Drouot Monitor]` logs
- Check if scraping patterns need adjustment for current Drouot structure
- Click the 🔄 button on the page to manually re-scrape

### Extension not loading
- Make sure you selected the `dist/` folder, not the project root
- Check for errors in `chrome://extensions/` (click "Errors")
- Verify all icon files exist in `dist/assets/`

### Filters not working
- Go to Settings and verify filters are enabled
- Try adding just one category and one keyword to start
- Click "Réinitialiser" to reset to defaults

## Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

Then in Chrome:
1. Make code changes
2. Webpack will auto-rebuild
3. Click "Reload" in `chrome://extensions/` for your extension
4. Refresh Drouot page to see changes

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Read [SCRAPING_STRATEGY.md](SCRAPING_STRATEGY.md) for scraping info
- Read [MVP_ROADMAP.md](MVP_ROADMAP.md) for future features
- Check [STORAGE_SCHEMA.md](STORAGE_SCHEMA.md) for data structure

## Common Tasks

### Update filters programmatically
```javascript
// In browser console on Drouot page
chrome.storage.local.get(['filters'], (result) => {
  console.log('Current filters:', result.filters);
});
```

### Clear all data
```javascript
// In browser console
chrome.storage.local.clear(() => {
  console.log('All data cleared');
});
```

### View storage contents
```javascript
// In browser console
chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items);
});
```

### Check new count
```javascript
// In browser console
chrome.storage.local.get(['metadata'], (result) => {
  console.log('New items:', result.metadata?.newCount);
});
```

## What You Should See

### On Drouot pages:
- 🔄 Re-scrape button (bottom-right)
- 🆕 NEW badges on matching items
- Colored borders around matching items
- Console logs: `[Drouot Monitor] Found X lots`

### In popup:
- Header: "Drouot Monitor 🔨"
- Tabs: Nouveaux, Favoris, Vus, Tous
- Item cards with images, prices, dates
- Action buttons (✓ and ☆)
- Settings gear icon

### In extension badge:
- Red badge with count of NEW items
- Updates in real-time as you browse

## Success Checklist

- [ ] Extension loads without errors
- [ ] Icon appears in Chrome toolbar
- [ ] Can open popup
- [ ] Can access Settings
- [ ] Can save filters
- [ ] Drouot pages show console logs
- [ ] Lots appear in popup
- [ ] Badge shows NEW count
- [ ] Can mark items as SEEN
- [ ] Can favorite items
- [ ] Visual badges appear on Drouot pages

## Need Help?

1. Check console logs in all three contexts:
   - Page console (F12 on Drouot page)
   - Background console (chrome://extensions → Inspect)
   - Popup console (Right-click popup → Inspect)

2. Look for error messages in `chrome://extensions/`

3. Try the 🔄 button on Drouot pages to manually trigger scraping

4. Review the architecture docs for deeper understanding

---

**You're all set! Happy hunting! 🔨**
