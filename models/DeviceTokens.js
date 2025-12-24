const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceToken = sequelize.define('device_tokens', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    device_token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    device_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    last_active: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        allowNull: false,
        type: DataTypes.DATE
    },
    updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
    }
}, {
    timestamps: true,
    tableName: 'device_tokens',
});

DeviceToken.associate = (models) => {
    DeviceToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};

module.exports = DeviceToken;
