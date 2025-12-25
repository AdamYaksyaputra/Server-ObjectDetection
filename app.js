require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const sequelize = require('./config/database');
const routes = require('./routes');
const { startCleanupScheduler } = require('./utils/dataCleanup');
const { errorLoggingMiddleware, logInfo } = require('./utils/logger');
const { rateLimitMiddleware } = require('./utils/rateLimiter');

require('./models');


class App {
  constructor() {
    this.app = express();
    this.port = parseInt(process.env.APP_PORT, 10) || 3003;

    this.configureMiddleware();
    this.configureRoutes();
    this.connectToDatabase();
  }

  configureMiddleware() {
    this.app.use(cors({ origin: '*', credentials: true }));
    this.app.use('/public', express.static(path.join(__dirname, 'public')));
    this.app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting - 100 requests per minute per IP
    this.app.use('/api', rateLimitMiddleware);
  }

  configureRoutes() {
    this.app.use(routes);

    // Error logging middleware (must be after routes)
    this.app.use(errorLoggingMiddleware);
  }

  async connectToDatabase() {
    try {
      await sequelize.sync();
      const getLocalIP = () => {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              return iface.address;
            }
          }
        }
        return 'localhost';
      };

      this.app.listen(this.port, '0.0.0.0', () => {
        console.log(` > Server is running on http://${getLocalIP()}:${this.port}`);

        // Start data cleanup scheduler (delete data older than 30 days)
        startCleanupScheduler();
      });
    } catch (error) {
      console.error(' > Error connecting to the database:', error.message);
    }
  }
}

new App();
