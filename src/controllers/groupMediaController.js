import multer from 'multer';
import path from 'path';
import fs from 'fs';
import GroupMember from '../models/GroupMember.js';

// Konfigurasi multer untuk group media
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const groupMediaDir = path.join(process.cwd(), 'uploads', 'group_media');
    
    // Buat direktori jika belum ada
    if (!fs.existsSync(groupMediaDir)) {
      fs.mkdirSync(groupMediaDir, { recursive: true });
    }
    
    cb(null, groupMediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'group_media-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Filter file yang diizinkan
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Jenis file tidak didukung. Hanya file gambar, video, dan dokumen yang diizinkan.'));
  }
};

// Batas ukuran file 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadGroupMedia = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
}).single('group_media');

// Middleware khusus untuk upload foto grup
export const uploadGroupPhoto = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Hanya izinkan file gambar untuk foto grup
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan untuk foto grup'), false);
    }
  }
}).single('file');

// Controller untuk upload file group
export const uploadGroupFile = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah user adalah member dari group
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }

    uploadGroupMedia(req, res, (err) => {
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
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/group_media/${req.file.filename}`;
        res.status(200).json({ 
          success: true,
          filePath: `/uploads/group_media/${req.file.filename}`,
          fileUrl: fileUrl,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        });
      } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses file' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Controller untuk menghapus file group
export const deleteGroupFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { id_group } = req.body;
    const userId = req.user.user_id;

    // Cek apakah user adalah member dari group atau admin
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'group_media', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({ message: 'File berhasil dihapus' });
    } else {
      res.status(404).json({ message: 'File tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};