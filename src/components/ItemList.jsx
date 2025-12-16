import React from 'react';
import ItemCard from './ItemCard.jsx';
import './ItemList.css';

export default function ItemList({ items, onStateChange }) {
  // Sort by match score descending
  const sortedItems = [...items].sort((a, b) => {
    const scoreA = a.matchScore || 0;
    const scoreB = b.matchScore || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="item-list">
      {sortedItems.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          onStateChange={onStateChange}
        />
      ))}
    </div>
  );
}
