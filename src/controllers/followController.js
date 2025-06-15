import User from '../models/User.js';
import Follow from '../models/Follow.js';
import { Op } from 'sequelize';

// @desc    Follow user
// @route   POST /api/follow/:userId
// @access  Private
const followUser = async (req, res) => {
  try {
    const followerId = req.user.user_id;
    const followingId = parseInt(req.params.userId);

    // Cek apakah user mencoba follow dirinya sendiri
    if (followerId === followingId) {
      return res.status(400).json({ message: 'Tidak bisa follow diri sendiri' });
    }

    // Cek apakah user yang akan difollow ada
    const userToFollow = await User.findByPk(followingId);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Cek apakah sudah follow
    const existingFollow = await Follow.findOne({
      where: {
        id_pengikut: followerId,
        id_diikuti: followingId
      }
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'Sudah mengikuti user ini' });
    }

    // Buat follow baru
    await Follow.create({
      id_pengikut: followerId,
      id_diikuti: followingId
    });

    res.status(201).json({ message: 'Berhasil mengikuti user' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow user
// @route   DELETE /api/follow/:userId
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.user_id;
    const followingId = parseInt(req.params.userId);

    // Cari dan hapus follow
    const follow = await Follow.findOne({
      where: {
        id_pengikut: followerId,
        id_diikuti: followingId
      }
    });

    if (!follow) {
      return res.status(404).json({ message: 'Tidak mengikuti user ini' });
    }

    await follow.destroy();
    res.status(200).json({ message: 'Berhasil unfollow user' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get followers
// @route   GET /api/follow/:userId/followers
// @access  Private
const getFollowers = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await User.findByPk(userId, {
      include: [{
        model: User,
        as: 'Pengikut',
        attributes: ['user_id', 'username', 'name', 'foto_profil'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.status(200).json({
      count: user.Pengikut.length,
      followers: user.Pengikut
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get following
// @route   GET /api/follow/:userId/following
// @access  Private
const getFollowing = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await User.findByPk(userId, {
      include: [{
        model: User,
        as: 'Mengikuti',
        attributes: ['user_id', 'username', 'name', 'foto_profil'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.status(200).json({
      count: user.Mengikuti.length,
      following: user.Mengikuti
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if following
// @route   GET /api/follow/:userId/status
// @access  Private
const getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.user_id;
    const followingId = parseInt(req.params.userId);

    const isFollowing = await Follow.findOne({
      where: {
        id_pengikut: followerId,
        id_diikuti: followingId
      }
    });

    res.status(200).json({ isFollowing: !!isFollowing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get followers count
// @route   GET /api/follow/:userId/followers/count
// @access  Private
const getFollowersCount = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await Follow.count({
      where: { id_diikuti: userId }
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get following count
// @route   GET /api/follow/:userId/following/count
// @access  Private
const getFollowingCount = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const count = await Follow.count({
      where: { id_pengikut: userId }
    });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getFollowersCount,
  getFollowingCount
};
