/**
 * theme-init.js — Early Theme Detection
 * 
 * Runs synchronously before CSS to prevent flash of wrong theme.
 * Loaded as an external script (no inline JS) for CSP compliance.
 */

'use strict';

(function () {
    try {
        var savedTheme = localStorage.getItem('newweb_theme');
        if (!savedTheme) return;

        // Strip JSON quotes if present (storage may wrap in quotes)
        var theme = savedTheme.replace(/"/g, '');

        // All valid theme values
        var validThemes = ['light', 'dark', 'midnight', 'ocean', 'forest', 'crimson', 'lavender', 'rose', 'sunset', 'arctic'];

        if (validThemes.indexOf(theme) !== -1) {
            document.documentElement.setAttribute('data-theme', theme);
        } else if (theme === 'system' || !theme) {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.setAttribute('data-theme', 'light');
            }
            // else: default dark (:root) applies automatically
        }
    } catch (e) { }
})();
