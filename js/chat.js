// chat.js - Messages with optional Supabase persistence and real-time
class ChatSystem {
    constructor() {
        this.contacts = [
            { id: 1, name: 'Chapter President', role: 'Active Leadership', lastMessage: 'Meeting tomorrow at 6pm', avatar: 'CP', channel: 'chapter-president', messages: [
                { from: 'them', text: 'Meeting tomorrow at 6pm', timestamp: '10:30 AM' },
                { from: 'me', text: 'Thanks for the update!', timestamp: '10:32 AM' },
                { from: 'them', text: 'See you at the meeting then.', timestamp: '10:35 AM' }
            ]},
            { id: 2, name: 'Alumni Coordinator', role: 'Alumni Relations', lastMessage: 'New networking event', avatar: 'AC', channel: 'alumni-coordinator', messages: [
                { from: 'them', text: 'New networking event next week', timestamp: '9:15 AM' },
                { from: 'me', text: 'Sounds interesting!', timestamp: '9:20 AM' }
            ]},
            { id: 3, name: 'Sarah Johnson', role: 'Alumni - Google', lastMessage: 'Job opportunity available', avatar: 'SJ', channel: 'sarah-johnson', messages: [
                { from: 'them', text: 'Job opportunity available', timestamp: 'Yesterday' },
                { from: 'me', text: 'Can you share more details?', timestamp: 'Yesterday' }
            ]},
            { id: 4, name: 'Mike Chen', role: 'Alumni - Goldman Sachs', lastMessage: 'Happy to help with interviews', avatar: 'MC', channel: 'mike-chen', messages: [
                { from: 'them', text: 'Happy to help with interviews', timestamp: '2 days ago' }
            ]}
        ];
        this.currentChat = null;
        this.supabase = null;
        this.realtimeUnsubscribe = null;
        this.init();
    }

    init() {
        this.setupChatInterface();
        this.initAsync();
    }

    async initAsync() {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            try {
                const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
                this.supabase = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            } catch (e) {
                console.warn('Supabase load failed, messages in demo mode', e);
            }
        }
        this.loadContacts();
    }

    getSenderName() {
        const u = window.userAuth && window.userAuth.getCurrentUser();
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

    loadContacts() {
        const contactsList = document.querySelector('.contacts-list');
        if (!contactsList) return;
        contactsList.innerHTML = '';
        this.contacts.forEach((contact) => {
            const contactItem = this.createContactItem(contact);
            contactsList.appendChild(contactItem);
        });
        document.querySelectorAll('.contact-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach((i) => i.classList.remove('active'));
                item.classList.add('active');
                this.openChat(this.contacts[index]);
            });
        });
        if (this.contacts.length > 0) {
            this.openChat(this.contacts[0]);
            document.querySelector('.contact-item').classList.add('active');
        }
    }

    createContactItem(contact) {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.setAttribute('data-channel', contact.channel);
        item.innerHTML = `
            <div class="contact-avatar">${contact.avatar}</div>
            <div class="contact-info">
                <h4>${contact.name}</h4>
                <p class="contact-role">${contact.role}</p>
                <p class="last-message">${contact.lastMessage}</p>
            </div>
        `;
        return item;
    }

    async openChat(contact) {
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
            await this.fetchAndRenderMessages(contact.channel);
            this.subscribeChannel(contact.channel);
        } else {
            chatMessages.innerHTML = '';
            contact.messages.forEach((msg) => {
                chatMessages.appendChild(this.createMessageElement(msg));
            });
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async fetchAndRenderMessages(channel) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages || !this.supabase) return;
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .select('id, sender_name, body, created_at')
                .eq('channel', channel)
                .order('created_at', { ascending: true });
            chatMessages.innerHTML = '';
            if (error) throw error;
            const me = this.getSenderName();
            if (data && data.length > 0) {
                this.currentChat.lastMessage = data[data.length - 1].body;
                this.updateContactLastMessage(this.currentChat.channel, this.currentChat.lastMessage);
            }
            (data || []).forEach((row) => {
                const from = row.sender_name === me ? 'me' : 'them';
                const timestamp = this.formatTimestamp(row.created_at);
                chatMessages.appendChild(this.createMessageElement({ from, text: row.body, timestamp }));
            });
        } catch (e) {
            console.error('Failed to load messages', e);
            chatMessages.innerHTML = '<div class="message-error">Could not load messages. Check MESSAGES-SETUP.md and your Supabase config.</div>';
        }
    }

    subscribeChannel(channel) {
        if (!this.supabase) return;
        const chatMessages = document.querySelector('.chat-messages');
        const me = this.getSenderName();
        const channelFilter = this.supabase.channel('messages-' + channel)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'channel=eq.' + channel }, (payload) => {
                const row = payload.new;
                if (!row || !chatMessages) return;
                const from = row.sender_name === me ? 'me' : 'them';
                const timestamp = this.formatTimestamp(row.created_at);
                chatMessages.appendChild(this.createMessageElement({ from, text: row.body, timestamp }));
                chatMessages.scrollTop = chatMessages.scrollHeight;
                if (this.currentChat && this.currentChat.channel === channel) {
                    this.currentChat.lastMessage = row.body;
                    this.updateContactLastMessage(channel, row.body);
                }
            })
            .subscribe();
        this.realtimeUnsubscribe = () => {
            this.supabase.removeChannel(channelFilter);
        };
    }

    updateContactLastMessage(channel, text) {
        const el = document.querySelector(`.contact-item[data-channel="${channel}"] .last-message`);
        if (el) el.textContent = text;
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

        const me = this.getSenderName();
        const channel = this.currentChat.channel;

        if (this.supabase) {
            try {
                const { error } = await this.supabase.from('messages').insert({
                    channel,
                    sender_name: me,
                    body: text.trim()
                });
                if (error) throw error;
                this.currentChat.lastMessage = text.trim();
                this.updateContactLastMessage(channel, text.trim());
            } catch (e) {
                console.error('Send failed', e);
                const errEl = document.createElement('div');
                errEl.className = 'message-error';
                errEl.textContent = 'Could not send. Check MESSAGES-SETUP.md and Supabase.';
                chatMessages.appendChild(errEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            return;
        }

        const messageData = { from: 'me', text: text.trim(), timestamp: this.getCurrentTime() };
        chatMessages.appendChild(this.createMessageElement(messageData));
        this.currentChat.lastMessage = text.trim();
        this.updateContactLastMessage(channel, text.trim());
        this.currentChat.messages.push(messageData);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(() => this.simulateReply(), 1000 + Math.random() * 2000);
    }

    simulateReply() {
        if (!this.currentChat) return;
        const replies = [
            "Thanks for your message!",
            "I'll get back to you soon",
            "That's a great point",
            "Let me check and get back to you",
            "I appreciate you reaching out"
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const replyData = { from: 'them', text: randomReply, timestamp: this.getCurrentTime() };
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.appendChild(this.createMessageElement(replyData));
            this.currentChat.lastMessage = randomReply;
            this.updateContactLastMessage(this.currentChat.channel, randomReply);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        this.currentChat.messages.push(replyData);
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
