import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';
import Post from './Post.js';

const Like = sequelize.define('Like', {
  id_like: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  waktu: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  id_post: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Post,
      key: 'id_post'
    }
  }
}, {
  timestamps: false // Waktu sudah dihandle oleh field 'waktu'
});

Like.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(Like, { foreignKey: 'id_user' });

Like.belongsTo(Post, { foreignKey: 'id_post' });
Post.hasMany(Like, { foreignKey: 'id_post' });

export default Like;