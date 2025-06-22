import multer from 'multer';
import path from 'path';
import fs from 'fs';
import GroupMember from '../models/GroupMember.js';
import GroupChat from '../models/GroupChat.js';
import User from '../models/User.js';

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
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'video/mp4', 'video/mov', 'video/avi',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xls, .xlsx
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .ppt, .pptx
    'text/plain'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
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
}).single('file'); // Mengubah 'group_media' menjadi 'file'

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
  console.log('Entering uploadGroupFile controller...'); // Log awal
  try {
    const { id_group } = req.params;
    console.log('id_group:', id_group); // Log id_group
    const userId = req.user ? req.user.user_id : 'undefined'; // Periksa req.user sebelum mengakses user_id
    console.log('userId:', userId); // Log userId

    // Cek apakah user adalah member dari group
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      console.log('User is not a member of this group.'); // Log jika bukan member
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }
    console.log('User is a member of the group.'); // Log jika member

    uploadGroupMedia(req, res, async (err) => {
      console.log('Inside uploadGroupMedia callback...');
      console.log('req.file:', req.file); // Log req.file
      console.log('Multer error (if any):', err); // Log Multer error

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Ukuran file terlalu besar. Maksimal 10MB' });
        }
        return res.status(500).json({ error: 'Terjadi kesalahan saat mengunggah file' });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        console.log('No file uploaded.'); // Log jika tidak ada file
        return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
      }

      try {
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/group_media/${req.file.filename}`;
        
        // Simpan pesan file ke database
        const { pesan } = req.body;
        console.log('Attempting to create GroupChat entry...');
        const groupChat = await GroupChat.create({
          id_group,
          id_pengirim: userId,
          pesan: pesan || `File: ${req.file.originalname}`,
          media: `/uploads/group_media/${req.file.filename}`
        });
        console.log('GroupChat entry created successfully:', groupChat);
        
        // Ambil data pengirim untuk socket
        const chatWithSender = await GroupChat.findByPk(groupChat.id_group_chat, {
          include: [{
            model: User,
            as: 'Pengirim',
            attributes: ['user_id', 'username', 'name', 'foto_profil']
          }]
        });
        
        // Tambahkan id_grup ke response untuk socket
        const chatWithGroupId = {
          ...chatWithSender.toJSON(),
          id_grup: id_group
        };
        
        res.status(200).json({ 
          success: true,
          filePath: `/uploads/group_media/${req.file.filename}`,
          fileUrl: fileUrl,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          chat: chatWithGroupId
        });
      } catch (error) {
        console.error('Error processing upload and saving to DB:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses file atau menyimpan ke database' });
      }
    });
  } catch (error) {
    console.error('Error in uploadGroupFile main try-catch:', error); // Log tambahan di catch utama
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
