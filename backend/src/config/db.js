const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Test connection on startup
  prisma.$connect()
    .then(() => logger.info('Database connected successfully'))
    .catch((error) => {
      logger.error('Failed to connect to database:', error);
      // Don't exit here, let the application handle connection errors
    });
} catch (error) {
  logger.error('Error initializing Prisma client:', error);
  prisma = null;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});

process.on('SIGINT', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

module.exports = prisma;
