/**
 * search.js — Search Engine Routing
 * 
 * PRIVACY: Queries are only sent to the user-selected search engine.
 * All query parameters are sanitized with encodeURIComponent.
 */

'use strict';

const Search = (() => {

    const ENGINES = {
        google: 'https://www.google.com/search?q=',
        duckduckgo: 'https://duckduckgo.com/?q=',
        brave: 'https://search.brave.com/search?q='
    };

    const AI_URL = 'https://duckduckgo.com/?q=%s&ia=chat';

    /**
     * Perform a search by redirecting.
     */
    function performSearch(query, mode, engine) {
        var trimmed = (query || '').trim();
        if (!trimmed) return;

        var encoded = encodeURIComponent(trimmed);
        var url = '';

        if (mode === 'ai') {
            url = AI_URL.replace('%s', encoded);
        } else {
            var base = ENGINES[engine] || ENGINES['duckduckgo'];
            url = base + encoded;
        }

        window.location.href = url;
    }

    return { performSearch: performSearch };
})();
