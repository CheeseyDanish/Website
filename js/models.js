// === 3D model gallery ===
// To add a model: export it from Blender as glTF Binary (.glb, Draco compression on)
// into assets/models/, then add an entry below.
// Small files (autoload: true) load as they scroll into view; bigger ones wait for a "Load" click.
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
        size: '80 KB',
        autoload: true,
        description: 'My take on the classic Blender donut, with drippy icing.',
        alt: 'A 3D model of a donut with pink icing'
    },
    {
        title: 'Bird',
        file: 'assets/models/bird.glb',
        size: '0.4 MB',
        description: 'A small, stylised bird sculpt.',
        alt: 'A 3D model of a small bird'
    },
    {
        title: 'Glizzy Monster',
        file: 'assets/models/glizzymonster.glb',
        size: '2.1 MB',
        description: 'A goofy character sculpt.',
        alt: 'A 3D model of a cartoon monster character'
    }
];

(function buildGallery() {
    const grid = document.getElementById('models-grid');
    if (!grid) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function showViewer(model, stage, poster) {
        const viewer = document.createElement('model-viewer');
        viewer.setAttribute('src', model.file);
        viewer.setAttribute('alt', model.alt);
        viewer.setAttribute('loading', 'lazy');
        viewer.setAttribute('camera-controls', '');
        viewer.setAttribute('camera-orbit', '35deg 70deg auto');
        viewer.setAttribute('touch-action', 'pan-y');
        viewer.setAttribute('shadow-intensity', '1');
        viewer.setAttribute('exposure', '1.05');
        viewer.setAttribute('interaction-prompt', 'auto');
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
