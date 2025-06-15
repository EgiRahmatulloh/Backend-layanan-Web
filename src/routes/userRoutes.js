import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUserProfile, updateUserProfile, getAllUsers } from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Konfigurasi multer untuk upload foto profil
const uploadsDir = path.join(process.cwd(), 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');

// Buat direktori jika belum ada
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Izinkan hanya file gambar
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('foto_profil');

// Get current user profile
router.get('/profile', verifyToken, (req, res) => {
  // Set userId dari token ke params untuk getUserProfile
  req.params.id = req.user.user_id;
  getUserProfile(req, res);
});

// Update current user profile
router.put('/profile', verifyToken, (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    updateUserProfile(req, res);
  });
});

// Get user profile by ID
router.get('/:id', verifyToken, getUserProfile);

// Get all users
router.get('/', verifyToken, getAllUsers);

export default router;