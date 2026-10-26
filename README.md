# Andrew Simon — Portfolio Website

My personal site: education, experience, skills, a gallery of 3D models I've made in Blender, and a few games you can play in the browser. Some of the games are hidden on the front page for visitors to find.

It's plain HTML, CSS and JavaScript, with no framework, build step or package manager.

## What's on the site

| Page | What it is |
|---|---|
| `index.html` | The portfolio: hero, Education, Experience, Technical Toolkit, **Projects**, **3D Work** (interactive model viewer), Contact |
| `Tidewall.html` | **Tidewall**, a wall-defense game I built, embedded from `tidewall/` |
| `Game.html` | **Brick Breaker**, unlocked by a hidden puzzle on the front page |
| *(dialog on index)* | Three more hidden mini games: **Simon Says**, **Worm** and **Mines** |

**Features**
- Light and dark themes ("Daylight" and "Hearth"). The choice is remembered and shared across pages.
- Every text colour meets **WCAG AAA** contrast (7:1) in both themes.
- The site respects the visitor's **reduced-motion** setting. Everything works from the keyboard and with screen readers.
- **3D models** you can orbit and zoom (Google's `<model-viewer>`). Large files only download when you click Load.
- **Hidden games and stars:** solve a puzzle on the front page to unlock a game, and beat a game to earn a star that shows under the hero.
- Works with storage blocked (private browsing): nothing breaks, it just doesn't remember things.

## Quick start

No install needed.

1. Clone the repo:
   ```bash
   git clone https://github.com/CheeseyDanish/Website.git
   ```
2. Serve the folder over HTTP. The 3D models and the embedded Tidewall game don't load from `file://`. Either of these works:
   ```bash
   python -m http.server 8000
   ```
   ```bash
   npx http-server -p 8000
   ```
3. Open http://localhost:8000.

Opening `index.html` by double-clicking still shows most of the site; only the models and Tidewall need a server.

## Project structure

```
Website/
├── index.html          Front page (portfolio + hidden-game dialog)
├── Game.html           Brick Breaker page
├── Tidewall.html       Tidewall page (embeds tidewall/ in an iframe)
├── css/
│   ├── style.css       All styles + the light/dark colour tokens
│   └── animations.css  Keyframes and reveal-on-scroll classes
├── js/
│   ├── script.js       Theme toggle, footer year, reveal-on-scroll, hero embers
│   ├── models.js       3D gallery: MODELS list + card builder
│   ├── rewards.js      Toast messages + the star system (shared)
│   ├── secrets.js      Unlock puzzles, game dialog, shelf, star row (loads last)
│   ├── game.js         Brick Breaker (Game.html only)
│   └── games/          Hidden mini games, one file each
│       ├── simon.js
│       ├── worm.js
│       └── mines.js
├── tidewall/           Tidewall 2D: source, design docs (docs/) and rules (CLAUDE.md)
└── assets/
    ├── models/*.glb    3D models (glTF binary, Draco-compressed)
    ├── resume.pdf
    └── GoogleCertificate.pdf
```

Every script starts with a header comment that says what it does, which page loads it, what it depends on, and which `localStorage` keys it uses. Functions are documented with JSDoc. For how the pieces fit together (load order, the mini-game API, storage keys, events), see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Common tasks

### Edit content
Text for Education, Experience, Skills and Contact is plain HTML in `index.html`. Each section is a `<section id="…">` with a comment above it.

### Change a CSS or JS file → bump its version
Browsers cache aggressively, so every stylesheet and script is linked with `?v=N`. After editing a file, increase its number everywhere it's linked:

```html
<link rel="stylesheet" href="css/style.css?v=5">   <!-- was v=4 -->
```

`style.css` and `animations.css` are linked from all three pages. `rewards.js` is linked from `index.html` and `Game.html`.

### Add a colour
Colours are custom properties at the top of `css/style.css`, defined once for light (`:root`) and once for dark (`body.dark-mode`). Use the tokens (`var(--accent)` and so on) instead of raw colours. If you add a text colour, check it reaches **7:1** against every background it appears on: [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/).

### Add a 3D model
1. In Blender: **File → Export → glTF 2.0**, format **glTF Binary (.glb)**, with **Draco compression** on.
2. Save it to `assets/models/`.
3. Add an entry to `MODELS` in `js/models.js`:
   ```js
   {
       title: 'Lamp',
       file: 'assets/models/lamp.glb',
       size: '40 KB',
       autoload: true,          // only for small files (< ~100 KB); big ones get a "Load" button
       description: 'A low-poly desk lamp.',
       alt: 'A low-poly 3D desk lamp'
   },
   ```
4. If you re-export an existing model, bump `MODEL_VERSION` in `js/models.js`.

### Add a hidden mini game
1. Create `js/games/<id>.js` that registers the game:
   ```js
   window.Games = window.Games || {};
   window.Games.dice = {
       title: 'Dice',
       tagline: 'Roll a six.',
       config: {},
       mount(root, api) {
           const btn = api.el('button', { type: 'button', className: 'btn btn-primary btn-small', textContent: 'Roll' });
           const out = api.el('p', { className: 'game-status' });
           btn.addEventListener('click', () => {
               const n = 1 + Math.floor(Math.random() * 6);
               out.textContent = 'You rolled ' + n;
               if (n === 6) api.star('dice');
           });
           root.append(btn, out);
           return null;              // or a cleanup function that clears timers and listeners
       }
   };
   ```
2. Add `<script src="js/games/<id>.js?v=1"></script>` to `index.html`, **before** `secrets.js`.
3. Add an unlock to `SECRETS` in `js/secrets.js`, e.g. `{ id: 'dice', word: 'DIME' }`. The word can only use letters that appear in **A N D R E W S I M O N** (a letter can be clicked more than once). No secret word may be the start of another (like WORM and WORMS), or the shorter one always triggers first.
4. If it awards a star, add a goal line to `STAR_GOALS` in `js/rewards.js`. The "of N stars" total updates automatically.

The full `api` reference is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-mini-game-contract).

### Working on Tidewall 2D
`tidewall/` is the home of the 2D game: its source (`index.html`, `style.css`, `js/`), its design documents (`tidewall/docs/`) and its rules (`tidewall/CLAUDE.md`). Edit it in place; there's nothing to copy. Run `node tidewall/serve.js` to test it on its own, and add `?dev` to the URL to load the balance bot. The game keeps its save under `localStorage` keys starting with `tidewall.`, so it never collides with the site's keys. The 3D version is a separate Unity project (the **TideWall** repo).

## Deployment

It's a static site, so any static host works: GitHub Pages, Netlify, Cloudflare Pages, or a plain web server. For GitHub Pages, go to **Settings → Pages → Deploy from a branch → `main` / root**. Pushing to that branch publishes the changes.

## Third-party resources

All of these load from CDNs at runtime; nothing is vendored into the repo.

| Resource | Used for | Source |
|---|---|---|
| [`<model-viewer>`](https://modelviewer.dev/) 3.5.0 | 3D model gallery | jsDelivr |
| [Font Awesome](https://fontawesome.com/) 6.4.0 | Icons | cdnjs |
| [Fraunces](https://fonts.google.com/specimen/Fraunces), [Inter](https://fonts.google.com/specimen/Inter), [Space Mono](https://fonts.google.com/specimen/Space+Mono) | Display, body and code fonts | Google Fonts |

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. The site uses `<dialog>`, CSS `color-mix()` and `aspect-ratio`; older browsers still show the content with simpler styling.

© Andrew Simon. All rights reserved.
