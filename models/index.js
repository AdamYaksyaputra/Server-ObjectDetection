const sequelize = require('../config/database');
const { Op } = require('sequelize');

const Branch = require('./Branch');
const History = require('./History');
const Sensor = require('./Sensor');
const DeviceToken = require('./DeviceTokens');
const User = require('./Users');

const models = {
    Branch,
    History,
    Sensor,
    DeviceToken,
    User,
};

// Associate models
Object.entries(models).forEach(([modelName, model]) => {
    if (model.associate) {
        model.associate(models);
    }
});

// Export models and sequelize instance
module.exports = {
    ...models,
    sequelize,
    Op
};