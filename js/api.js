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
        const config = {
            headers: this.getHeaders(!options.noAuth),
            ...options
        };
        
        // Handle body serialization
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            
            // Handle token expiration
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('greekLifeUser');
                window.location.reload();
                throw new Error('Session expired. Please log in again.');
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `API Error: ${response.status}`);
            }
            
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
