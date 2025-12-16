import React from 'react';
import './TabNavigation.css';

export default function TabNavigation({ activeTab, onTabChange, counts }) {
  const favoriteIconUrl = chrome.runtime.getURL('assets/favorite.svg');
  const newIconUrl = chrome.runtime.getURL('assets/new-button.svg');

  const tabs = [
    { id: 'new', label: 'Nouveaux', count: counts.new, icon: newIconUrl },
    { id: 'favorite', label: 'Favoris', count: counts.favorite, icon: favoriteIconUrl },
    { id: 'seen', label: 'Vus', count: counts.seen, icon: '👀' },
    { id: 'all', label: 'Tous', icon: '📋' }
  ];

  const renderIcon = (icon) => {
    if (typeof icon === 'string' && icon.includes('.svg')) {
      return <img src={icon} alt="" className="tab-icon-img" />;
    }
    return <span className="tab-icon">{icon}</span>;
  };

  return (
    <nav className="tab-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {renderIcon(tab.icon)}
          <span className="tab-label">{tab.label}</span>
          {tab.count !== undefined && tab.count > 0 && (
            <span className="tab-badge">{tab.count}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
