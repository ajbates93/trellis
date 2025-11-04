# Cohort

A buddy management and peer feedback platform for Pocketworks. Streamlines feedback collection, provides visibility into personal development, and maintains alignment with formal reviews.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v20 or higher recommended)
- **npm** (comes with Node.js)
- **PostgreSQL** (v14 or higher, or use Railway hosted database)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cohort
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages and automatically run `nuxt prepare` to generate TypeScript types.

### 3. Set Up Environment Variables

Copy the example environment file and update it with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```bash
# Database - Update with your local PostgreSQL credentials
DATABASE_URL=postgresql://user:password@localhost:5432/cohort

# Authentication - Get these from Google Cloud Console
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Generate a random 32+ character string for this
BETTER_AUTH_SECRET=your_secret_key_min_32_chars

# Local development URL (keep as is for local dev)
BETTER_AUTH_URL=http://localhost:3000
```

**Getting Google OAuth Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Set authorized redirect URI to: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env` file

### 4. Set Up the Database

Make sure PostgreSQL is running, then create the database:

```bash
# Create the database (if using psql)
createdb cohort

# Or using SQL
psql -U postgres -c "CREATE DATABASE cohort;"
```

Push the database schema:

```bash
npm run db:push
```

### 5. Seed the Database (Optional)

To populate the database with sample data for development:

```bash
npm run db:seed
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

```bash
# Development
npm run dev              # Start development server

# Database
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate migration files
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio (database GUI)
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database (clears all data)
npm run db:reseed        # Reset and re-seed database

# Production
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run generate         # Generate static site
```

## Tech Stack

- **Frontend**: Nuxt 4.1.3, Vue 3, Nuxt UI
- **Authentication**: Better-auth with Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **TypeScript**: 5.9.3

## Project Structure

```
cohort/
├── pages/              # Auto-routed pages
├── components/         # Vue components
├── composables/        # Composition utilities
├── server/
│   ├── api/           # API endpoints
│   ├── database/      # Database schema and seeds
│   └── middleware/    # Server middleware
├── assets/            # Build-time assets
└── public/            # Static files
```

## Authentication

This application uses invitation-based access control via Google OAuth. Users must be pre-created by an admin (via CSV import or manual creation) before they can authenticate. Any email domain is accepted. The first user to log in will automatically become an admin.

## Deployment

### Deploying to Railway

This application is configured for deployment on Railway. Follow these steps:

1. **Create a Railway Project**
   - Go to [Railway](https://railway.app) and create a new project
   - Add a PostgreSQL database service
   - Add a new service from your GitHub repository

2. **Configure Environment Variables**

   In the Railway dashboard, set the following environment variables:

   ```bash
   NODE_ENV=production
   DATABASE_URL=<automatically set by Railway PostgreSQL>
   GOOGLE_CLIENT_ID=<your production Google OAuth client ID>
   GOOGLE_CLIENT_SECRET=<your production Google OAuth secret>
   BETTER_AUTH_SECRET=<generate new 32+ char string>
   BETTER_AUTH_URL=https://your-app.railway.app
   ```

   **Important:** Generate a new `BETTER_AUTH_SECRET` for production using:
   ```bash
   openssl rand -base64 32
   ```

3. **Update Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Add production redirect URI: `https://your-app.railway.app/api/auth/callback/google`
   - Update authorized origins to include your Railway domain

4. **Deploy**
   - Railway will automatically build and deploy your application
   - The health check endpoint `/api/health` will verify deployment status
   - Database migrations will need to be run manually on first deploy:
     ```bash
     # In Railway dashboard, open the service shell and run:
     npm run db:push
     ```

5. **Monitor Deployment**
   - Check the health endpoint: `https://your-app.railway.app/api/health`
   - View logs in the Railway dashboard
   - Railway will automatically restart the service if health checks fail

### Production Checklist

Before launching to production, ensure:

- [ ] All environment variables are set correctly
- [ ] Google OAuth redirect URIs include production domain
- [ ] Database schema has been pushed (`npm run db:push`)
- [ ] At least one admin user has been created (first user becomes admin automatically)
- [ ] Health check endpoint returns `{"status": "healthy"}`
- [ ] HTTPS is enabled (Railway does this automatically)
- [ ] Different `BETTER_AUTH_SECRET` is used for production (not the same as development)

## Troubleshooting

**Database connection issues:**
- Ensure PostgreSQL is running: `brew services list` (macOS) or `systemctl status postgresql` (Linux)
- Verify your DATABASE_URL in `.env` has correct credentials
- Check if the database exists: `psql -l`

**OAuth errors:**
- Verify your Google Client ID and Secret are correct
- Check that the redirect URI matches in Google Cloud Console
- Ensure BETTER_AUTH_URL matches your local development URL

**Port already in use:**
- The default port is 3000. If it's in use, you can specify a different port:
  ```bash
  PORT=3001 npm run dev
  ```

## Documentation

For detailed technical specifications and design decisions, see:
- `CLAUDE.md` - Project overview and architecture
- `docs/cohort-tech-spec.md` - Technical specifications
- `docs/cohort-wireframes.md` - UI/UX wireframes

## Additional Resources

- [Nuxt Documentation](https://nuxt.com/docs)
- [Nuxt UI Documentation](https://ui.nuxt.com)
- [Better-auth Documentation](https://better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
