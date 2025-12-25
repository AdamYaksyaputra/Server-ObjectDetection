const { Op } = require('sequelize');
const History = require('../models/History');
const fs = require('fs');
const path = require('path');

/**
 * Delete history records older than 30 days
 * Data saved on December 25 will be deleted on January 26
 */
const cleanupOldData = async () => {
    try {
        // Calculate date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        console.log(`[Data Cleanup] Running cleanup for records older than: ${thirtyDaysAgo.toISOString()}`);

        // Find all history records older than 30 days
        const oldRecords = await History.findAll({
            where: {
                createdAt: {
                    [Op.lt]: thirtyDaysAgo
                }
            },
            paranoid: false // Include soft-deleted records
        });

        if (oldRecords.length === 0) {
            console.log('[Data Cleanup] No old records found to delete.');
            return { deleted: 0 };
        }

        console.log(`[Data Cleanup] Found ${oldRecords.length} records to delete.`);

        // Delete associated photo files
        for (const record of oldRecords) {
            if (record.photo_url) {
                try {
                    // Extract filename from URL and construct file path
                    const photoPath = record.photo_url.replace(/^.*\/uploads\//, '');
                    const fullPath = path.join(__dirname, '..', 'public', 'uploads', photoPath);

                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        console.log(`[Data Cleanup] Deleted photo: ${photoPath}`);
                    }
                } catch (fileError) {
                    console.error(`[Data Cleanup] Error deleting photo for record ${record.id}:`, fileError.message);
                }
            }
        }

        // Force delete records (permanent delete, not soft delete)
        const deletedCount = await History.destroy({
            where: {
                createdAt: {
                    [Op.lt]: thirtyDaysAgo
                }
            },
            force: true // Permanently delete
        });

        console.log(`[Data Cleanup] Successfully deleted ${deletedCount} old records.`);
        return { deleted: deletedCount };

    } catch (error) {
        console.error('[Data Cleanup] Error during cleanup:', error.message);
        return { deleted: 0, error: error.message };
    }
};

/**
 * Start the cleanup scheduler
 * Runs every 24 hours (86400000 milliseconds)
 */
const startCleanupScheduler = () => {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    console.log('[Data Cleanup] Scheduler started. Will run every 24 hours.');
    console.log('[Data Cleanup] Data retention policy: 30 days');

    // Run immediately on startup
    cleanupOldData();

    // Schedule to run every 24 hours
    setInterval(() => {
        console.log(`[Data Cleanup] Scheduled cleanup triggered at ${new Date().toISOString()}`);
        cleanupOldData();
    }, TWENTY_FOUR_HOURS);
};

module.exports = { cleanupOldData, startCleanupScheduler };
