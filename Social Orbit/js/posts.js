// Posts module
import { storage } from './storage.js';
import { auth } from './auth.js';
import { createNotification } from './notifications.js';

export const posts = {
    // Create new post
    create(text, image = '', link = '') {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return null;

        const allPosts = storage.getPosts();
        
        const newPost = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            authorId: currentUser.id,
            text: text.trim(),
            image: image.trim(),
            link: link.trim(),
            likes: [],
            comments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        allPosts.unshift(newPost); // Add to beginning
        storage.setPosts(allPosts);
        
        return newPost;
    },

    // Get all posts
    getAll() {
        const allPosts = storage.getPosts();
        return allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // Get post by ID
    getById(postId) {
        const allPosts = storage.getPosts();
        return allPosts.find(p => p.id === postId);
    },

    // Get posts by user
    getByUser(userId) {
        const allPosts = storage.getPosts();
        return allPosts
            .filter(p => p.authorId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // Update post
    update(postId, updates) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const allPosts = storage.getPosts();
        const postIndex = allPosts.findIndex(p => p.id === postId);

        if (postIndex === -1) return false;
        
        // Check if user owns the post
        if (allPosts[postIndex].authorId !== currentUser.id) return false;

        allPosts[postIndex] = {
            ...allPosts[postIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        storage.setPosts(allPosts);
        return true;
    },

    // Delete post
    delete(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const allPosts = storage.getPosts();
        const post = allPosts.find(p => p.id === postId);

        if (!post || post.authorId !== currentUser.id) return false;

        const filtered = allPosts.filter(p => p.id !== postId);
        storage.setPosts(filtered);
        
        return true;
    },

    // Like post
    like(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const allPosts = storage.getPosts();
        const postIndex = allPosts.findIndex(p => p.id === postId);

        if (postIndex === -1) return false;

        const post = allPosts[postIndex];
        
        if (!post.likes.includes(currentUser.id)) {
            post.likes.push(currentUser.id);
            storage.setPosts(allPosts);

            // Create notification if not own post
            if (post.authorId !== currentUser.id) {
                createNotification(
                    post.authorId,
                    'like',
                    `${currentUser.name} liked your post`,
                    postId
                );
            }
            
            return true;
        }
        
        return false;
    },

    // Unlike post
    unlike(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const allPosts = storage.getPosts();
        const postIndex = allPosts.findIndex(p => p.id === postId);

        if (postIndex === -1) return false;

        const post = allPosts[postIndex];
        post.likes = post.likes.filter(id => id !== currentUser.id);
        storage.setPosts(allPosts);
        
        return true;
    },

    // Check if user liked post
    isLiked(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const post = this.getById(postId);
        return post ? post.likes.includes(currentUser.id) : false;
    },

    // Add comment
    addComment(postId, text) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser || !text.trim()) return false;

        const allPosts = storage.getPosts();
        const postIndex = allPosts.findIndex(p => p.id === postId);

        if (postIndex === -1) return false;

        const comment = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            authorId: currentUser.id,
            text: text.trim(),
            createdAt: new Date().toISOString()
        };

        allPosts[postIndex].comments.push(comment);
        storage.setPosts(allPosts);

        // Create notification if not own post
        const post = allPosts[postIndex];
        if (post.authorId !== currentUser.id) {
            createNotification(
                post.authorId,
                'comment',
                `${currentUser.name} commented on your post`,
                postId
            );
        }

        return true;
    },

    // Delete comment
    deleteComment(postId, commentId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        const allPosts = storage.getPosts();
        const postIndex = allPosts.findIndex(p => p.id === postId);

        if (postIndex === -1) return false;

        const post = allPosts[postIndex];
        const comment = post.comments.find(c => c.id === commentId);

        if (!comment || comment.authorId !== currentUser.id) return false;

        post.comments = post.comments.filter(c => c.id !== commentId);
        storage.setPosts(allPosts);
        
        return true;
    },

    // Save post
    save(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        if (!currentUser.savedPosts) {
            currentUser.savedPosts = [];
        }

        if (!currentUser.savedPosts.includes(postId)) {
            currentUser.savedPosts.push(postId);
            auth.updateProfile({ savedPosts: currentUser.savedPosts });
            return true;
        }

        return false;
    },

    // Unsave post
    unsave(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;

        if (currentUser.savedPosts?.includes(postId)) {
            currentUser.savedPosts = currentUser.savedPosts.filter(id => id !== postId);
            auth.updateProfile({ savedPosts: currentUser.savedPosts });
            return true;
        }

        return false;
    },

    // Check if post is saved
    isSaved(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return false;
        return currentUser.savedPosts?.includes(postId) || false;
    },

    // Get saved posts
    getSaved() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return [];

        const allPosts = storage.getPosts();
        return allPosts
            .filter(p => currentUser.savedPosts?.includes(p.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // Search posts
    search(query) {
        const allPosts = storage.getPosts();
        const lowerQuery = query.toLowerCase();
        
        return allPosts.filter(p => 
            p.text.toLowerCase().includes(lowerQuery) ||
            p.link.toLowerCase().includes(lowerQuery)
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
};
