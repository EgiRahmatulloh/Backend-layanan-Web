import User from '../models/User.js';
import Follow from '../models/Follow.js';
import { Op } from 'sequelize';

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: ['user_id', 'username', 'email', 'name', 'foto_profil', 'bio', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    // Hitung followers dan following
    const followersCount = await Follow.count({
      where: { id_diikuti: id }
    });
    
    const followingCount = await Follow.count({
      where: { id_pengikut: id }
    });
    
    // Format response
    const userProfile = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      name: user.name,
      foto_profil: user.foto_profil,
      bio: user.bio,
      createdAt: user.createdAt,
      followersCount,
      followingCount
    };
    
    res.status(200).json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { name, username, bio } = req.body;
    
    // Cek apakah user ada
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }
    
    // Cek apakah username sudah digunakan user lain
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        where: { 
          username,
          user_id: { [Op.ne]: userId }
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username sudah digunakan'
        });
      }
    }
    
    // Siapkan data update
    const updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    
    // Handle upload foto profil jika ada
    if (req.file) {
      updateData.foto_profil = `/uploads/profiles/${req.file.filename}`;
    }
    
    // Update user
    await user.update(updateData);
    
    // Ambil data user yang sudah diupdate
    const updatedUser = await User.findByPk(userId, {
      attributes: ['user_id', 'username', 'email', 'name', 'foto_profil', 'bio', 'createdAt']
    });
    
    res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name,
        foto_profil: updatedUser.foto_profil,
        bio: updatedUser.bio,
        createdAt: updatedUser.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user.user_id;
    const users = await User.findAll({
      where: { user_id: { [Op.ne]: loggedInUserId } },
      attributes: ['user_id', 'username', 'email', 'name', 'foto_profil', 'last_seen']
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getUserProfile, updateUserProfile, getAllUsers };