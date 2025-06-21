import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import Group from './Group.js';
import User from './User.js';

const GroupMember = sequelize.define('GroupMember', {
  role: {
    type: DataTypes.ENUM('admin', 'member', 'moderator'), // Add 'moderator' to allowed roles
    allowNull: false,
    defaultValue: 'member'
  }
}, {
  timestamps: false,
  primaryKey: ['id_group', 'id_user'] // Composite primary key
});

GroupMember.belongsTo(Group, { foreignKey: 'id_group' });
Group.hasMany(GroupMember, { foreignKey: 'id_group' });

GroupMember.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(GroupMember, { foreignKey: 'id_user' });

export default GroupMember;
