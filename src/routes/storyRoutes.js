import express from 'express';
import multer from 'multer';
import path from 'path';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createStory,
  getActiveStories,
  getUserStories,
  deleteStory,
  manualCleanup
} from '../controllers/storyController.js';

const router = express.Router();

// Konfigurasi multer untuk upload media stories
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/stories/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'story-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Hanya terima file gambar dan video
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar dan video yang diperbolehkan'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Routes
router.post('/', verifyToken, upload.single('media'), createStory);
router.get('/', verifyToken, getActiveStories);
router.get('/user/:userId', verifyToken, getUserStories);
router.delete('/:storyId', verifyToken, deleteStory);
router.post('/cleanup', verifyToken, manualCleanup); // Untuk testing cleanup

export default router;