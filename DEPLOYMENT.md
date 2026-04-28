# Deployment Guide - Professional ICC Calculator

## Netlify Deployment

This project is configured for deployment to Netlify with both frontend and backend.

### Prerequisites

1. Netlify account
2. Netlify CLI installed: `npm install -g netlify-cli`
3. Git repository connected to Netlify

### Environment Variables

Set these in Netlify dashboard under Site Settings > Environment Variables:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-change-in-production
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

For frontend, set:
```
VITE_API_BASE_URL=https://your-site.netlify.app
```

### Deployment Steps

#### Option 1: Automatic Deployment via Git

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Netlify will automatically build and deploy on push

#### Option 2: Manual Deployment via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
npm run deploy
```

Or use the deployment script:
```bash
bash scripts/deploy.sh
```

### Architecture

- **Frontend**: React/Vite app deployed to Netlify CDN
- **Backend**: Express app deployed as Netlify Functions
- **Database**: PostgreSQL (external service like Supabase, Neon, or Railway)
- **Caching**: Redis (optional, external service like Upstash)

### API Routes

All backend routes are available at:
- `/calculo/*` → ICC calculations
- `/proyectos/*` → Project management
- `/proteccion/*` → Protection coordination
- `/reporte/*` → PDF reports
- `/coord/*` → Coordination analysis
- `/sqd-real/*` → SQD real-time data
- `/simulacion/*` → Simulation
- `/auth/*` → Authentication

### Build Configuration

The `netlify.toml` file handles:
- Frontend build command
- API route redirects to functions
- SPA routing (all routes to index.html)
- Security headers
- Asset caching

### Troubleshooting

#### Build Fails
- Check Node version is set to 18 in netlify.toml
- Verify all dependencies are in package.json
- Check build logs in Netlify dashboard

#### API Routes Not Working
- Verify backend dependencies are installed
- Check serverless-http is installed in backend
- Verify redirect rules in netlify.toml

#### Database Connection
- Ensure DATABASE_URL is set in Netlify environment variables
- Verify database is accessible from Netlify
- Check connection string format

### Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure production database
- [ ] Set up Redis for caching (optional)
- [ ] Update VITE_API_BASE_URL in frontend
- [ ] Enable HTTPS (automatic on Netlify)
- [ ] Set up custom domain (optional)
- [ ] Configure analytics (optional)
- [ ] Test all API endpoints
- [ ] Test PDF generation
- [ ] Test authentication flow
