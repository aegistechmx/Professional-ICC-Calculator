# Database Setup Requirements

This application supports both PostgreSQL (production) and SQLite (development) databases.

## Development Setup (SQLite)

For local development, the application uses SQLite for simplicity:

1. Navigate to the backend directory
2. Run Prisma migrations: `npx prisma db push`
3. The database file will be created at `backend/prisma/dev.db`

**Note:** SQLite is suitable for development only. For production, use PostgreSQL.

## Production Setup (PostgreSQL)

### Option 1: Docker Setup (Recommended)

1. Install Docker Desktop for Windows
2. Navigate to the backend directory
3. Run: `docker-compose up -d db`

4. Update `.env` file:

```bash
DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@db:5432/icc_db"
```

5. Run Prisma migrations: `npx prisma db push`

### Option 2: Local PostgreSQL

1. Install PostgreSQL for Windows
2. Create a database named `icc_db`

3. Update `.env` file:

```bash
DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5432/icc_db"
```

4. Run Prisma migrations: `npx prisma db push`

## Environment Variables

Required environment variables in `.env`:

```bash
PORT=3002
DATABASE_URL="file:./dev.db"  # SQLite for development
# DATABASE_URL="postgresql://postgres:password@localhost:5432/icc_db"  # PostgreSQL for production
JWT_SECRET=GENERATE_SECURE_RANDOM_KEY_HERE_USE_NODE_CRYPTO_OR_OPENSSL
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5174
NODE_ENV=development  # Set to 'production' for production
```

**Important:** Generate a secure JWT_SECRET for production using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Current Status

- Server is running on port 3002
- Root endpoint works: `http://localhost:3002/`
- Auth endpoints require database connection
- Development uses SQLite for simplicity
- Production should use PostgreSQL

## Testing Without Database

The following endpoints can be tested without a database:

- GET `/` - API information
- POST `/calculo/icc-simple` - ICC calculation (no auth required)
- POST `/calculo/icc` - Full ICC calculation (no auth required)
- POST `/calculo/icc-motores` - ICC with motor contribution (no auth required)

Auth endpoints require database:

- POST `/auth/register` - User registration
- POST `/auth/login` - User login
- GET/POST `/proyectos` - Project management (requires auth)

## Data Migration

When switching from PostgreSQL to SQLite or vice versa:

1. Export existing data (if any)
2. Update `DATABASE_URL` in `.env`
3. Update `provider` in `prisma/schema.prisma`
4. Run `npx prisma db push`
5. Import data if needed

**Note:** JSON fields in the schema are stored as strings for SQLite compatibility. The controllers handle JSON serialization/deserialization automatically.
