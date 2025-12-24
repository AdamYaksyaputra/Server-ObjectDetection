const express = require('express');
const {
    getReportBranches,
    getReportSummary,
    getReportPreview,
    downloadReport,
    sendReportEmail
} = require('../controllers/ReportsController');
const { protect } = require('../controllers/AuthController');

const router = express.Router();

router.get('/api/reports/branches', protect, getReportBranches);
router.get('/api/reports/summary', protect, getReportSummary);
router.get('/api/reports/preview', protect, getReportPreview);
router.get('/api/reports/download', protect, downloadReport);
router.post('/api/reports/send-email', protect, sendReportEmail);

module.exports = router;
