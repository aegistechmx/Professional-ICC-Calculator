require('dotenv').config();
const app = require('./app');
const prisma = require('./config/db');
const logger = require('./utils/logger');

// Validate required environment variables
const requiredEnvVars = ['PORT', 'JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars.join(', '));
  logger.error('Please check your .env file');
  process.exit(1);
}

// Validate optional environment variables with defaults
const optionalEnvVars = {
  ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000,http://localhost:5174',
  NODE_ENV: 'development',
  REDIS_URL: 'redis://localhost:6379'
};

Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
  if (!process.env[key]) {
    logger.warn(`Optional environment variable ${key} not set, using default: ${defaultValue}`);
    process.env[key] = defaultValue;
  }
});

// Validate JWT_SECRET is not the placeholder
if (process.env.JWT_SECRET === 'GENERATE_SECURE_RANDOM_KEY_HERE_USE_NODE_CRYPTO_OR_OPENSSL') {
  logger.error('ERROR: JWT_SECRET is still set to placeholder. Please generate a secure key.');
  logger.error('Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  process.exit(1);
}

const server = app.listen(process.env.PORT, () => {
  logger.info('Server running on port ' + process.env.PORT);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      await prisma.$disconnect();
      logger.info('Prisma client disconnected.');
      process.exit(0);
    } catch (error) {
      console.error('Error disconnecting Prisma:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
