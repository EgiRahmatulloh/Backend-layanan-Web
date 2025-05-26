import express from 'express';
import { addKomentar, deleteKomentar, updateKomentar, getKomentarByPostId, getKomentarById, getKomentarByUserId } from '../controllers/komentarController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes
router.post('/', verifyToken, addKomentar);
router.delete('/:id', verifyToken, deleteKomentar);
router.put('/:id', verifyToken, updateKomentar);
router.get('/post/:id_post', getKomentarByPostId);
router.get('/user/:id_user', getKomentarByUserId);
router.get('/:id', getKomentarById);

export default router;
