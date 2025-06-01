import express from 'express';
import { 
  createComment, 
  getAllComments, 
  getCommentById, 
  updateComment, 
  deleteComment, 
  getCommentsByUser 
} from '../controllers/komentarController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes untuk komentar

// Buat komentar baru untuk post tertentu
router.post('/post/:id', verifyToken, createComment);

// Dapatkan semua komentar untuk post tertentu
router.get('/post/:id', getAllComments);

// Dapatkan komentar berdasarkan ID
router.get('/:id', getCommentById);

// Update komentar
router.put('/:id', verifyToken, updateComment);

// Hapus komentar
router.delete('/:id', verifyToken, deleteComment);

// Dapatkan semua komentar dari user tertentu
router.get('/user/:userId', getCommentsByUser);

export default router;