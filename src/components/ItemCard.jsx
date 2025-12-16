import React from 'react';
import { ItemState } from '../constants.js';
import { formatPrice } from '../utils/price.js';
import { formatDate } from '../utils/date.js';
import './ItemCard.css';

export default function ItemCard({ item, onStateChange }) {
  const state = item.state?.state || ItemState.NEW;
  const [isFavorite, setIsFavorite] = React.useState(state === ItemState.FAVORITE);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = isFavorite ? ItemState.SEEN : ItemState.FAVORITE;
    setIsFavorite(!isFavorite);

    if (onStateChange) {
      onStateChange(item.id, newState);
    }
  };

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

  // Determine sale type badge
  const getSaleTypeBadge = () => {
    if (item.saleType === 'LIVE') {
      return 'LIVE';
    } else if (item.saleType === 'ONLINE') {
      return 'ONLINE';
    }
    return null;
  };

  const saleTypeBadge = getSaleTypeBadge();

  // Format date for badge
  const formatBadgeDate = () => {
    const date = new Date(item.auctionDate);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
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

        {/* Sale Type Badge */}
        {saleTypeBadge && (
          <div className="drouot-card-badge">
            <span className={`badge-type badge-${item.saleType.toLowerCase()}`}>
              {saleTypeBadge}
            </span>
            <span className="badge-date">
              {formatBadgeDate()}
            </span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          className={`drouot-card-favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M29.5,4.5C27.8,2.3,25.3,1,22.7,1c-2.6,0-5.1,1.3-6.7,3.5C14.4,2.3,11.9,1,9.3,1C6.7,1,4.2,2.3,2.5,4.5 c-1.9,2.6-2,6.4-0.3,9.3c0,0,0,0.1,0.1,0.1l12.9,16.6c0.2,0.3,0.5,0.4,0.8,0.4s0.6-0.1,0.8-0.4L29.7,14c0,0,0-0.1,0.1-0.1 C31.5,11,31.4,7.1,29.5,4.5z"
              fill={isFavorite ? '#de2826' : 'currentColor'}
            />
          </svg>
        </button>

        {/* NEW Badge */}
        {state === ItemState.NEW && (
          <div className="drouot-card-new-badge">
            <svg width="50" height="50" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <path d="M52 2H12C6.477 2 2 6.477 2 12v40c0 5.523 4.477 10 10 10h40c5.523 0 10-4.477 10-10V12c0-5.523-4.477-10-10-10zM21 39h-2.553l-5.084-9.131V39H11V25h2.477l5.16 9.348V25H21v14zm14 0H25V25h9.75v2.367h-7.096v3.104h6.6v2.359h-6.6v3.808H35V39zm16.668 0H48.73l-2.729-10.467L43.279 39h-3.004L37 25h2.836l2.068 9.615L44.41 25h3.293l2.404 9.779L52.213 25H55l-3.332 14z" fill="#d4423f"/>
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="drouot-card-content">
        {/* Lot Number */}
        {item.externalId && (
          <div className="drouot-card-lot-number">
            {item.externalId}
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
