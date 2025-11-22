// Comments management module
import { storage } from './storage.js';
import { auth } from './auth.js';
import { createNotification } from './notifications.js';

// Add comment to post
export function addComment(postId, text) {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || !text.trim()) return false;

    const posts = storage.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return false;

    const comment = {
        id: Date.now().toString(),
        authorId: currentUser.id,
        text: text.trim(),
        createdAt: new Date().toISOString()
    };

    posts[postIndex].comments.push(comment);
    storage.setPosts(posts);

    // Create notification
    const post = posts[postIndex];
    if (post.authorId !== currentUser.id) {
        createNotification(
            post.authorId,
            'comment',
            `${currentUser.name} commented on your post`,
            postId
        );
    }

    return true;
}

// Delete comment
export function deleteComment(postId, commentId) {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) return false;

    const posts = storage.getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return false;

    const post = posts[postIndex];
    const comment = post.comments.find(c => c.id === commentId);

    if (!comment || comment.authorId !== currentUser.id) return false;

    post.comments = post.comments.filter(c => c.id !== commentId);
    storage.setPosts(posts);

    return true;
}

// Get comments for post
export function getComments(postId) {
    const posts = storage.getPosts();
    const post = posts.find(p => p.id === postId);

    return post ? post.comments : [];
}
