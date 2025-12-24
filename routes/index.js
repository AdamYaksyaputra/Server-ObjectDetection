const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./AuthRoutes');
const branchRoutes = require('./BranchRoutes');
const historyRoutes = require('./HistoryRoutes');
const sensorRoutes = require('./SensorRoutes');
const userRoutes = require('./UserRoutes');
const reportsRoutes = require('./ReportsRoutes');
const deviceTokenRoutes = require('./DeviceTokenRoutes');

// Use routes
router.use(authRoutes);
router.use(branchRoutes);
router.use(historyRoutes);
router.use(sensorRoutes);
router.use(userRoutes);
router.use(reportsRoutes);
router.use(deviceTokenRoutes);

module.exports = router;