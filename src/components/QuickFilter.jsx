import React, { useState, useEffect } from 'react';
import './QuickFilter.css';

export default function QuickFilter({ items, onFilterChange }) {
  const [selectedHouses, setSelectedHouses] = useState(new Set());
  const [showAll, setShowAll] = useState(true);

  // Extract unique auction houses from items
  const auctionHouses = React.useMemo(() => {
    const housesSet = new Set();
    items.forEach(item => {
      if (item.auctionHouse && item.auctionHouse !== 'Drouot') {
        housesSet.add(item.auctionHouse);
      }
    });
    return Array.from(housesSet).sort();
  }, [items]);

  // Count items per house
  const houseCounts = React.useMemo(() => {
    const counts = {};
    items.forEach(item => {
      const house = item.auctionHouse || 'Drouot';
      counts[house] = (counts[house] || 0) + 1;
    });
    return counts;
  }, [items]);

  useEffect(() => {
    // Notify parent of filter changes
    onFilterChange(selectedHouses, showAll);
  }, [selectedHouses, showAll]);

  function handleToggleHouse(house) {
    const newSelected = new Set(selectedHouses);
    if (newSelected.has(house)) {
      newSelected.delete(house);
    } else {
      newSelected.add(house);
    }
    setSelectedHouses(newSelected);
    setShowAll(newSelected.size === 0);
  }

  function handleShowAll() {
    setSelectedHouses(new Set());
    setShowAll(true);
  }

  if (auctionHouses.length === 0) {
    return null; // Don't show filter if no auction houses
  }

  return (
    <div className="quick-filter">
      <div className="quick-filter-header">
        <span className="filter-icon">🏛️</span>
        <span className="filter-title">Filtrer par maison de vente</span>
      </div>

      <div className="quick-filter-buttons">
        <button
          className={`filter-button ${showAll ? 'active' : ''}`}
          onClick={handleShowAll}
        >
          Toutes ({items.length})
        </button>

        {auctionHouses.map(house => (
          <button
            key={house}
            className={`filter-button ${selectedHouses.has(house) ? 'active' : ''}`}
            onClick={() => handleToggleHouse(house)}
          >
            {house} ({houseCounts[house] || 0})
          </button>
        ))}
      </div>

      {selectedHouses.size > 0 && (
        <div className="filter-info">
          {selectedHouses.size} maison{selectedHouses.size > 1 ? 's' : ''} sélectionnée{selectedHouses.size > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
