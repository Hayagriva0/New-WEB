/**
 * storage.js — Chrome Storage Wrapper (with localStorage fallback)
 * 
 * PRIVACY: All data is stored locally. No data is ever sent externally.
 * Falls back to localStorage when chrome.storage is not available.
 */

'use strict';

const Storage = (() => {

  const DEFAULTS = {
    theme: 'dark',
    searchEngine: 'duckduckgo',
    weatherEnabled: false,
    weatherLat: null,
    weatherLon: null,
    weatherCity: '',
    notesEnabled: false,
    usageEnabled: true,
    topSitesEnabled: true,
    favourites: [
      { name: 'YouTube', url: 'https://www.youtube.com' },
      { name: 'Facebook', url: 'https://www.facebook.com' },
      { name: 'Instagram', url: 'https://www.instagram.com' },
      { name: 'ChatGPT', url: 'https://chat.openai.com' },
      { name: 'X', url: 'https://x.com' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com' },
      { name: 'NotebookLM', url: 'https://notebooklm.google.com' },
      { name: 'Amazon', url: 'https://www.amazon.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Gmail', url: 'https://mail.google.com' }
    ]
  };

  /* Detect if chrome.storage.local is available */
  const hasChromeStorage = (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local
  );

  /**
   * Get a value from storage.
   */
  async function get(key) {
    try {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('Storage get error:', chrome.runtime.lastError);
              resolve(getFromLocalStorage(key));
              return;
            }
            resolve(result[key] !== undefined ? result[key] : (DEFAULTS[key] ?? null));
          });
        });
      }
      return getFromLocalStorage(key);
    } catch (err) {
      console.warn('Storage.get failed:', err);
      return DEFAULTS[key] ?? null;
    }
  }

  /**
   * Set a value in storage.
   */
  async function set(key, value) {
    try {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              console.warn('Storage set error:', chrome.runtime.lastError);
              setToLocalStorage(key, value);
            }
            resolve();
          });
        });
      }
      setToLocalStorage(key, value);
    } catch (err) {
      console.warn('Storage.set failed:', err);
    }
  }

  /**
   * Get multiple keys.
   */
  async function getMultiple(keys) {
    try {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              console.warn('Storage getMultiple error:', chrome.runtime.lastError);
              resolve(getMultipleFromLocalStorage(keys));
              return;
            }
            const filled = {};
            for (const key of keys) {
              filled[key] = result[key] !== undefined ? result[key] : (DEFAULTS[key] ?? null);
            }
            resolve(filled);
          });
        });
      }
      return getMultipleFromLocalStorage(keys);
    } catch (err) {
      console.warn('Storage.getMultiple failed:', err);
      const filled = {};
      for (const key of keys) {
        filled[key] = DEFAULTS[key] ?? null;
      }
      return filled;
    }
  }

  /* --- localStorage fallback helpers --- */

  function getFromLocalStorage(key) {
    try {
      const raw = localStorage.getItem('newweb_' + key);
      if (raw === null) return DEFAULTS[key] ?? null;
      return JSON.parse(raw);
    } catch {
      return DEFAULTS[key] ?? null;
    }
  }

  function setToLocalStorage(key, value) {
    try {
      localStorage.setItem('newweb_' + key, JSON.stringify(value));
    } catch {
      /* Storage full or unavailable */
    }
  }

  function getMultipleFromLocalStorage(keys) {
    const filled = {};
    for (const key of keys) {
      filled[key] = getFromLocalStorage(key);
    }
    return filled;
  }

  /**
   * Clear all stored data.
   */
  async function clear() {
    try {
      if (hasChromeStorage) {
        return new Promise((resolve) => {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              console.warn('Storage clear error:', chrome.runtime.lastError);
            }
            resolve();
          });
        });
      }
      // Clear all newweb_ prefixed keys from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('newweb_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Storage.clear failed:', err);
    }
  }

  return { get, set, getMultiple, clear, DEFAULTS };
})();
