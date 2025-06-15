import Like from '../models/Like.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { sequelize } from '../config/db.js';

// Tambah like pada post
export const addLike = async (req, res) => {
  try {
    const { id_post } = req.body;
    const id_user = req.user.id;
    
    // Cek apakah post ada
    const post = await Post.findByPk(id_post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    // Cek apakah user sudah like post ini
    const existingLike = await Like.findOne({
      where: {
        id_user,
        id_post
      }
    });
    
    if (existingLike) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah menyukai post ini'
      });
    }
    
    // Buat like baru
    const newLike = await Like.create({
      id_user,
      id_post,
      waktu: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Berhasil menyukai post',
      data: newLike
    });
  } catch (error) {
    console.error('Error adding like:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan like',
      error: error.message
    });
  }
};

// Hapus like dari post
export const removeLike = async (req, res) => {
  try {
    const { id_post } = req.params;
    const id_user = req.user.user_id;
    
    // Cek apakah like ada
    const like = await Like.findOne({
      where: {
        id_user,
        id_post
      }
    });
    
    if (!like) {
      return res.status(404).json({
        success: false,
        message: 'Like tidak ditemukan'
      });
    }
    
    // Hapus like
    await like.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Berhasil membatalkan like'
    });
  } catch (error) {
    console.error('Error removing like:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus like',
      error: error.message
    });
  }
};

// Cek apakah user sudah like post
export const checkLike = async (req, res) => {
  try {
    const { id_post } = req.params;
    const id_user = req.user.user_id;
    
    const like = await Like.findOne({
      where: {
        id_user,
        id_post
      }
    });
    
    res.status(200).json({
      success: true,
      isLiked: !!like
    });
  } catch (error) {
    console.error('Error checking like:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memeriksa like',
      error: error.message
    });
  }
};

// Dapatkan jumlah like untuk post
export const getLikeCount = async (req, res) => {
  try {
    const { id_post } = req.params;
    
    // Cek apakah post ada
    const post = await Post.findByPk(id_post);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    const likeCount = await Like.count({
      where: {
        id_post
      }
    });
    
    res.status(200).json({
      success: true,
      likeCount
    });
  } catch (error) {
    console.error('Error getting like count:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan jumlah like',
      error: error.message
    });
  }
};

// Dapatkan semua user yang like post
export const getLikeUsers = async (req, res) => {
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
    
    const { count, rows: likes } = await Like.findAndCountAll({
      where: {
        id_post
      },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        }
      ],
      order: [['waktu', 'DESC']],
      limit,
      offset
    });
    
    const users = likes.map(like => like.User);
    
    res.status(200).json({
      success: true,
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: users
    });
  } catch (error) {
    console.error('Error getting like users:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan daftar user yang menyukai post',
      error: error.message
    });
  }
};

// Dapatkan semua post yang disukai oleh user
export const getLikedPosts = async (req, res) => {
  try {
    const id_user = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { count, rows: likes } = await Like.findAndCountAll({
      where: {
        id_user
      },
      include: [
        {
          model: Post,
          include: [
            {
              model: User,
              attributes: ['user_id', 'username', 'name', 'foto_profil']
            }
          ]
        }
      ],
      order: [['waktu', 'DESC']],
      limit,
      offset
    });
    
    const posts = likes.map(like => like.Post);
    
    res.status(200).json({
      success: true,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: posts
    });
  } catch (error) {
    console.error('Error getting liked posts:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan daftar post yang disukai',
      error: error.message
    });
  }
};
