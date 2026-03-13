// chat.js — Persistent messaging with localStorage (PER-USER, requires login to view anything)
// Fixes: missed auth event on initial load + dashboard recent messages helper

class GreekLifeChat {
    constructor() {
        this.STORAGE_KEYS = {
            CONTACTS: 'glh_contacts_v1',
            THREADS: 'glh_threads_v1'
        };

        this.currentUser = null;
        this.currentChatContactId = null;

        this.sendButton = null;
        this.messageInput = null;

        this.init();
    }

    // ---------------- INIT / AUTH ----------------

    init() {
        this.syncUserFromStorage();
        this.setupAuthBridge();
        this.setupStorageBridge();
        this.setupChatInterface();

        // If logged in, ensure there are some demo contacts for that user
        if (this.currentUser) {
            this.seedContactsIfEmptyForUser();
            this.renderContacts();
            this.openFirstContactIfAny();
        } else {
            this.renderLoggedOutState();
        }
    }

    setupAuthBridge() {
        window.addEventListener('greeklife:auth-changed', (e) => {
            const user = e && e.detail ? e.detail.user : null;
            this.currentUser = user || null;
            this.currentChatContactId = null;

            if (this.currentUser) {
                this.seedContactsIfEmptyForUser();
                this.renderContacts();
                this.openFirstContactIfAny();
            } else {
                this.renderLoggedOutState();
            }

            // Update dashboard recent messages when auth changes
            if (window.greekLifeApp && typeof window.greekLifeApp.renderDashboardRecentMessages === 'function') {
                window.greekLifeApp.renderDashboardRecentMessages();
            }
        });
    }

