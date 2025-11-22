// Main App - Feed Page Controller
import { auth } from './auth.js';
import { posts } from './posts.js';
import { formatTimeAgo, escapeHtml, linkifyText, debounce } from './utils.js';
import { getUserNotifications, getUnreadCount, markAllAsRead } from './notifications.js';
import { addComment, deleteComment } from './comments.js';

// Check authentication
if (!auth.getCurrentUser()) {
    window.location.href = 'login.html';
}

const currentUser = auth.getCurrentUser();
let currentEditPostId = null;
let openDropdownId = null;
let currentFilter = 'latest'; // Default filter

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeFeed();
    setupEventListeners();
    updateNotificationBadge();
    
    // Update notifications every 10 seconds
    setInterval(updateNotificationBadge, 10000);
});

function initializeFeed() {
    // Set current user avatar
    document.getElementById('currentUserAvatar').src = currentUser.profilePic;
    
    // Load posts
    renderPosts();
}

function setupEventListeners() {
    // Create post
    document.getElementById('postBtn').addEventListener('click', handleCreatePost);
    document.getElementById('addImageBtn').addEventListener('click', () => {
        document.getElementById('postImageInput').classList.toggle('hidden');
    });
    document.getElementById('addLinkBtn').addEventListener('click', () => {
        document.getElementById('postLinkInput').classList.toggle('hidden');
    });
    
    // Filter posts
    document.getElementById('postFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderPosts();
    });
    
    // Set the filter select to the current filter value
    document.getElementById('postFilter').value = currentFilter;
    
    // Notifications
    document.getElementById('notificationsBtn').addEventListener('click', showNotifications);
    document.getElementById('closeNotifications').addEventListener('click', hideNotifications);
    
    // Edit post modal
    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById('editPostModal').classList.add('hidden');
    });
    document.getElementById('saveEditBtn').addEventListener('click', saveEditPost);
    
    // Profile dropdown
    document.getElementById('profileDropdownBtn').addEventListener('click', toggleProfileDropdown);
    document.getElementById('navbarLogoutBtn').addEventListener('click', handleLogout);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.post-menu-btn') && !e.target.closest('.dropdown-menu') && !e.target.closest('#profileDropdownBtn')) {
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
    openDropdownId = null;
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

