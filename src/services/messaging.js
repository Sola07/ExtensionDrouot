import { MessageType } from '../constants.js';

/**
 * Messaging service for chrome.runtime communication
 * Provides a clean API for sending messages between components
 */

/**
 * Send message from content script to background
 * @param {string} type - Message type
 * @param {Object} data - Message data
 * @returns {Promise<any>}
 */
export async function sendToBackground(type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send message to all tabs
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export async function sendToAllTabs(type, data = {}) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type, ...data });
      } catch (e) {
        // Tab might not have content script, ignore
      }
    }
  }
}

/**
 * Send message to specific tab
 * @param {number} tabId - Tab ID
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export async function sendToTab(tabId, type, data = {}) {
  try {
    await chrome.tabs.sendMessage(tabId, { type, ...data });
  } catch (e) {
    console.error(`Failed to send message to tab ${tabId}:`, e);
  }
}

/**
 * Broadcast message to popup if open
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
export async function sendToPopup(type, data = {}) {
  // Get popup window
  const views = chrome.extension.getViews({ type: 'popup' });

  if (views.length > 0) {
    // Popup is open, send message
    chrome.runtime.sendMessage({ type, ...data });
  }
}

/**
 * Listen for messages in content script
 * @param {Function} handler - Message handler (message, sender, sendResponse)
 */
export function listenForMessages(handler) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handler(message, sender, sendResponse);
    // Return true if async response
    return true;
  });
}

/**
 * Notify UI to refresh
 */
export async function notifyRefreshUI() {
  await sendToAllTabs(MessageType.REFRESH_UI);
  await sendToPopup(MessageType.REFRESH_UI);
}
