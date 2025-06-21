import express from 'express';
import {
  createGroup,
  getUserGroups,
  getGroupDetail,
  addMember,
  removeMember,
  leaveGroup,
  updateGroup,
  deleteGroup,
  sendGroupMessage,
  getGroupMessages,
  deleteGroupMessage,
  transferAdmin,
  getAllAvailableGroups,
  joinGroup,
  updateMemberRole // Import the new function
} from '../controllers/groupController.js';
import { uploadGroupFile, deleteGroupFile } from '../controllers/groupMediaController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Group management routes
router.post('/create', verifyToken, createGroup);
router.get('/my-groups', verifyToken, getUserGroups);
router.get('/available', verifyToken, getAllAvailableGroups);
router.post('/:id_group/join', verifyToken, joinGroup);
router.get('/:id_group', verifyToken, getGroupDetail);
router.put('/:id_group', verifyToken, updateGroup);
router.delete('/:id_group', verifyToken, deleteGroup);

// Member management routes
router.post('/:id_group/members', verifyToken, addMember);
router.delete('/:id_group/members/:id_user', verifyToken, removeMember);
router.put('/:id_group/members/:id_user/role', verifyToken, updateMemberRole); // New route for updating member role
router.post('/:id_group/leave', verifyToken, leaveGroup);
router.put('/:id_group/transfer-admin', verifyToken, transferAdmin);

// Group chat routes
router.post('/:id_group/messages', verifyToken, sendGroupMessage);
router.get('/:id_group/messages', verifyToken, getGroupMessages);
router.delete('/messages/:id_group_chat', verifyToken, deleteGroupMessage);

// Group media routes
router.post('/:id_group/upload', verifyToken, uploadGroupFile);
router.delete('/media/:filename', verifyToken, deleteGroupFile);

export default router;
