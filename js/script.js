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

// Check for saved theme preference
const savedTheme = localStorage.getItem('dark-mode');
if (savedTheme === 'false') {
    document.body.classList.remove('dark-mode');
    themeToggle.querySelector('i').classList.remove('fa-sun');
    themeToggle.querySelector('i').classList.add('fa-moon');
}

