// === 3D model gallery ===
// To add a model: export it from Blender as glTF Binary (.glb) into assets/models/,
// then add an entry below. Models only download when the visitor presses "Load".
const MODELS = [
    {
        title: 'Bird',
        file: 'assets/models/bird.glb',
        size: '0.4 MB',
        description: 'A small, stylised bird sculpt.',
        alt: 'A 3D model of a small bird'
    },
    {
        title: 'Donut',
        file: 'assets/models/donut.glb',
        size: '80 KB',
        description: 'My take on the classic Blender donut, with drippy icing.',
        alt: 'A 3D model of a donut with pink icing'
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

    MODELS.forEach((model) => {
        const card = document.createElement('article');
        card.className = 'card model-card reveal is-visible';

        const stage = document.createElement('div');
        stage.className = 'model-stage';

        const poster = document.createElement('div');
        poster.className = 'model-poster';
        poster.innerHTML = '<i class="fas fa-cube" aria-hidden="true"></i>';
        const loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.className = 'btn btn-primary btn-small';
        loadBtn.textContent = `Load 3D model (${model.size})`;
        loadBtn.setAttribute('aria-label', `Load the ${model.title} 3D model, ${model.size}`);
        poster.appendChild(loadBtn);
        stage.appendChild(poster);

        const body = document.createElement('div');
        body.className = 'model-body';
        body.innerHTML = `<h3></h3><p></p><p class="model-meta">.glb · ${model.size}</p>`;
        body.querySelector('h3').textContent = model.title;
        body.querySelector('p').textContent = model.description;

        loadBtn.addEventListener('click', () => {
            if (!customElements.get('model-viewer')) {
                poster.innerHTML = '<p class="model-error">The 3D viewer couldn’t load. Check your connection and refresh the page.</p>';
                return;
            }
            const viewer = document.createElement('model-viewer');
            viewer.setAttribute('src', model.file);
            viewer.setAttribute('alt', model.alt);
            viewer.setAttribute('camera-controls', '');
            viewer.setAttribute('touch-action', 'pan-y');
            viewer.setAttribute('shadow-intensity', '1');
            viewer.setAttribute('exposure', '1.05');
            viewer.setAttribute('interaction-prompt', 'auto');
            if (!reduceMotion) viewer.setAttribute('auto-rotate', '');
            viewer.addEventListener('load', () => poster.remove());
            viewer.addEventListener('error', () => {
                poster.innerHTML = '<p class="model-error">This model couldn’t be loaded. Please try again later.</p>';
            });
            loadBtn.disabled = true;
            loadBtn.textContent = 'Loading…';
            stage.insertBefore(viewer, poster);
        });

        card.append(stage, body);
        grid.appendChild(card);
    });
})();