function renderPosts() {
    const allPosts = getFilteredPosts();
    const feedContainer = document.getElementById('postsFeed');
    
    // Update the filter select to show the current filter
    document.getElementById('postFilter').value = currentFilter;
    
    if (allPosts.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>No posts yet. Be the first to share something!</p>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = allPosts.map(post => renderPost(post)).join('');
}

function getFilteredPosts() {
    const allPosts = posts.getAll();
    
    console.log('Filtering posts with:', currentFilter);
    console.log('Total posts:', allPosts.length);
    
    switch(currentFilter) {
        case 'oldest':
            const oldest = [...allPosts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            console.log('Sorted by oldest:', oldest);
            return oldest;
        case 'mostLiked':
            const mostLiked = [...allPosts].sort((a, b) => b.likes.length - a.likes.length);
            console.log('Sorted by most liked:', mostLiked);
            return mostLiked;
        case 'mostCommented':
            const mostCommented = [...allPosts].sort((a, b) => b.comments.length - a.comments.length);
            console.log('Sorted by most commented:', mostCommented);
            return mostCommented;
        case 'latest':
        default:
            console.log('Sorted by latest:', allPosts);
            return allPosts; // Already sorted by latest in posts.getAll()
    }
}

function renderPost(post) {
    const author = auth.getUserById(post.authorId);
    if (!author) return '';
    
    const isOwner = currentUser.id === post.authorId;
    const isLiked = posts.isLiked(post.id);
    const isSaved = posts.isSaved(post.id);
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img src="${author.profilePic}" alt="${author.name}" class="post-avatar">
                <div class="post-author-info">
                    <div class="post-author-name">${escapeHtml(author.name)}</div>
                    <div class="post-author-username">@${escapeHtml(author.username)}</div>
                </div>
                <div class="post-time">${formatTimeAgo(post.createdAt)}</div>
                ${isOwner ? `
                    <button class="post-menu-btn" onclick="togglePostMenu('${post.id}')">
                        <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </button>
                    <div id="menu-${post.id}" class="dropdown-menu hidden">
                        <button class="dropdown-item" onclick="editPost('${post.id}')">Edit</button>
                        <button class="dropdown-item danger" onclick="deletePost('${post.id}')">Delete</button>
                    </div>
                ` : ''}
            </div>
            <div class="post-content">${linkifyText(escapeHtml(post.text))}</div>
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onerror="this.style.display='none'">` : ''}
            ${post.link ? `<a href="${post.link}" target="_blank" rel="noopener" class="post-link">
                <svg class="icon" viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; margin-right: 8px;">
                    <path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5z"/>
                </svg>
                ${post.link}
            </a>` : ''}
            <div class="post-actions">
                <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <span class="action-icon">
                        ${isLiked ? 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C5.41 14.24 5.41 10 6 10h10c.59 0 .59-.21.59-.59L18 8h1c.55 0 1 .45 1 1s-.45 1-1 1zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>'
                        }
                    </span>
                    <span>${post.likes.length}</span>
                </button>
                <button class="action-btn" onclick="toggleComments('${post.id}')">
                    <span class="action-icon">
                        <svg class="icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M21 6h-2l-1.41-1.41C17.59 4.21 17.59 4 17 4H7c-.59 0-.59.21-.59.59L5 6H3c-.55 0-1 .45-1 1s.45 1 1 1h1l1.41 1.41C5.41 9.79 5.41 10 6 10h10c.59 0 .59-.21.59-.59L18 8h1c.55 0 1-.45 1-1s-.45-1-1-1zm-1 6H4c-.55 0-1 .45-1 1s.45 1 1 1h1v4c0 .55.45 1 1 1s1-.45 1-1v-2h10c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                        </svg>
                    </span>
                    <span>${post.comments.length}</span>
                </button>
                <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSave('${post.id}')">
                    <span class="action-icon">
                        ${isSaved ? 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>' : 
                            '<svg class="icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>'
                        }
                    </span>
                    <span>${isSaved ? 'Saved' : 'Save'}</span>
                </button>
            </div>
            <div id="comments-${post.id}" class="comments-section hidden">
                <div class="comment-input-wrapper">
                    <input type="text" class="comment-input" placeholder="Write a comment..." id="comment-input-${post.id}">
                    <button class="btn-comment" onclick="addCommentToPost('${post.id}')">Post</button>
                </div>
                <div id="comments-list-${post.id}">
                    ${renderComments(post.comments, post.id)}
                </div>
            </div>
        </div>
    `;
}

function renderComments(comments, postId) {
    if (!comments || comments.length === 0) {
        return '<p class="text-muted text-center">No comments yet</p>';
    }
    
    return comments.map(comment => {
        const author = auth.getUserById(comment.authorId);
        if (!author) return '';
        
        const isOwner = currentUser.id === comment.authorId;
        
        return `
            <div class="comment-item">
                <img src="${author.profilePic}" alt="${author.name}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-author">${escapeHtml(author.name)}</div>
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                </div>
                ${isOwner ? `<button class="comment-delete-btn" onclick="deleteCommentFromPost('${postId}', '${comment.id}')">
                    <svg class="icon" viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>` : ''}
            </div>
        `;
    }).join('');
}

function handleCreatePost() {
    const text = document.getElementById('postTextarea').value.trim();
    const image = document.getElementById('postImageInput').value.trim();
    const link = document.getElementById('postLinkInput').value.trim();
    
    if (!text && !image && !link) {
        alert('Please enter some content');
        return;
    }
    
    posts.create(text, image, link);
    
    // Clear inputs
    document.getElementById('postTextarea').value = '';
    document.getElementById('postImageInput').value = '';
    document.getElementById('postLinkInput').value = '';
    document.getElementById('postImageInput').classList.add('hidden');
    document.getElementById('postLinkInput').classList.add('hidden');
    
    renderPosts();
}

// Global functions for onclick handlers
window.toggleLike = (postId) => {
    if (posts.isLiked(postId)) {
        posts.unlike(postId);
    } else {
        posts.like(postId);
    }
    renderPosts();
};

window.toggleSave = (postId) => {
    if (posts.isSaved(postId)) {
        posts.unsave(postId);
    } else {
        posts.save(postId);
    }
    renderPosts();
};

window.toggleComments = (postId) => {
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.classList.toggle('hidden');
};

window.addCommentToPost = (postId) => {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    if (addComment(postId, text)) {
        input.value = '';
        renderPosts();
    }
};

window.deleteCommentFromPost = (postId, commentId) => {
    if (confirm('Delete this comment?')) {
        if (deleteComment(postId, commentId)) {
            renderPosts();
        }
    }
};

window.togglePostMenu = (postId) => {
    const menu = document.getElementById(`menu-${postId}`);
    
    if (openDropdownId && openDropdownId !== postId) {
        document.getElementById(`menu-${openDropdownId}`)?.classList.add('hidden');
    }
    
    menu.classList.toggle('hidden');
    openDropdownId = menu.classList.contains('hidden') ? null : postId;
};

window.editPost = (postId) => {
    const post = posts.getById(postId);
    if (!post) return;
    
    currentEditPostId = postId;
    document.getElementById('editPostText').value = post.text;
    document.getElementById('editPostImage').value = post.image || '';
    document.getElementById('editPostLink').value = post.link || '';
    document.getElementById('editPostModal').classList.remove('hidden');
    closeAllDropdowns();
};

function saveEditPost() {
    if (!currentEditPostId) return;
    
    const text = document.getElementById('editPostText').value.trim();
    const image = document.getElementById('editPostImage').value.trim();
    const link = document.getElementById('editPostLink').value.trim();
    
    if (!text && !image && !link) {
        alert('Post must have some content');
        return;
    }
    
    posts.update(currentEditPostId, { text, image, link });
    document.getElementById('editPostModal').classList.add('hidden');
    currentEditPostId = null;
    renderPosts();
}

window.deletePost = (postId) => {
    if (confirm('Are you sure you want to delete this post?')) {
        posts.delete(postId);
        closeAllDropdowns();
        renderPosts();
    }
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
        
        // Mark all as read
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