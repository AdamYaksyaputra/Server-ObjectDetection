// Simple in-memory rate limiter
// For production, consider using express-rate-limit with Redis store

const rateLimit = {};

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Max 100 requests per minute per IP

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const ip in rateLimit) {
        if (rateLimit[ip].resetTime < now) {
            delete rateLimit[ip];
        }
    }
}, 5 * 60 * 1000);

// Rate limiting middleware
const rateLimitMiddleware = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Initialize or reset if window expired
    if (!rateLimit[ip] || rateLimit[ip].resetTime < now) {
        rateLimit[ip] = {
            count: 1,
            resetTime: now + WINDOW_MS
        };
        return next();
    }

    // Increment count
    rateLimit[ip].count++;

    // Check if exceeded
    if (rateLimit[ip].count > MAX_REQUESTS) {
        return res.status(429).json({
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimit[ip].resetTime - now) / 1000)
        });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', MAX_REQUESTS - rateLimit[ip].count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit[ip].resetTime / 1000));

    next();
};

module.exports = { rateLimitMiddleware };
