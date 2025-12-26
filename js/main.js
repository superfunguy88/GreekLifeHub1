// Greek Life Hub - Complete Application
class GreekLifeHub {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.loadUserData();
        this.setupNavigation();
        this.initializeSections();
        this.setupSearch();
        this.setupDonationButtons();
    }

    setupEventListeners() {
        // Navigation event listeners
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.navigateToSection(sectionId);
            });
        });

        // Button event listeners
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e.target);
            });
        });

        // Form submissions
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            });
        });
        
        // Add modal close functionality
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }


    navigateToSection(sectionId) {
        // Hide all main sections
        document.querySelectorAll('main > section').forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionId;
        }

        // Update active nav link
        this.updateActiveNavLink(sectionId);
    }

    updateActiveNavLink(activeSectionId) {
        // Remove active class from all links
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to the correct link
        const activeLink = document.querySelector(`a[href="#${activeSectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    handleButtonClick(button) {
        const buttonText = button.textContent.trim();
        const buttonClass = button.className;
        
        // Handle different button types
        if (buttonClass.includes('btn-primary') || buttonClass.includes('btn-secondary')) {
            switch(buttonText) {
                case 'Create New Event':
                    this.openEventModal();
                    break;
                case 'Donate Now':
                    this.processDonation(button);
                    break;
                case 'Send Message':
                    this.navigateToSection('messages');
                    break;
                case 'RSVP':
                    this.handleRSVP(button);
                    break;
                default:
                    console.log('Button clicked:', buttonText);
            }
        }
    }

    handleFormSubmit(form) {
        const formId = form.id;
        
        switch(formId) {
            case 'login-form':
                this.handleLogin(form);
                break;
            case 'event-form':
                this.handleEventCreation(form);
                break;
            default:
                console.log('Form submitted:', formId);
        }
    }

    handleLogin(form) {
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        
        // Simple validation
        if (username && password) {
            this.login(username, password);
        } else {
            this.showNotification('Please enter both username and password', 'error');
        }
    }

    login(username, password) {
        // Simulate login - in real app, this would call an API
        if (username.length > 0 && password.length > 0) {
            this.currentUser = {
                name: username,
                role: 'Member',
                chapter: 'Alpha Phi',
                graduationYear: 2024
            };
            
            localStorage.setItem('loggedInUser', username);
            this.updateUserProfile();
            this.navigateToSection('dashboard');
            this.showNotification(`Welcome back, ${username}!`, 'success');
            return true;
        }
        return false;
    }

    handleEventCreation(form) {
        const eventName = form.querySelector('#event-name').value;
        const eventDate = form.querySelector('#event-date').value;
        const eventLocation = form.querySelector('#event-location').value;
        const eventDescription = form.querySelector('#event-description').value;
        
        if (eventName && eventDate && eventLocation) {
            this.createEvent({
                title: eventName,
                date: eventDate,
                location: eventLocation,
                description: eventDescription
            });
            this.showNotification('Event created successfully!', 'success');
        } else {
            this.showNotification('Please fill all required fields', 'error');
        }
    }

    createEvent(eventData) {
        // Add event to the events grid
        const eventsGrid = document.querySelector('.events-grid');
        if (eventsGrid) {
            const eventCard = this.createEventCard(eventData);
            eventsGrid.insertBefore(eventCard, eventsGrid.firstChild);
        }
        
        // Close modal if it exists
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    openEventModal() {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'event-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Event</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="event-form">
                        <div class="form-group">
                            <label for="event-name">Event Name</label>
                            <input type="text" id="event-name" name="event-name" required>
                        </div>
                        <div class="form-group">
                            <label for="event-date">Date & Time</label>
                            <input type="datetime-local" id="event-date" name="event-date" required>
                        </div>
                        <div class="form-group">
                            <label for="event-location">Location</label>
                            <input type="text" id="event-location" name="event-location" required>
                        </div>
                        <div class="form-group">
                            <label for="event-description">Description</label>
                            <textarea id="event-description" name="event-description" rows="4" required></textarea>
                        </div>
                        <button type="submit" class="btn-primary">Create Event</button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        const form = modal.querySelector('#event-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventCreation(form);
            document.body.removeChild(modal);
        });
    }

    handleRSVP(button) {
        if (button.textContent === 'RSVP') {
            button.textContent = 'RSVPed!';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-primary');
            this.showNotification('You have RSVPed for this event!', 'success');
        } else {
            button.textContent = 'RSVP';
            button.classList.remove('btn-primary');
            button.classList.add('btn-secondary');
            this.showNotification('RSVP canceled', 'info');
        }
    }

    shareEvent(eventData) {
        if (navigator.share) {
            navigator.share({
                title: eventData.title,
                text: `Check out this event: ${eventData.description}`,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            const text = `Check out this event: ${eventData.title} on ${eventData.date} at ${eventData.location}`;
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Event details copied to clipboard!', 'success');
            });
        }
    }

    loadUserData() {
        // Check if user is logged in
        const savedUser = localStorage.getItem('loggedInUser');
        if (savedUser) {
            this.currentUser = {
                name: savedUser,
                role: 'Member',
                chapter: 'Alpha Phi',
                graduationYear: 2024
            };
        } else {
            this.currentUser = {
                name: 'John Doe',
                role: 'Member',
                chapter: 'Alpha Phi',
                graduationYear: 2024
            };
        }
        
        // Update UI with user data
        this.updateUserProfile();
    }

    updateUserProfile() {
        if (this.currentUser) {
            const usernameElements = document.querySelectorAll('.username');
            usernameElements.forEach(element => {
                element.textContent = this.currentUser.name;
            });
            
            const avatarElements = document.querySelectorAll('.profile-pic');
            avatarElements.forEach(element => {
                element.textContent = this.currentUser.name.charAt(0);
            });
        }
    }

    setupNavigation() {
        // Set initial active section
        this.navigateToSection('dashboard');
    }

    initializeSections() {
        // Initialize each section with sample data
        this.initializeDashboard();
        this.initializeEvents();
        this.initializeAlumni();
        this.initializeDonations();
        this.initializeMessages();
    }

    initializeDashboard() {
        // Add more dynamic content to dashboard
        const eventList = document.querySelector('.event-list');
        const messageList = document.querySelector('.message-list');
        
        if (eventList) {
            eventList.innerHTML = `
                <li>Homecoming - Oct 15 <span class="badge">RSVP</span></li>
                <li>Charity Gala - Oct 22 <span class="badge">RSVP</span></li>
                <li>Alumni Networking - Nov 5 <span class="badge new">NEW</span></li>
            `;
        }
        
        if (messageList) {
            messageList.innerHTML = `
                <li>President: Meeting Tomorrow <span class="badge">NEW</span></li>
                <li>Alumni Network: New Opportunities</li>
                <li>Scholarship Committee: Application Deadline</li>
            `;
        }
        
        // Add quick action event listeners
        const createEventBtn = document.querySelector('.dashboard-section .btn-primary');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                this.openEventModal();
            });
        }
        
        const sendMessageBtn = document.querySelector('.dashboard-section .btn-secondary');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                this.navigateToSection('messages');
            });
        }
    }

    initializeEvents() {
        // Populate events with sample data
        const eventsGrid = document.querySelector('.events-grid');
        if (!eventsGrid) return;
        
        // Clear existing content
        eventsGrid.innerHTML = '';
        
        const sampleEvents = [
            {
                title: 'Homecoming Dance',
                date: 'October 15, 2024',
                location: 'University Center',
                description: 'Annual homecoming celebration with dinner, dancing, and entertainment'
            },
            {
                title: 'Charity Gala',
                date: 'October 22, 2024',
                location: 'Grand Ballroom',
                description: 'Fundraising event for local children\'s hospital'
            },
            {
                title: 'Alumni Networking Night',
                date: 'November 5, 2024',
                location: 'Business School',
                description: 'Connect with alumni in various industries for career opportunities'
            }
        ];

        sampleEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            eventsGrid.appendChild(eventCard);
        });
    }

    createEventCard(eventData) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-image">
                <span>📅</span>
            </div>
            <div class="event-details">
                <h3>${eventData.title}</h3>
                <div class="event-meta">
                    <span>📍 ${eventData.location}</span>
                    <span>⏰ ${eventData.date}</span>
                </div>
                <p class="event-description">${eventData.description}</p>
                <div class="event-actions">
                    <button class="btn btn-secondary rsvp-btn">RSVP</button>
                    <button class="btn btn-outline share-btn">Share</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const rsvpButton = card.querySelector('.rsvp-btn');
        rsvpButton.addEventListener('click', () => {
            this.handleRSVP(rsvpButton);
        });
        
        const shareButton = card.querySelector('.share-btn');
        shareButton.addEventListener('click', () => {
            this.shareEvent(eventData);
        });
        
        return card;
    }

    initializeAlumni() {
        // Populate alumni directory with sample data
        const alumniGrid = document.querySelector('.alumni-grid');
        if (!alumniGrid) return;
        
        const sampleAlumni = [
            {
                name: 'Sarah Johnson',
                chapter: 'Alpha Phi',
                position: 'Marketing Director at Google',
                graduation: '2018',
                avatar: 'SJ'
            },
            {
                name: 'Michael Chen',
                chapter: 'Sigma Chi',
                position: 'Financial Analyst at Goldman Sachs',
                graduation: '2019',
                avatar: 'MC'
            },
            {
                name: 'Emily Rodriguez',
                chapter: 'Delta Gamma',
                position: 'Attorney at Law',
                graduation: '2020',
                avatar: 'ER'
            },
            {
                name: 'David Thompson',
                chapter: 'Phi Delta Theta',
                position: 'Entrepreneur - Tech Startup Founder',
                graduation: '2017',
                avatar: 'DT'
            }
        ];

        alumniGrid.innerHTML = '';
        sampleAlumni.forEach(alumni => {
            const alumniCard = this.createAlumniCard(alumni);
            alumniGrid.appendChild(alumniCard);
        });
    }

    createAlumniCard(alumniData) {
        const card = document.createElement('div');
        card.className = 'alumni-card';
        card.innerHTML = `
            <div class="alumni-avatar" style="background: linear-gradient(135deg, var(--primary-gold), var(--light-blue));">
                ${alumniData.avatar}
            </div>
            <div class="alumni-info">
                <h3>${alumniData.name}</h3>
                <div class="alumni-chapter">${alumniData.chapter} '${alumniData.graduation.slice(-2)}</div>
                <div class="alumni-position">${alumniData.position}</div>
                <div class="alumni-actions">
                    <button class="btn btn-outline connect-btn">Connect</button>
                    <button class="btn btn-secondary message-btn">Message</button>
                </div>
            </div>
        `;
        
        // Add click events
        const connectButton = card.querySelector('.connect-btn');
        connectButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sendConnectionRequest(alumniData);
        });
        
        const messageButton = card.querySelector('.message-btn');
        messageButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openMessageToAlumni(alumniData);
        });
        
        return card;
    }

    sendConnectionRequest(alumniData) {
        // Simulate connection request
        this.showNotification(`Connection request sent to ${alumniData.name}!`, 'success');
        
        // In a real app, this would send a request to the server
        setTimeout(() => {
            this.showNotification(`${alumniData.name} accepted your connection request!`, 'success');
        }, 2000);
    }

    openMessageToAlumni(alumniData) {
        // Navigate to messages section and open chat with alumni
        this.navigateToSection('messages');
        this.showNotification(`Opening chat with ${alumniData.name}...`, 'info');
        
        // In a real implementation, this would open the specific chat
    }

    initializeDonations() {
        // Donation section is already set up with HTML
        console.log('Donations initialized');
    }

    processDonation(button) {
        const card = button.closest('.donation-card');
        const fundType = card.querySelector('h3').textContent;
        
        const amount = prompt(`Enter donation amount for ${fundType}:`, '50');
        
        if (amount && !isNaN(amount) && amount > 0) {
            this.showNotification(`Thank you for your $${amount} donation to the ${fundType}!`, 'success');
            
            // In a real app, this would process a payment
            // For now, we'll just simulate it
            setTimeout(() => {
                this.showNotification('Donation processed successfully!', 'success');
            }, 1500);
        } else if (amount !== null) {
            this.showNotification('Please enter a valid amount', 'error');
        }
    }


    initializeMessages() {
        // Set up sample contacts
        const contactsList = document.querySelector('.contacts-list');
        if (!contactsList) return;
        
        const sampleContacts = [
            { 
                id: 1,
                name: 'Chapter President', 
                role: 'Active Leadership', 
                lastMessage: 'Meeting tomorrow at 6pm',
                avatar: 'CP'
            },
            { 
                id: 2,
                name: 'Alumni Coordinator', 
                role: 'Alumni Relations', 
                lastMessage: 'New networking event',
                avatar: 'AC'
            },
            { 
                id: 3,
                name: 'Sarah Johnson', 
                role: 'Alumni - Google', 
                lastMessage: 'Job opportunity available',
                avatar: 'SJ'
            },
            { 
                id: 4,
                name: 'Mike Chen', 
                role: 'Alumni - Goldman Sachs', 
                lastMessage: 'Happy to help with interviews',
                avatar: 'MC'
            }
        ];

        contactsList.innerHTML = '';
        sampleContacts.forEach(contact => {
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
                this.openChat(sampleContacts[index]);
            });
        });

        // Set up message sending
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

    createContactItem(contactData) {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <div class="contact-avatar">${contactData.avatar}</div>
            <div class="contact-info">
                <h4>${contactData.name}</h4>
                <p>${contactData.role}</p>
                <p>${contactData.lastMessage}</p>
            </div>
        `;
        return item;
    }

    openChat(contact) {
        const chatHeader = document.querySelector('.chat-header h3');
        const chatMessages = document.querySelector('.chat-messages');
        
        if (chatHeader && chatMessages) {
            chatHeader.textContent = contact.name;
            chatMessages.innerHTML = '';
            
            // Add sample messages
            const messages = [
                { from: 'them', text: contact.lastMessage },
                { from: 'me', text: 'Thanks for the update!' },
                { from: 'them', text: 'See you at the meeting then.' }
            ];
            
            messages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${msg.from}`;
                messageElement.textContent = msg.text;
                chatMessages.appendChild(messageElement);
            });
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendMessage(text) {
        if (!text.trim()) return;
        
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message me';
            messageElement.textContent = text;
            chatMessages.appendChild(messageElement);
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Simulate reply
            setTimeout(() => {
                const replyElement = document.createElement('div');
                replyElement.className = 'message them';
                replyElement.textContent = 'Thanks for your message!';
                chatMessages.appendChild(replyElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }
    }

    // Enhanced Search Functionality
    setupSearch() {
        // Events search
        const eventsSearch = document.querySelector('#events .search-input');
        if (eventsSearch) {
            eventsSearch.addEventListener('input', (e) => {
                this.filterEvents(e.target.value);
            });
        }
        
        // Alumni search
        const alumniSearch = document.querySelector('#alumni .search-input');
        if (alumniSearch) {
            alumniSearch.addEventListener('input', (e) => {
                this.filterAlumni(e.target.value);
            });
        }
    }

    setupDonationButtons() {
        const donateButtons = document.querySelectorAll('.btn-donate');
        donateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.processDonation(e.target);
            });
        });
    }


    filterEvents(query) {
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('.event-description').textContent.toLowerCase();
            if (query === '' || title.includes(query.toLowerCase()) || description.includes(query.toLowerCase())) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }


    filterAlumni(query) {
        const alumniCards = document.querySelectorAll('.alumni-card');
        alumniCards.forEach(card => {
            const name = card.querySelector('h3').textContent.toLowerCase();
            const position = card.querySelector('.alumni-position').textContent.toLowerCase();
            if (query === '' || name.includes(query.toLowerCase()) || position.includes(query.toLowerCase())) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }


    // Enhanced notification system
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        } else if (type === 'warning') {
            notification.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        }
        
        // Add to document
        document.body.appendChild(notification);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);
    }
    
}

// Enhanced User Authentication
class UserAuth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkExistingSession();
        this.setupLoginEvents();
        this.setupLogoutEvents();
    }

    checkExistingSession() {
        const userData = localStorage.getItem('greekLifeUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForLoggedInUser();
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

        // Logout button
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    setupLogoutEvents() {
        // Logout from multiple places
        const logoutButtons = document.querySelectorAll('#logout-btn, .logout-btn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });
    }

    async handleLogin(form) {
        const username = form.querySelector('#username').value;
        const password = form.querySelector('#password').value;
        
        // Simple validation
        if (!username || !password) {
            this.showNotification('Please enter both username and password', 'error');
            return;
        }

        // Simulate API call (in real app, this would be an actual API request)
        try {
            const user = await this.authenticateUser(username, password);
            if (user) {
                this.loginSuccess(user);
            } else {
                this.showNotification('Invalid credentials', 'error');
            }
        } catch (error) {
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    // Simulate authentication (replace with real API call)
    authenticateUser(username, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock user data - in real app, this comes from server
                const mockUsers = {
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

                const user = mockUsers[username];
                if (user && password === 'password123') { // Simple mock password check
                    resolve(user);
                } else {
                    resolve(null);
                }
            }, 500); // Simulate network delay
        });
    }

    loginSuccess(user) {
        this.currentUser = user;
        localStorage.setItem('greekLifeUser', JSON.stringify(user));
        this.updateUIForLoggedInUser();
        this.showNotification(`Welcome back, ${user.name}!`, 'success');
        
        // Navigate to dashboard
        if (window.greekLifeApp) {
            window.greekLifeApp.navigateToSection('dashboard');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('greekLifeUser');
        this.updateUIForLoggedOutUser();
        this.showNotification('You have been logged out', 'info');
        
        // Redirect to login or homepage
        window.location.reload();
    }

    updateUIForLoggedInUser() {
        // Update user profile display
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            if (this.currentUser) {
                element.textContent = this.currentUser.name;
            }
        });

        // Update avatar
        const avatarElements = document.querySelectorAll('.profile-pic, .avatar');
        avatarElements.forEach(element => {
            if (this.currentUser) {
                element.textContent = this.currentUser.avatar || this.currentUser.name.charAt(0);
            }
        });

        // Show/hide login-related UI elements
        document.querySelectorAll('.logged-in').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.logged-out').forEach(el => el.style.display = 'none');
    }

    updateUIForLoggedOutUser() {
        // Reset user profile display
        const usernameElements = document.querySelectorAll('.username');
        usernameElements.forEach(element => {
            element.textContent = 'Guest';
        });

        // Show/hide login-related UI elements
        document.querySelectorAll('.logged-in').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.logged-out').forEach(el => el.style.display = 'block');
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
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
        
        // Add to document
        document.body.appendChild(notification);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        // Remove after 3 seconds
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

// Initialize auth when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.userAuth = new UserAuth();
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.greekLifeApp = new GreekLifeHub();
});


// More Sensitive Shrinking Header
let lastScrollTop = 0;

window.addEventListener('scroll', function() {
    const header = document.querySelector('.main-header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) { // Trigger earlier - changed from 100 to 50
        header.classList.add('shrunk');
    } else {
        header.classList.remove('shrunk');
    }
    
    lastScrollTop = scrollTop;
});




// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GreekLifeHub;
}
