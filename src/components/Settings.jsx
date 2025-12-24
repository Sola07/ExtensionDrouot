import React, { useState, useEffect } from 'react';
import { DEFAULT_FILTERS } from '../constants.js';
import './Settings.css';

export default function Settings({ onClose }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Dynamic data from storage
  const [availableHouses, setAvailableHouses] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);

  // Load filters and dynamic data on mount
  useEffect(() => {
    loadFilters();
    loadDynamicData();
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

  async function loadDynamicData() {
    try {
      // Load all lots to extract unique houses and cities
      const result = await chrome.storage.local.get(['lots']);
      const lots = Object.values(result.lots || {});

      // Extract unique auction houses
      const housesSet = new Set();
      lots.forEach(lot => {
        if (lot.auctionHouse && lot.auctionHouse !== 'Drouot') {
          housesSet.add(lot.auctionHouse);
        }
      });

      // Extract unique cities
      const citiesSet = new Set();
      lots.forEach(lot => {
        if (lot.city) {
          citiesSet.add(lot.city);
        }
      });

      setAvailableHouses(Array.from(housesSet).sort());
      setAvailableCities(Array.from(citiesSet).sort());
    } catch (error) {
      console.error('Error loading dynamic data:', error);
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

  function handleAuctionHouseToggle(house) {
    setFilters(prev => ({
      ...prev,
      auctionHouses: prev.auctionHouses.includes(house)
        ? prev.auctionHouses.filter(h => h !== house)
        : [...prev.auctionHouses, house]
    }));
  }

  function handleCityToggle(city) {
    setFilters(prev => ({
      ...prev,
      cities: (prev.cities || []).includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...(prev.cities || []), city]
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

  function handleReset() {
    if (confirm('Réinitialiser tous les filtres ?')) {
      setFilters(DEFAULT_FILTERS);
    }
  }

  return (
    <div className="settings">
      <header className="settings-header">
        <h2>Filtres</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </header>

      <div className="settings-content">
        {/* Cities */}
        <section className="settings-section">
          <h3>Villes</h3>
          <p className="section-hint">Filtrer par ville des maisons de vente</p>
          {availableCities.length === 0 ? (
            <p className="no-data">Aucune ville disponible. Visitez Drouot pour collecter des lots.</p>
          ) : (
            <div className="checkbox-grid">
              {availableCities.map(city => (
                <label key={city} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(filters.cities || []).includes(city)}
                    onChange={() => handleCityToggle(city)}
                  />
                  <span>{city}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Auction Houses */}
        <section className="settings-section">
          <h3>Maisons de vente</h3>
          <p className="section-hint">Filtrer par maison de vente</p>
          {availableHouses.length === 0 ? (
            <p className="no-data">Aucune maison disponible. Visitez Drouot pour collecter des lots.</p>
          ) : (
            <div className="checkbox-grid">
              {availableHouses.map(house => (
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
          )}
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

        {/* Sort options */}
        <section className="settings-section">
          <h3>Tri des résultats</h3>
          <p className="section-hint">Choisissez l'ordre d'affichage des lots</p>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="sortMode"
                value="default"
                checked={filters.sortMode === 'default'}
                onChange={() => setFilters(prev => ({ ...prev, sortMode: 'default' }))}
              />
              <span>Recommandés (score)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="sortMode"
                value="estimate_asc"
                checked={filters.sortMode === 'estimate_asc'}
                onChange={() => setFilters(prev => ({ ...prev, sortMode: 'estimate_asc' }))}
              />
              <span>Estimation la plus basse</span>
            </label>
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
