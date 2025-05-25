import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Chat = sequelize.define('Chat', {
  id_chat: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_pengirim: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  id_penerima: {
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
  media_url: {
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

Chat.belongsTo(User, { as: 'Pengirim', foreignKey: 'id_pengirim' });
Chat.belongsTo(User, { as: 'Penerima', foreignKey: 'id_penerima' });
User.hasMany(Chat, { as: 'SentChats', foreignKey: 'id_pengirim' });
User.hasMany(Chat, { as: 'ReceivedChats', foreignKey: 'id_penerima' });

export default Chat;