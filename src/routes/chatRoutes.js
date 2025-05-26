import express from 'express';
import multer from 'multer';
import path from 'path';
import { sendMessage, getMessages, deleteMessage, editMessage } from '../controllers/chatController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/chat_media/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|mp4|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Hanya file gambar, video, PDF, atau dokumen yang diizinkan'));
  }
});

// Routes
router.post('/send', verifyToken, sendMessage);
router.get('/:id_penerima', verifyToken, getMessages);
router.delete('/:id_chat', verifyToken, deleteMessage);
router.put('/:id_chat', verifyToken, editMessage);

// Upload media chat
router.post('/upload/chat_media', verifyToken, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal 10MB' });
      }
      return res.status(500).json({ error: 'Terjadi kesalahan saat mengunggah file' });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    try {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/chat_media/${req.file.filename}`;
      res.status(200).json({ 
        success: true,
        filePath: `/uploads/chat_media/${req.file.filename}`,
        fileUrl: fileUrl,
        fileName: req.file.filename
      });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ error: 'Terjadi kesalahan saat memproses file' });
    }
  });
});

export default router;