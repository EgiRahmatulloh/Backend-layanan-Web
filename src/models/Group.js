import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Group = sequelize.define('Group', {
  id_group: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nama_group: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deskripsi: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  id_admin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  foto_grup: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

Group.belongsTo(User, { as: 'Admin', foreignKey: 'id_admin' });
User.hasMany(Group, { as: 'AdminedGroups', foreignKey: 'id_admin' });

export default Group;