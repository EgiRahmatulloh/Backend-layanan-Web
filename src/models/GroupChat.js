import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import Group from './Group.js';
import User from './User.js';

const GroupChat = sequelize.define('GroupChat', {
  id_group_chat: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_group: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Group,
      key: 'id_group'
    }
  },
  id_pengirim: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  pesan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  media: {
    type: DataTypes.STRING,
    allowNull: true
  },
  waktu: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false // Waktu sudah dihandle oleh field 'waktu'
});

GroupChat.belongsTo(Group, { foreignKey: 'id_group' });
Group.hasMany(GroupChat, { foreignKey: 'id_group' });

GroupChat.belongsTo(User, { as: 'Pengirim', foreignKey: 'id_pengirim' });
User.hasMany(GroupChat, { as: 'SentGroupChats', foreignKey: 'id_pengirim' });

export default GroupChat;