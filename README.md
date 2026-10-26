# My Website
My website to host information about me.

## Maintaining the site
No build step: open `index.html`, or serve the folder (e.g. `python -m http.server`) so the 3D models can load.

When you change a CSS or JS file, bump the `?v=` number on its link in `index.html` / `Game.html` so visitors don't get a stale cached copy.

- **Colours** live as tokens at the top of `css/style.css` (light and dark). Every text colour is checked to WCAG AAA (7:1); check any new one before using it.
- **3D models**: export from Blender as glTF Binary (`.glb`, Draco compression on) into `assets/models/`, then add an entry to `MODELS` in `js/models.js`. The viewer is Google's `<model-viewer>`, which works in Firefox, Chrome, Edge and Safari.
- **Tidewall** (`Tidewall.html` + `tidewall/`): a copy of the game's `web/` folder from the separate TideFall repo, without `serve.js`. To update it, copy `index.html`, `style.css` and `js/` from `TideFall/web/` over `tidewall/`. The game is embedded in an iframe and keeps its own save under `localStorage` keys starting with `tidewall.`.
- **Secret games**: each game is one file in `js/games/` that registers `Games.<id> = { title, tagline, config, mount(root, api) }`. The puzzles that unlock them, and the list of secret words, are in `js/secrets.js`.
