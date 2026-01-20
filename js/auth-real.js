// auth-real.js - Frontend-only auth for static hosting (GitHub Pages, Live Server, etc.)
//
// - Google login works via Google Identity Services and stores the user in localStorage
// - Regular login/register are "demo" logins (no real backend)
// - No /api/* calls, so it works fine on static hosting

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

    // ---------------- SESSION ----------------

    checkExistingSession() {
        try {
            const stored = localStorage.getItem('greekLifeUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
                this.updateUIForLoggedInUser();
                this.emitAuthChanged(); // NEW
            } else {
                this.updateUIForLoggedOutUser();
                this.emitAuthChanged(); // NEW
            }
        } catch (err) {
            console.error('Failed to read stored user:', err);
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            this.emitAuthChanged(); // NEW
        }
    }

    // ---------------- SETUP EVENTS ----------------

    setupLoginEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e.target);
            });
        }

        const closeBtn = document.querySelector('#login-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('login-modal').style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            const modal = document.getElementById('login-modal');
            const registerModal = document.getElementById('register-modal');
            const resetModal = document.getElementById('reset-password-modal');

            if (modal && e.target === modal) modal.style.display = 'none';
            if (registerModal && e.target === registerModal) registerModal.style.display = 'none';
            if (resetModal && e.target === resetModal) resetModal.style.display = 'none';
        });
    }

    setupRegisterEvents() {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegistration(e.target);
            });
        }

        const closeBtn = document.querySelector('#register-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('register-modal').style.display = 'none';
            });
        }
    }

    setupModalToggle() {
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

    // ---------------- GOOGLE AUTH ----------------

    initGoogleAuth() {
        const googleClientId =
            window.GOOGLE_CLIENT_ID ||
            'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

        console.log('Google Client ID:', googleClientId);
        console.log('Window location:', window.location.origin);

        if (
            !googleClientId ||
            googleClientId ===
                'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
        ) {
            console.warn('Google Client ID not configured - Google login disabled');
            const googleButtons = document.querySelectorAll('.google-login-btn');
            googleButtons.forEach((btn) => (btn.style.display = 'none'));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
            if (typeof google === 'undefined') {
                console.error('Google object not available after loading script');
                return;
            }

            try {
                google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: this.handleGoogleCredentialResponse.bind(this),
                    auto_select: false
                });

                this.renderGoogleButtons();
            } catch (error) {
                console.error('Google Auth initialization failed:', error);
                this.showNotification(
                    'Google login temporarily unavailable',
                    'error'
                );
            }
        };

        script.onerror = () => {
            console.error('Failed to load Google Platform Library');
        };
    }

    renderGoogleButtons() {
        const googleLoginBtn = document.getElementById('google-login-button');
        const googleRegisterBtn = document.getElementById('google-register-button');

        if (googleLoginBtn) {
            google.accounts.id.renderButton(googleLoginBtn, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                width: 200
            });
        }

        if (googleRegisterBtn) {
            google.accounts.id.renderButton(googleRegisterBtn, {
                theme: 'outline',
                size: 'large',
                text: 'signup_with',
                shape: 'rectangular',
                width: 200
            });
        }
    }

    handleGoogleCredentialResponse(response) {
        // Called by Google when the user picks an account
        this.handleGoogleLogin(response.credential);
    }

    // Frontend-only Google login: decode JWT, store user, update UI.
    async handleGoogleLogin(credential) {
        try {
            this.showLoading(true);

            if (!credential) {
                throw new Error('No Google credential received.');
            }

            const userInfo = this.decodeJwt(credential);

            const user = {
                name: userInfo.name || userInfo.given_name || 'Google User',
                email: userInfo.email || '',
                picture: userInfo.picture || null,
                provider: 'google'
            };

            this.currentUser = user;
            localStorage.setItem('greekLifeUser', JSON.stringify(user));

            this.updateUIForLoggedInUser();
            this.emitAuthChanged(); // NEW

            document.querySelectorAll('.modal').forEach((m) => {
                m.style.display = 'none';
            });

            this.showNotification(
                `Signed in as ${user.name} (Google)`,
                'success'
            );
        } catch (error) {
            console.error('Google login error:', error);
            this.showNotification(
                error.message || 'Google login failed. Please try again.',
                'error'
            );
        } finally {
            this.showLoading(false);
        }
    }

    // Helper to decode JWT payload (no verification, just for demo)
    decodeJwt(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid credential format.');
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(
                    (c) =>
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                )
                .join('')
        );

        return JSON.parse(jsonPayload);
    }

    // ---------------- LOCAL LOGIN / REGISTER (DEMO) ----------------

    async handleLogin(form) {
        const username = form.querySelector('#username').value.trim();
        const password = form.querySelector('#password').value.trim();

        if (!username || !password) {
            this.showNotification(
                'Please enter both username and password',
                'error'
            );
            return;
        }

        // Demo-only local "login" – in a real app this would go to your backend.
        const user = {
            name: username,
            email: '',
            provider: 'local'
        };

        this.currentUser = user;
        localStorage.setItem('greekLifeUser', JSON.stringify(user));

        this.updateUIForLoggedInUser();
        this.emitAuthChanged(); // NEW

        document.getElementById('login-modal').style.display = 'none';
        this.showNotification(`Logged in as ${user.name}`, 'success');
    }

    async handleRegistration(form) {
        const name = form.querySelector('#reg-name').value.trim();
        const username = form.querySelector('#reg-username').value.trim();
        const email = form.querySelector('#reg-email').value.trim();
        const password = form.querySelector('#reg-password').value.trim();
        const chapter = form.querySelector('#reg-chapter').value.trim();
        const role = form.querySelector('#reg-role').value.trim();

        if (!name || !username || !email || !password || !chapter || !role) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification(
                'Password must be at least 6 characters',
                'error'
            );
            return;
        }

        // Demo-only "account creation"
        const user = {
            name,
            username,
            email,
            chapter,
            role,
            provider: 'local'
        };

        this.currentUser = user;
        localStorage.setItem('greekLifeUser', JSON.stringify(user));

        this.updateUIForLoggedInUser();
        this.emitAuthChanged(); // NEW

        document.getElementById('register-modal').style.display = 'none';
        this.showNotification('Account created & logged in (demo only)', 'success');
    }

    async handlePasswordReset(form) {
        const email = form.querySelector('#reset-email').value.trim();

        if (!email) {
            this.showNotification(
                'Please enter your email address',
                'error'
            );
            return;
        }

        // No backend = we just fake it
        this.showNotification(
            'Password reset is not available in demo mode (no backend).',
            'info'
        );
        document.getElementById('reset-password-modal').style.display = 'none';
    }

    // ---------------- LOGIN STATE / UI ----------------

    loginSuccess(user, token = null) {
        // kept for compatibility if you ever add a backend later
        this.currentUser = user;
        localStorage.setItem('greekLifeUser', JSON.stringify(user));
        this.updateUIForLoggedInUser();
        this.emitAuthChanged(); // NEW

        if (window.greekLifeApp) {
            window.greekLifeApp.currentUser = user;
            if (typeof window.greekLifeApp.updateUserProfile === 'function') {
                window.greekLifeApp.updateUserProfile();
            }
            window.greekLifeApp.navigateToSection('dashboard');
        }
    }

    async logout() {
        this.currentUser = null;
        localStorage.removeItem('greekLifeUser');
        this.updateUIForLoggedOutUser();
        this.emitAuthChanged(); // NEW
        this.showNotification('You have been logged out', 'info');
    }

    // ---- NEW: app-wide auth change event (so main.js / chat / etc can react)
    emitAuthChanged() {
        try {
            window.dispatchEvent(
                new CustomEvent('greeklife:auth-changed', {
                    detail: { user: this.currentUser }
                })
            );
        } catch (e) {
            // if CustomEvent ever fails, just no-op
            console.warn('Failed to emit auth event:', e);
        }
    }

    // ---- helper: name → first name
    getFirstName(name) {
        if (!name) return 'Guest';
        const parts = name.trim().split(/\s+/);
        return parts[0] || 'Guest';
    }

    // ---- helper: name → two initials (first + last name first letters)
    getInitialsFromName(name) {
        if (!name) return 'GU';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            const first = parts[0].charAt(0) || 'G';
            const last = parts[0].slice(-1) || first;
            return (first + last).toUpperCase();
        }
        const first = parts[0].charAt(0) || 'G';
        const last = parts[parts.length - 1].charAt(0) || first;
        return (first + last).toUpperCase();
    }

    // ---- helper: generate SVG avatar with initials
    generateInitialsAvatar(initials) {
        const safeInitials = (initials || 'GU').toUpperCase();
        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="40" ry="40" fill="#1b365d"/>
  <text x="50%" y="50%" dy=".35em"
        text-anchor="middle"
        fill="#ffffff"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="28"
        font-weight="600">
    ${safeInitials}
  </text>
</svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    // ---- helper: update dashboard greeting
    updateDashboardGreeting(name) {
        const firstName = this.getFirstName(name);
        const header = document.querySelector('#dashboard .container h2');
        if (header) {
            header.textContent = `Welcome Back, ${firstName}!`;
        }
    }

    updateUIForLoggedInUser() {
        const name = this.currentUser ? this.currentUser.name : 'Guest';
        const firstName = this.getFirstName(name);

        // Decide avatar source: Google picture or initials avatar
        let avatarSrc = 'assets/images/default-avatar.png';
        if (this.currentUser && this.currentUser.picture) {
            avatarSrc = this.currentUser.picture;
        } else {
            const initials = this.getInitialsFromName(name);
            avatarSrc = this.generateInitialsAvatar(initials);
        }

        // Update all username labels
        document
            .querySelectorAll('.username')
            .forEach((el) => (el.textContent = name));

        // Update all profile pics (src + alt)
        document
            .querySelectorAll('.profile-pic')
            .forEach((el) => {
                el.setAttribute('alt', name);
                el.setAttribute('src', avatarSrc);
            });

        // Update dashboard greeting text ("Welcome Back, {firstName}!")
        this.updateDashboardGreeting(firstName);

        const logoutBtn = document.getElementById('logout-btn');
        const authBtn = document.getElementById('auth-btn');
        const profile = document.querySelector('.user-profile');

        // Show logout, and pull it right next to the username
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.style.marginLeft = '0';
        }

        // Completely remove login/register button from layout
        if (authBtn) {
            authBtn.style.display = 'none';
        }

        if (profile) profile.style.display = 'flex';
    }

    updateUIForLoggedOutUser() {
        // Reset username text
        document
            .querySelectorAll('.username')
            .forEach((el) => (el.textContent = 'Guest'));

        // Reset avatar back to default image
        document
            .querySelectorAll('.profile-pic')
            .forEach((el) => {
                el.setAttribute('alt', 'Guest');
                el.setAttribute('src', 'assets/images/default-avatar.png');
            });

        // Reset dashboard greeting
        const header = document.querySelector('#dashboard .container h2');
        if (header) {
            header.textContent = 'Welcome Back, Guest!';
        }

        const logoutBtn = document.getElementById('logout-btn');
        const authBtn = document.getElementById('auth-btn');
        const profile = document.querySelector('.user-profile');

        // Hide logout and restore its original margin for when it shows again
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
            logoutBtn.style.marginLeft = '10px'; // matches inline HTML style
        }

        // Show login/register button again
        if (authBtn) {
            authBtn.style.display = 'inline-block';
        }

        if (profile) profile.style.display = 'flex';
    }

    showAuthModal() {
        document.querySelectorAll('.modal').forEach((m) => {
            m.style.display = 'none';
        });

        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'block';
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.maxHeight = '90vh';
                modalContent.style.overflowY = 'auto';
            }
        }
    }

    // ---------------- UTILITIES ----------------

    showLoading(show) {
        const loginBtn = document.querySelector(
            '#login-form button[type="submit"]'
        );
        const registerBtn = document.querySelector(
            '#register-form button[type="submit"]'
        );
        const resetBtn = document.querySelector(
            '#reset-password-form button[type="submit"]'
        );

        [loginBtn, registerBtn, resetBtn].forEach((btn) => {
            if (!btn) return;

            if (show) {
                btn.innerHTML =
                    '<span class="loading-spinner"></span> Processing...';
                btn.disabled = true;
            } else {
                const form = btn.closest('form');
                const formId = form ? form.id : '';

                if (formId === 'login-form') {
                    btn.textContent = 'Login';
                } else if (formId === 'register-form') {
                    btn.textContent = 'Create Account';
                } else if (formId === 'reset-password-form') {
                    btn.textContent = 'Reset Password';
                }

                btn.disabled = false;
            }
        });
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

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
            notification.style.background =
                'linear-gradient(135deg, #27ae60, #2ecc71)';
        } else if (type === 'error') {
            notification.style.background =
                'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else if (type === 'info') {
            notification.style.background =
                'linear-gradient(135deg, #3498db, #2980b9)';
        } else {
            notification.style.background =
                'linear-gradient(135deg, #f39c12, #e67e22)';
        }

        document.body.appendChild(notification);

        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        });

        setTimeout(() => {
            if (!notification.parentNode) return;
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
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
