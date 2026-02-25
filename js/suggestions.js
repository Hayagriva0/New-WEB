/**
 * suggestions.js — Search Autocomplete
 * 
 * Works in BOTH contexts:
 * - Chrome Extension: direct fetch (CORS bypassed by host_permissions)
 * - Live Server / Dev: uses allorigins.win CORS proxy
 * 
 * Uses Google Suggest (primary) + DuckDuckGo (fallback).
 */

'use strict';

var Suggestions = (() => {

    var DEBOUNCE_MS = 250;
    var MAX_ITEMS = 7;
    var debounceTimer = null;
    var selectedIndex = -1;
    var items = [];
    var inputEl = null;
    var dropdown = null;
    var visible = false;

    /* Detect if running as a Chrome extension */
    var isExtension = !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id &&
        window.location.protocol === 'chrome-extension:');

    console.log('[Suggestions] Extension mode:', isExtension);

    /**
     * Fetch URL with CORS handled automatically.
     * In extension context, fetches directly (host_permissions bypass CORS).
     * In dev context, uses allorigins.win as a CORS proxy.
     */
    function corsAwareFetch(url) {
        var fetchUrl = isExtension
            ? url
            : 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);

        console.log('[Suggestions] Fetching:', fetchUrl);

        return fetch(fetchUrl, { method: 'GET' })
            .then(function (response) {
                console.log('[Suggestions] Status:', response.status);
                if (!response.ok) return null;
                return response.text();
            })
            .then(function (text) {
                if (!text) return null;
                console.log('[Suggestions] Got', text.length, 'chars');
                return JSON.parse(text);
            })
            .catch(function (err) {
                console.warn('[Suggestions] Fetch error:', err.message);
                return null;
            });
    }

    /**
     * Fetch suggestions.
     */
    function fetchSuggestions(query) {
        var trimmed = (query || '').trim();
        if (trimmed.length < 2) return Promise.resolve([]);

        var encoded = encodeURIComponent(trimmed);

        /* Try Google Suggest first */
        var googleUrl = 'https://suggestqueries.google.com/complete/search?client=firefox&q=' + encoded;

        return corsAwareFetch(googleUrl)
            .then(function (data) {
                /* Google OpenSearch format: [query, [s1, s2, ...]] */
                if (data && Array.isArray(data) && Array.isArray(data[1]) && data[1].length > 0) {
                    console.log('[Suggestions] Google returned', data[1].length, 'results');
                    return data[1].slice(0, MAX_ITEMS);
                }

                /* Fallback to Bing Suggest */
                console.log('[Suggestions] Google empty, trying Bing...');
                var bingUrl = 'https://api.bing.com/osjson.aspx?query=' + encoded;
                return corsAwareFetch(bingUrl);
            })
            .then(function (data) {
                if (data && Array.isArray(data) && Array.isArray(data[1]) && data[1].length > 0) {
                    console.log('[Suggestions] Bing returned', data[1].length, 'results');
                    return data[1].slice(0, MAX_ITEMS);
                }

                /* Fallback to DuckDuckGo */
                console.log('[Suggestions] Bing empty, trying DuckDuckGo...');
                var ddgUrl = 'https://duckduckgo.com/ac/?q=' + encoded;
                return corsAwareFetch(ddgUrl);
            })
            .then(function (data) {
                if (!data) return [];
                /* If it's already an array of strings (from Google/Bing success), return it */
                if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
                    return data;
                }
                /* DuckDuckGo format: [{phrase: "..."}, ...] */
                if (Array.isArray(data) && data.length > 0 && data[0] && data[0].phrase) {
                    var results = data.slice(0, MAX_ITEMS).map(function (d) { return d.phrase; });
                    console.log('[Suggestions] DuckDuckGo returned', results.length, 'results');
                    return results;
                }
                return [];
            })
            .catch(function (err) {
                console.error('[Suggestions] All sources failed:', err);
                return [];
            });
    }

    function escapeHTML(str) {
        var el = document.createElement('span');
        el.textContent = str;
        return el.innerHTML;
    }

    function renderItems(results) {
        items = results;
        selectedIndex = -1;

        if (!results || results.length === 0) {
            hide();
            return;
        }

        console.log('[Suggestions] Rendering', results.length, 'items');

        var html = '';
        for (var i = 0; i < results.length; i++) {
            html += '<div class="suggestion-item" data-idx="' + i + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
                '<span>' + escapeHTML(results[i]) + '</span></div>';
        }
        dropdown.innerHTML = html;
        show();
    }

    function setSectionsVisibility(vis) {
        var favs = document.querySelector('.favourites-section');
        var tops = document.querySelector('.top-sites-section');
        if (favs) favs.style.visibility = vis;
        if (tops) tops.style.visibility = vis;
    }

    function show() {
        visible = true;
        setSectionsVisibility('hidden');
        dropdown.style.display = 'block';
        requestAnimationFrame(function () {
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });
    }

    function hide() {
        if (!visible) return;
        visible = false;
        setSectionsVisibility('visible');
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        setTimeout(function () {
            if (!visible) dropdown.style.display = 'none';
        }, 180);
        selectedIndex = -1;
        items = [];
    }

    function onInput() {
        clearTimeout(debounceTimer);
        var query = inputEl.value;
        if (!query || !query.trim()) {
            hide();
            return;
        }

        debounceTimer = setTimeout(function () {
            fetchSuggestions(query).then(function (results) {
                if (inputEl.value === query) {
                    renderItems(results);
                }
            });
        }, DEBOUNCE_MS);
    }

    function onKeydown(e) {
        if (!visible || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            highlightItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            highlightItem();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hide();
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            inputEl.value = items[selectedIndex];
            hide();
        }
    }

    function highlightItem() {
        var els = dropdown.querySelectorAll('.suggestion-item');
        for (var i = 0; i < els.length; i++) {
            els[i].classList.toggle('selected', i === selectedIndex);
        }
        if (selectedIndex >= 0 && items[selectedIndex]) {
            inputEl.value = items[selectedIndex];
        }
    }

    function onClick(e) {
        var target = e.target.closest('.suggestion-item');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(target.getAttribute('data-idx'), 10);
        if (items[idx]) {
            inputEl.value = items[idx];
            hide();
            if (typeof window._doSearch === 'function') window._doSearch();
        }
    }

    function init(input, dd) {
        inputEl = input;
        dropdown = dd;

        if (!inputEl || !dropdown) {
            console.error('[Suggestions] Missing DOM elements!');
            return;
        }

        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-6px)';
        dropdown.style.transition = 'opacity 180ms ease, transform 180ms ease';
        dropdown.style.display = 'none';

        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('keydown', onKeydown);
        dropdown.addEventListener('mousedown', onClick);

        document.addEventListener('click', function (e) {
            if (!inputEl.contains(e.target) && !dropdown.contains(e.target)) hide();
        });

        console.log('[Suggestions] Ready ✓ (mode: ' + (isExtension ? 'extension' : 'dev/proxy') + ')');
    }

    return { init: init, hide: hide };
})();
