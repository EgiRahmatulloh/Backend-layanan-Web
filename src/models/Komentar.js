import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';
import Post from './Post.js';

const Komentar = sequelize.define('Komentar', {
  id_komentar: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  isi_komentar: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  waktu: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  id_post: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: 'id_post'
    }
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  }
}, {
  timestamps: false // Waktu sudah dihandle oleh field 'waktu'
});

Komentar.belongsTo(Post, { foreignKey: 'id_post' });
Post.hasMany(Komentar, { foreignKey: 'id_post' });

Komentar.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(Komentar, { foreignKey: 'id_user' });

export default Komentar;