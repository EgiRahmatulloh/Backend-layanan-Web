import express from 'express';
import { getUserProfile, updateUserProfile, getAllUsers } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// router.route('/:id').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').get(verifyToken, getUserProfile).put(verifyToken, updateUserProfile);
router.get('/', verifyToken, getAllUsers);

export default router;