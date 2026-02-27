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
    var themeSwatches = document.querySelectorAll('.theme-swatch');
    var settingsBtn = document.getElementById('settings-btn');
    var closeSettingsBtn = document.getElementById('close-settings-btn');
    var engineBtns = document.querySelectorAll('.engine-btn');
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
    var weatherWidget = document.getElementById('weather-widget');

    var currentMode = 'search';
    var searchEngine = 'duckduckgo';
    var settingsOpen = false;
    var use24h = false;

    /* Module-scoped search function (no global exposure) */
    var doSearch = null;

    /* -------------------------------------------------------
     * FEATURE 1: Clock & Greeting (with 12/24h toggle)
     * ------------------------------------------------------- */
    try {
        var clockStyle = 'default';
        var VALID_CLOCK_STYLES = ['default', 'thin', 'bold', 'rounded', 'condensed', 'serif', 'digital', 'script', 'outline', 'neon', 'retro', 'bubble'];

        /* Load clock preferences */
        Promise.all([
            Storage.get('clock24h'),
            Storage.get('clockStyle')
        ]).then(function (vals) {
            use24h = !!vals[0];
            if (clockFormatToggle) clockFormatToggle.checked = use24h;

            if (vals[1] && VALID_CLOCK_STYLES.indexOf(vals[1]) !== -1) {
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
            var wasHidden = clockEl.classList.contains('hidden');
            clockEl.className = 'clock'; // Reset
            if (wasHidden) clockEl.classList.add('hidden');
            if (style && style !== 'default') {
                clockEl.classList.add('clock-style-' + style);
            }
        }

        function updateClock() {
            var now = new Date();
            var h = now.getHours();
            var m = now.getMinutes();

            /* Clear existing content safely */
            while (clockEl.firstChild) {
                clockEl.removeChild(clockEl.firstChild);
            }

            if (use24h) {
                clockEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            } else {
                var period = h >= 12 ? 'PM' : 'AM';
                var h12 = h % 12;
                if (h12 === 0) h12 = 12;

                var timeText = document.createTextNode(String(h12) + ':' + String(m).padStart(2, '0'));
                var periodSpan = document.createElement('span');
                periodSpan.style.marginLeft = '8px';
                periodSpan.textContent = period;

                clockEl.appendChild(timeText);
                clockEl.appendChild(periodSpan);
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
    } catch (err) {
        console.error('[New WEB] Toggle init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 3: Search
     * ------------------------------------------------------- */
    try {
        doSearch = function () {
            try { Suggestions.hide(); } catch (e) { }
            Search.performSearch(searchInput.value, currentMode, searchEngine);
        };

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
    } catch (err) {
        console.error('[New WEB] Search init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 4: Suggestions
     * ------------------------------------------------------- */
    try {
        Suggestions.init(searchInput, suggestionsDD, doSearch);
    } catch (err) {
        console.error('[New WEB] Suggestions init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 5: Settings Panel (Tabbed Modal)
     * ------------------------------------------------------- */
    try {
        var settingsModal = document.getElementById('settings-modal');
        var settingsBackdrop = document.getElementById('settings-backdrop');

        var tabBtns = document.querySelectorAll('.settings-tab-btn');
        var tabPanes = document.querySelectorAll('.settings-tab-pane');

        function openSettings() {
            settingsOpen = true;
            if (settingsModal) settingsModal.classList.add('active');
            if (settingsBackdrop) settingsBackdrop.classList.add('active');
        }
        function closeSettings() {
            settingsOpen = false;
            if (settingsModal) settingsModal.classList.remove('active');
            if (settingsBackdrop) settingsBackdrop.classList.remove('active');
        }

        settingsBtn.addEventListener('click', function (e) {
            e.preventDefault(); e.stopPropagation();
            settingsOpen ? closeSettings() : openSettings();
        });

        closeSettingsBtn.addEventListener('click', function (e) {
            e.preventDefault(); closeSettings();
        });

        if (settingsBackdrop) {
            settingsBackdrop.addEventListener('click', function () {
                closeSettings();
            });
        }

        // Tab Switching Logic
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var targetTab = btn.getAttribute('data-tab');

                // Update active button
                tabBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                // Update active pane
                tabPanes.forEach(function (pane) {
                    if (pane.id === 'tab-' + targetTab) {
                        pane.classList.remove('hidden');
                        pane.classList.add('active');
                    } else {
                        pane.classList.add('hidden');
                        pane.classList.remove('active');
                    }
                });
            });
        });

    } catch (err) {
        console.error('[New WEB] Settings panel init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 6: Search Engine Selection
     * ------------------------------------------------------- */
    try {
        function updateEngineUI(activeEngine) {
            engineBtns.forEach(function (btn) {
                if (btn.dataset.engineValue === activeEngine) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        Storage.get('searchEngine').then(function (val) {
            if (val) {
                /* Validate engine against whitelist */
                var VALID_ENGINES = ['duckduckgo', 'google', 'bing', 'brave'];
                if (VALID_ENGINES.indexOf(val) !== -1) {
                    searchEngine = val;
                    updateEngineUI(val);
                }
            }
        }).catch(function () { });

        engineBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                searchEngine = e.currentTarget.dataset.engineValue;
                updateEngineUI(searchEngine);
                Storage.set('searchEngine', searchEngine).catch(function () { });
            });
        });

    } catch (err) {
        console.error('[New WEB] Engine select init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 7: Weather (with click handler replacing inline onclick)
     * ------------------------------------------------------- */
    try {
        /* Attach click handler (replaces inline onclick on weather widget) */
        if (weatherWidget) {
            weatherWidget.addEventListener('click', function () {
                window.location.href = 'https://weather.abhrajit.in/';
            });
        }

        Storage.get('weatherEnabled').then(function (val) {
            weatherToggle.checked = !!val;
        }).catch(function () { });
        weatherToggle.addEventListener('change', function () {
            var enabled = weatherToggle.checked;
            Storage.set('weatherEnabled', enabled).catch(function () { });
            if (enabled) { Weather.init(); }
            else { if (weatherWidget) weatherWidget.classList.add('hidden'); }
        });
        Weather.init();
    } catch (err) {
        console.error('[New WEB] Weather init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 8: Favourites
     * ------------------------------------------------------- */
    try {
        var favouritesToggle = document.getElementById('favourites-toggle');
        var favouritesSection = document.querySelector('.favourites-section');

        Storage.get('favouritesEnabled').then(function (val) {
            var enabled = val !== false; // default true
            if (favouritesToggle) favouritesToggle.checked = enabled;
            if (!enabled && favouritesSection) favouritesSection.style.display = 'none';
        }).catch(function () { });

        if (favouritesToggle) {
            favouritesToggle.addEventListener('change', function () {
                var enabled = favouritesToggle.checked;
                Storage.set('favouritesEnabled', enabled).catch(function () { });
                if (favouritesSection) favouritesSection.style.display = enabled ? '' : 'none';
            });
        }

        Favourites.init(favGrid, addFavBtn, favModal, favNameInput, favUrlInput, favSaveBtn, favCancelBtn)
            .then(function () { })
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

                /* Clear grid safely */
                while (topSitesGrid.firstChild) {
                    topSitesGrid.removeChild(topSitesGrid.firstChild);
                }

                for (var i = 0; i < display.length; i++) {
                    (function (site, idx) {
                        var card = document.createElement('a');
                        card.href = site.url;
                        card.className = 'top-card';
                        card.title = site.title || site.url;
                        card.setAttribute('rel', 'noopener noreferrer');

                        /* Thumbnail area */
                        var thumb = document.createElement('div');
                        thumb.className = 'top-card-thumb';

                        /* Give each card a unique gradient color based on index */
                        var hue = (idx * 47 + 200) % 360;
                        thumb.style.background = 'linear-gradient(135deg, hsla(' + hue + ',60%,50%,0.08), hsla(' + ((hue + 60) % 360) + ',50%,40%,0.05))';

                        var img = document.createElement('img');
                        img.className = 'top-card-thumb-icon';
                        img.alt = '';
                        try {
                            img.src = 'chrome-extension://' + chrome.runtime.id +
                                '/_favicon/?pageUrl=' + encodeURIComponent(site.url) + '&size=64';
                        } catch (e) {
                            /* Use letter fallback instead of external favicon service */
                            var fb = document.createElement('div');
                            fb.className = 'top-card-thumb-fallback';
                            fb.textContent = (site.title || '?')[0].toUpperCase();
                            thumb.appendChild(fb);
                            img = null;
                        }
                        if (img) {
                            img.addEventListener('error', function () {
                                var fb = document.createElement('div');
                                fb.className = 'top-card-thumb-fallback';
                                fb.textContent = (site.title || '?')[0].toUpperCase();
                                img.replaceWith(fb);
                            });
                            thumb.appendChild(img);
                        }

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
                    })(display[i], i);
                }
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
            NotesModule.init().then(function () {
            });
        }
    } catch (err) {
        console.error('[New WEB] Quick Notes init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 10.5: Usage Insight Toggle
     * ------------------------------------------------------- */
    try {
        var usageToggle = document.getElementById('usage-toggle');
        var usageSection = document.getElementById('usage-insight');

        if (usageToggle) {
            Storage.get('usageEnabled').then(function (val) {
                var enabled = val !== false; // default true
                usageToggle.checked = enabled;
                if (!enabled && usageSection) usageSection.style.display = 'none';
            }).catch(function () { });

            usageToggle.addEventListener('change', function () {
                var enabled = usageToggle.checked;
                Storage.set('usageEnabled', enabled).catch(function () { });
                if (usageSection) usageSection.style.display = enabled ? '' : 'none';

                // If it was just enabled and hasn't been initialized yet
                if (enabled && typeof UsageInsight !== 'undefined' && !usageSection.firstChild) {
                    UsageInsight.init();
                }
            });
        }
    } catch (err) {
        console.error('[New WEB] Usage Insight toggle init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 10.6: Element Toggles (Clock, Date, Logo, Greeting)
     * ------------------------------------------------------- */
    try {
        var clockToggle = document.getElementById('clock-toggle');
        var dateToggle = document.getElementById('date-toggle');
        var logoToggle = document.getElementById('logo-toggle');
        var greetingToggle = document.getElementById('greeting-toggle');

        var clockComp = document.getElementById('clock');
        var dateComp = document.getElementById('date-display');
        var logoComp = document.getElementById('main-logo-container');
        var greetingComp = document.getElementById('greeting');

        Storage.getMultiple(['clockEnabled', 'dateEnabled', 'logoEnabled', 'greetingEnabled']).then(function (vals) {
            var cEn = vals.clockEnabled !== false;
            var dEn = vals.dateEnabled !== false;
            var lEn = vals.logoEnabled !== false;
            var gEn = vals.greetingEnabled !== false;

            if (clockToggle) clockToggle.checked = cEn;
            if (dateToggle) dateToggle.checked = dEn;
            if (logoToggle) logoToggle.checked = lEn;
            if (greetingToggle) greetingToggle.checked = gEn;

            if (!cEn && clockComp) clockComp.classList.add('hidden');
            if (!dEn && dateComp) dateComp.classList.add('hidden');
            if (!lEn && logoComp) logoComp.classList.add('hidden');
            if (!gEn && greetingComp) greetingComp.classList.add('hidden');
        }).catch(function () { });

        if (clockToggle) clockToggle.addEventListener('change', function () {
            var en = clockToggle.checked;
            Storage.set('clockEnabled', en).catch(function () { });
            if (clockComp) { en ? clockComp.classList.remove('hidden') : clockComp.classList.add('hidden'); }
        });
        if (dateToggle) dateToggle.addEventListener('change', function () {
            var en = dateToggle.checked;
            Storage.set('dateEnabled', en).catch(function () { });
            if (dateComp) { en ? dateComp.classList.remove('hidden') : dateComp.classList.add('hidden'); }
        });
        if (logoToggle) logoToggle.addEventListener('change', function () {
            var en = logoToggle.checked;
            Storage.set('logoEnabled', en).catch(function () { });
            if (logoComp) { en ? logoComp.classList.remove('hidden') : logoComp.classList.add('hidden'); }
        });
        if (greetingToggle) greetingToggle.addEventListener('change', function () {
            var en = greetingToggle.checked;
            Storage.set('greetingEnabled', en).catch(function () { });
            if (greetingComp) { en ? greetingComp.classList.remove('hidden') : greetingComp.classList.add('hidden'); }
        });
    } catch (err) {
        console.error('[New WEB] Element toggles init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 10.7: Wallpaper Logic
     * ------------------------------------------------------- */
    try {
        var wallpaperUpload = document.getElementById('wallpaper-upload');
        var wallpaperRemove = document.getElementById('wallpaper-remove');

        // Function to apply wallpaper from data URL
        function applyWallpaper(dataUrl) {
            document.body.style.backgroundImage = 'url(' + dataUrl + ')';
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';

            // Add wallpaper-active class to hide the ambient orb (body::before)
            document.body.classList.add('wallpaper-active');
            if (wallpaperRemove) wallpaperRemove.classList.remove('hidden');
        }

        // Function to remove wallpaper
        function removeWallpaper() {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundSize = '';
            document.body.style.backgroundPosition = '';
            document.body.style.backgroundRepeat = '';

            // Remove wallpaper-active class to restore the ambient orb
            document.body.classList.remove('wallpaper-active');
            if (wallpaperRemove) wallpaperRemove.classList.add('hidden');
            Storage.set('customWallpaper', null).catch(function () { });
        }

        // Load saved wallpaper on init
        Storage.get('customWallpaper').then(function (val) {
            if (val) {
                applyWallpaper(val);
            }
        }).catch(function () { });

        var MAX_WALLPAPER_SIZE = 5 * 1024 * 1024; /* 5MB */
        var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

        if (wallpaperUpload) {
            wallpaperUpload.addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (!file) return;

                /* Validate file type */
                if (ALLOWED_IMAGE_TYPES.indexOf(file.type) === -1) {
                    console.warn('[New WEB] Invalid wallpaper type:', file.type);
                    wallpaperUpload.value = '';
                    return;
                }

                /* Validate file size */
                if (file.size > MAX_WALLPAPER_SIZE) {
                    console.warn('[New WEB] Wallpaper too large:', (file.size / 1024 / 1024).toFixed(1), 'MB');
                    wallpaperUpload.value = '';
                    return;
                }

                var reader = new FileReader();
                reader.onload = function (event) {
                    var dataUrl = event.target.result;
                    applyWallpaper(dataUrl);
                    // Save to storage
                    Storage.set('customWallpaper', dataUrl).catch(function (err) {
                        console.error('Failed to save wallpaper', err);
                    });
                };
                reader.readAsDataURL(file);

                // Clear input so same file can trigger change again if removed & re-added
                wallpaperUpload.value = '';
            });
        }

        if (wallpaperRemove) {
            wallpaperRemove.addEventListener('click', function () {
                removeWallpaper();
            });
        }
    } catch (err) {
        console.error('[New WEB] Wallpaper init failed:', err);
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

            themeSwatches.forEach(function (btn) {
                if (btn.dataset.themeValue === themeValue) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        Storage.get('theme').then(function (val) {
            var activeTheme = val || 'system';

            // Validate theme value — accept all known themes
            var validThemes = ['system', 'light', 'dark', 'midnight', 'ocean', 'forest', 'crimson', 'lavender', 'rose', 'sunset', 'arctic'];
            if (validThemes.indexOf(activeTheme) === -1) {
                activeTheme = activeTheme === true ? 'light' : 'dark';
            }

            applyTheme(activeTheme);
        }).catch(function () {
            applyTheme('system');
        });

        themeSwatches.forEach(function (btn) {
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

    } catch (err) {
        console.error('[New WEB] Theme toggle init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 13: Daily Usage Insight Initialization
     * ------------------------------------------------------- */
    try {
        Storage.get('usageEnabled').then(function (val) {
            var enabled = val !== false; // default true
            if (enabled && typeof UsageInsight !== 'undefined') {
                UsageInsight.init();
            }
        });
    } catch (err) {
        console.error('[New WEB] Usage Insight init failed:', err);
    }

    /* -------------------------------------------------------
     * FEATURE 14: Reset Settings
     * ------------------------------------------------------- */
    try {
        var resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (confirm('Reset all settings to defaults? This will clear your favourites, notes, wallpaper, and preferences.')) {
                    // Clear all storage
                    if (typeof Storage !== 'undefined' && Storage.clear) {
                        Storage.clear().then(function () {
                            // Also clear localStorage
                            try { localStorage.clear(); } catch (e) { }
                            window.location.reload();
                        }).catch(function () {
                            try { localStorage.clear(); } catch (e) { }
                            window.location.reload();
                        });
                    } else {
                        try { localStorage.clear(); } catch (e) { }
                        window.location.reload();
                    }
                }
            });
        }
    } catch (err) {
        console.error('[New WEB] Reset settings init failed:', err);
    }
});
