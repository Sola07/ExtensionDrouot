# Extension Icons

The extension requires three icon sizes for Chrome:

## Required Files

- `icon16.png` - 16x16px - Shown in extension toolbar
- `icon48.png` - 48x48px - Shown in extensions management page
- `icon128.png` - 128x128px - Shown in Chrome Web Store

## Design Guidelines

### Theme
- Use auction/gavel icon 🔨 as primary symbol
- Color scheme: Purple gradient (#667eea → #764ba2)
- Modern, clean design
- Clear visibility at small sizes

### Recommendations

1. **Use a design tool**:
   - Figma (free): https://figma.com
   - Canva (free): https://canva.com
   - GIMP (free): https://gimp.org

2. **Or use an icon generator**:
   - https://www.favicon-generator.org/
   - https://realfavicongenerator.net/

3. **Simple SVG template** (save as SVG, then export to PNG):

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="url(#grad)" />

  <!-- Gavel icon (simplified) -->
  <g fill="white">
    <rect x="35" y="50" width="45" height="10" rx="5" transform="rotate(-45 57.5 55)" />
    <rect x="60" y="70" width="15" height="30" rx="3" />
    <rect x="45" y="95" width="45" height="8" rx="4" />
  </g>
</svg>
```

4. **Quick placeholder** (until you design proper icons):
   - Use emoji-to-image converters: https://emoji.gg/
   - Convert 🔨 emoji to PNG at different sizes
   - Or use any auction-related icon from https://www.flaticon.com/

## Temporary Solution

If you need to test the extension immediately:
1. Create simple colored squares as placeholders
2. Use online tools like https://placeholder.com/
3. Download:
   - https://via.placeholder.com/16/667eea/FFFFFF?text=D
   - https://via.placeholder.com/48/667eea/FFFFFF?text=D
   - https://via.placeholder.com/128/667eea/FFFFFF?text=D

Save these as `icon16.png`, `icon48.png`, and `icon128.png` in this directory.

## Once You Have Icons

1. Place PNG files in this `assets/` directory
2. Ensure filenames match exactly: `icon16.png`, `icon48.png`, `icon128.png`
3. Rebuild extension: `npm run build`
4. Reload extension in Chrome

The icons will be automatically copied to `dist/assets/` during build.
