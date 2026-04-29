const { PrismaClient } = require('@prisma/client')
const logger = require('@/infrastructure/logger/logger')

let prisma

try {
  prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

  // Test connection on startup
  prisma
    .$connect()
    .then(() => logger.info('Database connected successfully'))
    .catch(error => {
      logger.error('Failed to connect to database:', error)
      // Don't exit here, let the application handle connection errors
    })
} catch (error) {
  logger.error('Error initializing Prisma client:', error)
  prisma = null
}

// Graceful shutdown with proper cleanup to prevent memory leaks
const cleanup = async _signal => {
  if (prisma) {
    try {
      await prisma.$disconnect()
      logger.info('Database disconnected gracefully')
    } catch (error) {
      logger.error('Error disconnecting database:', error)
    }
  }
}

// Use once() to prevent multiple listeners and memory leaks
process.once('beforeExit', cleanup)
process.once('SIGINT', async () => {
  await cleanup('SIGINT')
  process.exit(0)
})
process.once('SIGTERM', async () => {
  await cleanup('SIGTERM')
  process.exit(0)
})

module.exports = prisma
