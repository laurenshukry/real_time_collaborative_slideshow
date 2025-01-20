document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded successfully!');
    
    
    const navLinks = document.querySelectorAll('.main-nav ul li a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            console.log(`Navigating to ${this.getAttribute('href')}`);
        });
    });
});
