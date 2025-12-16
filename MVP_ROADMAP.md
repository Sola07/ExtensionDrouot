# MVP Roadmap - Drouot Monitor

## Phase 1: Core MVP (Week 1-2)

### 1.1 Foundation ✅ HIGHEST PRIORITY
**Goal**: Extension runs, scrapes, stores data

**Deliverables**:
- [x] Chrome extension boilerplate (Manifest V3)
- [x] Project structure with build system (Webpack)
- [x] Storage service (chrome.storage.local wrapper)
- [x] Basic content script that runs on Drouot pages
- [x] Background service worker setup

**Success Criteria**:
- Extension loads in Chrome
- Content script detects Drouot pages
- Can store/retrieve data from chrome.storage

**Files to create**:
- `manifest.json`
- `background.js`
- `content/content.js`
- `src/services/storage.js`
- `package.json`
- `webpack.config.js`

---

### 1.2 Scraping Engine ✅ HIGHEST PRIORITY
**Goal**: Extract lot data from Drouot pages

**Deliverables**:
- [ ] Generic DOM scraper with flexible selectors
- [ ] Field extraction (title, price, date, auction house, etc.)
- [ ] Deduplication logic
- [ ] Date/price parsing utilities
- [ ] Error handling and fallbacks

**Success Criteria**:
- Can extract 80%+ of lots from a Drouot listing page
- Correctly parses French dates and prices
- Handles missing fields gracefully
- No duplicate lots in storage

**Files to create**:
- `src/services/scraper.js`
- `src/utils/date.js`
- `src/utils/price.js`

---

### 1.3 Filter Matching Engine ✅ HIGHEST PRIORITY
**Goal**: Determine which lots match user criteria

**Deliverables**:
- [ ] Filter matching algorithm
- [ ] Keyword inclusion/exclusion logic
- [ ] Price range filtering
- [ ] Date range filtering
- [ ] Category filtering
- [ ] **Auction house filtering** (custom field!)

**Success Criteria**:
- Correctly matches lots against multi-criteria filters
- Handles edge cases (missing data, special characters)
- Fast performance (<10ms per lot)

**Files to create**:
- `src/services/filter.js`
- `src/services/scoring.js` (optional scoring)

---

### 1.4 State Management ⚠️ HIGH PRIORITY
**Goal**: Track NEW/SEEN/FAVORITE/IGNORED states per user

**Deliverables**:
- [ ] State transitions (NEW → SEEN, SEEN → FAVORITE, etc.)
- [ ] Index management (fast queries for NEW items)
- [ ] Background worker processes new lots
- [ ] Badge count updates

**Success Criteria**:
- NEW items show correct count in badge
- Marking item as SEEN immediately updates UI
- State persists across browser restarts

**Files to create**:
- `src/services/state.js`
- Update `background.js` with state logic

---

## Phase 2: User Interface (Week 2-3)

### 2.1 Basic Popup UI ⚠️ HIGH PRIORITY
**Goal**: Minimal popup showing new items

**Deliverables**:
- [ ] React setup with Webpack
- [ ] Simple list view of NEW items
- [ ] Item card showing: title, price, date, image
- [ ] "Mark as Seen" button
- [ ] Link to Drouot page

**Success Criteria**:
- Popup opens and loads items in <1s
- Can view and mark items as seen
- Clear, readable design

**Files to create**:
- `popup/popup.html`
- `popup/popup.jsx` (React entry)
- `src/components/ItemCard.jsx`
- `src/components/ItemList.jsx`

---

### 2.2 Tab Navigation 🔵 MEDIUM PRIORITY
**Goal**: Switch between NEW / ALL / SEEN / FAVORITES

**Deliverables**:
- [ ] Tab component
- [ ] Filter items by state
- [ ] Count badges on tabs

**Success Criteria**:
- Can navigate between all views
- Counts are accurate
- Fast switching (<200ms)

**Files to create**:
- `src/components/TabNavigation.jsx`

---

### 2.3 Content Script Highlighting 🔵 MEDIUM PRIORITY
**Goal**: Visual indicators on Drouot pages

**Deliverables**:
- [ ] Inject badges (🆕 NEW, ⭐ FAVORITE, 👀 SEEN)
- [ ] Highlight matching items (green border)
- [ ] Optionally hide/gray out non-matching items
- [ ] Quick action buttons on hover

**Success Criteria**:
- Badges appear on lots within 1s of page load
- Highlighting doesn't break page layout
- Users can quickly identify relevant items

**Files to create**:
- Update `content/content.js`
- `content/content.css` (badge styles)

---

### 2.4 Filter Configuration UI 🔵 MEDIUM PRIORITY
**Goal**: Let users edit their filters

**Deliverables**:
- [ ] Settings page/modal in popup
- [ ] Category multi-select
- [ ] Keyword input (include/exclude)
- [ ] Price range sliders
- [ ] Date range picker
- [ ] **Auction house multi-select**
- [ ] Save/reset buttons

