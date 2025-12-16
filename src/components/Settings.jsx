import React, { useState, useEffect } from 'react';
import { DROUOT_CATEGORIES, KNOWN_AUCTION_HOUSES, DEFAULT_FILTERS } from '../constants.js';
import './Settings.css';

export default function Settings({ onClose }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeKeywordInput, setExcludeKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Load filters on mount
  useEffect(() => {
    loadFilters();
  }, []);

  async function loadFilters() {
    try {
      const result = await chrome.storage.local.get(['filters']);
      if (result.filters) {
        setFilters(result.filters);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      // Save filters
      await chrome.storage.local.set({ filters });

      // Notify background to re-evaluate
      await chrome.runtime.sendMessage({
        type: 'UPDATE_FILTERS',
        filters
      });

      // Close after short delay
      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error saving filters:', error);
      setSaving(false);
    }
  }

  function handleCategoryToggle(category) {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  }

  function handleAuctionHouseToggle(house) {
    setFilters(prev => ({
      ...prev,
      auctionHouses: prev.auctionHouses.includes(house)
        ? prev.auctionHouses.filter(h => h !== house)
        : [...prev.auctionHouses, house]
    }));
  }

  function handleAddKeyword() {
    if (keywordInput.trim()) {
      setFilters(prev => ({
        ...prev,
        includeKeywords: [...prev.includeKeywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  }

  function handleRemoveKeyword(keyword) {
    setFilters(prev => ({
      ...prev,
      includeKeywords: prev.includeKeywords.filter(k => k !== keyword)
    }));
  }

  function handleAddExcludeKeyword() {
    if (excludeKeywordInput.trim()) {
      setFilters(prev => ({
        ...prev,
        excludeKeywords: [...prev.excludeKeywords, excludeKeywordInput.trim()]
      }));
      setExcludeKeywordInput('');
    }
  }

  function handleRemoveExcludeKeyword(keyword) {
    setFilters(prev => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.filter(k => k !== keyword)
    }));
  }

  function handleReset() {
    if (confirm('Réinitialiser tous les filtres ?')) {
      setFilters(DEFAULT_FILTERS);
    }
  }

  return (
    <div className="settings">
      <header className="settings-header">
        <h2>Paramètres</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </header>

      <div className="settings-content">
        {/* Categories */}
        <section className="settings-section">
          <h3>Catégories</h3>
          <div className="checkbox-grid">
            {DROUOT_CATEGORIES.map(category => (
              <label key={category} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                />
                <span>{category}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Auction Houses */}
        <section className="settings-section">
          <h3>Maisons de vente</h3>
          <div className="checkbox-grid">
            {KNOWN_AUCTION_HOUSES.map(house => (
              <label key={house} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.auctionHouses.includes(house)}
                  onChange={() => handleAuctionHouseToggle(house)}
                />
                <span>{house}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Include Keywords */}
        <section className="settings-section">
          <h3>Mots-clés à inclure</h3>
          <p className="section-hint">Les lots contenant au moins un de ces mots seront affichés</p>
          <div className="keyword-input">
            <input
              type="text"
              placeholder="Ex: louis xvi, empire, baccarat"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
            />
            <button onClick={handleAddKeyword}>Ajouter</button>
          </div>
          <div className="keyword-tags">
            {filters.includeKeywords.map(keyword => (
              <span key={keyword} className="keyword-tag">
                {keyword}
                <button onClick={() => handleRemoveKeyword(keyword)}>✕</button>
              </span>
            ))}
          </div>
        </section>

        {/* Exclude Keywords */}
        <section className="settings-section">
          <h3>Mots-clés à exclure</h3>
          <p className="section-hint">Les lots contenant ces mots seront cachés</p>
          <div className="keyword-input">
            <input
              type="text"
              placeholder="Ex: reproduction, style de"
              value={excludeKeywordInput}
              onChange={(e) => setExcludeKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddExcludeKeyword()}
            />
            <button onClick={handleAddExcludeKeyword}>Ajouter</button>
          </div>
          <div className="keyword-tags">
            {filters.excludeKeywords.map(keyword => (
              <span key={keyword} className="keyword-tag exclude">
                {keyword}
                <button onClick={() => handleRemoveExcludeKeyword(keyword)}>✕</button>
              </span>
            ))}
          </div>
        </section>

        {/* Price Range */}
        <section className="settings-section">
          <h3>Fourchette de prix</h3>
          <div className="price-inputs">
            <div className="price-field">
              <label>Minimum (€)</label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceMin: parseInt(e.target.value) || 0
                }))}
              />
            </div>
            <div className="price-field">
              <label>Maximum (€)</label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceMax: parseInt(e.target.value) || 999999
                }))}
              />
            </div>
          </div>
        </section>

        {/* Options */}
        <section className="settings-section">
          <h3>Options</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.onlyWithImages}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                onlyWithImages: e.target.checked
              }))}
            />
            <span>Uniquement les lots avec images</span>
          </label>
        </section>
      </div>

      <footer className="settings-footer">
        <button className="reset-btn" onClick={handleReset}>
          Réinitialiser
        </button>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </footer>
    </div>
  );
}
