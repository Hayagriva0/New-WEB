/**
 * favourites.js — Favourite Sites Manager
 * 
 * PRIVACY: All data stored locally. No external requests.
 */

'use strict';

var Favourites = (() => {

    var MAX_FAVOURITES = 12;
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
        var n = (name || '').trim();
        var u = (url || '').trim();
        if (!n || !u) return false;
        if (favourites.length >= MAX_FAVOURITES) return false;

        /* Add protocol if missing */
        if (u.indexOf('http://') !== 0 && u.indexOf('https://') !== 0) {
            u = 'https://' + u;
        }

        /* Validate URL */
        try { new URL(u); } catch (e) { return false; }

        /* Check duplicates */
        for (var i = 0; i < favourites.length; i++) {
            if (favourites[i].url === u) return false;
        }

        favourites.push({ name: n, url: u });
        save();
        return true;
    }

    function remove(index) {
        if (index >= 0 && index < favourites.length) {
            favourites.splice(index, 1);
            save();
            render();
        }
    }

    function getFaviconUrl(siteUrl) {
        try {
            var urlObj = new URL(siteUrl);
            /* Try Chrome's internal favicon API first */
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
        gridEl.innerHTML = '';

        if (favourites.length === 0) return;

        for (var i = 0; i < favourites.length; i++) {
            (function (fav, idx) {
                var card = document.createElement('a');
                card.href = fav.url;
                card.className = 'site-card';
                card.title = fav.name;

                var img = document.createElement('img');
                img.className = 'site-favicon';
                img.alt = '';
                img.src = getFaviconUrl(fav.url);
                img.addEventListener('error', function () {
                    var fb = document.createElement('div');
                    fb.className = 'site-favicon-fallback';
                    fb.textContent = (fav.name || '?')[0].toUpperCase();
                    img.replaceWith(fb);
                });

                var label = document.createElement('span');
                label.className = 'site-label';
                label.textContent = fav.name;

                var removeBtn = document.createElement('button');
                removeBtn.className = 'site-remove-btn';
                removeBtn.title = 'Remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(idx);
                });

                card.appendChild(img);
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
