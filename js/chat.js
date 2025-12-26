// chat.js
class ChatSystem {
    constructor() {
        this.contacts = [
            { 
                id: 1,
                name: 'Chapter President', 
                role: 'Active Leadership', 
                lastMessage: 'Meeting tomorrow at 6pm',
                avatar: 'CP',
                messages: [
                    { from: 'them', text: 'Meeting tomorrow at 6pm', timestamp: '10:30 AM' },
                    { from: 'me', text: 'Thanks for the update!', timestamp: '10:32 AM' },
                    { from: 'them', text: 'See you at the meeting then.', timestamp: '10:35 AM' }
                ]
            },
            { 
                id: 2,
                name: 'Alumni Coordinator', 
                role: 'Alumni Relations', 
                lastMessage: 'New networking event',
                avatar: 'AC',
                messages: [
                    { from: 'them', text: 'New networking event next week', timestamp: '9:15 AM' },
                    { from: 'me', text: 'Sounds interesting!', timestamp: '9:20 AM' }
                ]
            },
            { 
                id: 3,
                name: 'Sarah Johnson', 
                role: 'Alumni - Google', 
                lastMessage: 'Job opportunity available',
                avatar: 'SJ',
                messages: [
                    { from: 'them', text: 'Job opportunity available', timestamp: 'Yesterday' },
                    { from: 'me', text: 'Can you share more details?', timestamp: 'Yesterday' }
                ]
            },
            { 
                id: 4,
                name: 'Mike Chen', 
                role: 'Alumni - Goldman Sachs', 
                lastMessage: 'Happy to help with interviews',
                avatar: 'MC',
                messages: [
                    { from: 'them', text: 'Happy to help with interviews', timestamp: '2 days ago' }
                ]
            }
        ];
        
        this.currentChat = null;
        this.init();
    }

    init() {
        this.setupChatInterface();
        this.loadContacts();
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
        this.contacts.forEach(contact => {
            const contactItem = this.createContactItem(contact);
            contactsList.appendChild(contactItem);
        });

        // Add click handlers to contacts
        document.querySelectorAll('.contact-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.contact-item').forEach(i => {
                    i.classList.remove('active');
                });
                item.classList.add('active');
                this.openChat(this.contacts[index]);
            });
        });

        // Open first chat by default
        if (this.contacts.length > 0) {
            this.openChat(this.contacts[0]);
            document.querySelector('.contact-item').classList.add('active');
        }
    }

    createContactItem(contact) {
        const item = document.createElement('div');
        item.className = 'contact-item';
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

    openChat(contact) {
        this.currentChat = contact;
        const chatHeader = document.querySelector('.chat-header h3');
        const chatMessages = document.querySelector('.chat-messages');
        
        if (chatHeader && chatMessages) {
            chatHeader.textContent = contact.name;
            chatMessages.innerHTML = '';
            
            contact.messages.forEach(msg => {
                const messageElement = this.createMessageElement(msg);
                chatMessages.appendChild(messageElement);
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    createMessageElement(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageData.from}`;
        messageElement.innerHTML = `
            <div class="message-content">${messageData.text}</div>
            <div class="message-time">${messageData.timestamp}</div>
        `;
        return messageElement;
    }

    sendMessage(text) {
        if (!text.trim() || !this.currentChat) return;
        
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageData = {
                from: 'me',
                text: text,
                timestamp: this.getCurrentTime()
            };
            
            const messageElement = this.createMessageElement(messageData);
            chatMessages.appendChild(messageElement);
            
            // Update contact's last message
            const contactElement = document.querySelector(`.contact-item:nth-child(${this.currentChat.id}) .last-message`);
            if (contactElement) {
                contactElement.textContent = text;
            }
            
            // Add to contact's message history
            this.currentChat.messages.push(messageData);
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Simulate reply after a delay
            setTimeout(() => {
                this.simulateReply();
            }, 1000 + Math.random() * 2000);
        }
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
        
        const replyData = {
            from: 'them',
            text: randomReply,
            timestamp: this.getCurrentTime()
        };
        
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = this.createMessageElement(replyData);
            chatMessages.appendChild(messageElement);
            
            // Update contact's last message
            const contactElement = document.querySelector(`.contact-item:nth-child(${this.currentChat.id}) .last-message`);
            if (contactElement) {
                contactElement.textContent = randomReply;
            }
            
            // Add to contact's message history
            this.currentChat.messages.push(replyData);
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
