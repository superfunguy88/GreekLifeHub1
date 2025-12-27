// auth-real.js - Updated authentication system with real API integration
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
        this.setupAuthButton();
        this.setupPasswordReset();
        this.initGoogleAuth();
    }

    async checkExistingSession() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const user = await APIService.getCurrentUser();
                this.loginSuccess(user);
            } catch (error) {
                console.error('Session validation failed:', error);
                this.logout();
            }
        }
    }

    setupLoginEvents() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e.target);
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
            const resetModal = document.getElementById('reset-password-modal');
            
            if (e.target === modal) modal.style.display = 'none';
            if (e.target === registerModal) registerModal.style.display = 'none';
            if (e.target === resetModal) resetModal.style.display = 'none';
        });
    }

    setupRegisterEvents() {
        // Registration form submission
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegistration(e.target);
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
        const showResetLink = document.getElementById('show-reset-password');
        const showLoginFromReset = document.getElementById('show-login-from-reset');
        
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
        
        if (showResetLink) {
            showResetLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-modal').style.display = 'none';
                document.getElementById('reset-password-modal').style.display = 'block';
            });
        }
        
        if (showLoginFromReset) {
            showLoginFromReset.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('reset-password-modal').style.display = 'none';
                document.getElementById('login-modal').style.display = 'block';
            });
        }
    }

    setupLogoutEvents() {
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
        }
    }

    setupAuthButton() {
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthModal();
            });
        }
    }

    setupPasswordReset() {
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePasswordReset(e.target);
            });
        }
    }

    initGoogleAuth() {
        // Check if Google Client ID is configured
        const googleClientId = window.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

        // Add this to your auth-real.js initGoogleAuth method temporarily
        console.log('Google Client ID:', window.GOOGLE_CLIENT_ID);
        console.log('Window location:', window.location.origin);

        
        // Only initialize if we have a valid client ID
        if (googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
            // Load Google Platform Library
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            
            script.onload = () => {
                if (typeof google !== 'undefined') {
                    try {
                        google.accounts.id.initialize({
                            client_id: googleClientId,
                            callback: this.handleGoogleCredentialResponse.bind(this),
                            auto_select: false
                        });
                        
                        // Render Google buttons if elements exist
                        this.renderGoogleButtons();
                    } catch (error) {
                        console.error('Google Auth initialization failed:', error);
                        this.showNotification('Google login temporarily unavailable', 'error');
                    }
                }
            };
            
            script.onerror = () => {
                console.error('Failed to load Google Platform Library');
            };
        } else {
            console.warn('Google Client ID not configured - Google login disabled');
            // Hide Google login buttons
            const googleButtons = document.querySelectorAll('.google-login-btn');
            googleButtons.forEach(btn => btn.style.display = 'none');
        }
    }

    // In the renderGoogleButtons method, change this:
    renderGoogleButtons() {
        const googleLoginBtn = document.getElementById('google-login-button');
        const googleRegisterBtn = document.getElementById('google-register-button');
        
        if (googleLoginBtn) {
            google.accounts.id.renderButton(googleLoginBtn, {
                theme: "outline",
                size: "large",
                text: "signin_with",
                shape: "rectangular",
                width: 200  // Changed from "100%" to fixed width
            });
        }
        
        if (googleRegisterBtn) {
            google.accounts.id.renderButton(googleRegisterBtn, {
                theme: "outline",
                size: "large",
                text: "signup_with",
                shape: "rectangular",
                width: 200  // Changed from "100%" to fixed width
            });
        }
    }


    handleGoogleCredentialResponse(response) {
        this.handleGoogleLogin(response.credential);
    }

    async handleLogin(form) {
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        
        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const result = await APIService.login({ username, password });
            
            if (result.token && result.user) {
                this.loginSuccess(result.user, result.token);
                document.getElementById('login-modal').style.display = 'none';
                this.showNotification(`Welcome back, ${result.user.name}!`, 'success');
            } else {
                this.showNotification('Login failed. Please try again.', 'error');
            }
        } catch (error) {
            this.showNotification(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
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
            this.showLoading(true);
            const result = await APIService.register({
                name,
                username,
                email,
                password,
                chapter,
                role
            });
            
            this.showNotification('Account created successfully! Please login.', 'success');
            // Switch to login modal
            document.getElementById('register-modal').style.display = 'none';
            document.getElementById('login-modal').style.display = 'block';
        } catch (error) {
            this.showNotification(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleGoogleLogin(credential) {
        try {
            this.showLoading(true);
            const result = await APIService.googleLogin({ credential });
            
            if (result.token && result.user) {
                this.loginSuccess(result.user, result.token);
                // Close any open modals
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
                this.showNotification(`Welcome, ${result.user.name}!`, 'success');
            } else {
                this.showNotification('Google login failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Google login error:', error);
            this.showNotification(error.message || 'Google login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handlePasswordReset(form) {
        const email = form.querySelector('#reset-email').value;
        
        if (!email) {
            this.showNotification('Please enter your email address', 'error');
            return;
        }

        try {
            this.showLoading(true);
            await APIService.forgotPassword(email);
            this.showNotification('Password reset email sent! Check your inbox.', 'success');
            document.getElementById('reset-password-modal').style.display = 'none';
        } catch (error) {
            this.showNotification(error.message || 'Failed to send reset email. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loginSuccess(user, token = null) {
        this.currentUser = user;
        
        if (token) {
            localStorage.setItem('token', token);
        }
        
        localStorage.setItem('greekLifeUser', JSON.stringify(user));
        this.updateUIForLoggedInUser();
        
        if (window.greekLifeApp) {
            window.greekLifeApp.currentUser = user;
            window.greekLifeApp.updateUserProfile();
            window.greekLifeApp.navigateToSection('dashboard');
        }
    }

    async logout() {
        try {
            await APIService.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.currentUser = null;
            localStorage.removeItem('greekLifeUser');
            localStorage.removeItem('token');
            this.updateUIForLoggedOutUser();
            this.showNotification('You have been logged out', 'info');
        }
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
        document.getElementById('auth-btn').style.display = 'none';
        document.querySelector('.user-profile').style.display = 'flex';
    }

    updateUIForLoggedOutUser() {
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = 'Guest';
        });

        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('auth-btn').style.display = 'inline-block';
    }

    showAuthModal() {
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Show login modal
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'block';
            // Ensure modal content is scrollable
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.maxHeight = '90vh';
                modalContent.style.overflowY = 'auto';
            }
        }
    }

    showLoading(show) {
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        const registerBtn = document.querySelector('#register-form button[type="submit"]');
        const resetBtn = document.querySelector('#reset-password-form button[type="submit"]');
        
        [loginBtn, registerBtn, resetBtn].forEach(btn => {
            if (btn) {
                if (show) {
                    btn.innerHTML = '<span class="loading-spinner"></span> Processing...';
                    btn.disabled = true;
                } else {
                    btn.textContent = btn.id === 'login-form' ? 'Login' : 
                                    btn.id === 'register-form' ? 'Create Account' : 'Reset Password';
                    btn.disabled = false;
                }
            }
        });
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
            transition: 'all 0.3s ease',
            maxWidth: '300px'
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
