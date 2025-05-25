import User from '../models/User.js';
import { Op } from 'sequelize';

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  // Implementasi logika mendapatkan profil pengguna
  res.send('GET user profile');
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
const updateUserProfile = async (req, res) => {
  // Implementasi logika memperbarui profil pengguna
  res.send('PUT user profile');
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user.user_id;
    const users = await User.findAll({
      where: { user_id: { [Op.ne]: loggedInUserId } },
      attributes: ['user_id', 'username', 'email', 'name', 'foto_profil', 'is_online', 'last_seen']
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user online status
// @route   PUT /api/users/status
// @access  Private
const updateOnlineStatus = async (req, res) => {
  try {
    const { is_online } = req.body;
    const userId = req.user.user_id;
    
    await User.update(
      { 
        is_online: is_online,
        last_seen: new Date()
      },
      { where: { user_id: userId } }
    );
    
    res.status(200).json({ message: 'Status berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user online status
// @route   GET /api/users/status/:id
// @access  Private
const getUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ['user_id', 'username', 'is_online', 'last_seen']
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getUserProfile, updateUserProfile, getAllUsers, updateOnlineStatus, getUserStatus };