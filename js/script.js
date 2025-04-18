// Set dark mode by default
document.body.classList.add('dark-mode');
// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
    
    // Save preference to localStorage
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
});

let engineInstance;

tsParticles.load("hero-bg", {
  fullScreen: { enable: false },
  particles: {
    number: { value: 60 },
    color: { value: "#ffffff" },
    shape: { type: "circle" },
    opacity: { value: 0.3 },
    size: { value: 3 },
    move: { enable: true, speed: 1.5 },
    links: {
      enable: true,
      distance: 130,
      color: "#ffffff",
      opacity: 0.3,
      width: 1
    }
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: "repulse" }
    },
    modes: {
      repulse: { distance: 100 },
      manual: {}
    }
  },
  background: { color: "#0f2027" }
}).then((engine) => {
  engineInstance = engine;

});



// Check for saved theme preference
const savedTheme = localStorage.getItem('dark-mode');
if (savedTheme === 'false') {
    document.body.classList.remove('dark-mode');
    themeToggle.querySelector('i').classList.remove('fa-sun');
    themeToggle.querySelector('i').classList.add('fa-moon');
}