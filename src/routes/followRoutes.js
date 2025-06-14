import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus
} from '../controllers/followController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Follow user
router.post('/:userId', verifyToken, followUser);

// Unfollow user
router.delete('/:userId', verifyToken, unfollowUser);

// Get followers
router.get('/:userId/followers', verifyToken, getFollowers);

// Get following
router.get('/:userId/following', verifyToken, getFollowing);

// Check follow status
router.get('/:userId/status', verifyToken, getFollowStatus);

export default router;