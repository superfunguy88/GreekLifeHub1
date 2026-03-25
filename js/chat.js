// chat.js - Real user-to-user messaging (Supabase: profiles, user_connections, conversations, messages)
class ChatSystem {
    constructor() {
        this.contacts = [];
        this.currentChat = null;
        this.supabase = null;
        this.realtimeUnsubscribe = null;
        this.pendingRequests = [];
        this.init();
    }

    init() {
        this.setupChatInterface();
        this.initAsync();
    }

    async initAsync() {
        // Reuse the shared Supabase client created in auth-real.js
        if (window.greekLifeSupabase) {
            this.supabase = window.greekLifeSupabase;
        }
        window.addEventListener('greeklife:auth-changed', () => {
            this.supabase = window.greekLifeSupabase || this.supabase;
            this.loadContacts();
        });
        await this.loadContacts();
        // Auth + Supabase init are async; first loadContacts often runs before client/user exist.
        this.scheduleContactsRetry();
    }

    /** Re-run loadContacts until Supabase + user id exist or attempts exhausted. */
    scheduleContactsRetry(maxAttempts = 40, intervalMs = 150) {
        let n = 0;
        const tick = () => {
            if (n++ >= maxAttempts) return;
            if (!this.supabase && window.greekLifeSupabase) {
                this.supabase = window.greekLifeSupabase;
            }
            const meId = this.getCurrentUserId();
            if (this.supabase && meId) {
                this.loadContacts();
                return;
            }
            setTimeout(tick, intervalMs);
        };
        setTimeout(tick, intervalMs);
    }

    getCurrentUser() {
        return (window.userAuth && window.userAuth.getCurrentUser()) || null;
    }

    getCurrentUserId() {
        const u = this.getCurrentUser();
        return (u && u.id) || null;
    }

    getSenderName() {
        const u = this.getCurrentUser();
        return (u && u.name) ? u.name : 'Guest';
    }

