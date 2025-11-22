// Notifications module
import { storage } from './storage.js';

export function createNotification(userId, type, message, relatedId = null) {
    const notifications = storage.getNotifications();
    
    const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        userId,
        type, // 'like', 'comment', 'follow'
        message,
        relatedId, // postId or userId
        read: false,
        createdAt: new Date().toISOString()
    };

    notifications.push(notification);
    storage.setNotifications(notifications);
    
    return notification;
}

export function getUserNotifications(userId) {
    const notifications = storage.getNotifications();
    return notifications
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadCount(userId) {
    const notifications = getUserNotifications(userId);
    return notifications.filter(n => !n.read).length;
}

export function markAsRead(notificationId) {
    const notifications = storage.getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
        notifications[index].read = true;
        storage.setNotifications(notifications);
        return true;
    }
    
    return false;
}

export function markAllAsRead(userId) {
    const notifications = storage.getNotifications();
    notifications.forEach(n => {
        if (n.userId === userId) {
            n.read = true;
        }
    });
    storage.setNotifications(notifications);
}

export function clearUserNotifications(userId) {
    const notifications = storage.getNotifications();
    const filtered = notifications.filter(n => n.userId !== userId);
    storage.setNotifications(filtered);
}
