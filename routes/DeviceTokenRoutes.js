const express = require('express');
const { registerDeviceToken, deleteDeviceToken } = require('../controllers/DeviceTokenController');
const { protect } = require('../controllers/AuthController');

const router = express.Router();

// Register device token (requires auth)
router.post('/api/device-token', protect, registerDeviceToken);

// Delete device token (logout)
router.delete('/api/device-token', protect, deleteDeviceToken);

module.exports = router;
