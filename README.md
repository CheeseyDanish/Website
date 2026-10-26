# My Website
My website to host information about me.

## Maintaining the site
No build step: open `index.html`, or serve the folder (e.g. `python -m http.server`) so the 3D models can load.

- **Colours** live as tokens at the top of `css/style.css` (light and dark). Every text colour is checked to WCAG AAA (7:1); check any new one before using it.
- **3D models**: export from Blender as glTF Binary (`.glb`, Draco compression on) into `assets/models/`, then add an entry to `MODELS` in `js/models.js`. The viewer is Google's `<model-viewer>`, which works in Firefox, Chrome, Edge and Safari.
- **Secret games**: each game is one file in `js/games/` that registers `Games.<id> = { title, tagline, config, mount(root, api) }`. The puzzles that unlock them, and the list of secret words, are in `js/secrets.js`.
