// === Mines ===
// Classic minesweeper: open every safe tile. Numbers count the mines touching a tile.
// Room to grow: more difficulty presets, a timer leaderboard, chording, hex boards.
window.Games = window.Games || {};

window.Games.mines = {
    title: 'Mines',
    tagline: 'Open every safe tile. Numbers tell you how many mines are nearby.',

    config: {
        difficulties: {
            Cozy:   { size: 8,  mines: 8 },
            Normal: { size: 10, mines: 15 }
        },
        start: 'Cozy'
    },

    mount(root, api) {
        const cfg = this.config;
        let level = cfg.difficulties[cfg.start];
        let levelName = cfg.start;
        let cells, firstClick, over, opened, flagMode = false;

        const minesEl = api.el('span');
        const levelBtn = api.el('button', { type: 'button', className: 'btn btn-ghost btn-small' });
        const flagBtn = api.el('button', { type: 'button', className: 'btn btn-ghost btn-small toggle-btn', textContent: '⚑ Flag mode' });
        flagBtn.setAttribute('aria-pressed', 'false');
        const newBtn = api.el('button', { type: 'button', className: 'btn btn-primary btn-small', textContent: 'New game' });
        const grid = api.el('div', { className: 'mines-grid' });
        grid.setAttribute('role', 'grid');
        grid.setAttribute('aria-label', 'Minefield');
        const status = api.el('p', { className: 'game-status' });
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        root.append(
            api.el('div', { className: 'game-hud' }, [minesEl, levelBtn, flagBtn, newBtn]),
            grid,
            status,
            api.el('p', { className: 'game-help', textContent: 'Click to open. Right-click (or turn on Flag mode) to mark a mine. Arrow keys move, Enter opens, F flags.' })
        );

        function neighbours(i) {
            const n = level.size, x = i % n, y = Math.floor(i / n), out = [];
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < n && ny < n) out.push(ny * n + nx);
                }
            return out;
        }

        function build() {
            const n = level.size;
            levelBtn.textContent = 'Size: ' + levelName;
            grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
            grid.innerHTML = '';
            firstClick = true;
            over = false;
            opened = 0;
            cells = Array.from({ length: n * n }, (_, i) => {
                const btn = api.el('button', { type: 'button', className: 'mine-cell' });
                btn.setAttribute('aria-label', `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}, hidden`);
                btn.tabIndex = i === 0 ? 0 : -1;
                btn.addEventListener('click', () => (flagMode ? flag(i) : reveal(i)));
                btn.addEventListener('contextmenu', (e) => { e.preventDefault(); flag(i); });
                btn.addEventListener('keydown', (e) => onCellKey(e, i));
                grid.appendChild(btn);
                return { btn, mine: false, open: false, flag: false, count: 0 };
            });
            updateCounter();
            status.textContent = 'Your first click is always safe.';
        }

        function layMines(safe) {
            const banned = new Set([safe, ...neighbours(safe)]);
            let placed = 0;
            while (placed < level.mines) {
                const i = Math.floor(Math.random() * cells.length);
                if (cells[i].mine || banned.has(i)) continue;
                cells[i].mine = true;
                placed++;
            }
            cells.forEach((c, i) => { c.count = neighbours(i).filter((j) => cells[j].mine).length; });
        }

        function label(i) {
            const n = level.size;
            return `Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`;
        }

        function reveal(i) {
            const c = cells[i];
            if (over || c.open || c.flag) return;
            if (firstClick) { layMines(i); firstClick = false; }
            if (c.mine) return lose(i);

            // flood-open empty areas
            const stack = [i];
            while (stack.length) {
                const j = stack.pop();
                const cj = cells[j];
                if (cj.open || cj.flag) continue;
                cj.open = true;
                opened++;
                cj.btn.classList.add('open');
                cj.btn.textContent = cj.count || '';
                cj.btn.setAttribute('aria-label', `${label(j)}, ${cj.count ? cj.count + ' nearby' : 'empty'}`);
                if (cj.count === 0) neighbours(j).forEach((k) => { if (!cells[k].open) stack.push(k); });
            }
            api.tone(600, .05);
            if (opened === cells.length - level.mines) win();
        }

        function flag(i) {
            const c = cells[i];
            if (over || c.open) return;
            c.flag = !c.flag;
            c.btn.classList.toggle('flag', c.flag);
            c.btn.textContent = c.flag ? '⚑' : '';
            c.btn.setAttribute('aria-label', `${label(i)}, ${c.flag ? 'flagged' : 'hidden'}`);
            updateCounter();
        }

        function updateCounter() {
            const flags = cells.filter((c) => c.flag).length;
            minesEl.textContent = `Mines ${level.mines - flags}`;
        }

        function showMines() {
            cells.forEach((c) => {
                if (c.mine && !c.flag) { c.btn.textContent = '●'; c.btn.classList.add('open'); }
            });
        }

        function lose(i) {
            over = true;
            showMines();
            cells[i].btn.classList.add('boom');
            status.textContent = 'Boom! That one was a mine. Press New game to try again.';
            api.tone(120, .5);
        }

        function win() {
            over = true;
            showMines();
            const wins = api.best('mines_wins') + 1;
            api.best('mines_wins', wins);
            status.textContent = `Cleared! That's ${wins} win${wins === 1 ? '' : 's'} so far.`;
            api.tone(784, .3);
            api.star('mines');
        }

        // Roving focus so the whole board is one tab stop
        function onCellKey(e, i) {
            const n = level.size;
            const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: n, ArrowUp: -n };
            if (moves[e.key] !== undefined) {
                e.preventDefault();
                const j = i + moves[e.key];
                const sameRow = Math.abs(moves[e.key]) !== 1 || Math.floor(j / n) === Math.floor(i / n);
                if (j >= 0 && j < cells.length && sameRow) {
                    cells[i].btn.tabIndex = -1;
                    cells[j].btn.tabIndex = 0;
                    cells[j].btn.focus();
                }
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                flag(i);
            }
        }

        flagBtn.addEventListener('click', () => {
            flagMode = !flagMode;
            flagBtn.setAttribute('aria-pressed', String(flagMode));
        });
        levelBtn.addEventListener('click', () => {
            const names = Object.keys(cfg.difficulties);
            levelName = names[(names.indexOf(levelName) + 1) % names.length];
            level = cfg.difficulties[levelName];
            build();
        });
        newBtn.addEventListener('click', build);

        build();
        return null;
    }
};
