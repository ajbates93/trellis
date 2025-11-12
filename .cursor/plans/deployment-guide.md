# Deployment Guide - Cohort

This guide covers deploying Cohort to staging and production environments on Railway.

## Table of Contents
- [Environment Overview](#environment-overview)
- [Initial Setup](#initial-setup)
- [Local Development](#local-development)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Environment Overview

Cohort uses a three-environment deployment strategy:

| Environment | Purpose | Git Branch | Auto-Deploy | Database |
|-------------|---------|------------|-------------|----------|
| **Local** | Development | Any | No | Local PostgreSQL |
| **Staging** | Pre-production testing | `staging` | Yes (via GitHub Actions) | Railway Staging DB |
| **Production** | Live application | `main` | Yes (via GitHub Actions) | Railway Production DB |

### Deployment Workflow

```
feature-branch → PR → staging branch → test → PR → main branch → production
```

---

## Initial Setup

### 1. Railway Configuration

You need to configure two environments in your Railway project:

**Staging Environment:**
1. Go to Railway dashboard → Your project → Environments
2. Select "staging" environment
3. Configure the service to deploy from `staging` branch
4. Set environment variables (see below)

**Production Environment:**
1. Go to Railway dashboard → Your project → Environments
2. Select "production" environment
3. Configure the service to deploy from `main` branch
4. Set environment variables (see below)

### 2. Required Railway Environment Variables

**For STAGING:**
```bash
NODE_ENV=production
DATABASE_URL=[Railway staging database connection string]
GOOGLE_CLIENT_ID=[Your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[Your Google OAuth client secret]
BETTER_AUTH_SECRET=[Generate with: openssl rand -base64 32]
BETTER_AUTH_URL=https://your-staging-app.railway.app
ANTHROPIC_API_KEY=[Your Anthropic API key] (optional)
```

**For PRODUCTION:**
```bash
NODE_ENV=production
DATABASE_URL=[Railway production database connection string]
GOOGLE_CLIENT_ID=[Your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[Your Google OAuth client secret]
BETTER_AUTH_SECRET=[Generate with: openssl rand -base64 32] (DIFFERENT from staging!)
BETTER_AUTH_URL=https://your-production-app.railway.app
ANTHROPIC_API_KEY=[Your Anthropic API key]
```

### 3. Google OAuth Configuration

Add authorized redirect URIs for each environment:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Staging: `https://your-staging-app.railway.app/api/auth/callback/google`
   - Production: `https://your-production-app.railway.app/api/auth/callback/google`

### 4. GitHub Secrets & Variables

Configure these in GitHub repository settings → Secrets and variables → Actions:

**Secrets:**
- `RAILWAY_TOKEN`: Your Railway API token (get from Railway dashboard)
- `STAGING_DATABASE_URL`: Staging database connection string
- `PRODUCTION_DATABASE_URL`: Production database connection string

**Variables:**
- `STAGING_URL`: Your staging app URL (e.g., `https://staging.railway.app`)
- `PRODUCTION_URL`: Your production app URL (e.g., `https://cohort.railway.app`)
- `RAILWAY_STAGING_SERVICE_NAME`: Name of your staging service in Railway
- `RAILWAY_PRODUCTION_SERVICE_NAME`: Name of your production service in Railway

---

## Local Development

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Local Database

```bash
createdb cohort
```

### 3. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update `.env.local` with your local values:

```bash
DATABASE_URL=postgresql://localhost:5432/cohort
GOOGLE_CLIENT_ID=[Your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[Your Google OAuth client secret]
BETTER_AUTH_SECRET=[Generate with: openssl rand -base64 32]
BETTER_AUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=[Your Anthropic API key]
```

### 4. Run Migrations & Seed Data

```bash
npm install
npm run db:migrate
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Staging Deployment

### Automatic Deployment (Recommended)

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to staging branch:**
   ```bash
   git checkout staging
   git merge feature/your-feature-name
   git push origin staging
   ```

4. **GitHub Actions will automatically:**
   - Run linting and type-checking
   - Run database migrations on staging database
   - Deploy to Railway staging environment
   - Create deployment notification

5. **Test on staging:**
   - Visit your staging URL
   - Test the new feature thoroughly
   - Check logs in Railway dashboard if issues occur

### Manual Deployment

If you need to deploy manually (not recommended):

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy to staging
railway up --service [staging-service-name] --environment staging
```

---

## Production Deployment

### Process

1. **Ensure staging is working:**
   - Test all features on staging
   - Verify database migrations succeeded
   - Check for any errors in Railway logs

2. **Create a pull request:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/staging-to-main
   git merge staging
   git push origin release/staging-to-main
   ```

3. **Review and merge PR:**
   - Get PR approval from team
   - Ensure all CI checks pass
   - Merge PR to `main` branch

4. **GitHub Actions will automatically:**
   - Run linting and type-checking
   - Run database migrations on production database
   - Deploy to Railway production environment
   - Create a deployment tag (e.g., `production-20250112-143000`)
   - Create deployment notification

5. **Verify deployment:**
   - Visit your production URL
   - Check critical features
   - Monitor Railway logs for errors

---

## Rollback Procedures

### Quick Rollback (Railway Dashboard)

1. Go to Railway dashboard → Your project → Production environment
2. Click on "Deployments"
3. Find the last working deployment
4. Click "Redeploy" on that deployment

### Git-based Rollback

1. **Identify the last working commit:**
   ```bash
   git log --oneline
   ```

2. **Revert to previous commit:**
   ```bash
   git checkout main
   git revert [bad-commit-hash]
   git push origin main
   ```

3. **Alternative: Hard reset (destructive):**
   ```bash
   git checkout main
   git reset --hard [good-commit-hash]
   git push origin main --force
   ```

### Database Rollback

If a migration caused issues:

1. **Connect to Railway database:**
   ```bash
   # Get connection string from Railway dashboard
   psql [DATABASE_URL]
   ```

2. **Check migration status:**
   ```bash
   npm run db:check
   ```

3. **Manual rollback (if needed):**
   - Locate the problematic migration in `server/database/migrations/`
   - Write a reverse migration
   - Run manually on production database

⚠️ **Warning:** Database rollbacks are risky. Always backup before attempting.

---

## Troubleshooting

### Deployment Failed

**Check GitHub Actions logs:**
1. Go to GitHub repository → Actions
2. Click on the failed workflow
3. Review the logs for errors

**Common issues:**
- Missing environment variables in Railway
- Database migration failed
- Build errors (check TypeScript types)
- Railway service not configured correctly

### Database Migration Failed

**Check migration status:**
```bash
npm run db:check
```

**Common issues:**
- Conflicting migrations (fix by regenerating)
- Missing dependencies in migration script
- Database connection issues (check DATABASE_URL)

### Authentication Not Working

**Check Google OAuth configuration:**
- Verify redirect URIs are correct in Google Cloud Console
- Ensure `BETTER_AUTH_URL` matches your actual app URL
- Check `BETTER_AUTH_SECRET` is set in Railway

**Check Better-auth session:**
- Clear cookies and try again
- Check Railway logs for auth errors
- Verify database has `session` and `account` tables

### Build Errors

**TypeScript errors:**
```bash
npx nuxt typecheck
```

**Linting errors:**
```bash
npm run lint
```

**Fix automatically:**
```bash
npm run lint:fix
```

### Railway Deployment Stuck

**Check Railway dashboard:**
- View deployment logs
- Check build progress
- Verify health check endpoint is responding

**Restart deployment:**
```bash
railway up --service [service-name] --environment [env]
```

---

## Monitoring & Maintenance

### Check Deployment Status

**Via Railway Dashboard:**
- Monitor CPU/memory usage
- Check deployment logs
- View health check status

**Via GitHub Actions:**
- View deployment history
- Check automated test results
- Review deployment tags

### Database Maintenance

**Backup production database:**
```bash
# Railway provides automatic backups, but you can create manual backups:
# Go to Railway dashboard → Database → Backups → Create backup
```

**Run database studio (local/staging only):**
```bash
npm run db:studio
```

⚠️ **Never run `db:studio` on production** - it exposes your database publicly.

---

## Emergency Contacts

If you encounter critical production issues:

1. Check Railway status: https://status.railway.app/
2. Review Railway docs: https://docs.railway.app/
3. Contact Railway support (if infrastructure issue)
4. Review GitHub Actions logs for deployment failures

---

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build for production |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Auto-fix linting errors |
| `npx nuxt typecheck` | Run TypeScript type-checking |
| `npm run db:generate` | Generate new migration |
| `npm run db:migrate` | Run migrations |
| `npm run db:check` | Check migration status |
| `npm run db:seed` | Seed database with test data |
| `npm run db:reset` | Reset database (local only!) |
| `npm run db:reseed` | Reset and reseed (local only!) |
| `npm run db:studio` | Open database GUI (local/staging only!) |

---

**Last Updated:** 2025-01-12
**Maintained by:** Alex Bates