**Success Criteria**:
- Easy to add/remove filters
- Changes apply immediately
- Visual feedback on save

**Files to create**:
- `src/components/FilterConfig.jsx`
- `src/components/Settings.jsx`

---

## Phase 3: Polish & Features (Week 3-4)

### 3.1 Notifications ⚪ LOW PRIORITY
**Goal**: Alert users to high-value matches

**Deliverables**:
- [ ] Chrome notifications on new high-score items
- [ ] Badge count on extension icon
- [ ] Optional sound/visual alert

**Success Criteria**:
- Notifications don't spam user
- Can be disabled in settings

**Files to create**:
- Update `background.js` with notification logic

---

### 3.2 Advanced Sorting & Search ⚪ LOW PRIORITY
**Goal**: Better item discovery

**Deliverables**:
- [ ] Sort by: date, price, score, auction date
- [ ] Search within results (title/description)
- [ ] Pagination for large lists

**Success Criteria**:
- Fast sorting (<100ms)
- Search feels instant

**Files to create**:
- `src/components/SearchBar.jsx`
- Update `ItemList.jsx`

---

### 3.3 Favorites & Notes ⚪ LOW PRIORITY
**Goal**: Let users organize items

**Deliverables**:
- [ ] Star icon to favorite items
- [ ] Add personal notes to items
- [ ] Custom tags

**Success Criteria**:
- Favorites easily accessible
- Notes persist

**Files to create**:
- Update `ItemCard.jsx`
- `src/components/NotesModal.jsx`

---

### 3.4 Data Export ⚪ LOW PRIORITY
**Goal**: Export watched items

**Deliverables**:
- [ ] Export to CSV
- [ ] Export to JSON
- [ ] Include filters in export

**Success Criteria**:
- One-click export
- Data includes all relevant fields

**Files to create**:
- `src/utils/export.js`

---

### 3.5 Cleanup & Maintenance ⚪ LOW PRIORITY
**Goal**: Keep storage lean

**Deliverables**:
- [ ] Auto-cleanup of old items (90+ days)
- [ ] Manual "Clear history" button
- [ ] Storage usage indicator

**Success Criteria**:
- Storage doesn't grow unbounded
- User can control data retention

**Files to create**:
- Update `background.js` with cleanup alarm

---

## Feature Priority Matrix

| Feature | Priority | User Value | Complexity | MVP? |
|---------|----------|------------|------------|------|
| Extension foundation | ✅ Highest | High | Low | ✅ Yes |
| Scraping engine | ✅ Highest | Critical | Medium | ✅ Yes |
| Filter matching | ✅ Highest | Critical | Medium | ✅ Yes |
| State management (NEW/SEEN) | ⚠️ High | High | Medium | ✅ Yes |
| Basic popup UI | ⚠️ High | High | Medium | ✅ Yes |
| Tab navigation | 🔵 Medium | Medium | Low | ⚠️ Maybe |
| Content script badges | 🔵 Medium | High | Medium | ⚠️ Maybe |
| Filter config UI | 🔵 Medium | High | Medium | ⚠️ Maybe |
| Notifications | ⚪ Low | Medium | Low | ❌ No |
| Advanced sorting | ⚪ Low | Low | Low | ❌ No |
| Favorites & notes | ⚪ Low | Medium | Low | ❌ No |
| Data export | ⚪ Low | Low | Low | ❌ No |
| Cleanup tools | ⚪ Low | Low | Low | ❌ No |

---

## Minimum Viable Product (MVP)

**Definition**: The smallest version that delivers core value.

### MVP Must-Haves ✅
1. **Scraping**: Extract lots from Drouot pages
2. **Filtering**: Match lots against user criteria (including auction house!)
3. **State tracking**: NEW vs SEEN items
4. **Basic UI**: Popup showing new matching items
5. **Mark as seen**: User can acknowledge items

### MVP Nice-to-Haves ⚠️
6. **Content script badges**: Visual indicators on Drouot pages
7. **Filter editing**: UI to configure filters (can be hardcoded initially)
8. **Favorites**: Star important items

### Post-MVP ❌
- Notifications
- Advanced sorting/search
- Notes & tags
- Export
- Multi-device sync
- Analytics/stats

---

## Development Phases

### Phase 1: Foundation (Days 1-3)
**Goal**: Extension runs and scrapes data

**Tasks**:
1. Set up project structure
2. Create manifest.json
3. Implement storage service
4. Build scraping engine
5. Test on Drouot pages

**Deliverable**: Extension that logs scraped lots to console

---

### Phase 2: Core Logic (Days 4-6)
**Goal**: Filter matching and state management work

**Tasks**:
1. Implement filter matching algorithm
2. Add state transitions (NEW → SEEN)
3. Background worker processes lots
4. Badge count updates

**Deliverable**: Extension identifies matching lots and shows badge count

---

### Phase 3: Basic UI (Days 7-10)
**Goal**: Popup displays items

