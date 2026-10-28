/**
 * models.js — the "3D Work" gallery on the front page (index.html, #models-grid).
 *
 * Builds one card per entry in MODELS. Each card holds a Google <model-viewer> element
 * (loaded from jsDelivr in index.html's <head>), so visitors can orbit and zoom the model
 * with no plugins.
 *
 * Load order: after script.js. Globals defined: MODEL_VERSION, MODELS.
 * Depends on: #models-grid in index.html; the .model-* styles in css/style.css.
 */

// === 3D model gallery ===
// To add a model: export it from Blender as glTF Binary (.glb, Draco compression on)
// into assets/models/, then add an entry below.
// Small files (autoload: true) load as they scroll into view; bigger ones wait for a "Load" click.
// After re-exporting a model, bump MODEL_VERSION so browsers don't show a cached copy.

/** Appended to every model URL as ?v=N to bust browser caches after a re-export. */
const MODEL_VERSION = 3;

/**
 * @typedef {Object} ModelEntry
 * @property {string}  title        Card heading.
 * @property {string}  file         Path to the .glb, relative to the site root.
 * @property {string}  size         Human-readable file size, shown on the card and the Load button.
 * @property {boolean} [autoload]   true = load as soon as it scrolls into view (use for files under ~100 KB).
 *                                  Omit for big files, which wait for a "Load 3D model" click to save data.
 * @property {string}  description  One-line caption under the heading.
 * @property {string}  alt          Text alternative read by screen readers.
 */

/** Every model in the gallery, in display order. @type {ModelEntry[]} */
const MODELS = [
    {
        title: 'Burger',
        file: 'assets/models/burger.glb',
        size: '15 KB',
        autoload: true,
        description: 'Low-poly cheeseburger with lettuce and tomato.',
        alt: 'A low-poly 3D cheeseburger'
    },
    {
        title: 'Fries',
        file: 'assets/models/fries.glb',
        size: '30 KB',
        autoload: true,
        description: 'A box of fries to go with it.',
        alt: 'A low-poly 3D box of french fries'
    },
    {
        title: 'Cup',
        file: 'assets/models/cup.glb',
        size: '14 KB',
        autoload: true,
        description: 'Fast-food drink cup with a lid and straw.',
        alt: 'A low-poly 3D red drink cup with a straw'
    },
    {
        title: 'Soda Can',
        file: 'assets/models/coke.glb',
        size: '35 KB',
        autoload: true,
        description: 'A red soda can with a modelled pull tab.',
        alt: 'A 3D red soda can with a silver lid and pull tab'
    },
    {
        title: 'Hot Dog',
        file: 'assets/models/hotdog.glb',
        size: '12 KB',
        autoload: true,
        description: 'A textured low-poly hot dog.',
        alt: 'A low-poly 3D hot dog in a bun'
    },
    {
        title: 'Gas Can',
        file: 'assets/models/gascan.glb',
        size: '30 KB',
        autoload: true,
        description: 'Jerry can prop with a spout.',
        alt: 'A low-poly 3D red gas can'
    },
    {
        title: 'Tire',
        file: 'assets/models/tire.glb',
        size: '16 KB',
        autoload: true,
        description: 'Car tire with a five-lug rim.',
        alt: 'A low-poly 3D car tire and rim'
    },
    {
        title: 'Donut',
        file: 'assets/models/donut.glb',
        size: '75 KB',
        autoload: true,
        description: 'My take on the classic Blender donut, with drippy icing and sprinkles.',
        alt: 'A 3D model of a golden donut with pink icing and rainbow sprinkles'
    },
    {
        title: 'Spiny Lizard',
        file: 'assets/models/lizard.glb',
        size: '0.8 MB',
        description: 'A stylised spiny lizard sculpt with mottled, vertex-painted scales.',
        alt: 'A 3D model of a green spiny lizard with orange-tipped spikes'
    }
];

/**
 * Build the gallery: one card per MODELS entry, appended to #models-grid.
 * Card structure: article.card.model-card > div.model-stage (viewer + poster) + div.model-body (text).
 * Cards get .reveal.is-visible straight away, because they're created after script.js has
 * already set up the scroll observer.
 */
(function buildGallery() {
    const grid = document.getElementById('models-grid');
    if (!grid) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * Create the <model-viewer> for a model and put it in the card's stage.
     * The poster (placeholder icon/button) stays on top until the model loads, then is removed;
     * if loading fails, the poster shows an error message instead.
     * @param {ModelEntry}  model
     * @param {HTMLElement} stage   the .model-stage container.
     * @param {HTMLElement} poster  the .model-poster placeholder inside the stage.
     */
    function showViewer(model, stage, poster) {
        const viewer = document.createElement('model-viewer');
        viewer.setAttribute('src', `${model.file}?v=${MODEL_VERSION}`);
        viewer.setAttribute('alt', model.alt);
        viewer.setAttribute('loading', 'lazy');
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('camera-orbit', '35deg 70deg auto');
        viewer.setAttribute('touch-action', 'pan-y');
        viewer.setAttribute('shadow-intensity', '1');
        viewer.setAttribute('exposure', '1.05');
        viewer.setAttribute('interaction-prompt', 'auto');
        // Slow auto-spin, unless the visitor asked for reduced motion
        if (!reduceMotion) viewer.setAttribute('auto-rotate', '');
        viewer.addEventListener('load', () => poster.remove());
        viewer.addEventListener('error', () => {
            poster.innerHTML = '<p class="model-error">This model couldn’t be loaded. Please try again later.</p>';
        });
        stage.insertBefore(viewer, poster);
    }

    MODELS.forEach((model) => {
        const card = document.createElement('article');
        card.className = 'card model-card reveal is-visible';

        const stage = document.createElement('div');
        stage.className = 'model-stage';

        const poster = document.createElement('div');
        poster.className = 'model-poster';
        poster.innerHTML = '<i class="fas fa-cube" aria-hidden="true"></i>';
        stage.appendChild(poster);

        const body = document.createElement('div');
        body.className = 'model-body';
        // Title and description go in via textContent so they can never inject HTML
        body.innerHTML = `<h3></h3><p></p><p class="model-meta">.glb · ${model.size}</p>`;
        body.querySelector('h3').textContent = model.title;
        body.querySelector('p').textContent = model.description;

        if (model.autoload) {
            poster.append(Object.assign(document.createElement('p'), { textContent: 'Loading 3D model…' }));
            showViewer(model, stage, poster);
        } else {
            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.className = 'btn btn-primary btn-small';
            loadBtn.textContent = `Load 3D model (${model.size})`;
            loadBtn.setAttribute('aria-label', `Load the ${model.title} 3D model, ${model.size}`);
            poster.appendChild(loadBtn);
            loadBtn.addEventListener('click', () => {
                // The viewer library comes from a CDN; if it never registered, say so instead of failing silently
                if (!customElements.get('model-viewer')) {
                    poster.innerHTML = '<p class="model-error">The 3D viewer couldn’t load. Check your connection and refresh the page.</p>';
                    return;
                }
                loadBtn.disabled = true;
                loadBtn.textContent = 'Loading…';
                showViewer(model, stage, poster);
            });
        }

        card.append(stage, body);
        grid.appendChild(card);
    });
})();
