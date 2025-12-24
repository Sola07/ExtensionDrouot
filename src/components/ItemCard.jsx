import React from 'react';
import { ItemState } from '../constants.js';
import { formatPrice } from '../utils/price.js';
import './ItemCard.css';

export default function ItemCard({ item, onStateChange }) {
  const state = item.state?.state || ItemState.NEW;

  const handleCardClick = () => {
    // Mark as SEEN when clicked
    if (state === ItemState.NEW) {
      onStateChange(item.id, ItemState.SEEN);
    }

    // Open lot page
    if (item.url) {
      chrome.tabs.create({ url: item.url });
    }
  };
  const saleTypeLabel = item.saleType ? item.saleType.toUpperCase() : null;
  const formatSaleDate = () => {
    if (!item.auctionDate) return '';
    const date = new Date(item.auctionDate);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'long' }).toLocaleUpperCase('fr-FR');
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} | ${time}`;
  };

  return (
    <div className="drouot-card" onClick={handleCardClick}>
      {/* Image Container */}
      <div className="drouot-card-image-container">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="drouot-card-image"
            loading="lazy"
          />
        ) : (
          <div className="drouot-card-image-placeholder">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ccc" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="#ccc"/>
              <path d="M3 16L8 11L12 15L16 11L21 16V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V16Z" fill="#ccc"/>
            </svg>
          </div>
        )}

      </div>

      {/* Content */}
      <div className="drouot-card-content">
        {/* Sale info */}
        {saleTypeLabel && (
          <div className="drouot-card-sale-info">
            <span className={`sale-type sale-${item.saleType?.toLowerCase()}`}>
              {saleTypeLabel}
            </span>
            <span className="sale-date">{formatSaleDate()}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="drouot-card-title">{item.title}</h3>

        {/* Auction House */}
        {item.auctionHouse && item.auctionHouse !== 'Drouot' && (
          <div className="drouot-card-house">
            {item.auctionHouse}
          </div>
        )}

        {/* Estimation Label */}
        <div className="drouot-card-estimation-label">
          Estimation
        </div>

        {/* Price */}
        <div className="drouot-card-price">
          {item.estimateMin > 0 && item.estimateMax > 0 ? (
            <>
              {formatPrice(item.estimateMin)} - {formatPrice(item.estimateMax)}
            </>
          ) : item.estimateMin > 0 ? (
            formatPrice(item.estimateMin)
          ) : (
            'Prix sur demande'
          )}
        </div>

        {/* Current Bid (if any) */}
        {item.currentBid > 0 && (
          <div className="drouot-card-current-bid">
            Enchère actuelle : {formatPrice(item.currentBid)}
          </div>
        )}
      </div>
    </div>
  );
}
