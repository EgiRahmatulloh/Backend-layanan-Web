import Story from '../models/Story.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';

// Membuat story baru
export const createStory = async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.user.user_id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media diperlukan untuk membuat story'
      });
    }

    const story = await Story.create({
      caption: caption || '',
      media: `/uploads/stories/${req.file.filename}`,
      id_user: userId
    });

    const storyWithUser = await Story.findByPk(story.id_story, {
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Story berhasil dibuat',
      data: storyWithUser
    });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat story',
      error: error.message
    });
  }
};

// Mendapatkan semua stories yang masih aktif
export const getActiveStories = async (req, res) => {
  try {
    const now = new Date();
    
    const stories = await Story.findAll({
      where: {
        expired_at: {
          [Op.gt]: now
        },
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Group stories by user
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.id_user;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.User,
          stories: []
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    const result = Object.values(groupedStories);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil stories',
      error: error.message
    });
  }
};

// Mendapatkan stories dari user tertentu
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    
    const stories = await Story.findAll({
      where: {
        id_user: userId,
        expired_at: {
          [Op.gt]: now
        },
        is_active: true
      },
      include: [{
        model: User,
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil stories user',
      error: error.message
    });
  }
};

// Menghapus story
export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.user_id;
    
    const story = await Story.findOne({
      where: {
        id_story: storyId,
        id_user: userId
      }
    });

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story tidak ditemukan atau Anda tidak memiliki akses'
      });
    }

    // Hapus file media
    if (story.media) {
      const mediaPath = path.join(process.cwd(), 'uploads', 'stories', path.basename(story.media));
      if (fs.existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath);
      }
    }

    await story.destroy();

    res.json({
      success: true,
      message: 'Story berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus story',
      error: error.message
    });
  }
};

// Fungsi untuk membersihkan stories yang sudah expired (untuk cron job)
export const cleanupExpiredStories = async () => {
  try {
    const now = new Date();
    
    const expiredStories = await Story.findAll({
      where: {
        expired_at: {
          [Op.lt]: now
        }
      }
    });

    // Hapus file media dari stories yang expired
    for (const story of expiredStories) {
      if (story.media) {
        const mediaPath = path.join(process.cwd(), 'uploads', 'stories', path.basename(story.media));
        if (fs.existsSync(mediaPath)) {
          fs.unlinkSync(mediaPath);
        }
      }
    }

    // Hapus records dari database
    const deletedCount = await Story.destroy({
      where: {
        expired_at: {
          [Op.lt]: now
        }
      }
    });

    console.log(`Cleaned up ${deletedCount} expired stories`);
    return deletedCount;
  } catch (error) {
    // Jika tabel belum ada (saat pertama kali server start), return 0
    if (error.name === 'SequelizeDatabaseError' && error.original?.code === 'ER_NO_SUCH_TABLE') {
      console.log('Stories table not yet created, skipping cleanup');
      return 0;
    }
    console.error('Error cleaning up expired stories:', error);
    throw error;
  }
};

// Endpoint untuk manual cleanup (untuk testing)
export const manualCleanup = async (req, res) => {
  try {
    const deletedCount = await cleanupExpiredStories();
    res.json({
      success: true,
      message: `Berhasil membersihkan ${deletedCount} stories yang expired`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal membersihkan stories expired',
      error: error.message
    });
  }
};