**Tasks**:
1. Set up React + Webpack
2. Build ItemCard component
3. Create ItemList with NEW items
4. Add "Mark as Seen" button
5. Style for readability

**Deliverable**: Functional popup showing new items

---

### Phase 4: Polish MVP (Days 11-14)
**Goal**: Complete MVP features

**Tasks**:
1. Add tab navigation (NEW/ALL/SEEN)
2. Implement content script badges
3. Build filter config UI
4. Add favorites functionality
5. Test end-to-end flow

**Deliverable**: Fully functional MVP ready for user testing

---

## Success Metrics

### MVP Success = User Can:
1. ✅ Install extension
2. ✅ Visit Drouot page → lots are scraped
3. ✅ Open popup → see NEW matching items
4. ✅ Click item → opens Drouot page
5. ✅ Mark item as SEEN → disappears from NEW list
6. ✅ Filter by auction house (custom feature!)

### Post-MVP Goals:
- 50+ lots scraped per day (passive usage)
- 80%+ user satisfaction with matching accuracy
- <1% false positives (irrelevant items shown)
- <5% false negatives (missed relevant items)

---

## Technical Debt to Address Later

1. **Better selectors**: Currently generic, may need Drouot-specific adjustments
2. **Performance**: Optimize for 1000+ lots in storage
3. **Testing**: Add unit tests for filter matching
4. **Internationalization**: Support English UI
5. **Error reporting**: Send scraping errors to developers
6. **Migrations**: Handle storage schema changes

---

## Future Enhancements (V2+)

### V2 Features
- Multi-device sync (Firebase/Supabase backend)
- Advanced notifications (email, SMS)
- Price alerts (notify when price drops)
- Historical price tracking
- Auction calendar view

### V3 Features
- Machine learning for better matching
- Auto-bidding integration (if Drouot allows)
- Social features (share finds with friends)
- Mobile companion app (iOS/Android)
- Browser extension for other auction sites (Sotheby's, Christie's)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Drouot changes HTML structure | Medium | High | Generic selectors + user feedback |
| Slow scraping performance | Low | Medium | Debouncing + batch operations |
| Storage quota exceeded | Low | Medium | Auto-cleanup after 90 days |
| User doesn't understand NEW/SEEN | Medium | High | Clear onboarding + tooltips |
| Filters too complex | Medium | Medium | Start with simple defaults |

---

## Implementation Order (Recommended)

### Week 1: Core (Must build in order)
1. ✅ Project setup + manifest
2. ✅ Storage service
3. ✅ Scraping engine
4. ✅ Filter matching
5. ✅ Background worker
6. ✅ State management

### Week 2: UI
7. ⚠️ React setup + build
8. ⚠️ Basic popup UI
9. ⚠️ Item card component
10. ⚠️ Mark as seen functionality

### Week 3: Polish
11. 🔵 Tab navigation
12. 🔵 Content script badges
13. 🔵 Filter config UI
14. 🔵 Favorites

### Week 4: Launch
15. ⚪ Testing + bug fixes
16. ⚪ Documentation (README)
17. ⚪ User guide
18. ⚪ Publish to Chrome Web Store (optional)

---

## Next Steps

### To start development:
```bash
# 1. Initialize project
npm init -y
npm install react react-dom webpack webpack-cli babel-loader

# 2. Create file structure
mkdir -p src/{components,services,utils} content popup assets

# 3. Start with manifest.json
# (see implementation files)

# 4. Build and test
npm run build
# Load extension in Chrome
```

### To test MVP:
1. Load extension in Chrome (`chrome://extensions/`)
2. Visit Drouot.com search page
3. Check console for scraped lots
4. Open popup → verify NEW items appear
5. Mark item as SEEN → verify it disappears
6. Test filters with different criteria

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Foundation | 3 days | Extension scrapes and stores data |
| Phase 2: Core Logic | 3 days | Filtering and state management work |
| Phase 3: Basic UI | 4 days | Popup displays items |
| Phase 4: Polish MVP | 4 days | Complete MVP ready for testing |
| **Total MVP** | **2 weeks** | **Functional Drouot monitor** |
| Post-MVP features | 2+ weeks | Notifications, export, advanced features |

---

## User Journey (MVP)

1. **Install**: User adds extension from Chrome Web Store
2. **Setup**: Configure basic filters (categories, price range, auction houses)
3. **Browse**: User visits Drouot.com naturally (no change in behavior)
4. **Discovery**: Extension scrapes in background, finds 5 matching lots
5. **Notification**: Badge shows "5" new items
6. **Review**: User opens popup, sees 5 NEW items with images
7. **Action**: User clicks item → opens Drouot page in new tab
8. **Acknowledge**: User marks item as SEEN → disappears from NEW list
9. **Repeat**: User continues browsing, extension continuously monitors

**Key insight**: Zero behavior change required. User browses Drouot normally, extension works passively in background.
