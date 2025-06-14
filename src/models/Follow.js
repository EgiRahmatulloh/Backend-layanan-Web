import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Follow = sequelize.define('Follow', {
  id_pengikut: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  id_diikuti: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['id_pengikut', 'id_diikuti'] }
  ]
});

Follow.belongsTo(User, { as: 'Pengikut', foreignKey: 'id_pengikut' });
Follow.belongsTo(User, { as: 'Diikuti', foreignKey: 'id_diikuti' });

User.belongsToMany(User, { as: 'Mengikuti', through: Follow, foreignKey: 'id_pengikut', otherKey: 'id_diikuti' });
User.belongsToMany(User, { as: 'Pengikut', through: Follow, foreignKey: 'id_diikuti', otherKey: 'id_pengikut' });

export default Follow;