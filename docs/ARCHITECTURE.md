# Architecture

How the site's pieces fit together. For setup and everyday tasks, see the [README](../README.md).

## Design goals
- **No build step.** Plain files served as-is, so anyone can clone and open them.
- **Accessible by default.** WCAG AAA text contrast, keyboard support everywhere, screen-reader labels, reduced-motion support.
- **Degrades gracefully.** Blocked storage, a missing CDN or an old browser never breaks the page; at worst a feature quietly switches off.
- **Small, readable modules.** Each script does one job and talks to the others through a few documented globals.

## Pages and scripts

```
index.html ──▶ script.js ─▶ models.js ─▶ rewards.js ─▶ games/simon.js ─▶ games/worm.js ─▶ games/mines.js ─▶ secrets.js
Game.html  ──▶ rewards.js ─▶ game.js
Tidewall.html ──▶ (inline script only) + <iframe src="tidewall/index.html">
```

Scripts are classic `<script>` tags at the end of `<body>`, so the DOM exists when they run. **Order matters:** a script can only use globals from scripts loaded before it.

| Script | Defines (globals) | Uses | Runs on |
|---|---|---|---|
| `script.js` | `Store`, `prefersReducedMotion`, `applyTheme` | DOM only | index |
| `models.js` | `MODEL_VERSION`, `MODELS` | `<model-viewer>` custom element (CDN, loaded as a module in `<head>`) | index |
| `rewards.js` | `Rewards` | — | index, Game |
| `games/*.js` | `window.Games.<id>` | nothing at load time; `api` when mounted | index |
| `secrets.js` | `SECRETS`, `Secrets` | `Rewards`, `window.Games` | index (**must be last**) |
| `game.js` | Brick Breaker state and functions (page-level globals) | `Rewards` (optional) | Game |

`Game.html` and `Tidewall.html` also have a tiny inline script in `<body>` that reads `localStorage.darkMode` before first paint, so they open in the same theme as the front page without a flash.

## Theming

All colours are CSS custom properties defined twice in `css/style.css`:

```css
:root            { --bg: #FAF4EA; --text: #2B2019; --accent: #7A2E12; … }   /* light, "Daylight" */
body.dark-mode   { --bg: #1D1814; --text: #F6EDE1; --accent: #F2B77E; … }   /* dark,  "Hearth"   */
```

`applyTheme()` in `script.js` toggles `body.dark-mode` and saves the choice. Components only ever use the tokens, so they don't need dark-mode variants. Canvas code reads tokens at draw time (`themeColor()` in `game.js`, `api.css()` in the mini games, `--ember` in the hero), so it follows a theme switch too.

## The hidden-game system

### Flow
```
 Visitor clicks/types letters ─┐                       ┌─▶ secret.page?  ──▶ navigate (Brick Breaker → Game.html)
 of "Andrew Simon"             ├─▶ Secrets.unlock() ───┤
 Visitor breaks every          │   (save to            └─▶ otherwise ─────▶ Secrets.open(): show <dialog>,
 skill chip ───────────────────┘    'secretsFound')                          call Games[id].mount(root, api)

 Game beaten ─▶ api.star(id) ─▶ Rewards.earn(id) ─▶ 'stars:changed' event ─▶ Secrets refreshes shelf + star row
                                                └─▶ Rewards.toast("Star earned!")
```

- **`SECRETS`** (`secrets.js`) is the registry: `{ id, word?, page?, title?, tagline? }`.
- **Puzzle 1 (name):** the hero `<h1>` is split into clickable letter spans. Picked letters build a buffer, which restarts whenever it stops matching the start of any word. An exact match unlocks that secret. Typing the word anywhere on the page does the same, so it's keyboard accessible. The visible letters are `aria-hidden`, and a visually hidden copy of the plain name stays for screen readers.
- **Puzzle 2 (bricks):** clicking every `.skill-chip` adds `.broken` to each. Once all are broken they're mended and the `bricks` secret opens `Game.html`.
- **The shelf** ("Games you've found", in the footer) lists unlocked secrets, so returning visitors can replay them without solving the puzzle again.

### The mini-game contract

Each file in `js/games/` registers one object:

