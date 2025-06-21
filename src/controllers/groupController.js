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
        attributes: ['id_group', 'nama_group', 'deskripsi', 'foto_grup', 'id_admin'],
        include: [
          {
            model: User,
            as: 'Admin',
            attributes: ['user_id', 'username', 'name']
          },
          {
            model: GroupMember,
            include: [{
              model: User,
              attributes: ['user_id', 'username', 'name']
            }]
          }
        ]
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
    const currentUserId = req.user.user_id;

    // Cek apakah user yang menghapus adalah admin atau moderator
    const currentUserMembership = await GroupMember.findOne({
      where: { id_group, id_user: currentUserId }
    });

    if (!currentUserMembership || !['admin', 'moderator'].includes(currentUserMembership.role)) {
      return res.status(403).json({ message: 'Hanya admin atau moderator yang dapat menghapus member' });
    }

    // Cek member yang akan dihapus
    const targetMember = await GroupMember.findOne({
      where: { id_group, id_user }
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Member tidak ditemukan' });
    }

    // Tidak bisa menghapus admin
    if (targetMember.role === 'admin') {
      return res.status(400).json({ message: 'Tidak dapat menghapus admin group' });
    }

    // Moderator tidak bisa menghapus moderator lain
    if (currentUserMembership.role === 'moderator' && targetMember.role === 'moderator') {
      return res.status(403).json({ message: 'Moderator tidak dapat menghapus moderator lain' });
    }

    // Tidak bisa menghapus diri sendiri (kecuali menggunakan leave group)
    if (currentUserId === id_user) {
      return res.status(400).json({ message: 'Gunakan fitur keluar group untuk meninggalkan group' });
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

// Mendapatkan semua grup yang tersedia untuk bergabung
export const getAllAvailableGroups = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { search } = req.query;

    // Dapatkan ID grup yang sudah diikuti user
    const userGroups = await GroupMember.findAll({
      where: { id_user: userId },
      attributes: ['id_group']
    });

    const joinedGroupIds = userGroups.map(group => group.id_group);

    // Query untuk mendapatkan grup yang belum diikuti
    let whereCondition = {
      id_group: {
        [Op.notIn]: joinedGroupIds
      }
    };

    // Tambahkan filter pencarian jika ada
    if (search) {
      whereCondition.nama_group = {
        [Op.like]: `%${search}%`
      };
    }

    const availableGroups = await Group.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'Admin',
          attributes: ['user_id', 'username', 'name', 'foto_profil']
        },
        {
          model: GroupMember,
          attributes: ['id_user'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Tambahkan jumlah member untuk setiap grup
    const groupsWithMemberCount = availableGroups.map(group => {
      const memberCount = group.GroupMembers ? group.GroupMembers.length : 0;
      const groupData = group.get({ plain: true });
      delete groupData.GroupMembers;
      return {
        ...groupData,
        memberCount
      };
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar grup yang tersedia',
      data: groupsWithMemberCount
    });
  } catch (error) {
    console.error('Error fetching available groups:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil daftar grup yang tersedia',
      error: error.message 
    });
  }
};

// Bergabung dengan grup
export const joinGroup = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah grup ada
    const group = await Group.findByPk(id_group);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: 'Grup tidak ditemukan' 
      });
    }

    // Cek apakah user sudah menjadi member
    const existingMember = await GroupMember.findOne({
      where: { id_group, id_user: userId }
    });

    if (existingMember) {
      return res.status(400).json({ 
        success: false,
        message: 'Anda sudah menjadi member grup ini' 
      });
    }

    // Tambahkan user sebagai member
    const newMember = await GroupMember.create({
      id_group,
      id_user: userId,
      role: 'member'
    });

    res.status(201).json({ 
      success: true,
      message: 'Berhasil bergabung dengan grup',
      data: newMember
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal bergabung dengan grup',
      error: error.message 
    });
  }
};

// Memperbarui peran anggota grup (moderator/member)
export const updateMemberRole = async (req, res) => {
  try {
    const { id_group, id_user } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.user_id;

    // Validasi peran yang diminta
    if (!['member', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Peran tidak valid. Hanya "member" atau "moderator" yang diizinkan.' });
    }

    // Cek apakah user yang melakukan aksi adalah admin grup
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: currentUserId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat mengubah peran anggota.' });
    }

    // Cek apakah anggota target ada di grup
    const targetMember = await GroupMember.findOne({
      where: { id_group, id_user }
    });

    if (!targetMember) {
      return res.status(404).json({ message: 'Anggota tidak ditemukan di grup ini.' });
    }

    // Admin tidak bisa mengubah peran dirinya sendiri atau admin lain
    if (targetMember.role === 'admin') {
      return res.status(400).json({ message: 'Tidak dapat mengubah peran admin grup.' });
    }
    
    // Admin tidak bisa mengubah peran dirinya sendiri
    if (targetMember.id_user === currentUserId) {
      return res.status(400).json({ message: 'Anda tidak dapat mengubah peran Anda sendiri.' });
    }

    // Update peran anggota
    await targetMember.update({ role });

    res.status(200).json({ 
      message: `Peran anggota berhasil diperbarui menjadi ${role}`, 
      member: targetMember 
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update foto grup
export const updateGroupPhoto = async (req, res) => {
  try {
    const { id_group } = req.params;
    const userId = req.user.user_id;

    // Cek apakah user adalah admin
    const adminMembership = await GroupMember.findOne({
      where: { id_group, id_user: userId, role: 'admin' }
    });

    if (!adminMembership) {
      return res.status(403).json({ message: 'Hanya admin yang dapat mengubah foto grup' });
    }

    const group = await Group.findByPk(id_group);
    if (!group) {
      return res.status(404).json({ message: 'Group tidak ditemukan' });
    }

    // Hapus foto lama jika ada
    if (group.foto_grup) {
      const oldPhotoPath = path.join(process.cwd(), group.foto_grup.replace(/^\//, ''));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Update dengan foto baru
    const fotoGrupPath = req.file ? `/uploads/group_media/${req.file.filename}` : null;
    await group.update({ foto_grup: fotoGrupPath });

    res.status(200).json({ 
      message: 'Foto grup berhasil diubah', 
      group,
      foto_grup: fotoGrupPath
    });
  } catch (error) {
    console.error('Error updating group photo:', error);
    res.status(500).json({ message: error.message });
  }
};
