// account.js - Account details screen (view/update profiles row)
class AccountDetails {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        window.addEventListener('greeklife:auth-changed', () => this.refresh());
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('account-form');
            if (form) {
                form.addEventListener('submit', (e) => this.onSubmit(e));
            }
            this.refresh();
        });
    }

    getCurrentUser() {
        return (window.userAuth && window.userAuth.getCurrentUser()) || null;
    }

    async getSupabase() {
        if (this.supabase) return this.supabase;
        if (window.greekLifeSupabase) {
            this.supabase = window.greekLifeSupabase;
            return this.supabase;
        }
        return null;
    }

    setStatus(text, type) {
        const el = document.getElementById('account-status');
        if (!el) return;
        el.textContent = text || '';
        el.classList.remove('success', 'error');
        if (type) el.classList.add(type);
    }

    setLoggedOutUI() {
        const out = document.getElementById('account-logged-out');
        const form = document.getElementById('account-form');
        if (out) out.style.display = 'block';
        if (form) form.style.display = 'none';
        this.setStatus('', null);
    }

    setLoggedInUI() {
        const out = document.getElementById('account-logged-out');
        const form = document.getElementById('account-form');
        if (out) out.style.display = 'none';
        if (form) form.style.display = 'block';
    }

    fillForm(profile) {
        const u = this.getCurrentUser();
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || '';
        };
        set('acct-email', (u && u.email) || (profile && profile.email) || '');
        set('acct-username', (profile && profile.username) || (u && u.username) || '');
        set('acct-name', (profile && profile.name) || (u && u.name) || '');
        set('acct-role', (profile && profile.role) || (u && u.role) || '');
        set('acct-chapter', (profile && profile.chapter) || (u && u.chapter) || '');
        set('acct-picture', (profile && profile.picture) || (u && u.picture) || '');
    }

    async refresh() {
        const u = this.getCurrentUser();
        if (!u || !u.id) {
            this.setLoggedOutUI();
            return;
        }
        this.setLoggedInUI();
        this.setStatus('Loading…', null);

        const supabase = await this.getSupabase();
        if (!supabase) {
            this.fillForm(u);
            this.setStatus('Supabase not configured.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('name, username, email, chapter, role, picture')
                .eq('id', u.id)
                .single();
            if (error) throw error;
            this.fillForm(data);
            this.setStatus('', null);
        } catch (e) {
            console.error('Failed to load profile', e);
            this.fillForm(u);
            this.setStatus('Could not load profile.', 'error');
        }
    }

    async onSubmit(e) {
        e.preventDefault();
        const u = this.getCurrentUser();
        if (!u || !u.id) return;

        const supabase = await this.getSupabase();
        if (!supabase) {
            this.setStatus('Supabase not configured.', 'error');
            return;
        }

        const get = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const patch = {
            name: get('acct-name') || null,
            username: get('acct-username') || null,
            chapter: get('acct-chapter') || null,
            role: get('acct-role') || null,
            picture: get('acct-picture') || null,
            updated_at: new Date().toISOString()
        };

        if (!patch.username || patch.username.length < 2) {
            this.setStatus('Username must be at least 2 characters.', 'error');
            return;
        }

        this.setStatus('Saving…', null);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(patch)
                .eq('id', u.id);
            if (error) throw error;

            // Keep local app state in sync
            const merged = { ...u, ...patch, id: u.id, email: u.email };
            localStorage.setItem('greekLifeUser', JSON.stringify(merged));
            if (window.userAuth) {
                window.userAuth.currentUser = merged;
                if (typeof window.userAuth.updateUIForLoggedInUser === 'function') {
                    window.userAuth.updateUIForLoggedInUser();
                }
                if (typeof window.userAuth.emitAuthChanged === 'function') {
                    window.userAuth.emitAuthChanged();
                }
            }

            this.setStatus('Saved.', 'success');
        } catch (err) {
            console.error('Failed to save profile', err);
            this.setStatus(err.message || 'Save failed.', 'error');
        }
    }
}

window.accountDetails = new AccountDetails();

