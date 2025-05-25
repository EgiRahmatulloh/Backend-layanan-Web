import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

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

    await chat.destroy();
    res.status(200).json({ message: 'Pesan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};