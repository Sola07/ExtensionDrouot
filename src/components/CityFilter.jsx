import React, { useState, useEffect } from 'react';
import './CityFilter.css';

export default function CityFilter({ items, onFilterChange }) {
  const [selectedCities, setSelectedCities] = useState(new Set());
  const [showAll, setShowAll] = useState(true);

  // Extract unique cities from items
  const cities = React.useMemo(() => {
    const citiesSet = new Set();
    items.forEach(item => {
      if (item.city) {
        citiesSet.add(item.city);
      }
    });
    return Array.from(citiesSet).sort();
  }, [items]);

  // Count items per city
  const cityCounts = React.useMemo(() => {
    const counts = {};
    items.forEach(item => {
      const city = item.city || 'Non spécifié';
      counts[city] = (counts[city] || 0) + 1;
    });
    return counts;
  }, [items]);

  useEffect(() => {
    // Notify parent of filter changes
    onFilterChange(selectedCities, showAll);
  }, [selectedCities, showAll]);

  function handleToggleCity(city) {
    const newSelected = new Set(selectedCities);
    if (newSelected.has(city)) {
      newSelected.delete(city);
    } else {
      newSelected.add(city);
    }
    setSelectedCities(newSelected);
    setShowAll(newSelected.size === 0);
  }

  function handleShowAll() {
    setSelectedCities(new Set());
    setShowAll(true);
  }

  if (cities.length === 0) {
    return null; // Don't show filter if no cities
  }

  return (
    <div className="city-filter">
      <div className="city-filter-header">
        <span className="filter-icon">📍</span>
        <span className="filter-title">Filtrer par ville</span>
      </div>

      <div className="city-filter-buttons">
        <button
          className={`filter-button ${showAll ? 'active' : ''}`}
          onClick={handleShowAll}
        >
          Toutes ({items.length})
        </button>

        {cities.map(city => (
          <button
            key={city}
            className={`filter-button ${selectedCities.has(city) ? 'active' : ''}`}
            onClick={() => handleToggleCity(city)}
          >
            {city} ({cityCounts[city] || 0})
          </button>
        ))}
      </div>

      {selectedCities.size > 0 && (
        <div className="filter-info">
          {selectedCities.size} ville{selectedCities.size > 1 ? 's' : ''} sélectionnée{selectedCities.size > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
