import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

export const sendMessage = async (req, res) => {
  try {
    const { id_penerima, pesan, media_url } = req.body;
    const id_pengirim = req.user.user_id; 

    const chat = await Chat.create({
      id_pengirim,
      id_penerima,
      pesan,
      media_url
    });

    res.status(201).json({ message: 'Pesan berhasil dikirim', chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id_penerima } = req.params;
    const id_pengirim = req.user.user_id;

    const messages = await Chat.findAll({
      where: {
        [Op.or]: [
          { id_pengirim: id_pengirim, id_penerima: id_penerima },
          { id_pengirim: id_penerima, id_penerima: id_pengirim }
        ]
      },
      include: [
        { model: User, as: 'Pengirim', attributes: ['user_id', 'username'] },
        { model: User, as: 'Penerima', attributes: ['user_id', 'username'] }
      ],
      order: [['waktu', 'ASC']]
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id_chat } = req.params;
    const { pesan } = req.body;
    const id_pengirim = req.user.user_id;

    const chat = await Chat.findOne({ where: { id_chat, id_pengirim } });

    if (!chat) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan atau Anda tidak memiliki izin untuk mengedit pesan ini' });
    }

    chat.pesan = pesan;
    await chat.save();

    res.status(200).json({ message: 'Pesan berhasil diperbarui', chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id_chat } = req.params;
    const id_pengirim = req.user.user_id;

    const chat = await Chat.findOne({ where: { id_chat, id_pengirim } });

    if (!chat) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan atau Anda tidak memiliki izin untuk menghapus pesan ini' });
    }

    // Hapus file media jika ada
    if (chat.media_url) {
      const filename = path.basename(chat.media_url);
      const filePath = path.join(process.cwd(), 'uploads', 'chat_media', filename);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('File media berhasil dihapus:', filePath);
        }
      } catch (err) {
        console.error('Gagal menghapus file media:', err);
        // Lanjutkan meskipun gagal menghapus file, agar pesan tetap terhapus dari DB
      }
    }

    await chat.destroy();
    res.status(200).json({ message: 'Pesan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendFile = async (req, res) => {
  try {
    const { id_penerima, pesan } = req.body;
    const id_pengirim = req.user.user_id;
    const file = req.file;

    if (!id_penerima || !file) {
      return res.status(400).json({ message: 'Harap isi semua bidang' });
    }

    // Simpan file di server
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat_media');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Simpan pesan ke database
    const chat = await Chat.create({
      id_pengirim,
      id_penerima,
      pesan: pesan || '',
      media_url: `/uploads/chat_media/${fileName}`
    });

    res.status(201).json({ message: 'File berhasil dikirim', chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Middleware untuk mengunggah file
import multer from 'multer';
const storage = multer.memoryStorage();
export const uploadFile = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
}).single('file');