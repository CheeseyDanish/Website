// Small wrapper so the site still works when storage is blocked (private mode, strict browsers)
const Store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// === Theme toggle (dark by default, remembers your choice) ===
const themeToggle = document.getElementById('theme-toggle');

function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', isDark);
    icon.classList.toggle('fa-moon', !isDark);
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#1D1814' : '#FAF4EA';
}

applyTheme(Store.get('darkMode') !== 'false');

themeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark-mode');
    applyTheme(isDark);
    Store.set('darkMode', isDark);
});

// === Footer year ===
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// === Sections fade in as you scroll ===
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => observer.observe(el));
} else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
}

// === Hero background: slow, warm embers drifting up (like a fireplace) ===
(function embers() {
    const canvas = document.getElementById('hero-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COUNT = 46;
    let width = 0, height = 0, particles = [];

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(anywhere) {
        return {
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : height + 10,
            r: 1 + Math.random() * 2.4,
            speed: 8 + Math.random() * 22,      // px per second
            sway: 10 + Math.random() * 25,
            phase: Math.random() * Math.PI * 2,
            alpha: .25 + Math.random() * .5
        };
    }

    function draw(t) {
        ctx.clearRect(0, 0, width, height);
        const rgb = getComputedStyle(document.body).getPropertyValue('--ember').trim() || '242, 170, 100';
        for (const p of particles) {
            const x = p.x + Math.sin(t / 1600 + p.phase) * p.sway;
            const fade = Math.min(1, p.y / (height * .35));
            ctx.beginPath();
            ctx.fillStyle = `rgba(${rgb}, ${p.alpha * fade})`;
            ctx.shadowColor = `rgba(${rgb}, .8)`;
            ctx.shadowBlur = 8;
            ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        for (let i = 0; i < particles.length; i++) {
            particles[i].y -= particles[i].speed * dt;
            if (particles[i].y < -10) particles[i] = spawn(false);
        }
        draw(now);
        requestAnimationFrame(frame);
    }

    resize();
    particles = Array.from({ length: COUNT }, () => spawn(true));
    window.addEventListener('resize', resize);
    if (prefersReducedMotion) draw(0); // a still glow, no movement
    else requestAnimationFrame(frame);
})();
