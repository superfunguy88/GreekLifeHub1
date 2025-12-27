// auth.js - Updated with registration functionality
class UserAuth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupLoginEvents();
        this.setupLogoutEvents();
        this.setupRegisterEvents();
        this.setupModalToggle();
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
            const registerModal = document.getElementById('register-modal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
            if (e.target === registerModal) {
                registerModal.style.display = 'none';
            }
        });
    }

    setupRegisterEvents() {
        // Registration form submission
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistration(e.target);
            });
        }

        // Close register modal
        const closeBtn = document.querySelector('#register-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('register-modal').style.display = 'none';
            });
        }
    }

    setupModalToggle() {
        // Toggle between login and register modals
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'none';
                document.getElementById('register-modal').style.display = 'block';
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-modal').style.display = 'none';
                document.getElementById('login-modal').style.display = 'block';
            });
        }
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

    async handleRegistration(form) {
        const name = form.querySelector('#reg-name').value;
        const username = form.querySelector('#reg-username').value;
        const email = form.querySelector('#reg-email').value;
        const password = form.querySelector('#reg-password').value;
        const chapter = form.querySelector('#reg-chapter').value;
        const role = form.querySelector('#reg-role').value;
        
        // Validation
        if (!name || !username || !email || !password || !chapter || !role) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const result = await this.createUser({
                name,
                username,
                email,
                password,
                chapter,
                role
            });
            
            if (result.success) {
                this.showNotification('Account created successfully! Please login.', 'success');
                // Switch to login modal
                document.getElementById('register-modal').style.display = 'none';
                document.getElementById('login-modal').style.display = 'block';
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            this.showNotification('Registration failed. Please try again.', 'error');
        }
    }

    authenticateUser(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Get all users from localStorage
                const usersData = localStorage.getItem('greekLifeUsers');
                let users = {};
                
                if (usersData) {
                    users = JSON.parse(usersData);
                } else {
                    // Default users if none exist
                    users = {
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
                }

                const user = users[username];
                if (user && user.password === password) {
                    // Remove password before returning user data
                    const { password, ...userData } = user;
                    resolve(userData);
                } else {
                    resolve(null);
                }
            }, 500);
        });
    }

    createUser(userData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Get existing users
                const usersData = localStorage.getItem('greekLifeUsers');
                let users = usersData ? JSON.parse(usersData) : {};
                
                // Check if username already exists
                if (users[userData.username]) {
                    resolve({
                        success: false,
                        message: 'Username already exists. Please choose another.'
                    });
                    return;
                }
                
                // Check if email already exists
                const emailExists = Object.values(users).some(user => user.email === userData.email);
                if (emailExists) {
                    resolve({
                        success: false,
                        message: 'Email already registered. Please use another email.'
                    });
                    return;
                }
                
                // Create new user
                const newUser = {
                    id: Date.now(), // Simple ID generation
                    username: userData.username,
                    name: userData.name,
                    email: userData.email,
                    password: userData.password,
                    role: userData.role,
                    chapter: userData.chapter,
                    graduationYear: userData.role === 'Alumni' ? 2020 : new Date().getFullYear(),
                    avatar: userData.name.split(' ').map(n => n[0]).join('').toUpperCase()
                };
                
                // Save user
                users[userData.username] = newUser;
                localStorage.setItem('greekLifeUsers', JSON.stringify(users));
                
                resolve({
                    success: true,
                    message: 'User created successfully!'
                });
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
