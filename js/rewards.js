/**
 * rewards.js — toast messages and the star system, shared by index.html and Game.html.
 *
 * Toasts: small messages in the corner instead of alert() pop-ups.
 * Stars:  one per mini game, earned by beating it. They show under the hero on the front page
 *         (rendered by js/secrets.js) and next to the game's name on the "Games you've found" shelf.
 *
 * Load order: before any game script and before secrets.js (both call Rewards).
 * Global defined: Rewards (see the returned object at the bottom for the public API).
 * localStorage:   'starsEarned' — JSON array of game ids, e.g. ["simon","bricks"].
 * Events:         dispatches 'stars:changed' on document (detail: { id }) when a new star is earned.
 *
 * Example:
 *   Rewards.toast('Saved!', { icon: 'fa-check' });
 *   if (Rewards.earn('worm')) Rewards.toast('First star!');   // earn() is true only the first time
 */
const Rewards = (function () {
    const STARS_KEY = 'starsEarned';

    // Every game that can award a star, and what you have to do to get it.
    // The count of entries here is the "of N stars" total. The goal itself is checked inside each
    // game (e.g. Games.simon.config.starRound), so keep the wording here in sync with it.
    const STAR_GOALS = {
        simon:  'Simon Says: completed round 7',
        worm:   'Worm: ate 15 apples',
        mines:  'Mines: cleared a board',
        bricks: 'Brick Breaker: broke every brick'
    };

    /** @returns {string[]} ids of every earned star (empty if none, or if storage is blocked or corrupt). */
    function read() {
        try { return JSON.parse(localStorage.getItem(STARS_KEY)) || []; } catch (e) { return []; }
    }
    /** @param {string[]} list  ids to save as the earned stars. */
    function write(list) {
        try { localStorage.setItem(STARS_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
    }

    let region = null;
    /**
     * Get (creating on first use) the live region that holds toasts.
     * It's role="status" + aria-live="polite", so screen readers announce each toast.
     * @returns {HTMLDivElement}
     */
    function getRegion() {
        if (!region) {
            region = document.createElement('div');
            region.className = 'toast-region';
            region.setAttribute('role', 'status');
            region.setAttribute('aria-live', 'polite');
        }
        // A modal dialog covers everything else, so show toasts inside it while it's open
        const host = document.querySelector('dialog[open]') || document.body;
        if (region.parentNode !== host) host.appendChild(region);
        return region;
    }

    /**
     * Show a dismissible message in the bottom-right corner.
     * toast('Hello', { icon: 'fa-star', link: { href, text }, duration: 6000 })
     * @param {string} message                  plain text (inserted with textContent, never as HTML).
     * @param {Object} [opts]
     * @param {string} [opts.icon]              Font Awesome solid icon class, default 'fa-circle-info'.
     * @param {{href:string,text:string}} [opts.link]  optional link shown after the message.
     * @param {number} [opts.duration]          ms before it dismisses itself, default 6000.
     * @returns {HTMLDivElement} the toast element.
     */
    function toast(message, opts) {
        opts = opts || {};
        const el = document.createElement('div');
        el.className = 'toast';
        const icon = document.createElement('i');
        icon.className = 'fas ' + (opts.icon || 'fa-circle-info');
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('p');
        text.textContent = message;
        el.append(icon, text);
        if (opts.link) {
            const a = document.createElement('a');
            a.href = opts.link.href;
            a.textContent = opts.link.text;
            el.appendChild(a);
        }
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'toast-close';
        close.setAttribute('aria-label', 'Dismiss message');
        close.innerHTML = '<i class="fas fa-xmark" aria-hidden="true"></i>';
        el.appendChild(close);

        // .leaving plays the toastOut animation (css/animations.css), then the element is removed
        function dismiss() {
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 300);
        }
        close.addEventListener('click', dismiss);
        getRegion().appendChild(el);
        setTimeout(dismiss, opts.duration || 6000);
        return el;
    }

    /**
     * Award the star for a game. Safe to call every time the player wins: it only records,
     * and only fires 'stars:changed', the first time.
     * @param {string} id  a key of STAR_GOALS ('simon' | 'worm' | 'mines' | 'bricks').
     * @returns {boolean} true the first time a star is earned, false if it was already earned.
     */
    function earn(id) {
        const list = read();
        if (list.includes(id)) return false;
        list.push(id);
        write(list);
        document.dispatchEvent(new CustomEvent('stars:changed', { detail: { id } }));
        return true;
    }

    // Public API
    return {
        toast,                                   // (message, opts?) -> HTMLElement
        earn,                                    // (id) -> boolean, true on first earn
        stars: read,                             // () -> string[] of earned ids
        has: (id) => read().includes(id),        // (id) -> boolean
        goal: (id) => STAR_GOALS[id] || id,      // (id) -> human-readable goal text
        total: Object.keys(STAR_GOALS).length    // number of stars that exist
    };
})();
