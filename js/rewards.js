// === Toasts and stars (shared by index.html and Game.html) ===
// Toasts: small messages in the corner instead of alert() pop-ups.
// Stars: one per mini game, earned by beating it. They show on the front page.
const Rewards = (function () {
    const STARS_KEY = 'starsEarned';

    // Every game that can award a star, and what you have to do to get it
    const STAR_GOALS = {
        simon:  'Simon Says: completed round 7',
        worm:   'Worm: ate 15 apples',
        mines:  'Mines: cleared a board',
        bricks: 'Brick Breaker: broke every brick'
    };

    function read() {
        try { return JSON.parse(localStorage.getItem(STARS_KEY)) || []; } catch (e) { return []; }
    }
    function write(list) {
        try { localStorage.setItem(STARS_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
    }

    let region = null;
    function getRegion() {
        if (!region) {
            region = document.createElement('div');
            region.className = 'toast-region';
            region.setAttribute('role', 'status');
            region.setAttribute('aria-live', 'polite');
        }
        // A modal dialog covers everything else, so show toasts inside it while it's open
        const host = document.querySelector('dialog[open]') || document.body;
        if (region.parentNode !== host) host.appendChild(region);
        return region;
    }

    // toast('Hello', { icon: 'fa-star', link: { href, text }, duration: 6000 })
    function toast(message, opts) {
        opts = opts || {};
        const el = document.createElement('div');
        el.className = 'toast';
        const icon = document.createElement('i');
        icon.className = 'fas ' + (opts.icon || 'fa-circle-info');
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('p');
        text.textContent = message;
        el.append(icon, text);
        if (opts.link) {
            const a = document.createElement('a');
            a.href = opts.link.href;
            a.textContent = opts.link.text;
            el.appendChild(a);
        }
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'toast-close';
        close.setAttribute('aria-label', 'Dismiss message');
        close.innerHTML = '<i class="fas fa-xmark" aria-hidden="true"></i>';
        el.appendChild(close);

        function dismiss() {
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 300);
        }
        close.addEventListener('click', dismiss);
        getRegion().appendChild(el);
        setTimeout(dismiss, opts.duration || 6000);
        return el;
    }

    // Returns true the first time a star is earned
    function earn(id) {
        const list = read();
        if (list.includes(id)) return false;
        list.push(id);
        write(list);
        document.dispatchEvent(new CustomEvent('stars:changed', { detail: { id } }));
        return true;
    }

    return {
        toast,
        earn,
        stars: read,
        has: (id) => read().includes(id),
        goal: (id) => STAR_GOALS[id] || id,
        total: Object.keys(STAR_GOALS).length
    };
})();
