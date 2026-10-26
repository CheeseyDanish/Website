/**
 * secrets.js — the hidden mini games on the front page: the puzzles that unlock them, the dialog
 * they play in, the "Games you've found" shelf in the footer, and the star row under the hero.
 *
 * Load order: LAST on index.html. It needs Rewards (rewards.js) and every game in js/games/
 *             to be registered on window.Games first.
 * Globals defined: SECRETS, Secrets.
 * localStorage:
 *   'secretsFound'  JSON array of unlocked game ids, so the shelf remembers what you found.
 *   'starsSeen'     JSON array of star ids already shown, so only new stars play the pop animation.
 *   'best_<id>'     a game's best score, written by api.best() (e.g. best_simon, best_worm, best_mines_wins).
 * Listens for: 'stars:changed' (from rewards.js) and 'pageshow' (Back/Forward cache restores).
 * Depends on:  #game-dialog, #game-root, #game-title, #game-tagline, #game-close, #arcade-shelf,
 *              #arcade-list, #star-row, #star-count, #hero-name and #skills-list in index.html.
 */

// === Secret games ===
// Puzzles that unlock the mini games in js/games/.
//
// 1. Click the letters of "Andrew Simon" in the hero to spell a word
//    (or just type the word anywhere on the page — the keyboard way in).
// 2. Click every skill chip in "Technical Toolkit" to break them all.
//
// Each game file registers itself on window.Games as:
//   Games.<id> = { title, tagline, mount(root, api) -> cleanup() }
// To add a game: write js/games/<id>.js, add a <script> tag in index.html,
// and add an entry to SECRETS below. Words must use letters from A N D R E W S I M O N.

/**
 * @typedef {Object} Secret
 * @property {string} id         Game id: the key in window.Games and in Rewards' STAR_GOALS.
 * @property {string} [word]     Word that unlocks it via the name puzzle (upper case, letters from the name).
 * @property {string} [page]     Open this page instead of the dialog (used by Brick Breaker → Game.html).
 * @property {string} [title]    Overrides the game's own title (needed when there's no window.Games entry).
 * @property {string} [tagline]  Overrides the game's own tagline.
 */

/** Every secret, in shelf order. @type {Secret[]} */
const SECRETS = [
    { id: 'simon', word: 'SIMON' },
    { id: 'worm',  word: 'WORM' },
    { id: 'mines', word: 'MINES' },
    { id: 'bricks', page: 'Game.html', title: 'Brick Breaker', tagline: 'Break the bricks.' }
];

/**
 * Secrets — owns the game dialog, the shelf and the star row.
 * Public API: { unlock(secret), open(secret), list }.
 */
