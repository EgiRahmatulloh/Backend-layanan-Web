import express from 'express';
import { sendMessage, getMessages, deleteMessage, editMessage } from '../controllers/chatController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', (req, res, next) => {
  console.log('Menerima POST ke /api/chats/send');
  next();
}, verifyToken, sendMessage);
router.get('/:id_penerima', (req, res, next) => {
  console.log(`Menerima GET ke /api/chats/${req.params.id_penerima}`);
  next();
}, verifyToken, getMessages);
router.delete('/:id_chat', verifyToken, deleteMessage);
router.put('/:id_chat', verifyToken, editMessage);

export default router;