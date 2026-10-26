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
const SECRETS = [
    { id: 'simon', word: 'SIMON' },
    { id: 'worm',  word: 'WORM' },
    { id: 'mines', word: 'MINES' },
    { id: 'bricks', page: 'Game.html', title: 'Brick Breaker', tagline: 'Break the bricks.' }
];

const Secrets = (function () {
    const STORAGE_KEY = 'secretsFound';
    const dialog = document.getElementById('game-dialog');
    const root = document.getElementById('game-root');
    const titleEl = document.getElementById('game-title');
    const taglineEl = document.getElementById('game-tagline');
    const shelf = document.getElementById('arcade-shelf');
    const shelfList = document.getElementById('arcade-list');
    let cleanup = null;

    function loadFound() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
    }
    function saveFound(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
    }
    let found = loadFound();

    function infoFor(secret) {
        const game = window.Games && window.Games[secret.id];
        return {
            title: secret.title || (game && game.title) || secret.id,
            tagline: secret.tagline || (game && game.tagline) || ''
        };
    }

    // Small shared toolkit handed to every game so they stay short
    const api = {
        el(tag, props, children) {
            const node = document.createElement(tag);
            Object.assign(node, props || {});
            (children || []).forEach((c) => node.append(c));
            return node;
        },
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
        css(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
    };

    function renderShelf() {
        shelfList.innerHTML = '';
        SECRETS.filter((s) => found.includes(s.id)).forEach((s) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost btn-small';
            btn.textContent = infoFor(s).title;
            btn.addEventListener('click', () => open(s));
            shelfList.appendChild(btn);
        });
        shelf.hidden = shelfList.children.length === 0;
    }

    function unlock(secret) {
        if (!found.includes(secret.id)) {
            found.push(secret.id);
            saveFound(found);
            renderShelf();
        }
        open(secret);
    }

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

    function close() {
        if (cleanup) { cleanup(); cleanup = null; }
        root.innerHTML = '';
    }

    document.getElementById('game-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', close);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

    renderShelf();
    return { unlock, open, list: SECRETS };
})();

// --- Puzzle 1: spell a word with the letters of my name ---
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

    function clearPicked() {
        picked.forEach((el) => el.classList.remove('picked'));
        picked = [];
        buffer = '';
    }

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
(function brickPuzzle() {
    const chips = document.querySelectorAll('#skills-list .skill-chip');
    const secret = SECRETS.find((s) => s.id === 'bricks');
    if (!chips.length || !secret) return;
    let broken = 0;
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            if (chip.classList.contains('broken')) return;
            if (!chip.classList.contains('cracked')) { chip.classList.add('cracked'); return; }
            chip.classList.add('broken');
            broken++;
            if (broken === chips.length) {
                setTimeout(() => {
                    chips.forEach((c) => c.classList.remove('cracked', 'broken'));
                    broken = 0;
                    Secrets.unlock(secret);
                }, 600);
            }
        });
    });
})();
