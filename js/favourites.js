/**
 * favourites.js — Favourite Sites Manager
 * 
 * PRIVACY: All data stored locally. No external requests.
 */

'use strict';

var Favourites = (() => {

    var MAX_FAVOURITES = 12;
    var MAX_NAME_LENGTH = 24;
    var favourites = [];
    var gridEl = null;
    var modalEl = null;
    var nameInputEl = null;
    var urlInputEl = null;

    var SEED_VERSION = 2; /* Bump this when changing default favourites */
    var DEFAULT_FAVS = [
        { name: 'YouTube', url: 'https://www.youtube.com' },
        { name: 'Facebook', url: 'https://www.facebook.com' },
        { name: 'Instagram', url: 'https://www.instagram.com' },
        { name: 'ChatGPT', url: 'https://chat.openai.com' },
        { name: 'X', url: 'https://x.com' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com' },
        { name: 'NotebookLM', url: 'https://notebooklm.google.com' }
    ];

    /**
     * Sanitize a user-provided name: trim, limit length, strip control chars.
     */
    function sanitizeName(name) {
        var s = (name || '').trim();
        /* Remove control characters (U+0000–U+001F, U+007F) */
        s = s.replace(/[\x00-\x1F\x7F]/g, '');
        return s.substring(0, MAX_NAME_LENGTH);
    }

    /**
     * Validate and sanitize a user-provided URL.
     * Returns the sanitized URL string, or null if invalid.
     */
    function sanitizeUrl(url) {
        var u = (url || '').trim();
        if (!u) return null;

        /* Add protocol if missing */
        if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) {
            u = 'https://' + u;
        }

        /* Validate with URL constructor */
        try {
            var parsed = new URL(u);
            /* Only allow http and https protocols */
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return null;
            }
            return parsed.href;
        } catch (e) {
            return null;
        }
    }

    async function load() {
        try {
            var savedVersion = await Storage.get('favSeedVersion');
            var data = await Storage.get('favourites');
            favourites = Array.isArray(data) ? data : [];

            /* Seed defaults if version doesn't match (new install or updated defaults) */
            if (savedVersion !== SEED_VERSION) {
                favourites = DEFAULT_FAVS.slice();
                await Storage.set('favourites', favourites);
                await Storage.set('favSeedVersion', SEED_VERSION);
            }
        } catch (err) {
            console.warn('Favourites load failed:', err);
            favourites = DEFAULT_FAVS.slice();
        }
    }

    async function save() {
        try {
            await Storage.set('favourites', favourites);
        } catch (err) {
            console.warn('Favourites save failed:', err);
        }
    }

    function add(name, url) {
        var n = sanitizeName(name);
        var u = sanitizeUrl(url);
        if (!n || !u) return false;
        if (favourites.length >= MAX_FAVOURITES) return false;

        /* Check duplicates */
        for (var i = 0; i < favourites.length; i++) {
            if (favourites[i].url === u) return false;
        }

        favourites.push({ name: n, url: u });
        save();
        return true;
    }

    function remove(index) {
        if (typeof index !== 'number' || index < 0 || index >= favourites.length) return;
        favourites.splice(index, 1);
        save();
        render();
    }

    function getFaviconUrl(siteUrl) {
        try {
            var urlObj = new URL(siteUrl);
            /* Use Chrome's internal favicon API (only available in extension context) */
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
                return 'chrome-extension://' + chrome.runtime.id +
                    '/_favicon/?pageUrl=' + encodeURIComponent(urlObj.href) + '&size=32';
            }
            /* Fallback to Google's favicon service */
            return 'https://www.google.com/s2/favicons?domain=' + urlObj.hostname + '&sz=32';
        } catch (e) {
            return '';
        }
    }

    function render() {
        if (!gridEl) return;

        /* Clear grid safely (no innerHTML) */
        while (gridEl.firstChild) {
            gridEl.removeChild(gridEl.firstChild);
        }

        if (favourites.length === 0) return;

        for (var i = 0; i < favourites.length; i++) {
            (function (fav, idx) {
                var card = document.createElement('a');
                card.href = fav.url;
                card.className = 'site-card';
                card.title = fav.name;
                card.setAttribute('rel', 'noopener noreferrer');

                var faviconSrc = getFaviconUrl(fav.url);

                if (faviconSrc) {
                    var img = document.createElement('img');
                    img.className = 'site-favicon';
                    img.alt = '';
                    img.src = faviconSrc;
                    img.addEventListener('error', function () {
                        var fb = document.createElement('div');
                        fb.className = 'site-favicon-fallback';
                        fb.textContent = (fav.name || '?')[0].toUpperCase();
                        img.replaceWith(fb);
                    });
                    card.appendChild(img);
                } else {
                    /* Letter fallback when no favicon API available */
                    var fb = document.createElement('div');
                    fb.className = 'site-favicon-fallback';
                    fb.textContent = (fav.name || '?')[0].toUpperCase();
                    card.appendChild(fb);
                }

                var label = document.createElement('span');
                label.className = 'site-label';
                label.textContent = fav.name;

                var removeBtn = document.createElement('button');
                removeBtn.className = 'site-remove-btn';
                removeBtn.title = 'Remove';
                removeBtn.textContent = '\u00D7'; /* × character */
                removeBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(idx);
                });

                card.appendChild(label);
                card.appendChild(removeBtn);
                gridEl.appendChild(card);
            })(favourites[i], i);
        }
    }

    function showModal() {
        if (favourites.length >= MAX_FAVOURITES) return;
        nameInputEl.value = '';
        urlInputEl.value = '';
        modalEl.style.opacity = '1';
        modalEl.style.pointerEvents = 'auto';
        modalEl.style.display = 'flex';
        setTimeout(function () { nameInputEl.focus(); }, 100);
    }

    function hideModal() {
        modalEl.style.opacity = '0';
        modalEl.style.pointerEvents = 'none';
        setTimeout(function () {
            modalEl.style.display = 'none';
        }, 200);
    }

    function handleSave() {
        var ok = add(nameInputEl.value, urlInputEl.value);
        if (ok) {
            hideModal();
            render();
        }
    }

    async function init(grid, addBtn, modal, nameInput, urlInput, saveBtn, cancelBtn) {
        gridEl = grid;
        modalEl = modal;
        nameInputEl = nameInput;
        urlInputEl = urlInput;

        /* Initially hide modal */
        modalEl.style.display = 'none';
        modalEl.style.opacity = '0';
        modalEl.style.pointerEvents = 'none';
        modalEl.style.transition = 'opacity 200ms ease';

        await load();
        render();

        addBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            showModal();
        });
        saveBtn.addEventListener('click', function (e) {
            e.preventDefault();
            handleSave();
        });
        cancelBtn.addEventListener('click', function (e) {
            e.preventDefault();
            hideModal();
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal) hideModal();
        });
        urlInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
        });
        nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); urlInput.focus(); }
        });
    }

    return { init: init, render: render };
})();
