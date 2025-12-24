
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define('branch', {
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
    city: {
        type: DataTypes.STRING,
        allowNull: false
    },
    from_active_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    to_active_time: {
        type: DataTypes.TIME,
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
    tableName: 'branch',
    deletedAt: 'deleteAt'
});

Branch.associate = (models) => {
    Branch.hasMany(models.History, { foreignKey: 'branch_id', as: 'histories' });
    Branch.hasMany(models.Sensor, { foreignKey: 'branch_id', as: 'sensors' });
};

module.exports = Branch;
