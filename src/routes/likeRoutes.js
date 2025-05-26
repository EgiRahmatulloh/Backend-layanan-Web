import express from 'express';
import { addLike, removeLike, checkLike, getLikeCount, getLikeUsers, getLikedPosts } from '../controllers/likeController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes
router.post('/', verifyToken, addLike);
router.delete('/:id_post', verifyToken, removeLike);
router.get('/check/:id_post', verifyToken, checkLike);
router.get('/count/:id_post', getLikeCount);
router.get('/users/:id_post', getLikeUsers);
router.get('/posts', verifyToken, getLikedPosts);

export default router;
