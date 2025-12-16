import React, { useState, useEffect } from 'react';
import TabNavigation from './TabNavigation.jsx';
import ItemList from './ItemList.jsx';
import QuickFilter from './QuickFilter.jsx';
import Settings from './Settings.jsx';
import { MessageType, ItemState } from '../constants.js';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('new');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [counts, setCounts] = useState({
    new: 0,
    seen: 0,
    favorite: 0
  });

  // Load items when tab changes
  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  // Initialize filtered items when items change
  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  // Listen for refresh messages
  useEffect(() => {
    const listener = (message) => {
      if (message.type === MessageType.REFRESH_UI) {
        loadItems(activeTab);
      }
    };

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [activeTab]);

  // Load counts on mount
  useEffect(() => {
    loadCounts();
  }, []);

  async function loadItems(filter) {
    setLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_ITEMS,
        filter
      });

      if (response.success) {
        setItems(response.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      // Get metadata from storage
      const result = await chrome.storage.local.get(['metadata']);
      const metadata = result.metadata || {};

      setCounts({
        new: metadata.newCount || 0,
        seen: metadata.seenCount || 0,
        favorite: metadata.favoriteCount || 0
      });
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  }

  async function handleStateChange(lotId, newState) {
    try {
      await chrome.runtime.sendMessage({
        type: MessageType.UPDATE_STATE,
        lotId,
        state: newState
      });

      // Reload items and counts
      await loadItems(activeTab);
      await loadCounts();
    } catch (error) {
      console.error('Error updating state:', error);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
  }

  function handleFilterChange(filtered) {
    setFilteredItems(filtered);
  }

  if (showSettings) {
    return (
      <Settings
        onClose={() => {
          setShowSettings(false);
          loadItems(activeTab);
          loadCounts();
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span className="app-icon">🔨</span>
          Drouot Monitor
        </h1>
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="Paramètres"
        >
          ⚙️
        </button>
      </header>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
      />

      {/* Quick filter by auction house */}
      {!loading && items.length > 0 && (
        <QuickFilter
          items={items}
          onFilterChange={handleFilterChange}
        />
      )}

      <div className="app-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>Aucun lot</h2>
            <p>
              {activeTab === 'new' && 'Visitez Drouot.com pour découvrir de nouveaux lots'}
              {activeTab === 'seen' && 'Aucun lot vu pour le moment'}
              {activeTab === 'favorite' && 'Aucun favori pour le moment'}
              {activeTab === 'all' && 'Aucun lot correspondant à vos filtres'}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>Aucun résultat</h2>
            <p>Aucun lot ne correspond aux maisons de vente sélectionnées</p>
          </div>
        ) : (
          <ItemList
            items={filteredItems}
            onStateChange={handleStateChange}
          />
        )}
      </div>

      <footer className="app-footer">
        <span className="footer-text">
          {filteredItems.length} / {items.length} lot{items.length > 1 ? 's' : ''}
        </span>
      </footer>
    </div>
  );
}
