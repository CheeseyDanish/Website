/**
 * script.js — core behaviour for the front page (index.html).
 *
 * Responsibilities:
 *   1. Light/dark theme toggle, remembered across visits.
 *   2. Footer copyright year.
 *   3. "Reveal on scroll" for elements with the .reveal class.
 *   4. The drifting-embers animation behind the hero section.
 *
 * Load order: first script on index.html (before models.js, rewards.js, the games and secrets.js).
 * Globals defined: Store, prefersReducedMotion, themeToggle, applyTheme, yearEl, revealEls.
 * localStorage:   'darkMode' — "true" | "false". Also read by the inline script on Game.html and
 *                 Tidewall.html so every page opens in the same theme.
 * Depends on:     #theme-toggle, #year, #hero-bg and .reveal elements in index.html;
 *                 the --ember colour token in css/style.css.
 */

/**
 * Small wrapper so the site still works when storage is blocked (private mode, strict browsers).
 * Every read or write is wrapped in try/catch; a blocked read returns null, a blocked write is ignored.
 */
const Store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
};

// The visitor's OS-level "reduce motion" setting. Animations below are skipped or frozen when it's on.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// === Theme toggle (dark by default, remembers your choice) ===
const themeToggle = document.getElementById('theme-toggle');

/**
 * Switch the whole page between the dark ("Hearth") and light ("Daylight") themes.
 * The colour tokens themselves live in css/style.css under :root and body.dark-mode.
 * Also updates the toggle's icon and accessible label, and the browser UI colour (<meta name="theme-color">).
 * @param {boolean} isDark  true for the dark theme, false for light.
 */
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-sun', isDark);
    icon.classList.toggle('fa-moon', !isDark);
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#1D1814' : '#FAF4EA';
}

// Dark unless the visitor previously chose light ('darkMode' === 'false').
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
// Elements with .reveal start transparent (css/animations.css) and get .is-visible the first time
// 12% of them is on screen. With reduced motion, or in browsers without IntersectionObserver,
// everything is shown immediately.
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
// Draws COUNT glowing dots on the #hero-bg canvas. Each rises at its own speed, sways sideways
// on a sine wave, fades out near the top, and respawns at the bottom. The colour comes from the
// --ember CSS token, so it follows the current theme.
(function embers() {
    const canvas = document.getElementById('hero-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const COUNT = 46;
    let width = 0, height = 0, particles = [];

    /** Match the canvas bitmap to its on-screen size (capped at 2× pixel density to stay cheap). */
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Create one ember.
     * @param {boolean} anywhere  true to place it at a random height (initial fill),
     *                            false to start it just below the bottom edge (respawn).
     * @returns {{x:number, y:number, r:number, speed:number, sway:number, phase:number, alpha:number}}
     */
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

    /**
     * Paint every ember.
     * @param {number} t  timestamp in ms, which drives the sideways sway.
     */
    function draw(t) {
        ctx.clearRect(0, 0, width, height);
        const rgb = getComputedStyle(document.body).getPropertyValue('--ember').trim() || '242, 170, 100';
        for (const p of particles) {
            const x = p.x + Math.sin(t / 1600 + p.phase) * p.sway;
            // Fade out over the top 35% of the canvas
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
    /**
     * Animation loop: move embers up by speed × elapsed time, respawn any that leave the top, redraw.
     * dt is capped at 50 ms so a backgrounded tab doesn't make them jump when it comes back.
     * @param {number} now  requestAnimationFrame timestamp in ms.
     */
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
