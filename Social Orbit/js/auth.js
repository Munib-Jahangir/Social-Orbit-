// Authentication module with Email & Password
import { storage } from './storage.js';
import { createNotification } from './notifications.js';

export const auth = {
    // Login user with email and password
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }

        const users = storage.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return { success: false, message: 'User not found. Please sign up first.' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Incorrect password' };
        }

        // Don't store password in current user session
        const { password: _, ...userWithoutPassword } = user;
        storage.setCurrentUser(userWithoutPassword);
        return { success: true, user: userWithoutPassword };
    },

    // Sign up new user with email and password
    signup(name, email, password, username, bio = '', profilePic = '') {
        if (!name || !email || !password || !username) {
            return { success: false, message: 'Name, email, username and password are required' };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, message: 'Invalid email format' };
        }

        // Validate password length
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        const users = storage.getUsers();
        
        // Check if email already exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'Email already exists' };
        }

        // Check if username already exists
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: 'Username already exists' };
        }

        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password, // In production, this should be hashed
            username: username.trim(),
            bio: bio.trim(),
            profilePic: profilePic.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            followers: [],
            following: [],
            savedPosts: [],
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        storage.setUsers(users);
        
        // Don't store password in current user session
        const { password: _, ...userWithoutPassword } = newUser;
        storage.setCurrentUser(userWithoutPassword);
        
        return { success: true, user: userWithoutPassword };
    },

    // Logout user
    logout() {
        // Only remove the current user session, not all data
        storage.remove('munibsocial_currentUser');
        // Clear any other potential session data
        try {
            // Force clear any cached data
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.clear();
            }
            // Only clear session-specific localStorage keys, not user data
            if (typeof localStorage !== 'undefined') {
                // Only remove session-related keys, not user or post data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('munibsocial_session_') || key.includes('temp'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
        } catch (e) {
            // Ignore errors in case storage is not available
        }
        return true;
    },

    // Get current logged in user
    getCurrentUser() {
        return storage.getCurrentUser();
    },

    // Update user profile
    updateProfile(updates) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const users = storage.getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);

        if (userIndex === -1) return false;

        // Update user (don't allow email or password change here)
        const { email, password, ...allowedUpdates } = updates;
        users[userIndex] = { ...users[userIndex], ...allowedUpdates };
        storage.setUsers(users);
        
        // Update current user session (without password)
        const { password: _, ...userWithoutPassword } = users[userIndex];
        storage.setCurrentUser(userWithoutPassword);

        return true;
    },

    // Follow user
    followUser(targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.id === targetUserId) return false;

        const users = storage.getUsers();
        const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
        const targetUserIndex = users.findIndex(u => u.id === targetUserId);

        if (currentUserIndex === -1 || targetUserIndex === -1) return false;

        // Add to following list
        if (!users[currentUserIndex].following) {
            users[currentUserIndex].following = [];
        }
        if (!users[currentUserIndex].following.includes(targetUserId)) {
            users[currentUserIndex].following.push(targetUserId);
        }

        // Add to followers list
        if (!users[targetUserIndex].followers) {
            users[targetUserIndex].followers = [];
        }
        if (!users[targetUserIndex].followers.includes(currentUser.id)) {
            users[targetUserIndex].followers.push(currentUser.id);
        }

        storage.setUsers(users);
        
        // Update current user session
        const { password: _, ...userWithoutPassword } = users[currentUserIndex];
        storage.setCurrentUser(userWithoutPassword);

        // Create notification for target user
        createNotification(targetUserId, 'follow', `${currentUser.name} started following you`, currentUser.id);

        return true;
    },

    // Unfollow user
    unfollowUser(targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.id === targetUserId) return false;

        const users = storage.getUsers();
        const currentUserIndex = users.findIndex(u => u.id === currentUser.id);
        const targetUserIndex = users.findIndex(u => u.id === targetUserId);

        if (currentUserIndex === -1 || targetUserIndex === -1) return false;

        // Remove from following list
        if (users[currentUserIndex].following) {
            users[currentUserIndex].following = users[currentUserIndex].following.filter(id => id !== targetUserId);
        }

        // Remove from followers list
        if (users[targetUserIndex].followers) {
            users[targetUserIndex].followers = users[targetUserIndex].followers.filter(id => id !== currentUser.id);
        }

        storage.setUsers(users);
        
        // Update current user session
        const { password: _, ...userWithoutPassword } = users[currentUserIndex];
        storage.setCurrentUser(userWithoutPassword);

        return true;
    },

    // Check if following user
    isFollowing(targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        return currentUser.following?.includes(targetUserId) || false;
    },

    // Get user by ID
    getUserById(userId) {
        const users = storage.getUsers();
        const user = users.find(u => u.id === userId);
        
        if (user) {
            // Don't return password
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        
        return null;
    },

    // Get all users except current
    getAllUsers() {
        const currentUser = this.getCurrentUser();
        const users = storage.getUsers();
        
        // Return users without passwords
        return users
            .filter(u => u.id !== currentUser?.id)
            .map(({ password, ...userWithoutPassword }) => userWithoutPassword);
    }
};
