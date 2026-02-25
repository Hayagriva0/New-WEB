/**
 * main.js — Application Orchestrator
 * 
 * PRIVACY: No tracking. No analytics. No fingerprinting.
 * All data stays local. Weather is opt-in (free Open-Meteo API).
 * Each feature is initialized independently.
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    /* -------------------------------------------------------
     * DOM References
     * ------------------------------------------------------- */
    var searchInput = document.getElementById('search-input');
    var searchBtn = document.getElementById('search-btn');
    var searchClearBtn = document.getElementById('search-clear-btn');
    var toggleSearch = document.getElementById('toggle-search');
    var toggleAI = document.getElementById('toggle-ai');
    var toggleHighlight = document.getElementById('toggle-highlight');
    var themeBtns = document.querySelectorAll('.theme-btn');
    var settingsBtn = document.getElementById('settings-btn');
    var settingsPanel = document.getElementById('settings-panel');
    var closeSettingsBtn = document.getElementById('close-settings-btn');
    var engineSelect = document.getElementById('search-engine-select');
    var weatherToggle = document.getElementById('weather-toggle');
    var clockStyleCards = document.querySelectorAll('.clock-style-card');
    var clockFormatToggle = document.getElementById('clock-format-toggle');
    var topSitesToggle = document.getElementById('top-sites-toggle');
    var notesToggle = document.getElementById('notes-toggle');
    var topSitesSection = document.querySelector('.top-sites-section');
    var notesSection = document.querySelector('.notes-section');
    var topSitesGrid = document.getElementById('top-sites-grid');
    var suggestionsDD = document.getElementById('suggestions-dropdown');
    var favGrid = document.getElementById('favourites-grid');
    var addFavBtn = document.getElementById('add-favourite-btn');
    var favModal = document.getElementById('favourite-modal');
    var favNameInput = document.getElementById('fav-name-input');
    var favUrlInput = document.getElementById('fav-url-input');
    var favSaveBtn = document.getElementById('fav-save-btn');
    var favCancelBtn = document.getElementById('fav-cancel-btn');
    var clockEl = document.getElementById('clock');
    var greetingEl = document.getElementById('greeting');
    var dateEl = document.getElementById('date-display');

    var currentMode = 'search';
    var searchEngine = 'duckduckgo';
    var settingsOpen = false;
    var use24h = false;

    /* -------------------------------------------------------
     * FEATURE 1: Clock & Greeting (with 12/24h toggle)
     * ------------------------------------------------------- */
    try {
        var clockStyle = 'default';

        /* Load clock preferences */
        Promise.all([
            Storage.get('clock24h'),
            Storage.get('clockStyle')
        ]).then(function (vals) {
            use24h = !!vals[0];
            if (clockFormatToggle) clockFormatToggle.checked = use24h;

            if (vals[1]) {
                clockStyle = vals[1];
            }
            updateClockCardsUI(clockStyle);
            applyClockStyle(clockStyle);

            updateClock();
        }).catch(function () { });

        function updateClockCardsUI(activeStyle) {
            clockStyleCards.forEach(function (card) {
                if (card.dataset.style === activeStyle) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        }

        function applyClockStyle(style) {
            clockEl.className = 'clock'; // Reset
            if (style && style !== 'default') {
                clockEl.classList.add('clock-style-' + style);
            }
        }

        function updateClock() {
            var now = new Date();
            var h = now.getHours();
            var m = now.getMinutes();

            if (use24h) {
                clockEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            } else {
                var period = h >= 12 ? 'PM' : 'AM';
                var h12 = h % 12;
                if (h12 === 0) h12 = 12;
                clockEl.innerHTML = String(h12) + ':' + String(m).padStart(2, '0') + '<span style="margin-left: 8px;">' + period + '</span>';
            }

            /* Greeting */
            var greeting = 'Good evening';
            if (h >= 5 && h < 12) greeting = 'Good morning';
            else if (h >= 12 && h < 17) greeting = 'Good afternoon';
            else if (h >= 17 && h < 21) greeting = 'Good evening';
            else greeting = 'Good night';
            greetingEl.textContent = greeting;

            /* Date + timezone */
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            var months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            var tz = '';
            try { tz = ' · ' + Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' '); } catch (e) { }
            dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + tz;
        }

        /* Object listeners */
        if (clockFormatToggle) {
            clockFormatToggle.addEventListener('change', function () {
                use24h = clockFormatToggle.checked;
                Storage.set('clock24h', use24h).catch(function () { });
                updateClock();
            });
        }

        clockStyleCards.forEach(function (card) {
            card.addEventListener('click', function (e) {
                clockStyle = e.currentTarget.dataset.style;
                Storage.set('clockStyle', clockStyle).catch(function () { });
                updateClockCardsUI(clockStyle);
                applyClockStyle(clockStyle);
            });
        });

        updateClock();
        setInterval(updateClock, 10000);
        console.log('[New WEB] Clock initialized');
    } catch (err) {
        console.error('[New WEB] Clock init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 2: Toggle (Search / AI)
     * ------------------------------------------------------- */
    try {
        function setMode(mode) {
            currentMode = mode;
            if (mode === 'ai') {
                toggleHighlight.classList.add('right');
                toggleAI.classList.add('active');
                toggleSearch.classList.remove('active');
                searchInput.placeholder = 'Ask Duck.ai anything…';
            } else {
                toggleHighlight.classList.remove('right');
                toggleSearch.classList.add('active');
                toggleAI.classList.remove('active');
                searchInput.placeholder = 'Search privately';
            }
            searchInput.focus();
        }
        toggleSearch.addEventListener('click', function () { setMode('search'); });
        toggleAI.addEventListener('click', function () { setMode('ai'); });
        console.log('[New WEB] Toggle initialized');
    } catch (err) {
        console.error('[New WEB] Toggle init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 3: Search
     * ------------------------------------------------------- */
    try {
        function doSearch() {
            try { Suggestions.hide(); } catch (e) { }
            Search.performSearch(searchInput.value, currentMode, searchEngine);
        }
        window._doSearch = doSearch;

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') setTimeout(doSearch, 30);
        });

        searchInput.addEventListener('input', function () {
            if (searchInput.value.length > 0) {
                searchClearBtn.style.display = 'flex';
            } else {
                searchClearBtn.style.display = 'none';
            }
        });

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', function () {
                searchInput.value = '';
                searchClearBtn.style.display = 'none';
                searchInput.focus();
                try { Suggestions.hide(); } catch (e) { }
            });
        }

        searchBtn.addEventListener('click', function () { doSearch(); });
        console.log('[New WEB] Search initialized');
    } catch (err) {
        console.error('[New WEB] Search init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 4: Suggestions
     * ------------------------------------------------------- */
    try {
        Suggestions.init(searchInput, suggestionsDD);
        console.log('[New WEB] Suggestions initialized');
    } catch (err) {
        console.error('[New WEB] Suggestions init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 5: Settings Panel
     * ------------------------------------------------------- */
    try {
        settingsPanel.style.opacity = '0';
        settingsPanel.style.pointerEvents = 'none';
        settingsPanel.style.transform = 'translateY(-8px) scale(0.97)';
        settingsPanel.style.transition = 'opacity 280ms ease, transform 280ms ease';

        function openSettings() {
            settingsOpen = true;
            settingsPanel.style.opacity = '1';
            settingsPanel.style.pointerEvents = 'auto';
            settingsPanel.style.transform = 'translateY(0) scale(1)';
        }
        function closeSettings() {
            settingsOpen = false;
            settingsPanel.style.opacity = '0';
            settingsPanel.style.pointerEvents = 'none';
            settingsPanel.style.transform = 'translateY(-8px) scale(0.97)';
        }
        settingsBtn.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            settingsOpen ? closeSettings() : openSettings();
        });
        closeSettingsBtn.addEventListener('click', function (e) {
            e.preventDefault(); closeSettings();
        });
        document.addEventListener('click', function (e) {
            if (settingsOpen && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) closeSettings();
        });
        console.log('[New WEB] Settings panel initialized');
    } catch (err) {
        console.error('[New WEB] Settings panel init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 6: Search Engine Selection
     * ------------------------------------------------------- */
    try {
        Storage.get('searchEngine').then(function (val) {
            if (val) { searchEngine = val; engineSelect.value = val; }
        }).catch(function () { });
        engineSelect.addEventListener('change', function () {
            searchEngine = engineSelect.value;
            Storage.set('searchEngine', searchEngine).catch(function () { });
        });
        console.log('[New WEB] Engine select initialized');
    } catch (err) {
        console.error('[New WEB] Engine select init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 7: Weather
     * ------------------------------------------------------- */
    try {
        Storage.get('weatherEnabled').then(function (val) {
            weatherToggle.checked = !!val;
        }).catch(function () { });
        weatherToggle.addEventListener('change', function () {
            var enabled = weatherToggle.checked;
            Storage.set('weatherEnabled', enabled).catch(function () { });
            if (enabled) { Weather.init(); }
            else { var w = document.getElementById('weather-widget'); if (w) w.style.display = 'none'; }
        });
        Weather.init();
        console.log('[New WEB] Weather initialized');
    } catch (err) {
        console.error('[New WEB] Weather init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 8: Favourites
     * ------------------------------------------------------- */
    try {
        Favourites.init(favGrid, addFavBtn, favModal, favNameInput, favUrlInput, favSaveBtn, favCancelBtn)
            .then(function () { console.log('[New WEB] Favourites initialized'); })
            .catch(function (err) { console.error('[New WEB] Favourites init failed:', err); });
    } catch (err) {
        console.error('[New WEB] Favourites init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 9: Top Sites (card-style like reference)
     * ------------------------------------------------------- */
    try {
        Storage.get('topSitesEnabled').then(function (val) {
            var enabled = val !== false; // default true
            topSitesToggle.checked = enabled;
            if (!enabled && topSitesSection) topSitesSection.style.display = 'none';
        }).catch(function () { });

        topSitesToggle.addEventListener('change', function () {
            var enabled = topSitesToggle.checked;
            Storage.set('topSitesEnabled', enabled).catch(function () { });
            if (topSitesSection) topSitesSection.style.display = enabled ? '' : 'none';
        });

        if (typeof chrome !== 'undefined' && chrome.topSites) {
            chrome.topSites.get(function (sites) {
                if (!sites || !sites.length) return;
                var display = sites.slice(0, 6);
                topSitesGrid.innerHTML = '';

                for (var i = 0; i < display.length; i++) {
                    (function (site) {
                        var card = document.createElement('a');
                        card.href = site.url;
                        card.className = 'top-card';
                        card.title = site.title || site.url;

                        /* Thumbnail area */
                        var thumb = document.createElement('div');
                        thumb.className = 'top-card-thumb';

                        /* Give each card a unique gradient color based on index */
                        var hue = (i * 47 + 200) % 360;
                        thumb.style.background = 'linear-gradient(135deg, hsla(' + hue + ',60%,50%,0.08), hsla(' + ((hue + 60) % 360) + ',50%,40%,0.05))';

                        var img = document.createElement('img');
                        img.className = 'top-card-thumb-icon';
                        img.alt = '';
                        try {
                            img.src = 'chrome-extension://' + chrome.runtime.id +
                                '/_favicon/?pageUrl=' + encodeURIComponent(site.url) + '&size=64';
                        } catch (e) {
                            img.src = 'https://www.google.com/s2/favicons?domain=' + new URL(site.url).hostname + '&sz=64';
                        }
                        img.addEventListener('error', function () {
                            var fb = document.createElement('div');
                            fb.className = 'top-card-thumb-fallback';
                            fb.textContent = (site.title || '?')[0].toUpperCase();
                            img.replaceWith(fb);
                        });
                        thumb.appendChild(img);

                        /* Info area */
                        var info = document.createElement('div');
                        info.className = 'top-card-info';

                        var name = document.createElement('div');
                        name.className = 'top-card-name';
                        name.textContent = site.title || 'Untitled';

                        var domain = document.createElement('div');
                        domain.className = 'top-card-domain';
                        try { domain.textContent = new URL(site.url).hostname.replace('www.', ''); }
                        catch (e) { domain.textContent = site.url; }

                        info.appendChild(name);
                        info.appendChild(domain);

                        card.appendChild(thumb);
                        card.appendChild(info);
                        topSitesGrid.appendChild(card);
                    })(display[i]);
                }
                console.log('[New WEB] Top sites loaded:', display.length);
            });
        }
    } catch (err) {
        console.error('[New WEB] Top sites init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 10: Quick Notes
     * ------------------------------------------------------- */
    try {
        Storage.get('notesEnabled').then(function (val) {
            var enabled = val !== false; // default true
            notesToggle.checked = enabled;
            if (!enabled && notesSection) notesSection.style.display = 'none';
        }).catch(function () { });

        notesToggle.addEventListener('change', function () {
            var enabled = notesToggle.checked;
            Storage.set('notesEnabled', enabled).catch(function () { });
            if (notesSection) notesSection.style.display = enabled ? '' : 'none';
        });

        if (typeof NotesModule !== 'undefined') {
            NotesModule.init().then(() => {
                console.log('[New WEB] Quick Notes initialized');
            });
        }
    } catch (err) {
        console.error('[New WEB] Quick Notes init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 11: Ambient Orb Parallax
     * ------------------------------------------------------- */
    try {
        var bodyStyle = document.body.style;
        document.addEventListener('mousemove', function (e) {
            // Subtle parallax (-20px to 20px depending on screen position)
            var x = (e.clientX / window.innerWidth - 0.5) * 40;
            var y = (e.clientY / window.innerHeight - 0.5) * 40;
            requestAnimationFrame(function () {
                bodyStyle.setProperty('--bg-x', x + 'px');
                bodyStyle.setProperty('--bg-y', y + 'px');
            });
        });
        console.log('[New WEB] Ambient Orb Parallax initialized');
    } catch (err) {
        console.error('[New WEB] Ambient Orb Parallax init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 12: Theme Toggle
     * ------------------------------------------------------- */
    try {
        function applyTheme(themeValue) {
            if (themeValue === 'system') {
                var isSystemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
                document.documentElement.setAttribute('data-theme', isSystemLight ? 'light' : 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', themeValue);
            }
            Storage.set('theme', themeValue).catch(function () { });

            themeBtns.forEach(function (btn) {
                if (btn.dataset.themeValue === themeValue) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        Storage.get('theme').then(function (val) {
            var activeTheme = val || 'system';

            // Handle edge case where old db might have stored boolean or other values
            if (activeTheme !== 'light' && activeTheme !== 'dark' && activeTheme !== 'system') {
                activeTheme = activeTheme === true ? 'light' : 'dark';
            }

            applyTheme(activeTheme);
        }).catch(function () {
            applyTheme('system');
        });

        themeBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var newTheme = e.currentTarget.dataset.themeValue;
                applyTheme(newTheme);
            });
        });

        // Listen for system theme changes if set to system
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
                Storage.get('theme').then(function (val) {
                    if (val === 'system' || !val) {
                        document.documentElement.setAttribute('data-theme', e.matches ? 'light' : 'dark');
                    }
                }).catch(function () { });
            });
        }

        console.log('[New WEB] Theme toggle initialized');
    } catch (err) {
        console.error('[New WEB] Theme toggle init failed:', err);
    }

    console.log('[New WEB] All features initialized ✓');
});
