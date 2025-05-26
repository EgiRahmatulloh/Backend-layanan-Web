import Komentar from '../models/Komentar.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

// Tambah komentar pada post
export const addKomentar = async (req, res) => {
  try {
    const { id_post, isi_komentar } = req.body;
    const id_user = req.user.id;
    
    // Cek apakah post ada
    const post = await Post.findByPk(id_post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    // Buat komentar baru
    const newKomentar = await Komentar.create({
      isi_komentar,
      id_post,
      id_user,
      waktu: new Date()
    });
    
    // Ambil komentar dengan data user
    const komentarWithUser = await Komentar.findByPk(newKomentar.id_komentar, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'profile_picture']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Komentar berhasil ditambahkan',
      data: komentarWithUser
    });
  } catch (error) {
    console.error('Error adding komentar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan komentar',
      error: error.message
    });
  }
};

// Hapus komentar
export const deleteKomentar = async (req, res) => {
  try {
    const { id } = req.params;
    const id_user = req.user.id;
    
    // Cek apakah komentar ada
    const komentar = await Komentar.findByPk(id);
    if (!komentar) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }
    
    // Cek apakah user yang request adalah pemilik komentar
    if (komentar.id_user !== id_user) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk menghapus komentar ini'
      });
    }
    
    // Hapus komentar
    await komentar.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Komentar berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting komentar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus komentar',
      error: error.message
    });
  }
};

// Update komentar
export const updateKomentar = async (req, res) => {
  try {
    const { id } = req.params;
    const { isi_komentar } = req.body;
    const id_user = req.user.id;
    
    // Cek apakah komentar ada
    const komentar = await Komentar.findByPk(id);
    if (!komentar) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }
    
    // Cek apakah user yang request adalah pemilik komentar
    if (komentar.id_user !== id_user) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah komentar ini'
      });
    }
    
    // Update komentar
    komentar.isi_komentar = isi_komentar;
    await komentar.save();
    
    // Ambil komentar yang sudah diupdate dengan data user
    const updatedKomentar = await Komentar.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'profile_picture']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Komentar berhasil diperbarui',
      data: updatedKomentar
    });
  } catch (error) {
    console.error('Error updating komentar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui komentar',
      error: error.message
    });
  }
};

// Dapatkan semua komentar untuk post tertentu
export const getKomentarByPostId = async (req, res) => {
  try {
    const { id_post } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Cek apakah post ada
    const post = await Post.findByPk(id_post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    // Ambil komentar dengan pagination
    const { count, rows: komentars } = await Komentar.findAndCountAll({
      where: { id_post },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'profile_picture']
        }
      ],
      order: [['waktu', 'DESC']],
      limit,
      offset
    });
    
    res.status(200).json({
      success: true,
      totalKomentar: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: komentars
    });
  } catch (error) {
    console.error('Error getting komentar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan komentar',
      error: error.message
    });
  }
};

// Dapatkan komentar berdasarkan ID
export const getKomentarById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const komentar = await Komentar.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'profile_picture']
        }
      ]
    });
    
    if (!komentar) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: komentar
    });
  } catch (error) {
    console.error('Error getting komentar by id:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan komentar',
      error: error.message
    });
  }
};

// Dapatkan semua komentar dari user tertentu
export const getKomentarByUserId = async (req, res) => {
  try {
    const { id_user } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Cek apakah user ada
    const user = await User.findByPk(id_user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    // Ambil komentar dengan pagination
    const { count, rows: komentars } = await Komentar.findAndCountAll({
      where: { id_user },
      include: [
        {
          model: Post,
          include: [
            {
              model: User,
              attributes: ['user_id', 'username', 'name', 'profile_picture']
            }
          ]
        }
      ],
      order: [['waktu', 'DESC']],
      limit,
      offset
    });
    
    res.status(200).json({
      success: true,
      totalKomentar: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: komentars
    });
  } catch (error) {
    console.error('Error getting user komentar:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan komentar user',
      error: error.message
    });
  }
};