```js
window.Games.<id> = {
    title:   'Shown as the dialog heading',
    tagline: 'Shown under the heading',
    config:  { /* tunables, e.g. starRound, grid size */ },
    mount(root, api) {
        // Render into `root` (an empty <div> inside the dialog).
        // Return a cleanup function, or null if there's nothing to clean up.
        return () => { /* clear timers, remove document listeners */ };
    }
};
```

**Lifecycle:** `mount` is called each time the game is opened. When the dialog closes (X button, Esc, or a backdrop click), the cleanup function runs and `root` is emptied. Anything attached to `document` or `window`, and any timers, **must** be removed in cleanup, or they will keep running after the dialog closes.

**`api` reference** (built in `secrets.js`):

| Member | Signature | Purpose |
|---|---|---|
| `el` | `(tag, props?, children?) → HTMLElement` | Create an element; `props` are assigned directly (`className`, `textContent`, `type`…) |
| `best` | `(id, score?) → number` | Read the best score from `localStorage['best_<id>']`; if `score` is higher, save it first |
| `tone` | `(freq, seconds = 0.25) → void` | Short triangle-wave beep (one shared `AudioContext`) |
| `css` | `(name) → string` | Current value of a theme token, e.g. `api.css('--surface')` |
| `star` | `(id) → void` | Award the game's star; shows a toast the first time only |

Conventions the existing games follow:
- Status text goes in a `<p class="game-status" role="status" aria-live="polite">` so screen readers announce it.
- Controls row: `<div class="game-hud">`; help line: `<p class="game-help">`.
- Every action has a keyboard path (Simon: keys 1–4; Worm: arrows/WASD and Space; Mines: roving focus with arrows, Enter, F).

## Stars

`rewards.js` owns stars. `STAR_GOALS` maps each id to its goal text; the **number of entries** is the "of N" total. The goal itself is checked inside each game (`starRound`, `starApples`, clearing a board, clearing all bricks), so keep the text and the game's config in step.

`Rewards.earn(id)` is idempotent: call it on every win. It returns `true` and fires `stars:changed` only the first time.

## Storage

All access is wrapped in `try/catch`; with storage blocked, the site works but forgets everything.

| Key | Written by | Value |
|---|---|---|
| `darkMode` | `script.js` | `"true"` / `"false"` |
| `starsEarned` | `rewards.js` | JSON array of game ids |
| `starsSeen` | `secrets.js` | JSON array: stars already animated in |
| `secretsFound` | `secrets.js` | JSON array: unlocked secret ids (the shelf) |
| `best_simon`, `best_worm` | games via `api.best` | best round / most apples |
| `best_mines_wins` | `mines.js` via `api.best` | total boards cleared |
| `tidewall.run`, `tidewall.best` | `tidewall/` | the Tidewall game's own save |

## Events

| Event | Target | Fired by | Listened by |
|---|---|---|---|
| `stars:changed` (`detail: { id }`) | `document` | `Rewards.earn` | `Secrets` (re-renders shelf and star row) |
| `pageshow` with `persisted` | `window` | the browser, when restoring a page from the Back/Forward cache | `Secrets` (reloads found list), brick puzzle (mends chips), `game.js` (returns to idle) |

## Brick Breaker (`game.js`)

A self-contained page script. State machine: `idle → running ⇄ paused → won | lost → running`. `setState()` keeps the buttons in sync with the state. Physics run on frame-time `dt` in pixels per second (capped at 33 ms). Brick collision finds the point on the brick nearest the ball's centre and bounces off the face with the larger offset. Where the ball hits the paddle sets its outgoing angle, up to ±60°.

## Tidewall

`Tidewall.html` embeds `tidewall/index.html` in a 16:9 `<iframe>`. The frame's width is capped so the whole game fits under the page header. The game is a separate project, copied from the TideFall repo, and documented there (`README.md`, `CLAUDE.md`, `docs/`). Keyboard input goes to the iframe once the visitor clicks into it; if focus leaves it mid-night, the game pauses itself.

## Caching

Assets are linked with `?v=N` query strings, and 3D models get `?v=MODEL_VERSION`. Bump the number whenever the file changes, or returning visitors may keep an old cached copy.
