// Theme & Settings Controller
import { auth } from './auth.js';
import { storage } from './storage.js';
import { getUserNotifications, getUnreadCount, markAllAsRead } from './notifications.js';
import { escapeHtml, formatTimeAgo } from './utils.js';

// Check authentication
if (!auth.getCurrentUser()) {
    window.location.href = 'login.html';
}

const currentUser = auth.getCurrentUser();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    initializeTheme();
    updateNotificationBadge();
});

function loadSettings() {
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editBio').value = currentUser.bio || '';
    document.getElementById('editProfilePic').value = currentUser.profilePic;
}

function setupEventListeners() {
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleSaveProfile);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('change', handleThemeToggle);
    
    // Account actions
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('clearDataBtn').addEventListener('click', handleClearData);
    
    // Notifications
    document.getElementById('notificationsBtn').addEventListener('click', showNotifications);
    document.getElementById('closeNotifications').addEventListener('click', hideNotifications);
    
    // Profile dropdown
    document.getElementById('profileDropdownBtn').addEventListener('click', toggleProfileDropdown);
    document.getElementById('navbarLogoutBtn').addEventListener('click', handleLogout);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-menu') && !e.target.closest('#profileDropdownBtn')) {
            closeAllDropdowns();
        }
    });
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('hidden');
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
    });
}

function handleSaveProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const profilePic = document.getElementById('editProfilePic').value.trim();
    
    if (!name) {
        alert('Name is required');
        return;
    }
    
    const updates = { name, bio };
    if (profilePic) {
        updates.profilePic = profilePic;
    }
    
    if (auth.updateProfile(updates)) {
        showSuccess('Profile updated successfully!');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } else {
        alert('Failed to update profile');
    }
}

function initializeTheme() {
    const theme = storage.getTheme();
    const toggle = document.getElementById('themeToggle');
    
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        toggle.checked = false;
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.checked = true;
    }
}

function handleThemeToggle(e) {
    const isDark = e.target.checked;
    const theme = isDark ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', theme);
    storage.setTheme(theme);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.logout();
        window.location.href = 'login.html';
        // Additional safeguards to ensure redirect happens
        setTimeout(() => {
            window.location.reload();
        }, 100);
        // Final fallback
        setTimeout(() => {
            window.location.replace('login.html');
        }, 200);
    }
}

function handleClearData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        storage.clear();
        window.location.href = 'login.html';
    }
}

function showSuccess(message) {
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
    
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 3000);
}

function showNotifications() {
    const notifications = getUserNotifications(currentUser.id);
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔔</div>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        container.innerHTML = notifications.map(n => {
            const iconMap = { 
                'like': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
                'comment': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M21 6h-2l-1.41-1.41C17.59 4.21 17.59 4 17 4H7c-.59 0-.59.21-.59.59L5 6H3c-.55 0-1 .45-1 1s.45 1 1 1h1l1.41 1.41C5.41 9.79 5.41 10 6 10h10c.59 0 .59-.21.59-.59L18 8h1c.55 0 1-.45 1-1s-.45-1-1-1zm-1 6H4c-.55 0-1 .45-1 1s.45 1 1 1h1v4c0 .55.45 1 1 1s1-.45 1-1v-2h10c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>',
                'follow': '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
            };
            return `
                <div class="notification-item ${n.read ? '' : 'unread'}">
                    <div class="notification-icon">${iconMap[n.type] || '🔔'}</div>
                    <div class="notification-content">
                        <div class="notification-text">${escapeHtml(n.message)}</div>
                        <div class="notification-time">${formatTimeAgo(n.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        markAllAsRead(currentUser.id);
        updateNotificationBadge();
    }
    
    document.getElementById('notificationsModal').classList.remove('hidden');
}

function hideNotifications() {
    document.getElementById('notificationsModal').classList.add('hidden');
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const count = getUnreadCount(currentUser.id);
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}