import Post from '../models/Post.js';
import User from '../models/User.js';
import Like from '../models/Like.js'; // Tambahkan impor model Like
import Komentar from '../models/Komentar.js';
import Follow from '../models/Follow.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buat post baru
export const createPost = async (req, res) => {
  try {
    const { caption } = req.body;
    const id_user = req.user.user_id;
    
    // Jika ada file yang diupload
    let mediaPath = null;
    if (req.file) {
      mediaPath = `/uploads/posts/${req.file.filename}`;
    }
    
    const newPost = await Post.create({
      caption,
      media: mediaPath,
      id_user
    });
    
    const postWithUser = await Post.findByPk(newPost.id_post, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Post berhasil dibuat',
      data: postWithUser
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat post',
      error: error.message
    });
  }
};

// Dapatkan semua post (dengan pagination)
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const id_user = req.user?.user_id; // Di middleware, user id disimpan di req.user.user_id
    
    // Dapatkan daftar user yang difollow oleh user saat ini
    const followedUsers = await Follow.findAll({
      where: { id_pengikut: id_user },
      attributes: ['id_diikuti']
    });
    
    // Buat array ID user yang difollow + user sendiri
    const followedUserIds = followedUsers.map(follow => follow.id_diikuti);
    followedUserIds.push(id_user); // Tambahkan user sendiri
    
    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        id_user: followedUserIds // Filter hanya postingan dari user yang difollow + user sendiri
      },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        },
        {
          model: Komentar,
          include: [{
            model: User,
            attributes: ['user_id', 'username', 'name', 'foto_profil']
          }],
          limit: 2, // Ambil hanya 2 komentar sebagai preview
          order: [['waktu', 'DESC']] // Urutkan komentar dari yang terbaru
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // Tambahkan informasi likeCount, isLiked, dan commentCount untuk setiap post
    const postsWithLikes = await Promise.all(posts.map(async (post) => {
      const likeCount = await Like.count({ where: { id_post: post.id_post } });
      const commentCount = await Komentar.count({ where: { id_post: post.id_post } });
      
      let isLiked = false;
      if (id_user) {
        const like = await Like.findOne({
          where: {
            id_post: post.id_post,
            id_user
          }
        });
        isLiked = !!like;
      }
      
      return {
        ...post.get({ plain: true }),
        likeCount,
        commentCount,
        isLiked: !!isLiked
      };
    }));
    
    res.status(200).json({
      success: true,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: postsWithLikes
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil post',
      error: error.message
    });
  }
};

// Dapatkan post berdasarkan ID
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil post',
      error: error.message
    });
  }
};

// Dapatkan post berdasarkan user ID
export const getPostsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { count, rows: posts } = await Post.findAndCountAll({
      where: { id_user: userId },
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    res.status(200).json({
      success: true,
      totalPosts: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil post pengguna',
      error: error.message
    });
  }
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption } = req.body;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    // Cek apakah user yang request adalah pemilik post
    if (post.id_user !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengubah post ini'
      });
    }
    
    // Update post
    post.caption = caption;
    
    // Jika ada file baru yang diupload
    if (req.file) {
      // Hapus file lama jika ada
      if (post.media) {
        const oldFilePath = path.join(__dirname, '..', '..', post.media);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      // Set path media baru
      post.media = `/uploads/posts/${req.file.filename}`;
    }
    
    await post.save();
    
    const updatedPost = await Post.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['user_id', 'username', 'name', 'profile_picture']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Post berhasil diperbarui',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui post',
      error: error.message
    });
  }
};

// Hapus post
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByPk(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post tidak ditemukan'
      });
    }
    
    // Cek apakah user yang request adalah pemilik post
    if (post.id_user !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk menghapus post ini'
      });
    }
    
    // Hapus file media jika ada
    if (post.media) {
      const filePath = path.join(__dirname, '..', '..', post.media);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await post.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Post berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus post',
      error: error.message
    });
  }
};
