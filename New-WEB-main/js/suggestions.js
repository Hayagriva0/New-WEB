/**
 * suggestions.js — Search Autocomplete
 * 
 * Uses Google Suggest (primary) + Bing (fallback) + DuckDuckGo (fallback).
 * In extension context, fetches directly via host_permissions.
 * In dev context, suggestions are disabled (no third-party proxy).
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
    var searchCallback = null;

    /* Detect if running as a Chrome extension */
    var isExtension = !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id &&
        window.location.protocol === 'chrome-extension:');

    /**
     * Fetch URL — only in extension context (host_permissions bypass CORS).
     * In dev context, returns null (no third-party proxy for privacy).
     */
    function safeFetch(url) {
        if (!isExtension) {
            return Promise.resolve(null);
        }

        return fetch(url, { method: 'GET' })
            .then(function (response) {
                if (!response.ok) return null;
                return response.text();
            })
            .then(function (text) {
                if (!text) return null;
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return null;
                }
            })
            .catch(function () {
                return null;
            });
    }

    /**
     * Validate that data matches OpenSearch suggestion format: [query, [s1, s2, ...]]
     */
    function isValidOpenSearchResponse(data) {
        return data && Array.isArray(data) && Array.isArray(data[1]) && data[1].length > 0 &&
            data[1].every(function (item) { return typeof item === 'string'; });
    }

    /**
     * Validate that data matches DuckDuckGo format: [{phrase: "..."}, ...]
     */
    function isValidDDGResponse(data) {
        return Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].phrase === 'string';
    }

    /**
     * Fetch suggestions from multiple sources with fallback chain.
     */
    function fetchSuggestions(query) {
        var trimmed = (query || '').trim();
        if (trimmed.length < 2) return Promise.resolve([]);

        var encoded = encodeURIComponent(trimmed);

        /* Try Google Suggest first */
        var googleUrl = 'https://suggestqueries.google.com/complete/search?client=firefox&q=' + encoded;

        return safeFetch(googleUrl)
            .then(function (data) {
                if (isValidOpenSearchResponse(data)) {
                    return data[1].slice(0, MAX_ITEMS);
                }

                /* Fallback to Bing Suggest */
                var bingUrl = 'https://api.bing.com/osjson.aspx?query=' + encoded;
                return safeFetch(bingUrl);
            })
            .then(function (data) {
                if (isValidOpenSearchResponse(data)) {
                    return data[1].slice(0, MAX_ITEMS);
                }

                /* If it's already an array of strings (from Google success), return it */
                if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
                    return data;
                }

                /* Fallback to DuckDuckGo */
                var ddgUrl = 'https://duckduckgo.com/ac/?q=' + encoded;
                return safeFetch(ddgUrl);
            })
            .then(function (data) {
                if (!data) return [];
                /* If it's already an array of strings (from previous success), return it */
                if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
                    return data;
                }
                /* DuckDuckGo format: [{phrase: "..."}, ...] */
                if (isValidDDGResponse(data)) {
                    return data.slice(0, MAX_ITEMS).map(function (d) {
                        return typeof d.phrase === 'string' ? d.phrase : '';
                    }).filter(Boolean);
                }
                return [];
            })
            .catch(function () {
                return [];
            });
    }

    /**
     * Create the search icon SVG element for a suggestion item.
     */
    function createSearchIcon() {
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');

        var circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', '11');
        circle.setAttribute('cy', '11');
        circle.setAttribute('r', '8');

        var line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', '21');
        line.setAttribute('y1', '21');
        line.setAttribute('x2', '16.65');
        line.setAttribute('y2', '16.65');

        svg.appendChild(circle);
        svg.appendChild(line);
        return svg;
    }

    function renderItems(results) {
        items = results;
        selectedIndex = -1;

        if (!results || results.length === 0) {
            hide();
            return;
        }

        /* Clear dropdown safely */
        while (dropdown.firstChild) {
            dropdown.removeChild(dropdown.firstChild);
        }

        for (var i = 0; i < results.length; i++) {
            var item = document.createElement('div');
            item.className = 'suggestion-item';
            item.setAttribute('data-idx', String(i));

            item.appendChild(createSearchIcon());

            var textSpan = document.createElement('span');
            textSpan.textContent = results[i];
            item.appendChild(textSpan);

            dropdown.appendChild(item);
        }
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
        if (!isNaN(idx) && idx >= 0 && idx < items.length && items[idx]) {
            inputEl.value = items[idx];
            hide();
            if (typeof searchCallback === 'function') searchCallback();
        }
    }

    function init(input, dd, doSearchFn) {
        inputEl = input;
        dropdown = dd;
        searchCallback = doSearchFn || null;

        if (!inputEl || !dropdown) {
            console.warn('[Suggestions] Missing DOM elements');
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
    }

    return { init: init, hide: hide };
})();