    // Catch changes even if auth event was missed (or other tabs update storage)
    setupStorageBridge() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'greekLifeUser') {
                this.syncUserFromStorage();
                this.currentChatContactId = null;

                if (this.currentUser) {
                    this.seedContactsIfEmptyForUser();
                    this.renderContacts();
                    this.openFirstContactIfAny();
                } else {
                    this.renderLoggedOutState();
                }
            }
        });
    }

    syncUserFromStorage() {
        try {
            const stored = localStorage.getItem('greekLifeUser');
            this.currentUser = stored ? JSON.parse(stored) : null;
        } catch {
            this.currentUser = null;
        }
    }

    getUserKey() {
        if (!this.currentUser) return null;

        const email = (this.currentUser.email || '').trim().toLowerCase();
        if (email) return email;

        const provider = (this.currentUser.provider || 'local').trim().toLowerCase();
        const name = (this.currentUser.name || '').trim().toLowerCase();
        return `${provider}:${name || 'unknown'}`;
    }

    // ---------------- STORAGE ----------------

    loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    saveJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // ---------------- CONTACTS (PER USER) ----------------

    getContactsStore() {
        const store = this.loadJSON(this.STORAGE_KEYS.CONTACTS, {});
        return (store && typeof store === 'object') ? store : {};
    }

    getContacts() {
        const userKey = this.getUserKey();
        if (!userKey) return [];
        const store = this.getContactsStore();
        store[userKey] = store[userKey] || [];
        return Array.isArray(store[userKey]) ? store[userKey] : [];
    }

    setContacts(contacts) {
        const userKey = this.getUserKey();
        if (!userKey) return;
        const store = this.getContactsStore();
        store[userKey] = contacts;
        this.saveJSON(this.STORAGE_KEYS.CONTACTS, store);
    }

    seedContactsIfEmptyForUser() {
        const userKey = this.getUserKey();
        if (!userKey) return;

        const contacts = this.getContacts();
        if (contacts.length > 0) return;

        const seed = [
            { id: this.makeId(), name: 'Chapter President', role: 'Active Leadership', avatar: 'CP' },
            { id: this.makeId(), name: 'Alumni Coordinator', role: 'Alumni Relations', avatar: 'AC' },
            { id: this.makeId(), name: 'Recruitment Chair', role: 'Recruitment', avatar: 'RC' }
        ];

        this.setContacts(seed);

        // Seed starter threads for THIS user only
        const starters = [
            'Meeting tomorrow at 6pm.',
            'We have a networking night coming up — want an invite list?',
            'Recruitment week planning starts soon. You in?'
        ];

        seed.forEach((c, i) => {
            const now = Date.now();
            this.setThread(c.id, [
                { from: 'them', text: starters[i] || 'Hey!', timestamp: this.getTimeLabelFromMs(now), ts: now }
            ]);
        });
    }

    upsertContact({ name, role }) {
        const userKey = this.getUserKey();
        if (!userKey) return null;

        const contacts = this.getContacts();
        const existing = contacts.find(c => (c.name || '').toLowerCase() === (name || '').toLowerCase());

        if (existing) {
            if (role && role.trim()) existing.role = role.trim();
            if (!existing.avatar) existing.avatar = this.initials(existing.name);
            this.setContacts(contacts);
            return existing;
        }

        const contact = {
            id: this.makeId(),
            name: name.trim(),
            role: (role || '').trim(),
            avatar: this.initials(name)
        };

        contacts.unshift(contact);
        this.setContacts(contacts);
        return contact;
    }

    // ---------------- THREADS (PER USER) ----------------

    getThreadsStore() {
        const store = this.loadJSON(this.STORAGE_KEYS.THREADS, {});
        return (store && typeof store === 'object') ? store : {};
    }

    getThread(contactId) {
        const userKey = this.getUserKey();
        if (!userKey) return [];

        const store = this.getThreadsStore();
        store[userKey] = store[userKey] || {};
        return store[userKey][contactId] || [];
    }

    setThread(contactId, messages) {
        const userKey = this.getUserKey();
        if (!userKey) return;

        const store = this.getThreadsStore();
        store[userKey] = store[userKey] || {};
        store[userKey][contactId] = messages;
        this.saveJSON(this.STORAGE_KEYS.THREADS, store);
    }

    // ---------------- UI ----------------

    setupChatInterface() {
        this.sendButton = document.querySelector('.send-btn');
        this.messageInput = document.querySelector('.message-input input');

        if (!this.sendButton || !this.messageInput) return;

        this.sendButton.addEventListener('click', () => {
            this.sendMessage(this.messageInput.value);
            this.messageInput.value = '';
        });

        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage(this.messageInput.value);
                this.messageInput.value = '';
            }
        });
    }

    // Always re-check localStorage before rendering so we never get stuck
    ensureFreshAuth() {
        if (!this.currentUser) {
            this.syncUserFromStorage();
        }
    }

    renderLoggedOutState() {
        const contactsList = document.querySelector('.contacts-list');
        const chatHeaderEl = document.querySelector('.chat-header h3');
        const chatMessages = document.querySelector('.chat-messages');

        if (contactsList) contactsList.innerHTML = '';
        if (chatHeaderEl) chatHeaderEl.textContent = 'Messages';
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div style="padding: 18px; opacity: 0.85;">
                    <strong>Please log in</strong> to view contacts and messages.
                </div>
            `;
        }

        if (this.messageInput) {
            this.messageInput.value = '';
            this.messageInput.placeholder = 'Log in to send messages...';
            this.messageInput.disabled = true;
        }
        if (this.sendButton) {
            this.sendButton.disabled = true;
            this.sendButton.style.opacity = '0.6';
            this.sendButton.style.cursor = 'not-allowed';
        }
    }

    renderLoggedInInputState() {
        if (this.messageInput) {
            this.messageInput.disabled = false;
            this.messageInput.placeholder = 'Type a message...';
        }
        if (this.sendButton) {
            this.sendButton.disabled = false;
            this.sendButton.style.opacity = '';
            this.sendButton.style.cursor = '';
        }
    }

    renderContacts() {
        this.ensureFreshAuth();

        if (!this.currentUser) {
            this.renderLoggedOutState();
            return;
        }

        this.renderLoggedInInputState();

        const contactsList = document.querySelector('.contacts-list');
        if (!contactsList) return;

        const contacts = this.getContacts();
        contactsList.innerHTML = '';

        if (contacts.length === 0) {
            contactsList.innerHTML = `<div style="padding: 18px; opacity: 0.85;">No contacts yet.</div>`;
            return;
        }

        contacts.forEach(contact => {
            const last = this.getLastMessagePreview(contact.id);

            const contactEl = document.createElement('div');
            contactEl.className = 'contact-item';
            contactEl.dataset.contactId = contact.id;

            contactEl.innerHTML = `
                <div class="contact-avatar">${this.escapeHtml(contact.avatar || this.initials(contact.name))}</div>
                <div class="contact-info">
                    <div class="contact-name">${this.escapeHtml(contact.name)}</div>
                    <div class="contact-role">${this.escapeHtml(contact.role || '')}</div>
                    <div class="contact-preview">${this.escapeHtml(last || 'No messages yet.')}</div>
                </div>
            `;

            contactEl.addEventListener('click', () => this.openChat(contact.id));
            contactsList.appendChild(contactEl);
        });

        if (this.currentChatContactId) {
            const active = contactsList.querySelector(`[data-contact-id="${this.currentChatContactId}"]`);
            if (active) active.classList.add('active');
        }
    }

    openFirstContactIfAny() {
        const contacts = this.getContacts();
        if (contacts.length > 0 && !this.currentChatContactId) {
            this.openChat(contacts[0].id);
        }
    }

    openChat(contactId) {
        this.ensureFreshAuth();

        if (!this.currentUser) {
            this.renderLoggedOutState();
            return;
        }

        this.currentChatContactId = contactId;

        const contacts = this.getContacts();
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return;

        const chatHeaderEl = document.querySelector('.chat-header h3');
        if (chatHeaderEl) chatHeaderEl.textContent = contact.name;

        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = '';
        const thread = this.getThread(contactId);

        thread.forEach(msg => chatMessages.appendChild(this.createMessageElement(msg)));

        chatMessages.scrollTop = chatMessages.scrollHeight;
        this.renderContacts();
    }

    createMessageElement(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageData.from === 'me' ? 'me' : 'them'}`;

        const time = messageData.timestamp || (messageData.ts ? this.getTimeLabelFromMs(messageData.ts) : '');

        messageElement.innerHTML = `
            <div class="message-content">${this.escapeHtml(messageData.text)}</div>
            <div class="message-time">${this.escapeHtml(time)}</div>
        `;
        return messageElement;
    }

    sendMessage(text) {
        this.ensureFreshAuth();

        if (!text || !text.trim()) return;
        if (!this.currentChatContactId) return;

        if (!this.currentUser) {
            this.openLoginModal();
            return;
        }

        const now = Date.now();
        const msg = { from: 'me', text: text.trim(), timestamp: this.getTimeLabelFromMs(now), ts: now };

        const thread = this.getThread(this.currentChatContactId);
        thread.push(msg);
        this.setThread(this.currentChatContactId, thread);

        // tiny demo auto-reply
        setTimeout(() => {
            const replyNow = Date.now();
            const reply = {
                from: 'them',
                text: this.generateAutoReply(),
                timestamp: this.getTimeLabelFromMs(replyNow),
                ts: replyNow
            };
            const t2 = this.getThread(this.currentChatContactId);
            t2.push(reply);
            this.setThread(this.currentChatContactId, t2);
            this.openChat(this.currentChatContactId);
            this.renderContacts();

            // update dashboard recent messages
            if (window.greekLifeApp && typeof window.greekLifeApp.renderDashboardRecentMessages === 'function') {
                window.greekLifeApp.renderDashboardRecentMessages();
            }
        }, 650);

        this.openChat(this.currentChatContactId);
        this.renderContacts();

        // update dashboard recent messages
        if (window.greekLifeApp && typeof window.greekLifeApp.renderDashboardRecentMessages === 'function') {
            window.greekLifeApp.renderDashboardRecentMessages();
        }
    }

    getLastMessagePreview(contactId) {
        const thread = this.getThread(contactId);
        if (!thread || thread.length === 0) return '';
        const last = thread[thread.length - 1];
        const text = last.text || '';
        return text.length > 42 ? text.slice(0, 42) + '…' : text;
    }

    // ---------------- DASHBOARD RECENT MESSAGES (NEW) ----------------
    // Returns list like: [{ contactName, text, time }]
    getDashboardRecentMessages(limit = 3) {
        this.ensureFreshAuth();
        if (!this.currentUser) return [];

        const contacts = this.getContacts();
        const items = [];

        contacts.forEach(c => {
            const thread = this.getThread(c.id);
            if (!thread || thread.length === 0) return;

            const last = thread[thread.length - 1];
            const ts = typeof last.ts === 'number' ? last.ts : 0;
            const time = last.timestamp || (ts ? this.getTimeLabelFromMs(ts) : '');

            items.push({
                contactName: c.name,
                text: last.text || '',
                time,
                ts
            });
        });

        items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        return items.slice(0, limit);
    }

    // ---------------- EXTERNAL API (for alumni buttons) ----------------

    openOrCreateThread({ name, role }) {
        this.ensureFreshAuth();

        if (!this.currentUser) {
            this.openLoginModal();
            return;
        }
        if (!name || !name.trim()) return;

        const contact = this.upsertContact({ name, role });
        if (!contact) return;

        this.renderContacts();
        this.openChat(contact.id);
    }

    // ---------------- HELPERS ----------------

    openLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'block';
    }

    generateAutoReply() {
        const replies = [
            "Got it — thanks!",
            "Sounds good.",
            "Yep, I’m on it.",
            "Perfect. Appreciate you.",
            "Cool — I’ll follow up soon."
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    getTimeLabelFromMs(ms) {
        const d = new Date(ms);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    makeId() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    initials(name) {
        const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
        return parts.map(p => p[0]?.toUpperCase() || '').join('') || '??';
    }

    escapeHtml(str) {
        return String(str || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.greekLifeChat = new GreekLifeChat();
});
