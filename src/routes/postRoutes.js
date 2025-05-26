import express from 'express';
import { createPost, getAllPosts, getPostById, getPostsByUserId, updatePost, deletePost } from '../controllers/postController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Buat direktori untuk upload post jika belum ada
const postsDir = path.join(__dirname, '..', '..', 'uploads', 'posts');
if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}

// Konfigurasi multer untuk upload media post
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, postsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Batas ukuran file 10MB
const MAX_FILE_SIZE = 1000 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  // Izinkan gambar dan video
  const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Jenis file tidak didukung. Hanya file gambar dan video yang diizinkan.'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
}).single('media');

// Middleware untuk handle upload
const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar. Maksimal 10MB' });
      }
      return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengunggah file' });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Routes
router.post('/', verifyToken, handleUpload, createPost);
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.get('/user/:userId', getPostsByUserId);
router.put('/:id', verifyToken, handleUpload, updatePost);
router.delete('/:id', verifyToken, deletePost);

export default router;
