import express from 'express';
import { sendMessage, getMessages, deleteMessage, editMessage, sendFile, uploadFile } from '../controllers/chatController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', verifyToken, sendMessage);
router.post('/send-file', verifyToken, uploadFile, sendFile);
router.get('/:id_penerima', verifyToken, getMessages);
router.delete('/:id_chat', verifyToken, deleteMessage);
router.put('/:id_chat', verifyToken, editMessage);

export default router;