    setupChatInterface() {
        const sendButton = document.querySelector('.send-btn');
        const messageInput = document.querySelector('.message-input input');
        if (sendButton && messageInput) {
            sendButton.addEventListener('click', () => {
                this.sendMessage(messageInput.value);
                messageInput.value = '';
            });
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage(messageInput.value);
                    messageInput.value = '';
                }
            });
        }
    }

    async loadContacts() {
        const contactsList = document.querySelector('.contacts-list');
        if (!contactsList) return;

        // Make sure we always pick up the shared Supabase client once it exists
        if (!this.supabase && window.greekLifeSupabase) {
            this.supabase = window.greekLifeSupabase;
        }

        const meId = this.getCurrentUserId();
        if (!this.supabase || !meId) {
            contactsList.innerHTML = '<div class="contacts-placeholder"><p>Log in to message other members.</p><p class="contacts-hint">Use Login/Register above and add contacts to start chatting.</p></div>';
            this.contacts = [];
            this.currentChat = null;
            this.setEmptyChatState();
            return;
        }

        try {
            const { data: connections } = await this.supabase
                .from('user_connections')
                .select('id, from_user_id, to_user_id, status')
                .or(`from_user_id.eq.${meId},to_user_id.eq.${meId}`);

            const pending = (connections || []).filter(c => c.status === 'pending' && c.to_user_id === meId);
            const pendingFromIds = [...new Set(pending.map(c => c.from_user_id))];
            const { data: pendingProfiles } = pendingFromIds.length
                ? await this.supabase.from('profiles').select('id, name, username').in('id', pendingFromIds)
                : { data: [] };
            const pendingProfileMap = {};
            (pendingProfiles || []).forEach(p => { pendingProfileMap[p.id] = p; });
            this.pendingRequests = pending.map(c => ({
                ...c,
                fromName: (pendingProfileMap[c.from_user_id] && (pendingProfileMap[c.from_user_id].name || pendingProfileMap[c.from_user_id].username)) || 'Someone'
            }));
            const accepted = (connections || []).filter(c => c.status === 'accepted');
            const otherIds = accepted.map(c => c.from_user_id === meId ? c.to_user_id : c.from_user_id);

            if (otherIds.length === 0) {
                this.contacts = [];
                this.currentChat = null;
                this.setEmptyChatState();
                this.renderContactsList(contactsList);
                return;
            }

            const { data: profiles } = await this.supabase
                .from('profiles')
                .select('id, name, username, role')
                .in('id', otherIds);

            const profileMap = {};
            (profiles || []).forEach(p => { profileMap[p.id] = p; });

            const contacts = [];
            for (const otherId of otherIds) {
                const conv = await this.getOrCreateConversation(otherId);
                const profile = profileMap[otherId] || { id: otherId, name: 'Unknown', username: '', role: '' };
                const lastMessage = await this.getLastMessage(conv.id);
                contacts.push({
                    type: 'user',
                    id: otherId,
                    conversationId: conv.id,
                    name: profile.name || profile.username || 'User',
                    username: profile.username,
                    role: profile.role || 'Member',
                    avatar: this.getInitials(profile.name || profile.username || 'U'),
                    lastMessage: lastMessage ? lastMessage.body : 'No messages yet',
                    lastAt: lastMessage ? lastMessage.created_at : null
                });
            }
            contacts.sort((a, b) => (b.lastAt || '') > (a.lastAt || '') ? 1 : -1);
            this.contacts = contacts;
            this.renderContactsList(contactsList);
        } catch (e) {
            console.error('Load contacts failed', e);
            contactsList.innerHTML = '<div class="contacts-placeholder"><p>Could not load contacts.</p></div>';
            this.contacts = [];
            this.currentChat = null;
            this.setEmptyChatState();
        }
    }

    async getOrCreateConversation(otherUserId) {
        const meId = this.getCurrentUserId();
        if (!meId || !otherUserId) return null;
        const a = meId < otherUserId ? meId : otherUserId;
        const b = meId < otherUserId ? otherUserId : meId;
        let { data: existing } = await this.supabase
            .from('conversations')
            .select('id')
            .eq('user_a_id', a)
            .eq('user_b_id', b)
            .maybeSingle();
        if (existing) return existing;
        const { data: created, error } = await this.supabase
            .from('conversations')
            .insert({ user_a_id: a, user_b_id: b })
            .select('id')
            .single();
        if (error) {
            const { data: again } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('user_a_id', a)
                .eq('user_b_id', b)
                .maybeSingle();
            return again || { id: null };
        }
        return created;
    }

    async getLastMessage(conversationId) {
        if (!conversationId) return null;
        const { data } = await this.supabase
            .from('messages')
            .select('body, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        return data;
    }

    getInitials(name) {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    setEmptyChatState() {
        const chatHeader = document.querySelector('.chat-header h3');
        const chatMessages = document.querySelector('.chat-messages');
        if (chatHeader) chatHeader.textContent = 'Messages';
        if (chatMessages) chatMessages.innerHTML = '<div class="contacts-placeholder"><p>Select a conversation or add a contact to start chatting.</p></div>';
        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
            this.realtimeUnsubscribe = null;
        }
    }

    renderContactsList(container) {
        container.innerHTML = '';
        const addBtn = document.createElement('div');
        addBtn.className = 'contact-item contact-item-add';
        addBtn.innerHTML = '<span class="add-icon">+</span> Add or find contacts';
        addBtn.addEventListener('click', () => this.showAddContactPanel());
        container.appendChild(addBtn);

        if (this.pendingRequests.length > 0) {
            const heading = document.createElement('div');
            heading.className = 'contacts-subheading';
            heading.textContent = 'Pending requests';
            container.appendChild(heading);
            this.pendingRequests.forEach(req => {
                const el = this.createPendingRequestItem(req);
                container.appendChild(el);
            });
        }

        const listHeading = document.createElement('div');
        listHeading.className = 'contacts-subheading';
        listHeading.textContent = 'Conversations';
        container.appendChild(listHeading);

        this.contacts.forEach((contact, index) => {
            const item = this.createContactItem(contact);
            container.appendChild(item);
            item.addEventListener('click', () => {
                container.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.openChat(contact);
            });
        });

        if (this.contacts.length === 0 && this.pendingRequests.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'contacts-placeholder';
            empty.innerHTML = '<p>No conversations yet.</p><p class="contacts-hint">Click "Add or find contacts" to search members and send a request.</p>';
            container.appendChild(empty);
        } else if (this.contacts.length > 0) {
            const first = container.querySelector('.contact-item[data-conversation-id]');
            if (first) {
                first.classList.add('active');
                this.openChat(this.contacts[0]);
            }
        }
    }

    createPendingRequestItem(req) {
        const el = document.createElement('div');
        el.className = 'contact-item contact-item-pending';
        el.setAttribute('data-request-id', req.id);
        const name = req.fromName || 'Someone';
        el.innerHTML = `
            <div class="contact-avatar">${this.getInitials(name)}</div>
            <div class="contact-info">
                <h4>${name}</h4>
                <p class="contact-role">Wants to connect</p>
                <button class="btn-accept-request">Accept</button>
            </div>
        `;
        el.querySelector('.btn-accept-request').addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.acceptConnectionRequest(req.id);
        });
        return el;
    }

    async acceptConnectionRequest(connectionId) {
        if (!this.supabase) return;
        const { error } = await this.supabase
            .from('user_connections')
            .update({ status: 'accepted' })
            .eq('id', connectionId);
        if (!error) await this.loadContacts();
    }

    createContactItem(contact) {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.setAttribute('data-conversation-id', contact.conversationId || '');
        item.setAttribute('data-other-id', contact.id || '');
        item.innerHTML = `
            <div class="contact-avatar">${contact.avatar || this.getInitials(contact.name)}</div>
            <div class="contact-info">
                <h4>${contact.name}</h4>
                <p class="contact-role">${contact.role || 'Member'}</p>
                <p class="last-message">${contact.lastMessage || 'No messages yet'}</p>
            </div>
        `;
        return item;
    }

    showAddContactPanel() {
        const existing = document.getElementById('add-contact-panel');
        if (existing) {
            existing.remove();
            return;
        }
        const panel = document.createElement('div');
        panel.id = 'add-contact-panel';
        panel.className = 'add-contact-panel';
        panel.innerHTML = `
            <div class="add-contact-header">
                <h4>Add or find contacts</h4>
                <button type="button" class="add-contact-close">&times;</button>
            </div>
            <div class="add-contact-search">
                <input type="text" placeholder="Search by name or username..." class="add-contact-input">
                <button type="button" class="btn-primary add-contact-search-btn">Search</button>
            </div>
            <div class="add-contact-results"></div>
        `;
        const list = document.querySelector('.contacts-list');
        if (!list) return;
        list.appendChild(panel);

        panel.querySelector('.add-contact-close').addEventListener('click', () => panel.remove());
        panel.querySelector('.add-contact-search-btn').addEventListener('click', () => this.searchAndShowUsers(panel));
        panel.querySelector('.add-contact-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAndShowUsers(panel);
        });
    }

    async searchAndShowUsers(panel) {
        const input = panel.querySelector('.add-contact-input');
        const q = (input && input.value || '').trim().toLowerCase();
        const resultsEl = panel.querySelector('.add-contact-results');
        if (!resultsEl || !this.supabase) return;
        const meId = this.getCurrentUserId();
        if (!meId) return;

        let query = this.supabase.from('profiles').select('id, name, username, role');
        if (q.length >= 2) {
            query = query.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
        } else {
            query = query.limit(20);
        }
        const { data: users, error } = await query;
        if (error) {
            resultsEl.innerHTML = '<p class="add-contact-error">Search failed.</p>';
            return;
        }
        const exclude = new Set([meId]);
        const { data: existing } = await this.supabase
            .from('user_connections')
            .select('from_user_id, to_user_id')
            .or(`from_user_id.eq.${meId},to_user_id.eq.${meId}`);
        (existing || []).forEach(r => {
            exclude.add(r.from_user_id);
            exclude.add(r.to_user_id);
        });
        const list = (users || []).filter(u => !exclude.has(u.id));
        if (list.length === 0) {
            resultsEl.innerHTML = '<p class="add-contact-empty">No users found. Try a different search or invite people to join!</p>';
            return;
        }
        resultsEl.innerHTML = list.map(u => `
            <div class="add-contact-row" data-user-id="${u.id}">
                <div class="add-contact-avatar">${this.getInitials(u.name || u.username)}</div>
                <div class="add-contact-info">
                    <strong>${u.name || u.username || 'User'}</strong>
                    ${u.username ? `<span class="add-contact-username">@${u.username}</span>` : ''}
                    ${u.role ? `<span class="add-contact-role">${u.role}</span>` : ''}
                </div>
                <button type="button" class="btn-secondary btn-add-contact">Add</button>
            </div>
        `).join('');
        resultsEl.querySelectorAll('.btn-add-contact').forEach((btn, i) => {
            btn.addEventListener('click', () => this.sendConnectionRequest(list[i].id, resultsEl));
        });
    }

    async sendConnectionRequest(otherUserId, resultsEl) {
        const meId = this.getCurrentUserId();
        if (!meId || !this.supabase) return;
        const { error } = await this.supabase.from('user_connections').insert({
            from_user_id: meId,
            to_user_id: otherUserId,
            status: 'pending'
        });
        if (error) {
            if (error.code === '23505') {
                window.userAuth && window.userAuth.showNotification('Request already sent or already connected.', 'info');
            } else {
                window.userAuth && window.userAuth.showNotification(error.message || 'Could not send request', 'error');
            }
            return;
        }
        window.userAuth && window.userAuth.showNotification('Connection request sent!', 'success');
        const row = resultsEl && resultsEl.querySelector(`[data-user-id="${otherUserId}"]`);
        if (row) row.remove();
        await this.loadContacts();
    }

    async openChat(contact) {
        if (!contact || !contact.conversationId) return;
        this.currentChat = contact;
        const chatHeader = document.querySelector('.chat-header h3');
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatHeader || !chatMessages) return;

        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
            this.realtimeUnsubscribe = null;
        }

        chatHeader.textContent = contact.name;
        chatMessages.innerHTML = '<div class="message-loading">Loading...</div>';

        if (this.supabase) {
            await this.fetchAndRenderMessages(contact.conversationId);
            this.subscribeConversation(contact.conversationId);
        } else {
            chatMessages.innerHTML = '<div class="message-error">Log in to view messages.</div>';
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async fetchAndRenderMessages(conversationId) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages || !this.supabase) return;
        const meId = this.getCurrentUserId();
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('id, sender_id, body, created_at')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            chatMessages.innerHTML = '';
            if (error) throw error;
            (data || []).forEach((row) => {
                const from = row.sender_id === meId ? 'me' : 'them';
                const timestamp = this.formatTimestamp(row.created_at);
                chatMessages.appendChild(this.createMessageElement({ from, text: row.body, timestamp }));
            });
            if (data && data.length > 0 && this.currentChat) {
                const last = data[data.length - 1];
                this.currentChat.lastMessage = last.body;
                this.currentChat.lastAt = last.created_at;
                this.updateContactLastMessage(this.currentChat.conversationId, last.body);
            }
        } catch (e) {
            console.error('Failed to load messages', e);
            chatMessages.innerHTML = '<div class="message-error">Could not load messages.</div>';
        }
    }

    updateContactLastMessage(conversationId, text) {
        const el = document.querySelector(`.contact-item[data-conversation-id="${conversationId}"] .last-message`);
        if (el) el.textContent = text;
    }

    subscribeConversation(conversationId) {
        if (!this.supabase) return;
        const chatMessages = document.querySelector('.chat-messages');
        const meId = this.getCurrentUserId();
        const channelName = 'messages-conv-' + conversationId;
        const ch = this.supabase.channel(channelName)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: 'conversation_id=eq.' + conversationId
            }, (payload) => {
                const row = payload.new;
                if (!row || !chatMessages) return;
                const from = row.sender_id === meId ? 'me' : 'them';
                const timestamp = this.formatTimestamp(row.created_at);
                chatMessages.appendChild(this.createMessageElement({ from, text: row.body, timestamp }));
                chatMessages.scrollTop = chatMessages.scrollHeight;
                if (this.currentChat && this.currentChat.conversationId === conversationId) {
                    this.currentChat.lastMessage = row.body;
                    this.updateContactLastMessage(conversationId, row.body);
                }
            })
            .subscribe((status) => {
                // Helpful when debugging why realtime isn't firing
                // Expected: SUBSCRIBED
                console.log('[GreekLife realtime]', { status, channelName, conversationId });
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    const errEl = document.createElement('div');
                    errEl.className = 'message-error';
                    errEl.textContent = 'Realtime connection issue — messages may not update instantly.';
                    if (chatMessages) chatMessages.appendChild(errEl);
                }
            });
        this.realtimeUnsubscribe = () => this.supabase.removeChannel(ch);
    }

    createMessageElement(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageData.from}`;
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = messageData.text;
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = messageData.timestamp;
        messageElement.appendChild(content);
        messageElement.appendChild(time);
        return messageElement;
    }

    formatTimestamp(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        if (now - d < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    async sendMessage(text) {
        if (!text.trim() || !this.currentChat) return;
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) return;

        const meId = this.getCurrentUserId();
        const conversationId = this.currentChat.conversationId;

        if (this.supabase && meId && conversationId) {
            try {
                const { error } = await this.supabase.from('messages').insert({
                    conversation_id: conversationId,
                    sender_id: meId,
                    body: text.trim()
                });
                if (error) throw error;
                this.currentChat.lastMessage = text.trim();
                this.updateContactLastMessage(conversationId, text.trim());
            } catch (e) {
                console.error('Send failed', e);
                const errEl = document.createElement('div');
                errEl.className = 'message-error';
                errEl.textContent = e.message || 'Could not send.';
                chatMessages.appendChild(errEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            return;
        }

        const errEl = document.createElement('div');
        errEl.className = 'message-error';
        errEl.textContent = 'Log in and add this contact to send messages.';
        chatMessages.appendChild(errEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
