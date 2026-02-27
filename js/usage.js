'use strict';

/**
 * usage.js — Daily Usage Insight Module
 * Tracks daily new tab opens, first open time, and active session time.
 * Uses secure DOM manipulation (no innerHTML) and chrome.storage.local.
 */

var UsageInsight = (function () {
    var usageContainer;
    var opensValueEl;
    var firstOpenValueEl;
    var sessionValueEl;
    var sessionInterval;
    var sessionSeconds = 0;

    /**
     * Formatting Utilities
     */
    function formatTime(date) {
        var h = date.getHours();
        var m = date.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // the hour '0' should be '12'
        m = m < 10 ? '0' + m : m;
        return h + ':' + m + ' ' + ampm;
    }

    function formatSession(totalSeconds) {
        var m = Math.floor(totalSeconds / 60);
        var s = totalSeconds % 60;
        return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    /**
     * Animate Number Counting
     */
    function animateValue(obj, start, end, duration) {
        var startTimestamp = null;
        var step = function (timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            var progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out quad
            var easeProgress = progress * (2 - progress);
            var currentVal = Math.floor(easeProgress * (end - start) + start);
            obj.textContent = currentVal;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    }

    /**
     * UI Builders (Secure DOM manipulation)
     */
    function buildStatBlock(label, valueId) {
        var block = document.createElement('div');
        block.className = 'usage-stat';

        var lbl = document.createElement('span');
        lbl.className = 'usage-label';
        lbl.textContent = label;

        var val = document.createElement('span');
        val.className = 'usage-value';
        val.id = valueId;
        val.textContent = '--'; // Default placeholder

        block.appendChild(lbl);
        block.appendChild(val);
        return { block: block, val: val };
    }

    function buildDivider() {
        var divider = document.createElement('div');
        divider.className = 'usage-divider';
        return divider;
    }

    function initializeUI() {
        usageContainer = document.getElementById('usage-insight');
        if (!usageContainer) return false;

        // Clear if anything exists
        while (usageContainer.firstChild) {
            usageContainer.removeChild(usageContainer.firstChild);
        }

        var opensObj = buildStatBlock('Opens', 'usage-opens');
        var firstOpenObj = buildStatBlock('First Open', 'usage-first-open');
        var sessionObj = buildStatBlock('Session', 'usage-session');

        opensValueEl = opensObj.val;
        firstOpenValueEl = firstOpenObj.val;
        sessionValueEl = sessionObj.val;

        usageContainer.appendChild(opensObj.block);
        usageContainer.appendChild(buildDivider());
        usageContainer.appendChild(firstOpenObj.block);
        usageContainer.appendChild(buildDivider());
        usageContainer.appendChild(sessionObj.block);

        return true;
    }

    /**
     * Data Logic
     */
    function updateAndDisplayData() {
        var now = new Date();
        var dateString = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

        Storage.getMultiple(['usage_date', 'usage_opens', 'usage_first_open']).then(function (data) {
            var opens = 1;
            var firstOpenTimeInt = now.getTime();

            if (data.usage_date === dateString) {
                // Same day, increment opens — validate stored value is a positive number
                var storedOpens = data.usage_opens;
                opens = (typeof storedOpens === 'number' && isFinite(storedOpens) && storedOpens > 0)
                    ? storedOpens + 1 : 1;
                // Validate first open time is a valid timestamp
                var storedFirst = data.usage_first_open;
                firstOpenTimeInt = (typeof storedFirst === 'number' && isFinite(storedFirst) && storedFirst > 0)
                    ? storedFirst : now.getTime();
            } else {
                // New day, reset
                opens = 1;
                firstOpenTimeInt = now.getTime();
            }

            // Save back to storage
            Storage.set('usage_date', dateString);
            Storage.set('usage_opens', opens);
            Storage.set('usage_first_open', firstOpenTimeInt);

            // Update UI
            if (opensValueEl) {
                animateValue(opensValueEl, 0, opens, 800);
            }
            if (firstOpenValueEl) {
                firstOpenValueEl.textContent = formatTime(new Date(firstOpenTimeInt));
            }

        }).catch(function (err) {
            console.error('[UsageInsight] Error reading storage:', err);
            // Fallback UI
            if (opensValueEl) opensValueEl.textContent = '1';
            if (firstOpenValueEl) firstOpenValueEl.textContent = formatTime(now);
        });

        // Start session timer (clear any existing interval first)
        if (sessionInterval) {
            clearInterval(sessionInterval);
            sessionInterval = null;
        }
        sessionSeconds = 0;
        if (sessionValueEl) {
            sessionValueEl.textContent = '00:00';
            sessionInterval = setInterval(function () {
                sessionSeconds++;
                sessionValueEl.textContent = formatSession(sessionSeconds);
            }, 1000);
        }
    }

    /**
     * Public API
     */
    return {
        init: function () {
            if (!initializeUI()) {
                console.warn('[UsageInsight] Container not found, skipping init.');
                return;
            }
            updateAndDisplayData();
        }
    };
})();
