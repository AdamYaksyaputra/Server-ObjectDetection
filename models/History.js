
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const History = sequelize.define('history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  sensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Null on initial creation, updated when user responds
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isEmergency: {
    type: DataTypes.BOOLEAN,
    allowNull: true, // Null on initial creation, set when user responds
    defaultValue: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  photo_url: {
    type: DataTypes.TEXT, // Changed to TEXT to support JSON array of multiple photo URLs
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('photo_url');
      if (!rawValue) return [];
      try {
        return JSON.parse(rawValue);
      } catch (e) {
        // Legacy single URL support
        return rawValue ? [rawValue] : [];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('photo_url', JSON.stringify(value));
      } else if (value) {
        this.setDataValue('photo_url', JSON.stringify([value]));
      } else {
        this.setDataValue('photo_url', null);
      }
    }
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  tableName: 'history',
  deletedAt: 'deleteAt'
});

History.associate = (models) => {
  History.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  History.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
  History.belongsTo(models.Sensor, { foreignKey: 'sensor_id', as: 'sensor' });
};

module.exports = History;