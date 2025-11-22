// Search Page Controller
import { auth } from './auth.js';
import { posts } from './posts.js';
import { searchUsers } from './user.js';
import { formatTimeAgo, escapeHtml, linkifyText, debounce } from './utils.js';
import { getUserNotifications, getUnreadCount, markAllAsRead } from './notifications.js';

// Check authentication
if (!auth.getCurrentUser()) {
    window.location.href = 'login.html';
}

const currentUser = auth.getCurrentUser();
let currentTab = 'users';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateNotificationBadge();
    renderEmptyState();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    document.getElementById('usersTab').addEventListener('click', () => switchTab('users'));
    document.getElementById('postsSearchTab').addEventListener('click', () => switchTab('posts'));
    
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

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.logout();
        window.location.href = 'login.html';
        // Additional safeguard
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tab === 'users' ? 'usersTab' : 'postsSearchTab').classList.add('active');
    
    handleSearch();
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        renderEmptyState();
        return;
    }
    
    if (currentTab === 'users') {
        renderUserResults(query);
    } else {
        renderPostResults(query);
    }
}

function renderEmptyState() {
    const container = document.getElementById('searchResults');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>Search for ${currentTab === 'users' ? 'people' : 'posts'}</p>
        </div>
    `;
}

function renderUserResults(query) {
    const users = searchUsers(query).filter(u => u.id !== currentUser.id);
    const container = document.getElementById('searchResults');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😕</div>
                <p>No users found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        const isFollowing = auth.isFollowing(user.id);
        
        return `
            <div class="user-card">
                <img src="${user.profilePic}" alt="${user.name}" class="user-card-avatar">
                <div class="user-card-info">
                    <div class="user-card-name">${escapeHtml(user.name)}</div>
                    <div class="user-card-username">@${escapeHtml(user.username)}</div>
                    ${user.bio ? `<div class="user-card-bio">${escapeHtml(user.bio)}</div>` : ''}
                </div>
                <button class="btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user.id}')">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>
            </div>
        `;
    }).join('');
}

function renderPostResults(query) {
    const foundPosts = posts.search(query);
    const container = document.getElementById('searchResults');
    
    if (foundPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😕</div>
                <p>No posts found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = foundPosts.map(post => renderPost(post)).join('');
}

function renderPost(post) {
    const author = auth.getUserById(post.authorId);
    if (!author) return '';
    
    const isLiked = posts.isLiked(post.id);
    const isSaved = posts.isSaved(post.id);
    
    return `
        <div class="post-card">
            <div class="post-header">
                <img src="${author.profilePic}" alt="${author.name}" class="post-avatar">
                <div class="post-author-info">
                    <div class="post-author-name">${escapeHtml(author.name)}</div>
                    <div class="post-author-username">@${escapeHtml(author.username)}</div>
                </div>
                <div class="post-time">${formatTimeAgo(post.createdAt)}</div>
            </div>
            <div class="post-content">${linkifyText(escapeHtml(post.text))}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : ''}
            ${post.link ? `<a href="${post.link}" target="_blank" rel="noopener" class="post-link">
                <svg class="icon" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">
                    <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
                ${post.link}
            </a>` : ''}
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}">
                    <span class="action-icon">
                        ${isLiked ? 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>'
                        }
                    </span>
                    <span>${post.likes.length}</span>
                </button>
                <button class="action-btn">
                    <span class="action-icon">
                        <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M21 6h-2l-1.41-1.41C17.59 4.21 17.59 4 17 4H7c-.59 0-.59.21-.59.59L5 6H3c-.55 0-1 .45-1 1s.45 1 1 1h1l1.41 1.41C5.41 9.79 5.41 10 6 10h10c.59 0 .59-.21.59-.59L18 8h1c.55 0 1-.45 1-1s-.45-1-1-1zm-1 6H4c-.55 0-1 .45-1 1s.45 1 1 1h1v4c0 .55.45 1 1 1s1-.45 1-1v-2h10c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                        </svg>
                    </span>
                    <span>${post.comments.length}</span>
                </button>
                <button class="action-btn ${isSaved ? 'saved' : ''}">
                    <span class="action-icon">
                        ${isSaved ? 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>' : 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>'
                        }
                    </span>
                </button>
            </div>
        </div>
    `;
}

// Global functions
window.toggleFollow = (userId) => {
    if (auth.isFollowing(userId)) {
        auth.unfollowUser(userId);
    } else {
        auth.followUser(userId);
    }
    handleSearch(); // Refresh results
};

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