const Secrets = (function () {
    const STORAGE_KEY = 'secretsFound';
    const dialog = document.getElementById('game-dialog');
    const root = document.getElementById('game-root');
    const titleEl = document.getElementById('game-title');
    const taglineEl = document.getElementById('game-tagline');
    const shelf = document.getElementById('arcade-shelf');
    const shelfList = document.getElementById('arcade-list');
    // Function returned by the open game's mount(); called when the dialog closes
    let cleanup = null;

    /** @returns {string[]} ids of the secrets this visitor has unlocked. */
    function loadFound() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
    }
    /** @param {string[]} list */
    function saveFound(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
    }
    let found = loadFound();

    /**
     * Display title and tagline for a secret: the SECRETS entry wins, then the game's own values, then the id.
     * @param {Secret} secret
     * @returns {{title:string, tagline:string}}
     */
    function infoFor(secret) {
        const game = window.Games && window.Games[secret.id];
        return {
            title: secret.title || (game && game.title) || secret.id,
            tagline: secret.tagline || (game && game.tagline) || ''
        };
    }

    /**
     * Small shared toolkit handed to every game's mount(root, api) so the games stay short.
     * This is the whole contract a game can rely on (besides the DOM node it's given).
     */
    const api = {
        /**
         * Create an element in one call.
         * @param {string} tag
         * @param {Object} [props]        properties assigned directly (className, textContent, type…).
         * @param {Array<Node|string>} [children]
         * @returns {HTMLElement}
         * @example api.el('button', { className: 'btn', textContent: 'Go' })
         */
        el(tag, props, children) {
            const node = document.createElement(tag);
            Object.assign(node, props || {});
            (children || []).forEach((c) => node.append(c));
            return node;
        },
        /**
         * Read, and optionally raise, a stored best score (localStorage 'best_<id>').
         * @param {string} id
         * @param {number} [score]  if given and higher than the stored best, it becomes the new best.
         * @returns {number} the best score after the update (0 if none yet).
         */
        best(id, score) {
            const key = 'best_' + id;
            let best = 0;
            try { best = Number(localStorage.getItem(key)) || 0; } catch (e) { /* ignore */ }
            if (score !== undefined && score > best) {
                best = score;
                try { localStorage.setItem(key, String(best)); } catch (e) { /* ignore */ }
            }
            return best;
        },
        /**
         * Play a short triangle-wave beep. One AudioContext is shared and created on first use
         * (browsers only allow audio after a click or key press, which is always the case here).
         * @param {number} freq          Hz.
         * @param {number} [duration]    seconds, default 0.25.
         */
        tone: (function () {
            let ctx = null;
            return function (freq, duration) {
                try {
                    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(.12, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + (duration || .25));
                    osc.connect(gain).connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + (duration || .25));
                } catch (e) { /* audio not available */ }
            };
        })(),
        /**
         * Read a theme colour token so canvas games match light/dark mode.
         * @param {string} name  e.g. '--surface'.
         * @returns {string}
         */
        css(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); },
        // Call when the player beats a game; the first time earns its star (see js/rewards.js)
        star(id) {
            if (Rewards.earn(id)) {
                Rewards.toast(`Star earned! ${Rewards.goal(id)}. It's on the front page now.`, { icon: 'fa-star' });
            }
        }
    };

    /**
     * Rebuild the "Games you've found" shelf in the footer: one button per unlocked secret
     * (with a star icon if earned), plus the "N of M stars earned" line. Hidden until something is found.
     */
    function renderShelf() {
        shelfList.innerHTML = '';
        SECRETS.filter((s) => found.includes(s.id)).forEach((s) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-small';
            btn.textContent = infoFor(s).title;
            if (Rewards.has(s.id)) {
                btn.insertAdjacentHTML('beforeend', '<i class="fas fa-star shelf-star" aria-hidden="true"></i><span class="visually-hidden"> (star earned)</span>');
            }
            btn.addEventListener('click', () => open(s));
            shelfList.appendChild(btn);
        });
        shelf.hidden = shelfList.children.length === 0;
        starCount.textContent = `${Rewards.stars().length} of ${Rewards.total} stars earned`;
    }

    // One star per beaten game, shown under the hero buttons
    const starRow = document.getElementById('star-row');
    const starCount = document.getElementById('star-count');
    const SEEN_KEY = 'starsSeen';
    /**
     * Rebuild the star row under the hero buttons. Stars not in 'starsSeen' get the .new class
     * (the pop-in animation); afterwards every current star is marked as seen.
     */
    function renderStars() {
        const earned = SECRETS.map((s) => s.id).filter((id) => Rewards.has(id));
        let seen = [];
        try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch (e) { /* ignore */ }
        starRow.innerHTML = '';
        earned.forEach((id) => {
            const li = document.createElement('li');
            li.title = Rewards.goal(id);
            li.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i>';
            li.append(Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: Rewards.goal(id) }));
            if (!seen.includes(id)) li.classList.add('new');
            starRow.appendChild(li);
        });
        starRow.hidden = earned.length === 0;
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(earned)); } catch (e) { /* ignore */ }
    }

    /** Redraw everything that depends on found secrets or stars. */
    function refresh() { renderShelf(); renderStars(); }
    document.addEventListener('stars:changed', refresh);
    // Returning with the Back button shows a saved copy of the page: bring it up to date
    window.addEventListener('pageshow', (e) => { if (e.persisted) { found = loadFound(); refresh(); } });

    /**
     * Called when a puzzle is solved: remember the secret as found (adding it to the shelf), then open it.
     * @param {Secret} secret
     */
    function unlock(secret) {
        if (!found.includes(secret.id)) {
            found.push(secret.id);
            saveFound(found);
            renderShelf();
        }
        open(secret);
    }

    /**
     * Open a game. Secrets with a `page` navigate there; the rest are mounted into the modal dialog.
     * Any game already open is cleaned up first.
     * @param {Secret} secret
     */
    function open(secret) {
        if (secret.page) { window.location.href = secret.page; return; }
        const game = window.Games && window.Games[secret.id];
        if (!game) return;
        close();
        const info = infoFor(secret);
        titleEl.textContent = info.title;
        taglineEl.textContent = info.tagline;
        root.innerHTML = '';
        if (!dialog.open) dialog.showModal();
        cleanup = game.mount(root, api) || null;
    }

    /** Tear down the open game (timers, key listeners via its cleanup function) and empty the dialog. */
    function close() {
        if (cleanup) { cleanup(); cleanup = null; }
        root.innerHTML = '';
    }

    document.getElementById('game-close').addEventListener('click', () => dialog.close());
    // The dialog closes via the X button, the Esc key (built into <dialog>), or a click on the backdrop.
    // All three fire 'close', so cleanup always runs.
    dialog.addEventListener('close', close);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

    refresh();
    return { unlock, open, list: SECRETS };
})();

