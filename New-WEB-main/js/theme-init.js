/**
 * theme-init.js — Early Theme Detection & Flash Prevention
 * 
 * Runs synchronously before CSS to prevent flash of wrong theme
 * and flash of unstyled/default content.
 * Loaded as an external script (no inline JS) for CSP compliance.
 */

'use strict';

(function () {
    var doc = document.documentElement;

    // Mark the page as loading immediately to hide body until JS is ready.
    // This prevents the flash of default content when opening a new tab.
    doc.classList.add('not-ready');

    // Background colors for each theme — must match CSS :root --bg values
    var themeBgMap = {
        dark: '#000000',
        light: '#f5f5f7',
        midnight: '#0a0a16',
        ocean: '#05131a',
        forest: '#09140a',
        crimson: '#1a0505',
        lavender: '#120a1a',
        rose: '#1a0a10',
        sunset: '#1a0e05',
        arctic: '#0a1218'
    };

    try {
        var savedTheme = localStorage.getItem('newweb_theme');
        if (!savedTheme) return;

        // Strip JSON quotes if present (storage may wrap in quotes)
        var theme = savedTheme.replace(/"/g, '');

        // All valid theme values
        var validThemes = ['light', 'dark', 'midnight', 'ocean', 'forest', 'crimson', 'lavender', 'rose', 'sunset', 'arctic'];

        if (validThemes.indexOf(theme) !== -1) {
            doc.setAttribute('data-theme', theme);
            doc.style.background = themeBgMap[theme] || '#000000';
        } else if (theme === 'system' || !theme) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                doc.setAttribute('data-theme', 'light');
                doc.style.background = themeBgMap.light;
            }
            // else: default dark (:root) applies automatically
        }
    } catch (e) { }
})();

