import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { io } from '../server.js'; // Import io instance

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {
      user_id: req.user.user_id
    };
    
    if (unread_only === 'true') {
      whereClause.is_read = false;
    }
    
    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['user_id', 'username', 'name', 'foto_profil'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Map notification_id to id for frontend consistency
    const mappedNotifications = notifications.rows.map(notif => ({
      id: notif.notification_id,
      user_id: notif.user_id,
      sender_id: notif.sender_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      reference_id: notif.reference_id,
      reference_type: notif.reference_type,
      isRead: notif.is_read,
      createdAt: notif.createdAt,
      updatedAt: notif.updatedAt,
      user: notif.sender // Ensure sender data is passed as 'user'
    }));

    res.json({
      success: true,
      data: mappedNotifications,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(notifications.count / limit),
        total_items: notifications.count,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil notifikasi',
      error: error.message
    });
  }
};

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        user_id: req.user.user_id,
        is_read: false
      }
    });
    
    res.json({
      success: true,
      unread_count: count
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil jumlah notifikasi belum dibaca',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      where: {
        notification_id: id,
        user_id: req.user.user_id
      }
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan'
      });
    }
    
    await notification.update({ is_read: true });
    
    res.json({
      success: true,
      message: 'Notifikasi berhasil ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai notifikasi sebagai dibaca',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.user_id,
          is_read: false
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai semua notifikasi sebagai dibaca',
      error: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      where: {
        notification_id: id,
        user_id: req.user.user_id
      }
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notifikasi tidak ditemukan'
      });
    }
    
    await notification.destroy();
    
    res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi',
      error: error.message
    });
  }
};

// @desc    Create notification (internal function)
// @route   Internal use only
// @access  Internal
const createNotification = async ({
  user_id,
  sender_id = null,
  type,
  title,
  message,
  reference_id = null,
  reference_type = null,
  data = null
}) => {
  try {
    // Jangan buat notifikasi untuk diri sendiri
    if (user_id === sender_id) {
      return null;
    }
    
    const notification = await Notification.create({
      user_id,
      sender_id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      data
    });

    // Fetch sender details for real-time notification
    const sender = await User.findByPk(sender_id, {
      attributes: ['user_id', 'username', 'name', 'foto_profil']
    });

    // Data notifikasi yang akan dipancarkan
    const notificationData = {
      id: notification.notification_id, // Use notification_id as id for frontend
      user_id: notification.user_id,
      sender_id: notification.sender_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      reference_id: notification.reference_id,
      reference_type: notification.reference_type,
      isRead: notification.is_read,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      user: sender // Attach sender info
    };

    console.log('Emitting new_notification:', notificationData); // Log data yang dipancarkan

    // Emit real-time notification
    if (io && user_id !== sender_id) {
      io.to(`user_${user_id}`).emit('new_notification', notificationData);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// @desc    Create like notification
// @route   Internal use only
// @access  Internal
const createLikeNotification = async (post, liker) => {
  try {
    await createNotification({
      user_id: post.id_user,
      sender_id: liker.user_id,
      type: 'like',
      title: 'Post Disukai',
      message: `${liker.name} menyukai post Anda`,
      reference_id: post.post_id,
      reference_type: 'post'
    });
  } catch (error) {
    console.error('Error creating like notification:', error);
  }
};

// @desc    Create comment notification
// @route   Internal use only
// @access  Internal
const createCommentNotification = async (post, commenter, comment) => {
  try {
    await createNotification({
      user_id: post.id_user,
      sender_id: commenter.user_id,
      type: 'comment',
      title: 'Komentar Baru',
      message: `${commenter.name} mengomentari post Anda: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`,
      reference_id: post.post_id,
      reference_type: 'post'
    });
  } catch (error) {
    console.error('Error creating comment notification:', error);
  }
};

// @desc    Create follow notification
// @route   Internal use only
// @access  Internal
const createFollowNotification = async (followedUser, follower) => {
  try {
    await createNotification({
      user_id: followedUser.user_id,
      sender_id: follower.user_id,
      type: 'follow',
      title: 'Pengikut Baru',
      message: `${follower.name} mulai mengikuti Anda`,
      reference_id: follower.user_id,
      reference_type: 'user'
    });
  } catch (error) {
    console.error('Error creating follow notification:', error);
  }
};

// @desc    Create private message notification
// @route   Internal use only
// @access  Internal
const createPrivateMessageNotification = async (receiver, sender, messagePreview) => {
  try {
    await createNotification({
      user_id: receiver.user_id,
      sender_id: sender.user_id,
      type: 'private_message',
      title: 'Pesan Baru',
      message: `${sender.name} mengirim pesan: "${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
      reference_id: sender.user_id,
      reference_type: 'user',
      data: {
        message_preview: messagePreview,
        sender_username: sender.username
      }
    });
  } catch (error) {
    console.error('Error creating private message notification:', error);
  }
};

export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  createLikeNotification,
  createCommentNotification,
  createFollowNotification,
  createPrivateMessageNotification
};
