// api.js - API utilities and authentication service
class APIService {
    static BASE_URL = '/api'; // Update this to your actual backend URL

    static getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    static async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;

        // Pull out noAuth so it doesn't get passed to fetch
        const { noAuth, ...restOptions } = options;

        const config = {
            headers: this.getHeaders(!noAuth),
            ...restOptions
        };

        // Handle body serialization
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }

        let data = null;

        try {
            const response = await fetch(url, config);

            // Handle token expiration
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('greekLifeUser');
                window.location.reload();
                throw new Error('Session expired. Please log in again.');
            }

            // Try to parse JSON only if it's actually JSON and not empty
            try {
                const contentType = response.headers.get('content-type') || '';
                if (response.status !== 204 && contentType.includes('application/json')) {
                    data = await response.json();
                }
            } catch (parseErr) {
                console.warn('Failed to parse response as JSON:', parseErr);
                data = null;
            }

            if (!response.ok) {
                const message =
                    (data && data.message) ||
                    `API Error: ${response.status}`;
                throw new Error(message);
            }

            // Return whatever JSON we got, or null if none
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Auth endpoints
    static async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: credentials,
            noAuth: true
        });
    }

    static async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
            noAuth: true
        });
    }

    static async getCurrentUser() {
        return this.request('/auth/me');
    }

    static async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }
    }

    static async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: { email },
            noAuth: true
        });
    }

    static async resetPassword(token, password) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: { token, password },
            noAuth: true
        });
    }

    static async googleLogin(credential) {
        return this.request('/auth/google', {
            method: 'POST',
            body: { credential },
            noAuth: true
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
