
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Sensor = sequelize.define('sensor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  isOn: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: 'on'
  },
  isDetected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  tableName: 'sensor',
  deletedAt: 'deleteAt'
});

Sensor.associate = (models) => {
  Sensor.belongsTo(models.Branch, { foreignKey: 'branch_id', as: 'branch' });
  Sensor.hasMany(models.History, { foreignKey: 'sensor_id', as: 'history' });
};

module.exports = Sensor;