// --- Puzzle 1: spell a word with the letters of my name ---
// Splits the hero heading into one clickable <span> per letter. Clicked (or typed) letters build up a
// buffer. If the buffer stops being the start of any SECRETS word, it restarts from the latest letter.
// A full match unlocks that game. The buffer clears after 4 s of inactivity.
(function namePuzzle() {
    const heading = document.getElementById('hero-name');
    if (!heading) return;
    const words = SECRETS.filter((s) => s.word);
    const name = heading.textContent.trim();
    let buffer = '';
    let picked = [];
    let resetTimer = null;

    // Screen readers keep reading the plain name; the clickable letters are decorative
    heading.textContent = '';
    heading.append(Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: name }));
    const letters = document.createElement('span');
    letters.setAttribute('aria-hidden', 'true');
    [...name].forEach((ch) => {
        const span = document.createElement('span');
        if (ch === ' ') { span.className = 'name-space'; span.textContent = ' '; }
        else { span.className = 'name-letter'; span.textContent = ch; span.dataset.letter = ch.toUpperCase(); }
        letters.appendChild(span);
    });
    heading.appendChild(letters);

    /** Un-highlight the picked letters and empty the buffer. */
    function clearPicked() {
        picked.forEach((el) => el.classList.remove('picked'));
        picked = [];
        buffer = '';
    }

    /**
     * Add one letter to the buffer and check for a word.
     * @param {string} letter          upper-case A–Z.
     * @param {HTMLElement|null} el    the letter <span> to highlight, or null when typed with no free
     *                                 matching letter on screen.
     */
    function press(letter, el) {
        clearTimeout(resetTimer);
        let next = buffer + letter;
        // Not the start of any word? Start over from this letter.
        if (!words.some((w) => w.word.startsWith(next))) {
            clearPicked();
            next = words.some((w) => w.word.startsWith(letter)) ? letter : '';
        }
        buffer = next;
        if (el && buffer) { el.classList.add('picked'); picked.push(el); }

        const match = words.find((w) => w.word === buffer);
        if (match) {
            const solved = picked.slice();
            clearPicked();
            solved.forEach((s) => { s.classList.add('solved'); setTimeout(() => s.classList.remove('solved'), 900); });
            setTimeout(() => Secrets.unlock(match), solved.length ? 500 : 0);
            return;
        }
        resetTimer = setTimeout(clearPicked, 4000);
    }

    letters.addEventListener('click', (e) => {
        const el = e.target.closest('.name-letter');
        if (el) press(el.dataset.letter, el);
    });

    // Keyboard route: type the word anywhere (ignored while typing in a field or playing)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
        if (document.getElementById('game-dialog').open) return;
        if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
        const letter = e.key.toUpperCase();
        if (!/[A-Z]/.test(letter)) return;
        const match = [...letters.querySelectorAll('.name-letter')]
            .find((l) => l.dataset.letter === letter && !l.classList.contains('picked'));
        press(letter, match || null);
    });
})();

// --- Puzzle 2: break every skill "brick" to find Brick Breaker ---
// Each click on a skill chip in "Technical Toolkit" knocks it loose (.broken). When all are broken,
// they're put back and the 'bricks' secret is unlocked, which navigates to Game.html.
(function brickPuzzle() {
    const chips = document.querySelectorAll('#skills-list .skill-chip');
    const secret = SECRETS.find((s) => s.id === 'bricks');
    if (!chips.length || !secret) return;
    let broken = 0;
    /** Restore every chip and reset the count. */
    function mend() {
        chips.forEach((c) => c.classList.remove('broken'));
        broken = 0;
    }
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            if (chip.classList.contains('broken')) return;
            chip.classList.add('broken');
            broken++;
            if (broken === chips.length) {
                setTimeout(() => { mend(); Secrets.unlock(secret); }, 600);
            }
        });
    });
    // Coming back from Brick Breaker with the Back button: start the puzzle over
    window.addEventListener('pageshow', (e) => { if (e.persisted) mend(); });
})();
