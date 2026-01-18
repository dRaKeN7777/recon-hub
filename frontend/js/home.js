document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const nav = document.querySelector('nav');
    const heroActions = document.querySelector('.hero-actions');

    if (token) {
        // Authenticated Navbar
        nav.innerHTML = `
            <a href="home">Home</a>
            <a href="dashboard">Dashboard</a>
            <a href="#" id="logoutBtn">Logout</a>
        `;
        
        // Logout Handler
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login';
        });

        // Update Hero CTA if present
        if (heroActions) {
            heroActions.innerHTML = `
                <a href="dashboard" class="btn">Go to Dashboard</a>
            `;
        }

    } else {
        // Unauthenticated Navbar
        nav.innerHTML = `
            <a href="home">Home</a>
            <a href="login">Login</a>
            <a href="register">Register</a>
        `;
    }
});
