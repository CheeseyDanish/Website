// === Worm ===
// Guide the worm to the apples. Don't bump into yourself or the walls.
// Room to grow: obstacles, levels, power-ups (slow-mo, ghost), wrap-around mode.
window.Games = window.Games || {};

window.Games.worm = {
    title: 'Worm',
    tagline: 'Eat apples, grow longer, don’t bite yourself.',

    config: {
        grid: 18,            // cells per side
        startLength: 4,
        startTickMs: 160,    // time between moves
        minTickMs: 70,
        speedUpPerApple: 4,
        wrapWalls: false     // true = leave one side, appear on the other
    },

    mount(root, api) {
        const cfg = this.config;
        const canvas = api.el('canvas', { className: 'worm-canvas', width: 432, height: 432 });
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Worm game board');
        const ctx = canvas.getContext('2d');
        const cell = canvas.width / cfg.grid;

        const scoreEl = api.el('span', { textContent: 'Apples 0' });
        const bestEl = api.el('span', { textContent: 'Best ' + api.best('worm') });
        const startBtn = api.el('button', { type: 'button', className: 'btn btn-primary btn-small', textContent: 'Start' });
        const status = api.el('p', { className: 'game-status', textContent: 'Press Start or Space to begin.' });
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        const dpad = api.el('div', { className: 'dpad' });
        const arrows = { up: '↑', left: '←', down: '↓', right: '→' };
        Object.keys(arrows).forEach((dir) => {
            const b = api.el('button', { type: 'button', className: 'btn btn-ghost btn-small', textContent: arrows[dir] });
            b.dataset.dir = dir;
            b.setAttribute('aria-label', 'Move ' + dir);
            b.addEventListener('click', () => turn(dir));
            dpad.appendChild(b);
        });

        root.append(
            api.el('div', { className: 'game-hud' }, [scoreEl, bestEl, startBtn]),
            canvas,
            dpad,
            status,
            api.el('p', { className: 'game-help', textContent: 'Arrow keys or WASD to steer, Space to pause. Swipe on touch screens.' })
        );

        const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        let worm, dir, nextDir, apple, score, tickMs, running, paused, acc, last, raf;

        function reset() {
            const mid = Math.floor(cfg.grid / 2);
            worm = Array.from({ length: cfg.startLength }, (_, i) => ({ x: mid - i, y: mid }));
            dir = nextDir = 'right';
            score = 0;
            tickMs = cfg.startTickMs;
            acc = 0;
            placeApple();
            scoreEl.textContent = 'Apples 0';
        }

        function placeApple() {
            do {
                apple = { x: Math.floor(Math.random() * cfg.grid), y: Math.floor(Math.random() * cfg.grid) };
            } while (worm.some((s) => s.x === apple.x && s.y === apple.y));
        }

        function turn(d) {
            if (!running) start();
            const [dx, dy] = DIRS[d];
            const [cx, cy] = DIRS[dir];
            if (dx === -cx && dy === -cy) return; // no reversing into yourself
            nextDir = d;
        }

        function step() {
            dir = nextDir;
            const [dx, dy] = DIRS[dir];
            let head = { x: worm[0].x + dx, y: worm[0].y + dy };
            if (cfg.wrapWalls) {
                head.x = (head.x + cfg.grid) % cfg.grid;
                head.y = (head.y + cfg.grid) % cfg.grid;
            }
            const hitWall = head.x < 0 || head.y < 0 || head.x >= cfg.grid || head.y >= cfg.grid;
            const hitSelf = worm.some((s) => s.x === head.x && s.y === head.y);
            if (hitWall || hitSelf) return gameOver(hitWall ? 'You bumped the wall.' : 'You bit your tail.');

            worm.unshift(head);
            if (head.x === apple.x && head.y === apple.y) {
                score++;
                scoreEl.textContent = 'Apples ' + score;
                tickMs = Math.max(cfg.minTickMs, tickMs - cfg.speedUpPerApple);
                api.tone(520 + score * 8, .08);
                placeApple();
            } else {
                worm.pop();
            }
        }

        function draw() {
            ctx.fillStyle = api.css('--surface-2');
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // soft checkerboard
            ctx.fillStyle = api.css('--surface');
            for (let y = 0; y < cfg.grid; y++)
                for (let x = (y % 2); x < cfg.grid; x += 2) ctx.fillRect(x * cell, y * cell, cell, cell);

            // apple
            ctx.fillStyle = '#C2412D';
            ctx.beginPath();
            ctx.arc((apple.x + .5) * cell, (apple.y + .55) * cell, cell * .38, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4E7A3A';
            ctx.fillRect((apple.x + .5) * cell - 1, apple.y * cell + 2, 3, cell * .25);

            // worm
            worm.forEach((s, i) => {
                ctx.fillStyle = i === 0 ? '#6E9F58' : (i % 2 ? '#8DB873' : '#A3C98A');
                const pad = i === 0 ? 1 : 2.5;
                ctx.beginPath();
                ctx.roundRect(s.x * cell + pad, s.y * cell + pad, cell - pad * 2, cell - pad * 2, cell * .4);
                ctx.fill();
            });
            const h = worm[0];
            ctx.fillStyle = '#2B2019';
            const [dx, dy] = DIRS[dir];
            [-1, 1].forEach((side) => {
                const ex = (h.x + .5 + dx * .15 + dy * side * .2) * cell;
                const ey = (h.y + .5 + dy * .15 - dx * side * .2) * cell;
                ctx.beginPath(); ctx.arc(ex, ey, cell * .09, 0, Math.PI * 2); ctx.fill();
            });
        }

        function loop(now) {
            if (!running) return;
            if (!paused) {
                acc += now - last;
                while (acc >= tickMs && running) { acc -= tickMs; step(); }
            }
            last = now;
            draw();
            raf = requestAnimationFrame(loop);
        }

        function start() {
            reset();
            running = true;
            paused = false;
            startBtn.textContent = 'Restart';
            status.textContent = 'Go!';
            last = performance.now();
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(loop);
        }

        function gameOver(reason) {
            running = false;
            bestEl.textContent = 'Best ' + api.best('worm', score);
            status.textContent = `${reason} You ate ${score} apple${score === 1 ? '' : 's'}. Press Start to play again.`;
            api.tone(150, .4);
            draw();
        }

        function togglePause() {
            if (!running) return start();
            paused = !paused;
            status.textContent = paused ? 'Paused. Press Space to continue.' : 'Go!';
        }

        const KEYS = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
                       ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
        function onKey(e) {
            if (KEYS[e.key]) { e.preventDefault(); turn(KEYS[e.key]); }
            else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); togglePause(); }
        }
        document.addEventListener('keydown', onKey);

        let touch = null;
        canvas.addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (!touch) return;
            const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
            touch = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return togglePause();
            turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        });

        startBtn.addEventListener('click', start);
        reset();
        draw();

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKey);
        };
    }
};
