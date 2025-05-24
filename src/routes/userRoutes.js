import express from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
// import { protect } from '../middleware/authMiddleware.js'; // Jika ada middleware autentikasi

const router = express.Router();

// router.route('/:id').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').get(getUserProfile).put(updateUserProfile);

export default router;