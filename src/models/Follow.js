import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Follow = sequelize.define('Follow', {
  id_pengikut: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'user_id'
    }
  },
  id_diikuti: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'User',
      key: 'user_id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['id_pengikut', 'id_diikuti'] }
  ]
});

export default Follow;