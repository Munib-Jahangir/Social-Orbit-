// User management module
import { storage } from './storage.js';

// Search users
export function searchUsers(query) {
    const users = storage.getUsers();
    const lowerQuery = query.toLowerCase();
    
    return users.filter(user => 
        user.name.toLowerCase().includes(lowerQuery) ||
        user.username.toLowerCase().includes(lowerQuery) ||
        user.bio?.toLowerCase().includes(lowerQuery)
    );
}

// Get user stats
export function getUserStats(userId) {
    const users = storage.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) return null;
    
    const posts = storage.getPosts();
    const userPosts = posts.filter(p => p.authorId === userId);
    
    return {
        postsCount: userPosts.length,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
    };
}

// Generate unique ID
export function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
