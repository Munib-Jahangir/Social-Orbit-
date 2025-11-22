// Storage utility for localStorage management
export const storage = {
    // Get data from localStorage
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    },

    // Set data to localStorage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return false;
        }
    },

    // Remove item from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            return false;
        }
    },

    // Clear all data
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    // Get all users
    getUsers() {
        return this.get('munibsocial_users') || [];
    },

    // Save users
    setUsers(users) {
        return this.set('munibsocial_users', users);
    },

    // Get all posts
    getPosts() {
        return this.get('munibsocial_posts') || [];
    },

    // Save posts
    setPosts(posts) {
        return this.set('munibsocial_posts', posts);
    },

    // Get notifications
    getNotifications() {
        return this.get('munibsocial_notifications') || [];
    },

    // Save notifications
    setNotifications(notifications) {
        return this.set('munibsocial_notifications', notifications);
    },

    // Get current user
    getCurrentUser() {
        return this.get('munibsocial_currentUser');
    },

    // Save current user
    setCurrentUser(user) {
        return this.set('munibsocial_currentUser', user);
    },

    // Get theme
    getTheme() {
        return this.get('munibsocial_theme') || 'dark';
    },

    // Save theme
    setTheme(theme) {
        return this.set('munibsocial_theme', theme);
    }
};
