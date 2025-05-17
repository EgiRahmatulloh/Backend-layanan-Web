import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Post = sequelize.define('Post', {
  id_post: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  media: {
    type: DataTypes.STRING,
    allowNull: true
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
  timestamps: true
});

Post.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(Post, { foreignKey: 'id_user' });

export default Post;