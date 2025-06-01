import Komentar from '../models/Komentar.js';
import User from '../models/User.js';
import Post from '../models/Post.js';

// Buat komentar baru
export const createComment = async (req, res) => {
  try {
    const { isi_komentar } = req.body;
    const id_user = req.user.user_id;
    const id_post = req.params.id; // Ambil dari parameter URL

    // Cek apakah post ada
    const post = await Post.findByPk(id_post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }

    const newComment = await Komentar.create({
      id_post: parseInt(id_post),
      id_user,
      isi_komentar
    });

    // Ambil komentar dengan data user
    const commentWithUser = await Komentar.findByPk(newComment.id_komentar, {
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Komentar berhasil dibuat',
      data: commentWithUser
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat komentar',
      error: error.message
    });
  }
};

// Dapatkan semua komentar untuk sebuah post
export const getAllComments = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Cek apakah post ada
    const post = await Post.findByPk(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }

    const { count, rows: comments } = await Komentar.findAndCountAll({
      where: { id_post: id },
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }],
      order: [['waktu', 'ASC']], // Urutkan dari yang terlama
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      totalComments: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil komentar',
      error: error.message
    });
  }
};

// Dapatkan komentar berdasarkan ID
export const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Komentar.findByPk(id, {
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }, {
        model: Post,
        attributes: ['id_post', 'caption']
      }]
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil komentar',
      error: error.message
    });
  }
};

// Update komentar
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isi_komentar } = req.body;
    const id_user = req.user.user_id;

    const comment = await Komentar.findByPk(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }

    // Cek apakah user yang request adalah pemilik komentar
    if (comment.id_user !== id_user) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah komentar ini'
      });
    }

    // Update komentar
    comment.isi_komentar = isi_komentar;
    await comment.save();

    const updatedComment = await Komentar.findByPk(id, {
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }]
    });

    res.status(200).json({
      success: true,
      message: 'Komentar berhasil diperbarui',
      data: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui komentar',
      error: error.message
    });
  }
};

// Hapus komentar
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const id_user = req.user.user_id;

    const comment = await Komentar.findByPk(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Komentar tidak ditemukan'
      });
    }

    // Cek apakah user yang request adalah pemilik komentar
    if (comment.id_user !== id_user) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk menghapus komentar ini'
      });
    }

    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Komentar berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus komentar',
      error: error.message
    });
  }
};

// Dapatkan komentar berdasarkan user
export const getCommentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: comments } = await Komentar.findAndCountAll({
      where: { id_user: userId },
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }, {
        model: Post,
        attributes: ['id_post', 'caption'],
        include: [{
          model: User,
          attributes: ['user_id', 'username', 'name']
        }]
      }],
      order: [['waktu', 'DESC']], // Urutkan dari yang terbaru
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      totalComments: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: comments
    });
  } catch (error) {
    console.error('Error fetching user comments:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil komentar user',
      error: error.message
    });
  }
};