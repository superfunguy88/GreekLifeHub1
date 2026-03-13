// Greek Life Hub - Cleaned Application Controller (no auth / chat conflicts)
class GreekLifeHub {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.initializeApp();
    }

    initializeApp() {
        // NEW: sync current user at startup + listen for changes
        this.syncUserFromStorage();
        this.setupAuthBridge();

        this.setupEventListeners();
        this.setupNavigation();
        this.initializeSections();
        this.setupSearch();
        this.setupDonationButtons();
    }

    // ---------------- AUTH BRIDGE (NEW) ----------------

    syncUserFromStorage() {
        try {
            const stored = localStorage.getItem('greekLifeUser');
            this.currentUser = stored ? JSON.parse(stored) : null;
        } catch (e) {
            console.warn('Failed to parse greekLifeUser from storage:', e);
            this.currentUser = null;
        }
    }

    setupAuthBridge() {
        // Listen for auth changes emitted by auth-real.js
        window.addEventListener('greeklife:auth-changed', (e) => {
            const user = e && e.detail ? e.detail.user : null;
            this.currentUser = user || null;
            this.onAuthChanged();
        });

        // Also run once right now so app state matches initial storage
        this.onAuthChanged();
    }

    onAuthChanged() {
        // Update UI that depends on "currentUser"
        // (auth-real.js already updates username + avatar + buttons)
        this.updateUserProfile();

        // OPTIONAL: if user logs out while on a private-ish section, kick them home
        // You can get stricter later — for now it's just a sane default.
        if (!this.currentUser && this.currentSection !== 'dashboard') {
            // Don't be obnoxious, but keep it consistent
            // this.navigateToSection('dashboard');
        }
    }

    // ---------------- GENERAL EVENT LISTENERS ----------------

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

        // Button event listeners (for things like "Create New Event", "Donate Now", "RSVP")
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e.target);
            });
        });

        // Modal close buttons
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
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`a[href="#${activeSectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    handleButtonClick(button) {
        const buttonText = button.textContent.trim();
        const buttonClass = button.className;

        if (buttonClass.includes('btn-primary') || buttonClass.includes('btn-secondary')) {
            switch (buttonText) {
                case 'Create New Event':
                    this.openEventModal();
                    break;
                case 'Donate Now':
                    this.processDonation(button);
                    break;
                case 'Send Message':
                    this.navigateToSection('messages'); // Let ChatSystem own the actual messaging
                    break;
                case 'RSVP':
                    this.handleRSVP(button);
                    break;
                default:
                    console.log('Button clicked:', buttonText);
            }
        }
    }

    // -------- EVENTS --------

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
        const eventsGrid = document.querySelector('.events-grid');
        if (eventsGrid) {
            const eventCard = this.createEventCard(eventData);
            eventsGrid.insertBefore(eventCard, eventsGrid.firstChild);
        }

        const modal = document.querySelector('#event-modal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    openEventModal() {
        const existing = document.getElementById('event-modal');
        if (existing) existing.remove();

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
                            <label for="event-date">Date</label>
                            <input type="date" id="event-date" name="event-date" required>
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
            const text = `Check out this event: ${eventData.title} on ${eventData.date} at ${eventData.location}`;
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Event details copied to clipboard!', 'success');
            });
        }
    }

    // -------- USER PROFILE (used by auth-real.js + now by app state) --------

    updateUserProfile() {
        if (this.currentUser) {
            const usernameElements = document.querySelectorAll('.username');
            usernameElements.forEach(element => {
                element.textContent = this.currentUser.name;
            });

            const avatarElements = document.querySelectorAll('.profile-pic');
            avatarElements.forEach(element => {
                element.setAttribute('alt', this.currentUser.name);
            });
        } else {
            // Keep this lightweight — auth-real.js already does the full logged-out reset.
            // This just ensures app state isn't stale.
        }
    }

    // -------- SECTIONS INIT --------

    setupNavigation() {
        this.navigateToSection('dashboard');
    }

    initializeSections() {
        this.initializeDashboard();
        this.initializeEvents();
        this.initializeAlumni();
        this.initializeDonations();
        // Messages are handled by ChatSystem in chat.js
    }

    initializeDashboard() {
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

        const createEventBtn = document.querySelector('.dashboard-section .btn-primary');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                this.openEventModal();
            });
        }
    }

    initializeEvents() {
        const eventsGrid = document.querySelector('.events-grid');
        if (!eventsGrid) return;

        const sampleEvents = [
            {
                title: 'Homecoming Weekend',
                date: 'October 15, 2025',
                location: 'Greek Row',
                description: 'Join us for a weekend of reunions, tailgates, and chapter events.'
            },
            {
                title: 'Charity Gala',
                date: 'October 22, 2025',
                location: 'Campus Ballroom',
                description: 'Formal charity event supporting local community organizations.'
            },
            {
                title: 'Alumni Networking Night',
                date: 'November 5, 2025',
                location: 'Alumni Center',
                description: 'Connect with alumni in your field and build your professional network.'
            }
        ];

        eventsGrid.innerHTML = '';
        sampleEvents.forEach(eventData => {
            const eventCard = this.createEventCard(eventData);
            eventsGrid.appendChild(eventCard);
        });
    }

    createEventCard(eventData) {
        const card = document.createElement('article');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${eventData.title}</h3>
            <p class="event-meta">${eventData.date} • ${eventData.location}</p>
            <p>${eventData.description}</p>
            <div class="event-actions">
                <button class="btn btn-secondary">RSVP</button>
                <button class="btn btn-outline">Share</button>
            </div>
        `;

        const rsvpBtn = card.querySelector('.btn-secondary');
        const shareBtn = card.querySelector('.btn-outline');

        rsvpBtn.addEventListener('click', () => this.handleRSVP(rsvpBtn));
        shareBtn.addEventListener('click', () => this.shareEvent(eventData));

        return card;
    }

    initializeAlumni() {
        const alumniGrid = document.querySelector('.alumni-grid');
        if (!alumniGrid) return;

        const alumniData = [
            {
                name: 'Sarah Johnson',
                chapter: 'Alpha Phi',
                gradYear: 2018,
                company: 'Google',
                role: 'Software Engineer',
                location: 'Seattle, WA'
            },
            {
                name: 'Mike Chen',
                chapter: 'Sigma Chi',
                gradYear: 2016,
                company: 'Goldman Sachs',
                role: 'Investment Analyst',
                location: 'New York, NY'
            },
            {
                name: 'Emily Thompson',
                chapter: 'Delta Gamma',
                gradYear: 2019,
                company: 'Nike',
                role: 'Marketing Specialist',
                location: 'Portland, OR'
            }
        ];

        alumniGrid.innerHTML = '';
        alumniData.forEach(alumni => {
            const card = this.createAlumniCard(alumni);
            alumniGrid.appendChild(card);
        });
    }

    createAlumniCard(alumni) {
        const card = document.createElement('article');
        card.className = 'alumni-card';
        card.innerHTML = `
            <h3>${alumni.name}</h3>
            <p class="alumni-meta">${alumni.chapter} • Class of ${alumni.gradYear}</p>
            <p>${alumni.role} at ${alumni.company}</p>
            <p class="alumni-location">${alumni.location}</p>
            <div class="alumni-actions">
                <button class="btn btn-secondary">Connect</button>
                <button class="btn btn-outline">Message</button>
            </div>
        `;

        const connectBtn = card.querySelector('.btn-secondary');
        const messageBtn = card.querySelector('.btn-outline');

        connectBtn.addEventListener('click', () => {
            this.sendConnectionRequest(alumni);
        });

        messageBtn.addEventListener('click', () => {
            this.openMessageToAlumni(alumni);
        });

        return card;
    }

    sendConnectionRequest(alumni) {
        this.showNotification(`Connection request sent to ${alumni.name}`, 'success');
    }

    openMessageToAlumni(alumni) {
        this.navigateToSection('messages');
        this.showNotification(`Opening message thread with ${alumni.name}...`, 'info');
        // ChatSystem will handle the actual chat UI
    }

    initializeDonations() {
        const donationStats = document.querySelector('.donation-stats');
        if (!donationStats) return;

        donationStats.innerHTML = `
            <div class="stat-card">
                <h3>$25,000</h3>
                <p>Raised This Year</p>
            </div>
            <div class="stat-card">
                <h3>120</h3>
                <p>Active Donors</p>
            </div>
            <div class="stat-card">
                <h3>15</h3>
                <p>Scholarships Funded</p>
            </div>
        `;
    }

    processDonation(button) {
        this.showNotification('Donation flow coming soon!', 'info');
    }

    // -------- SEARCH / FILTER --------

    setupSearch() {
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterContent(e.target.value);
            });
        }
    }

    setupDonationButtons() {
        const donateButtons = document.querySelectorAll('.btn-donate');
        donateButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.processDonation(button);
            });
        });
    }

    filterContent(query) {
        const searchQuery = query.toLowerCase().trim();

        this.filterEvents(searchQuery);
        this.filterAlumni(searchQuery);
    }

    filterEvents(query) {
        const eventCards = document.querySelectorAll('.event-card');
        eventCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'block' : 'none';
        });
    }

    filterAlumni(query) {
        const alumniCards = document.querySelectorAll('.alumni-card');
        alumniCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'block' : 'none';
        });
    }

    // -------- NOTIFICATIONS --------

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
            padding: '12px 18px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: '600',
            zIndex: '9999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'opacity 0.3s ease',
            maxWidth: '320px'
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

        document.body.appendChild(notification);

        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
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
        }, 4000);
    }
}

// Shrinking header
let lastScrollTop = 0;

window.addEventListener('scroll', function () {
    const header = document.querySelector('.main-header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.greekLifeApp === 'undefined') {
        window.greekLifeApp = new GreekLifeHub();
    }
});
