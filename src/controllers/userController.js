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
      nama: user.name,
      foto_profil: user.foto_profil,
      bio: user.bio,
      createdAt: user.createdAt,
      followersCount,
      followingCount
    };
    
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
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
      attributes: ['user_id', 'username', 'email', 'name', 'foto_profil', 'last_seen']
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getUserProfile, updateUserProfile, getAllUsers };