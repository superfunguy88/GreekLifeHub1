// auth.js
class UserAuth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupLoginEvents();
        this.setupLogoutEvents();
    }

    checkExistingSession() {
        const userData = localStorage.getItem('greekLifeUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForLoggedInUser();
        } else {
            this.showLoginModal();
        }
    }

    setupLoginEvents() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e.target);
            });
        }

        // Close modal
        const closeBtn = document.querySelector('#login-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('login-modal').style.display = 'none';
            });
        }

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('login-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    setupLogoutEvents() {
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async handleLogin(form) {
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        
        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }

        try {
            const user = await this.authenticateUser(username, password);
            if (user) {
                this.loginSuccess(user);
                document.getElementById('login-modal').style.display = 'none';
            } else {
                this.showNotification('Invalid credentials', 'error');
            }
        } catch (error) {
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    authenticateUser(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUsers = {
                    'john_doe': {
                        id: 1,
                        username: 'john_doe',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'Member',
                        chapter: 'Alpha Phi',
                        graduationYear: 2024,
                        avatar: 'JD'
                    },
                    'sarah_alumni': {
                        id: 2,
                        username: 'sarah_alumni',
                        name: 'Sarah Johnson',
                        email: 'sarah@example.com',
                        role: 'Alumni',
                        chapter: 'Alpha Phi',
                        graduationYear: 2018,
                        avatar: 'SJ'
                    },
                    'president': {
                        id: 3,
                        username: 'president',
                        name: 'Mike President',
                        email: 'president@example.com',
                        role: 'President',
                        chapter: 'Alpha Phi',
                        graduationYear: 2024,
                        avatar: 'MP'
                    }
                };

                const user = mockUsers[username];
                if (user && password === 'password123') {
                    resolve(user);
                } else {
                    resolve(null);
                }
            }, 500);
        });
    }

    loginSuccess(user) {
        this.currentUser = user;
        localStorage.setItem('greekLifeUser', JSON.stringify(user));
        this.updateUIForLoggedInUser();
        this.showNotification(`Welcome back, ${user.name}!`, 'success');
        
        if (window.greekLifeApp) {
            window.greekLifeApp.currentUser = user;
            window.greekLifeApp.updateUserProfile();
            window.greekLifeApp.navigateToSection('dashboard');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('greekLifeUser');
        this.updateUIForLoggedOutUser();
        this.showNotification('You have been logged out', 'info');
        this.showLoginModal();
    }

    updateUIForLoggedInUser() {
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            if (this.currentUser) {
                element.textContent = this.currentUser.name;
            }
        });

        const avatarElements = document.querySelectorAll('.profile-pic');
        avatarElements.forEach(element => {
            if (this.currentUser) {
                element.textContent = this.currentUser.avatar || this.currentUser.name.charAt(0);
            }
        });

        document.getElementById('logout-btn').style.display = 'inline-block';
        document.querySelector('.user-profile').style.display = 'flex';
    }

    updateUIForLoggedOutUser() {
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = 'Guest';
        });

        document.getElementById('logout-btn').style.display = 'none';
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        });

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        }
        
        document.body.appendChild(notification);
        
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.userAuth = new UserAuth();
});
