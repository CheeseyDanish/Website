// === Simon Says ===
// Watch the pattern, then repeat it. Each round adds one step.
// Room to grow: more pads, a "strict" mode, faster tempo tiers, themed sound sets.
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
        speedUpPerRound: 25
    },

    mount(root, api) {
        const cfg = this.config;
        let sequence = [];
        let input = 0;
        let accepting = false;
        let timers = [];

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

        function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

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

        function stepMs() {
            return Math.max(cfg.minStepMs, cfg.startStepMs - sequence.length * cfg.speedUpPerRound);
        }

        function playSequence() {
            accepting = false;
            input = 0;
            status.textContent = 'Watch…';
            const ms = stepMs();
            sequence.forEach((p, n) => later(() => flash(p, ms), 500 + n * ms * 1.25));
            later(() => { accepting = true; status.textContent = 'Your turn.'; }, 500 + sequence.length * ms * 1.25);
        }

        function nextRound() {
            sequence.push(Math.floor(Math.random() * cfg.pads.length));
            roundEl.textContent = 'Round ' + sequence.length;
            playSequence();
        }

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
                later(nextRound, 700);
            }
        }

        startBtn.addEventListener('click', () => {
            timers.forEach(clearTimeout);
            timers = [];
            sequence = [];
            nextRound();
        });

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
