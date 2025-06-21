import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import GroupChat from '../models/GroupChat.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';

// Membuat group baru
export const createGroup = async (req, res) => {
  try {
    const { nama_group, deskripsi } = req.body;
    const id_admin = req.user.user_id;

    // Membuat group baru
    const group = await Group.create({
      nama_group,
      deskripsi,
      id_admin
    });

    // Menambahkan admin sebagai member dengan role admin
    await GroupMember.create({
      id_group: group.id_group,
      id_user: id_admin,
      role: 'admin'
    });

    res.status(201).json({ 
      message: 'Group berhasil dibuat', 
      group 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mendapatkan semua group yang diikuti user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const groups = await GroupMember.findAll({
      where: { id_user: userId },
      include: [{
        model: Group,
        include: [{
          model: User,
          as: 'Admin',
          attributes: ['user_id', 'username', 'name']
        }]
      }]
    });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mendapatkan detail group
export const getGroupDetail = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah user adalah member dari group
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }

    const group = await Group.findByPk(id_group, {
      include: [
        {
          model: User,
          as: 'Admin',
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        },
        {
          model: GroupMember,
          include: [{
            model: User,
            attributes: ['user_id', 'username', 'name', 'foto_profil']
          }]
        }
      ]
    });

    if (!group) {
      return res.status(404).json({ message: 'Group tidak ditemukan' });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Menambahkan member ke group
export const addMember = async (req, res) => {
  try {
    const { id_group } = req.params;
    const { id_user } = req.body;
    const adminId = req.user.user_id;

    // Cek apakah user yang menambahkan adalah admin
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: adminId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat menambahkan member' });
    }

    // Cek apakah user sudah menjadi member
    const existingMember = await GroupMember.findOne({
      where: { id_group, id_user }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User sudah menjadi member group ini' });
    }

    // Tambahkan member baru
    const newMember = await GroupMember.create({
      id_group,
      id_user,
      role: 'member'
    });

    res.status(201).json({ 
      message: 'Member berhasil ditambahkan', 
      member: newMember 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Menghapus member dari group
export const removeMember = async (req, res) => {
  try {
    const { id_group, id_user } = req.params;
    const adminId = req.user.user_id;

    // Cek apakah user yang menghapus adalah admin
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: adminId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat menghapus member' });
    }

    // Tidak bisa menghapus admin
    const targetMember = await GroupMember.findOne({
      where: { id_group, id_user }
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Member tidak ditemukan' });
    }

    if (targetMember.role === 'admin') {
      return res.status(400).json({ message: 'Tidak dapat menghapus admin group' });
    }

    await GroupMember.destroy({
      where: { id_group, id_user }
    });

    res.status(200).json({ message: 'Member berhasil dihapus dari group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Keluar dari group
export const leaveGroup = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Anda bukan member dari group ini' });
    }

    if (membership.role === 'admin') {
      return res.status(400).json({ message: 'Admin tidak dapat keluar dari group. Transfer admin terlebih dahulu.' });
    }

    await GroupMember.destroy({
      where: { id_group, id_user: userId }
    });

    res.status(200).json({ message: 'Berhasil keluar dari group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update group info
export const updateGroup = async (req, res) => {
  try {
    const { id_group } = req.params;
    const { nama_group, deskripsi } = req.body;
    const userId = req.user.user_id;

    // Cek apakah user adalah admin
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: userId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat mengupdate group' });
    }

    const group = await Group.findByPk(id_group);
    if (!group) {
      return res.status(404).json({ message: 'Group tidak ditemukan' });
    }

    await group.update({
      nama_group: nama_group || group.nama_group,
      deskripsi: deskripsi || group.deskripsi
    });

    res.status(200).json({ 
      message: 'Group berhasil diupdate', 
      group 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hapus group
export const deleteGroup = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah user adalah admin
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: userId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat menghapus group' });
    }

    // Hapus semua member
    await GroupMember.destroy({ where: { id_group } });
    
    // Hapus semua chat
    await GroupChat.destroy({ where: { id_group } });
    
    // Hapus group
    await Group.destroy({ where: { id_group } });

    res.status(200).json({ message: 'Group berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Kirim pesan ke group
export const sendGroupMessage = async (req, res) => {
  try {
    const { id_group } = req.params;
    const { pesan, media } = req.body;
    const id_pengirim = req.user.user_id;

    // Cek apakah user adalah member dari group
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: id_pengirim }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }

    const groupChat = await GroupChat.create({
      id_group,
      id_pengirim,
      pesan,
      media
    });

    res.status(201).json({ 
      message: 'Pesan berhasil dikirim', 
      chat: groupChat 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mendapatkan pesan group
export const getGroupMessages = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah user adalah member dari group
    const membership = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Anda bukan member dari group ini' });
    }

    const messages = await GroupChat.findAll({
      where: { id_group },
      include: [{
        model: User,
        as: 'Pengirim',
        attributes: ['user_id', 'username', 'name', 'foto_profil']
      }],
      order: [['waktu', 'ASC']]
    });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hapus pesan group
export const deleteGroupMessage = async (req, res) => {
  try {
    const { id_group_chat } = req.params;
    const userId = req.user.user_id;

    const message = await GroupChat.findByPk(id_group_chat);
    if (!message) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan' });
    }

    // Hanya pengirim atau admin yang bisa hapus pesan
    if (message.id_pengirim !== userId) {
      const adminMembership = await GroupMember.findOne({
        where: { 
          id_group: message.id_group, 
          id_user: userId, 
          role: 'admin' 
        }
      });

      if (!adminMembership) {
        return res.status(403).json({ message: 'Anda tidak memiliki izin untuk menghapus pesan ini' });
      }
    }

    // Hapus file media jika ada
    if (message.media) {
      const mediaPath = path.join(process.cwd(), 'uploads', 'chat_media', message.media);
      if (fs.existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath);
      }
    }

    await GroupChat.destroy({ where: { id_group_chat } });

    res.status(200).json({ message: 'Pesan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer admin
export const transferAdmin = async (req, res) => {
  try {
    const { id_group } = req.params;
    const { new_admin_id } = req.body;
    const currentAdminId = req.user.user_id;

    // Cek apakah user saat ini adalah admin
    const currentAdminMembership = await GroupMember.findOne({
      where: { id_group, id_user: currentAdminId, role: 'admin' }
    });

    if (!currentAdminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat transfer admin' });
    }

    // Cek apakah target user adalah member
    const targetMembership = await GroupMember.findOne({
      where: { id_group, id_user: new_admin_id }
    });

    if (!targetMembership) {
      return res.status(404).json({ message: 'User target bukan member dari group ini' });
    }

    // Update group admin
    await Group.update(
      { id_admin: new_admin_id },
      { where: { id_group } }
    );

    // Update role di GroupMember
    await GroupMember.update(
      { role: 'member' },
      { where: { id_group, id_user: currentAdminId } }
    );

    await GroupMember.update(
      { role: 'admin' },
      { where: { id_group, id_user: new_admin_id } }
    );

    res.status(200).json({ message: 'Admin berhasil ditransfer' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};