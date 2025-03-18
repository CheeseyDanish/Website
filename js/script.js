// Dark Mode Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.querySelector('i').classList.toggle('fa-sun');
});

// Scroll Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) {
            entry.target.classList.add('animate');
            if(entry.target.classList.contains('skill-progress')) {
                const width = entry.target.dataset.width;
                entry.target.style.width = width;
            }
        }
    });
});

document.querySelectorAll('.skill-progress').forEach((el) => {
    observer.observe(el);
});
// Initialize game
updateStats();
log("Welcome to Monster Tamer! Start training and battling!");
