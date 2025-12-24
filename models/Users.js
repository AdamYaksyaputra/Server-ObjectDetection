const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'security'),
    allowNull: false
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdAt: {
    allowNull: false,
    type: DataTypes.DATE
  },
  updatedAt: {
    allowNull: false,
    type: DataTypes.DATE
  },
  deleteAt: {
    allowNull: true,
    type: DataTypes.DATE
  }
}, {
  paranoid: true,
  timestamps: true,
  tableName: 'users',
  deletedAt: 'deleteAt'
});

User.associate = (models) => {
  User.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
  User.hasMany(models.History, { foreignKey: 'user_id', as: 'history' });
  User.hasMany(models.DeviceToken, { foreignKey: 'user_id', as: 'device_tokens' });
};

module.exports = User;
