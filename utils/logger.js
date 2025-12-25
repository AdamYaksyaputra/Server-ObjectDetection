const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

// Format timestamp
const getTimestamp = () => {
    return new Date().toISOString();
};

// Log error to file
const logError = (error, context = '') => {
    const timestamp = getTimestamp();
    const errorMessage = error.stack || error.message || String(error);
    const logEntry = `[${timestamp}] ${context ? `[${context}] ` : ''}ERROR: ${errorMessage}\n`;

    fs.appendFile(errorLogPath, logEntry, (err) => {
        if (err) console.error('Failed to write to error log:', err);
    });

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[ERROR] ${context}:`, errorMessage);
    }
};

// Log access/info to file
const logInfo = (message, context = '') => {
    const timestamp = getTimestamp();
    const logEntry = `[${timestamp}] ${context ? `[${context}] ` : ''}INFO: ${message}\n`;

    fs.appendFile(accessLogPath, logEntry, (err) => {
        if (err) console.error('Failed to write to access log:', err);
    });
};

// Express error logging middleware
const errorLoggingMiddleware = (err, req, res, next) => {
    const context = `${req.method} ${req.path}`;
    logError(err, context);

    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = {
    logError,
    logInfo,
    errorLoggingMiddleware
};
