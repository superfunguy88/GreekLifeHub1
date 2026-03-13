// Greek Life Hub - Application Controller (Events made real w/ localStorage)
// NOTE: still static-host friendly (no backend required)

class GreekLifeHub {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';

        // LocalStorage keys
        this.STORAGE_KEYS = {
            EVENTS: 'glh_events_v1',
            RSVPS: 'glh_rsvps_v1'
        };

        this.initializeApp();
    }

    // ---------------- APP INIT ----------------

    initializeApp() {
        // Auth sync + listen for changes from auth-real.js
        this.syncUserFromStorage();
        this.setupAuthBridge();

        // Seed demo data once (events only)
        this.seedEventsIfEmpty();

        this.setupEventListeners();
        this.setupNavigation();
        this.initializeSections();
        this.setupSearch();
        this.setupDonationButtons();
    }

    // ---------------- AUTH BRIDGE ----------------

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
        window.addEventListener('greeklife:auth-changed', (e) => {
            const user = e && e.detail ? e.detail.user : null;
            this.currentUser = user || null;
            this.onAuthChanged();
        });

        this.onAuthChanged();
    }

    onAuthChanged() {
        this.updateUserProfile();

        // When auth changes, re-render RSVP states (per-user)
        this.renderEvents();
        this.renderDashboardUpcomingEvents();
        this.renderDashboardRecentMessages();
    }

    // ---------------- GENERAL EVENT LISTENERS ----------------

    setupEventListeners() {
        // Navigation links
        const navLinks = document.querySelectorAll('.main-nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.navigateToSection(sectionId);
            });
        });

        // Generic buttons (Create Event, Donate Now, Send Message, etc.)
        document.querySelectorAll('.btn, .btn-primary, .btn-secondary').forEach(button => {
            button.addEventListener('click', (e) => {
                // only handle if it's an actual button element
                const target = e.target.closest('button');
                if (target) this.handleButtonClick(target);
            });
        });

        // Modal close buttons (static ones in HTML)
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });
    }

    navigateToSection(sectionId) {
        document.querySelectorAll('main > section').forEach(section => {
            section.style.display = 'none';
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionId;
        }

        this.updateActiveNavLink(sectionId);

        // When you navigate, make sure UIs are up to date
        if (sectionId === 'events') {
            this.renderEvents();
        }
        if (sectionId === 'dashboard') {
            this.renderDashboardUpcomingEvents();
            this.renderDashboardRecentMessages();
        }
        if (sectionId === 'messages') {
            // If chat exists, force refresh render (handles missed auth)
            if (window.greekLifeChat && typeof window.greekLifeChat.renderContacts === 'function') {
                window.greekLifeChat.renderContacts();
            }
        }
    }

    updateActiveNavLink(activeSectionId) {
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`a[href="#${activeSectionId}"]`);
        if (activeLink) activeLink.classList.add('active');
    }

    handleButtonClick(button) {
        const text = (button.textContent || '').trim();

        if (text === 'Create New Event' || text === 'Create Event') {
            this.openEventModal();
            return;
        }

        if (text === 'Donate Now') {
            this.processDonation(button);
            return;
        }

        if (text === 'Send Message') {
            this.navigateToSection('messages');
            return;
        }
    }

    // ---------------- STORAGE HELPERS ----------------

    loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`Failed to parse storage key "${key}"`, e);
            return fallback;
        }
    }

    saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to save storage key "${key}"`, e);
        }
    }

    // ---------------- EVENTS + RSVPS (REAL) ----------------

    seedEventsIfEmpty() {
        const existing = this.loadJSON(this.STORAGE_KEYS.EVENTS, null);
        if (Array.isArray(existing) && existing.length > 0) return;

        const seed = [
            {
                id: this.makeId(),
                title: 'Homecoming Weekend',
                dateISO: '2026-10-15',
                location: 'Greek Row',
                description: 'Join us for a weekend of reunions, tailgates, and chapter events.',
                createdAt: Date.now()
            },
            {
                id: this.makeId(),
                title: 'Charity Gala',
                dateISO: '2026-10-22',
                location: 'Campus Ballroom',
                description: 'Formal charity event supporting local community organizations.',
                createdAt: Date.now() - 1000
            },
            {
                id: this.makeId(),
                title: 'Alumni Networking Night',
                dateISO: '2026-11-05',
                location: 'Alumni Center',
                description: 'Connect with alumni in your field and build your professional network.',
                createdAt: Date.now() - 2000
            }
        ];

        this.saveJSON(this.STORAGE_KEYS.EVENTS, seed);
    }

    getEvents() {
        const events = this.loadJSON(this.STORAGE_KEYS.EVENTS, []);
        if (!Array.isArray(events)) return [];
        return events.slice().sort((a, b) => {
            const ad = new Date(a.dateISO).getTime();
            const bd = new Date(b.dateISO).getTime();
            return ad - bd;
        });
    }

    addEvent(event) {
        const events = this.loadJSON(this.STORAGE_KEYS.EVENTS, []);
        events.unshift(event);
        this.saveJSON(this.STORAGE_KEYS.EVENTS, events);
    }

    getUserKey() {
        if (!this.currentUser) return null;
        const email = (this.currentUser.email || '').trim().toLowerCase();
        if (email) return email;
        const name = (this.currentUser.name || '').trim().toLowerCase();
        const provider = (this.currentUser.provider || 'local').trim().toLowerCase();
        return `${provider}:${name || 'unknown'}`;
    }

    getRsvpsMap() {
        const map = this.loadJSON(this.STORAGE_KEYS.RSVPS, {});
        return map && typeof map === 'object' ? map : {};
    }

    isRsvped(eventId) {
        const userKey = this.getUserKey();
        if (!userKey) return false;
        const map = this.getRsvpsMap();
        return !!(map[userKey] && map[userKey][eventId]);
    }

    toggleRsvp(eventId) {
        if (!this.currentUser) {
            this.showNotification('Login required to RSVP.', 'warning');
            this.openLoginModal();
            return;
        }

        const userKey = this.getUserKey();
        const map = this.getRsvpsMap();
        if (!map[userKey]) map[userKey] = {};

        if (map[userKey][eventId]) {
            delete map[userKey][eventId];
            this.saveJSON(this.STORAGE_KEYS.RSVPS, map);
            this.showNotification('RSVP canceled.', 'info');
        } else {
            map[userKey][eventId] = true;
            this.saveJSON(this.STORAGE_KEYS.RSVPS, map);
            this.showNotification('You are RSVP’d!', 'success');
        }

        this.renderEvents();
        this.renderDashboardUpcomingEvents();
    }

    // ---------------- UI RENDERING ----------------

    initializeSections() {
        this.initializeDashboard();
        this.initializeEvents();
        this.initializeAlumni();
        this.initializeDonations();
    }

    initializeDashboard() {
        this.renderDashboardUpcomingEvents();
        this.renderDashboardRecentMessages();

        const createEventBtn = document.querySelector('#dashboard .btn-primary');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => this.openEventModal());
        }
    }

    renderDashboardUpcomingEvents() {
        const eventList = document.querySelector('#dashboard .event-list');
        if (!eventList) return;

        if (!this.currentUser) {
            eventList.innerHTML = `<li>Please log in to view upcoming events.</li>`;
            return;
        }

        const events = this.getEvents()
            .filter(e => this.isUpcoming(e.dateISO))
            .slice(0, 3);

        if (events.length === 0) {
            eventList.innerHTML = `<li>No upcoming events yet.</li>`;
            return;
        }

        eventList.innerHTML = events.map(e => {
            const dateText = this.formatShortDate(e.dateISO);
            const badge = this.isRsvped(e.id) ? `<span class="badge">RSVP’d</span>` : `<span class="badge">RSVP</span>`;
            return `<li>${this.escapeHtml(e.title)} - ${dateText} ${badge}</li>`;
        }).join('');
    }

    // NEW: Dashboard “Recent Messages” becomes real (pulls from chat.js)
    renderDashboardRecentMessages() {
        const msgList = document.querySelector('#dashboard .message-list');
        if (!msgList) return;

        if (!this.currentUser) {
            msgList.innerHTML = `<li>Please log in to view recent messages.</li>`;
            return;
        }

        if (!window.greekLifeChat || typeof window.greekLifeChat.getDashboardRecentMessages !== 'function') {
            msgList.innerHTML = `<li>Messages are loading...</li>`;
            return;
        }

        const items = window.greekLifeChat.getDashboardRecentMessages(3);

        if (!items || items.length === 0) {
            msgList.innerHTML = `<li>No messages yet.</li>`;
            return;
        }

        msgList.innerHTML = items.map(it => {
            const preview = (it.text || '').length > 40 ? (it.text || '').slice(0, 40) + '…' : (it.text || '');
            const time = it.time ? `<span class="message-time">${this.escapeHtml(it.time)}</span>` : '';
            return `<li>${this.escapeHtml(it.contactName)}: ${this.escapeHtml(preview)} ${time}</li>`;
        }).join('');
    }

    initializeEvents() {
        this.renderEvents();

        const createBtn = document.querySelector('#events .btn-primary');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openEventModal());
        }
    }

    renderEvents(filterQuery = '') {
        const eventsGrid = document.querySelector('#events .events-grid');
        if (!eventsGrid) return;

        if (!this.currentUser) {
            eventsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 18px; opacity: 0.85;">
                    <strong>Please log in</strong> to view events.
                </div>
            `;
            return;
        }

        const q = (filterQuery || '').toLowerCase().trim();
        let events = this.getEvents();

        if (q) {
            events = events.filter(e => {
                const blob = `${e.title} ${e.location} ${e.description}`.toLowerCase();
                return blob.includes(q);
            });
        }

        eventsGrid.innerHTML = '';
        events.forEach(eventData => {
            const card = this.createEventCard(eventData);
            eventsGrid.appendChild(card);
        });
    }

    createEventCard(eventData) {
        const card = document.createElement('article');
        card.className = 'event-card';

        const dateText = this.formatLongDate(eventData.dateISO);
        const isRsvped = this.isRsvped(eventData.id);

        card.innerHTML = `
            <h3>${this.escapeHtml(eventData.title)}</h3>
            <p class="event-meta">${dateText} • ${this.escapeHtml(eventData.location)}</p>
            <p>${this.escapeHtml(eventData.description)}</p>
            <div class="event-actions">
                <button class="btn ${isRsvped ? 'btn-primary' : 'btn-secondary'}" data-action="rsvp">
                    ${isRsvped ? 'RSVP’d!' : 'RSVP'}
                </button>
                <button class="btn btn-outline" data-action="share">Share</button>
            </div>
        `;

        const rsvpBtn = card.querySelector('[data-action="rsvp"]');
        const shareBtn = card.querySelector('[data-action="share"]');

        rsvpBtn.addEventListener('click', () => this.toggleRsvp(eventData.id));
        shareBtn.addEventListener('click', () => this.shareEvent({
            title: eventData.title,
            description: eventData.description,
            date: dateText,
            location: eventData.location
        }));

        return card;
    }

    // ---------------- EVENT MODAL (CREATE) ----------------

    openEventModal() {
        const existing = document.getElementById('event-modal');
        if (existing) existing.remove();

        if (!this.currentUser) {
            this.showNotification('Login required to create events.', 'warning');
            this.openLoginModal();
            return;
        }

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
        closeBtn.addEventListener('click', () => modal.remove());

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        const form = modal.querySelector('#event-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEventCreation(form, modal);
        });
    }

    handleEventCreation(form, modal) {
        const title = form.querySelector('#event-name').value.trim();
        const dateISO = form.querySelector('#event-date').value.trim();
        const location = form.querySelector('#event-location').value.trim();
        const description = form.querySelector('#event-description').value.trim();

        if (!title || !dateISO || !location || !description) {
            this.showNotification('Please fill all required fields.', 'error');
            return;
        }

        const eventData = {
            id: this.makeId(),
            title,
            dateISO,
            location,
            description,
            createdAt: Date.now()
        };

        this.addEvent(eventData);

        this.showNotification('Event created!', 'success');
        if (modal) modal.remove();

        this.renderEvents();
        this.renderDashboardUpcomingEvents();

        this.navigateToSection('events');
    }

    // ---------------- ALUMNI / DONATIONS (still demo) ----------------

    initializeAlumni() {
        const alumniGrid = document.querySelector('.alumni-grid');
        if (!alumniGrid) return;

        const alumniData = [
            { name: 'Sarah Johnson', chapter: 'Alpha Phi', gradYear: 2018, company: 'Google', role: 'Software Engineer', location: 'Seattle, WA' },
            { name: 'Mike Chen', chapter: 'Sigma Chi', gradYear: 2016, company: 'Goldman Sachs', role: 'Investment Analyst', location: 'New York, NY' },
            { name: 'Emily Thompson', chapter: 'Delta Gamma', gradYear: 2019, company: 'Nike', role: 'Marketing Specialist', location: 'Portland, OR' }
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
            <h3>${this.escapeHtml(alumni.name)}</h3>
            <p class="alumni-meta">${this.escapeHtml(alumni.chapter)} • Class of ${alumni.gradYear}</p>
            <p>${this.escapeHtml(alumni.role)} at ${this.escapeHtml(alumni.company)}</p>
            <p class="alumni-location">${this.escapeHtml(alumni.location)}</p>
            <div class="alumni-actions">
                <button class="btn btn-secondary">Connect</button>
                <button class="btn btn-outline">Message</button>
            </div>
        `;

        const connectBtn = card.querySelector('.btn-secondary');
        const messageBtn = card.querySelector('.btn-outline');

        connectBtn.addEventListener('click', () => {
            this.showNotification(`Connection request sent to ${alumni.name}`, 'success');
        });

        messageBtn.addEventListener('click', () => {
            this.navigateToSection('messages');

            const role = `Alumni - ${alumni.company}`;
            if (window.greekLifeChat && typeof window.greekLifeChat.openOrCreateThread === 'function') {
                window.greekLifeChat.openOrCreateThread({ name: alumni.name, role });
            } else {
                this.showNotification(`Opening message thread with ${alumni.name}...`, 'info');
            }
        });

        return card;
    }

    initializeDonations() {}

    processDonation() {
        this.showNotification('Donation flow coming soon!', 'info');
    }

    // ---------------- SEARCH ----------------

    setupSearch() {
        const eventsSearch = document.querySelector('#events .search-input');
        if (eventsSearch) {
            eventsSearch.addEventListener('input', (e) => {
                this.renderEvents(e.target.value);
            });
        }

        const alumniSearch = document.querySelector('#alumni .search-input');
        if (alumniSearch) {
            alumniSearch.addEventListener('input', (e) => {
                this.filterAlumni(e.target.value);
            });
        }

        const chapterFilter = document.querySelector('#alumni .chapter-filter');
        if (chapterFilter) {
            chapterFilter.addEventListener('change', () => {
                const q = alumniSearch ? alumniSearch.value : '';
                this.filterAlumni(q);
            });
        }
    }

    filterAlumni(query) {
        const q = (query || '').toLowerCase().trim();
        const chapter = (document.querySelector('#alumni .chapter-filter')?.value || 'All Chapters').trim();

        const alumniCards = document.querySelectorAll('.alumni-card');
        alumniCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const chapterMatch = chapter === 'All Chapters' || text.includes(chapter.toLowerCase());
            const queryMatch = !q || text.includes(q);
            card.style.display = (chapterMatch && queryMatch) ? 'block' : 'none';
        });
    }

    setupDonationButtons() {
        const donateButtons = document.querySelectorAll('.btn-donate');
        donateButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.processDonation(button);
            });
        });
    }

    // ---------------- USER PROFILE ----------------

    updateUserProfile() {
        if (this.currentUser) {
            document.querySelectorAll('.username').forEach(el => (el.textContent = this.currentUser.name));
        }
    }

    // ---------------- UTILITIES ----------------

    openLoginModal() {
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.style.display = 'block';
    }

    makeId() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    isUpcoming(dateISO) {
        const d = new Date(dateISO);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
    }

    formatShortDate(dateISO) {
        const d = new Date(dateISO);
        if (Number.isNaN(d.getTime())) return dateISO;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    formatLongDate(dateISO) {
        const d = new Date(dateISO);
        if (Number.isNaN(d.getTime())) return dateISO;
        return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
    }

    escapeHtml(str) {
        return String(str || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
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
            setTimeout(() => notification.remove(), 300);
        });

        setTimeout(() => {
            if (!notification.parentNode) return;
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }, 3500);
    }

    setupNavigation() {
        this.navigateToSection('dashboard');
    }
}

// Shrinking header behavior
let lastScrollTop = 0;
window.addEventListener('scroll', function () {
    const header = document.querySelector('.main-header');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) header.classList.add('shrunk');
    else header.classList.remove('shrunk');

    lastScrollTop = scrollTop;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.greekLifeApp === 'undefined') {
        window.greekLifeApp = new GreekLifeHub();
    }
});
