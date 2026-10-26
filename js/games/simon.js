// === Simon Says ===
// Watch the pattern, then repeat it. Each round adds one step.
// Room to grow: more pads, a "strict" mode, faster tempo tiers, themed sound sets.
//
// Unlock: spell SIMON with the hero letters (js/secrets.js). Star: complete round config.starRound.
// Registers window.Games.simon following the mini-game contract described in js/secrets.js
// and docs/ARCHITECTURE.md: { title, tagline, config, mount(root, api) -> cleanup }.
// Best score is stored as localStorage 'best_simon' (the highest round completed).
window.Games = window.Games || {};

window.Games.simon = {
    title: 'Simon Says',
    tagline: 'Watch the pattern, then repeat it.',

    config: {
        // Pad colours all keep #2B2019 label text above 7:1 (WCAG AAA)
        pads: [
            { name: 'Sage',  key: '1', color: '#A9C79B', lit: '#D6EDC9', freq: 329.6 },
            { name: 'Rose',  key: '2', color: '#E0A9A0', lit: '#F7D3CC', freq: 392.0 },
            { name: 'Honey', key: '3', color: '#E6C27A', lit: '#F8E3B0', freq: 440.0 },
            { name: 'Sky',   key: '4', color: '#9FBFD9', lit: '#D2E6F5', freq: 523.3 }
        ],
        startStepMs: 620,   // how long each step shows in round 1
        minStepMs: 260,
        speedUpPerRound: 25,
        starRound: 7        // complete this round to earn the star (keep js/rewards.js text in sync)
    },

    /**
     * Build the game inside the dialog.
     * @param {HTMLElement} root  empty container to render into.
     * @param {Object} api        shared helpers from js/secrets.js (el, best, tone, css, star).
     * @returns {Function} cleanup: cancels pending timers and removes the key listener.
     */
    mount(root, api) {
        const cfg = this.config;
        let sequence = [];      // pad indexes to repeat, one more each round
        let input = 0;          // how many steps of the sequence the player has repeated this round
        let accepting = false;  // true only while it's the player's turn
        let timers = [];        // every pending setTimeout, so cleanup/restart can cancel them

        const roundEl = api.el('span', { textContent: 'Round 0' });
        const bestEl = api.el('span', { textContent: 'Best ' + api.best('simon') });
        const startBtn = api.el('button', { type: 'button', className: 'btn btn-primary btn-small', textContent: 'Start' });
        const status = api.el('p', { className: 'game-status', textContent: 'Press Start when you’re ready.' });
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        const board = api.el('div', { className: 'simon-board' });
        const padEls = cfg.pads.map((pad, i) => {
            const btn = api.el('button', { type: 'button', className: 'simon-pad' });
            btn.style.backgroundColor = pad.color;
            btn.innerHTML = `${pad.name}<kbd>${pad.key}</kbd>`;
            btn.setAttribute('aria-label', `${pad.name} (key ${pad.key})`);
            btn.addEventListener('click', () => choose(i));
            board.appendChild(btn);
            return btn;
        });

        root.append(
            api.el('div', { className: 'game-hud' }, [roundEl, bestEl, startBtn]),
            board,
            status,
            api.el('p', { className: 'game-help', textContent: 'Click the pads or press 1–4.' })
        );

        /** setTimeout that's tracked in `timers`. */
        function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

        /**
         * Light up pad i and play its note.
         * @param {number} i   pad index.
         * @param {number} ms  how long the step lasts; the light stays on for 80% of it.
         */
        function flash(i, ms) {
            const pad = cfg.pads[i];
            padEls[i].classList.add('lit');
            padEls[i].style.backgroundColor = pad.lit;
            api.tone(pad.freq, ms / 1000);
            later(() => {
                padEls[i].classList.remove('lit');
                padEls[i].style.backgroundColor = pad.color;
            }, ms * .8);
        }

        /** @returns {number} ms per step this round: speeds up each round, never below minStepMs. */
        function stepMs() {
            return Math.max(cfg.minStepMs, cfg.startStepMs - sequence.length * cfg.speedUpPerRound);
        }

        /** Play back the whole sequence (steps 1.25 × stepMs apart), then hand over to the player. */
        function playSequence() {
            accepting = false;
            input = 0;
            status.textContent = 'Watch…';
            const ms = stepMs();
            sequence.forEach((p, n) => later(() => flash(p, ms), 500 + n * ms * 1.25));
            later(() => { accepting = true; status.textContent = 'Your turn.'; }, 500 + sequence.length * ms * 1.25);
        }

        /** Add one random pad to the sequence and play it. */
        function nextRound() {
            sequence.push(Math.floor(Math.random() * cfg.pads.length));
            roundEl.textContent = 'Round ' + sequence.length;
            playSequence();
        }

        /**
         * The player pressed pad i (by click or the 1–4 keys). A wrong pad ends the game; finishing
         * the sequence saves the best round, awards the star at starRound, and starts the next round.
         * @param {number} i
         */
        function choose(i) {
            if (!accepting) return;
            flash(i, 220);
            if (i !== sequence[input]) {
                accepting = false;
                const score = sequence.length - 1;
                bestEl.textContent = 'Best ' + api.best('simon', score);
                status.textContent = `Oops! You reached round ${sequence.length}. Press Start to try again.`;
                api.tone(140, .5);
                startBtn.textContent = 'Play again';
                return;
            }
            input++;
            if (input === sequence.length) {
                accepting = false;
                status.textContent = 'Nice!';
                bestEl.textContent = 'Best ' + api.best('simon', sequence.length);
                if (sequence.length >= cfg.starRound) api.star('simon');
                later(nextRound, 700);
            }
        }

        startBtn.addEventListener('click', () => {
            timers.forEach(clearTimeout);
            timers = [];
            sequence = [];
            nextRound();
        });

        /** Keys 1–4 press the matching pad. @param {KeyboardEvent} e */
        function onKey(e) {
            const i = cfg.pads.findIndex((p) => p.key === e.key);
            if (i >= 0) { e.preventDefault(); choose(i); }
        }
        document.addEventListener('keydown', onKey);

        return () => {
            timers.forEach(clearTimeout);
            document.removeEventListener('keydown', onKey);
        };
    }
};
