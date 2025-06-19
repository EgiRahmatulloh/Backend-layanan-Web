import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './User.js';

const Story = sequelize.define('Story', {
  id_story: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  media: {
    type: DataTypes.STRING,
    allowNull: false
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  id_user: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'user_id'
    }
  },
  expired_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => {
      const now = new Date();
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam dari sekarang
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Stories',
  timestamps: true
});

// Relasi dengan User
Story.belongsTo(User, { foreignKey: 'id_user' });
User.hasMany(Story, { foreignKey: 'id_user' });

export default Story;