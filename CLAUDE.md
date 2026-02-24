# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trellis** is a buddy management and peer feedback SaaS platform. It streamlines feedback collection, provides visibility into personal development, and maintains alignment with formal reviews. Originally built for Pocketworks, it is now a multi-tenant product available to any organization.

### Primary Goals
- Centralize feedback submission and viewing
- Provide actionable dashboard for employees and buddies
- Track review schedules and goals
- Enable data-driven insights into team engagement

## Technical Stack

- **Frontend Framework**: Nuxt 4.1.3 with SSR
- **UI Library**: Nuxt UI (component library)
- **Authentication**: Better-auth with Google OAuth (Pocketworks workspace only)
- **Database**: PostgreSQL
- **Hosting**: Railway (Nuxt app + PostgreSQL database)
- **TypeScript**: 5.9.3 for type-safe development
- **Future Integration**: Notion API

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Generate static site
npm run generate
```

## Architecture Overview

### Request Flow
1. Client requests come through Nuxt SSR
2. Better-auth middleware protects authenticated routes
3. API routes in `/server/api/` handle business logic
4. PostgreSQL stores relational data
5. Server-side rendering returns initial page state

### Authentication Flow
- Google OAuth via Better-auth
- **Invitation-based access**: Only users pre-created by admins can authenticate (any email domain allowed)
- Users must be imported via CSV or created by admin before they can log in
- Unauthorized OAuth attempts are rejected with friendly error message
- First user automatically becomes admin (`is_admin = true`)
- Server-side sessions stored in PostgreSQL (30-day duration)
- Protected routes require valid session

### User Linking System
The application implements an automatic user-linking system to handle pre-populated user data before OAuth authentication:

**Use Cases**:
1. **MVP Development**: Seed database with team members for testing before they log in
2. **SaaS Onboarding**: Admins import user data (names, emails, buddy relationships) before granting system access
3. **Bulk User Setup**: Pre-configure team structures and relationships before user activation

**Problem**: When users are created in the database before they authenticate, OAuth providers (like Better Auth) create new user records with different IDs on first login, resulting in duplicate user records and broken relationships.

**Solution**: A Better Auth hook automatically detects and merges pre-created users with OAuth users on first login:

1. **Pre-Created Users**:
   - Created via seed script (`npm run db:seed`) or admin CSV import
   - Have `emailVerified = false` flag to identify them as pre-created
   - Can have buddy relationships, receive feedback, be assigned goals

2. **First Login**: When a user authenticates via Google OAuth:
   - Better Auth creates a new user record with its own ID format
   - Hook checks if pre-created user exists with matching email (`emailVerified = false`)
   - **If pre-created user exists**:
     - Migrates all data to the OAuth user ID:
       - Feedback (as reviewer and reviewee)
       - Goals
       - Review schedules
       - Buddy relationships (bidirectional)
     - Deletes old pre-created user record
   - **If NO pre-created user exists** (unauthorized):
     - Deletes OAuth user record immediately
     - Shows error: "You haven't been invited to this workspace"
     - User cannot access the system

3. **Result**:
   - **Invited users**: Single authenticated user with all pre-configured relationships preserved
   - **Unauthorized users**: Access denied, no user record created

**Implementation**: See `server/utils/auth.ts` hooks configuration. The hook runs after successful OAuth sign-in and performs atomic database migrations to ensure data consistency.

**Benefits**:
- Admins can set up complete team structures before user access
- No duplicate users in production
- Seamless user experience on first login
- All relationships and historical data preserved
- Supports gradual rollout (some users active, others pre-configured)

**SaaS Workflow Example**:
```
Admin imports CSV → Pre-created users with buddy assignments
                  ↓
Users receive invitation email → Click login link
                  ↓
First OAuth login → Automatic user linking
                  ↓
User sees existing buddy, can give/receive feedback immediately
```

## Database Schema

### Core Tables

**users**: Employee profiles and buddy relationships
- `id` (UUID), `email`, `name`, `role_type` (dev/design/qa/growth/management)
- `buddy_id` (self-referential), `is_admin`
- Indexes on email, buddy_id

**feedback**: Peer feedback submissions
- `id` (UUID), `reviewer_id`, `reviewee_id`, `content`
- `week_year` (format: '2025-W43'), `is_read`
- Constraint: reviewer_id ≠ reviewee_id
- Indexes on reviewer, reviewee, week, created_at

**goals**: Personal development goals
- `id` (UUID), `user_id`, `goal_text`
- `status` (active/completed/archived), `target_date`
- Indexes on user_id, status

**review_schedules**: Formal review timing
- `id` (UUID), `user_id`, `buddy_id`, `scheduled_date`
- `status` (scheduled/completed/rescheduled), `notes`
- Indexes on user_id, scheduled_date

**onboarding_imports**: CSV import audit trail
- `id` (UUID), `admin_id`, `filename`, `rows_imported`
- `status` (pending/completed/failed), `error_log`

**slack_workspaces**: Slack integration connections
- `id` (UUID), `workspace_id`, `slack_team_id`, `slack_team_name`
- `access_token` (encrypted bot token), `bot_user_id`
- `installed_by`, `installed_at`
- Links Trellis workspaces to Slack workspaces for `/submit` command

## File Structure & Conventions

Following Nuxt file-based conventions:

- **pages/**: Auto-routed pages
  - Dashboard, feedback inbox, goals, reviews, admin panel
- **components/**: Auto-imported Vue components
  - Stats cards, charts, feedback forms, user lists
- **composables/**: Auto-imported composition utilities
  - Auth helpers, API calls, state management
- **layouts/**: Application layouts
  - Default layout with sidebar navigation
  - Admin layout for admin-specific pages
- **middleware/**: Route middleware
  - `auth.ts`: Verify user session
  - `admin.ts`: Check is_admin flag
- **server/api/**: API route handlers
  - `/auth/*`: Authentication endpoints
  - `/users/*`: User management
  - `/feedback/*`: Feedback CRUD and stats
  - `/goals/*`: Goals management
  - `/reviews/*`: Review scheduling
  - `/admin/*`: Admin-only operations
  - `/analytics/*`: Data visualizations
- **server/middleware/**: Server middleware
  - Better-auth integration
- **assets/**: Build-time processed assets
- **public/**: Static assets (favicon, robots.txt)

## Key API Endpoints

### Authentication
- `POST /api/auth/google` - Initiate OAuth
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Clear session

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/received` - Get received feedback
- `GET /api/feedback/given` - Get given feedback
- `GET /api/feedback/for-buddy` - Get feedback for assigned buddies
- `PATCH /api/feedback/:id/read` - Mark as read
- `GET /api/feedback/can-review/:userId` - Check if already reviewed this week

### Admin
- `POST /api/admin/onboard` - CSV user import
- `GET /api/admin/stats` - Platform-wide statistics
- `GET /api/admin/engagement` - Team engagement metrics

### Integrations (Slack)
- `GET /api/integrations/slack/install` - Initiate Slack OAuth installation
- `GET /api/integrations/slack/callback` - Handle Slack OAuth callback
- `GET /api/integrations/slack/status` - Get Slack connection status
- `POST /api/integrations/slack/disconnect` - Disconnect Slack workspace
- `POST /api/integrations/slack/commands` - Handle `/submit` slash command
- `POST /api/integrations/slack/interactions` - Handle modal submissions

## Design System

### Visual Principles
- **Clean & Modern**: Minimal clutter, generous whitespace
- **Data-Forward**: Visualizations are primary focus
- **Action-Oriented**: Clear CTAs and next steps
- **Dark/Light Mode**: Full theme support

### Color Palette
- Primary: Teal/Green (action, growth)
- Secondary: Blue (feedback, information)
- Accent: Purple (admin features)
- Semantic: Green (positive), Red (urgent), Yellow (warning)

### Component Patterns
- Cards: 12px border-radius, subtle shadows
- Buttons: 8px border-radius, hover states with lift
- Spacing: 8px grid system
- Typography: Nuxt UI defaults (modern sans-serif)

## Key Features

### Phase 1 (MVP)
1. **Authentication**: Google OAuth with invitation-based access control (any email domain)
2. **Dashboard**: Personalized view with stats, charts, action items
3. **Feedback Submission**: Submit feedback with weekly review tracking
4. **Feedback Inbox**: View received/given feedback with filters
5. **Goals Management**: CRUD operations for personal goals
6. **Admin Panel**: User management, buddy assignment, CSV import

### Dashboard Visualizations
- Stats cards: Feedback given/received, active goals, days until review
- Feedback timeline: Line chart of last 12 weeks
- Activity heatmap: GitHub-style contribution grid
- Weekly progress bar chart

### CSV Import Format
```csv
email,name,role_type,buddy_email
john.doe@company.com,John Doe,dev,jane.smith@company.com
alice@external-contractor.io,Alice Brown,design,john.doe@company.com
jane.smith@company.com,Jane Smith,management,
```

**Valid role types**: `dev`, `design`, `qa`, `growth`, `management`

**Note**: Any email domain is accepted (including external contractors/partners). Access is controlled via invitation only - users must be pre-created by admin before they can authenticate.

## Security Considerations

- **Invitation-based access control**: Only pre-created users can authenticate (prevents unauthorized access)
- All endpoints (except auth) require valid session
- Admin endpoints verify `is_admin` flag
- SQL injection prevention via parameterized queries
- XSS protection via content sanitization
- CSRF protection via Better-auth
- Rate limiting on feedback submission (max 10/hour)
- Input validation on all user-submitted content
- OAuth user records automatically deleted if no matching invitation found

## Performance Targets

- Dashboard load: <2 seconds
- Feedback submission: <500ms
- Database queries: <100ms
- Concurrent users: 100+ without degradation

## Development Phases

### Week 1-2: Foundation ✅ COMPLETE
- ✅ Set up Nuxt 4 + Nuxt UI
- ✅ Configure Railway deployment
- ✅ PostgreSQL setup and migrations
- ✅ Better-auth with Google OAuth
- ✅ User linking system for pre-created users

### Week 3-4: Core Features 🚧 IN PROGRESS
- ✅ User dashboard with visualizations
- ✅ Feedback submission (give.vue)
  - ✅ Weekly review tracking
  - ✅ "Already reviewed" validation
  - ✅ User selection with avatars
- ✅ Feedback inbox (inbox.vue)
  - ✅ Three-tab interface (Received, Given, For My Buddies)
  - ✅ Content truncation with popover
  - ✅ Mark as read functionality
  - ✅ Publish feedback (single and batch)
  - ✅ Loading states (page navigation + button spinners)
- ✅ Slack Integration
  - ✅ OAuth install flow via Settings → Integrations
  - ✅ `/submit` slash command with modal UI
  - ✅ User email matching (Slack ↔ Trellis)
  - ✅ Workspace-scoped (multi-tenant ready)
  - ✅ Rate limiting (10 submissions/hour)
  - ✅ Draft feedback (buddy publishes later)
- ⏳ Goals management (pending)

### Week 5-6: Admin & Polish
- ⏳ Admin panel and CSV onboarding
- ⏳ Responsive design refinement
- ⏳ Data visualizations

### Week 7-8: Testing & Launch
- ⏳ User acceptance testing
- ⏳ Performance optimization
- ⏳ Production deployment

## Multi-Tenancy Strategy (Future Phase 11)

Trellis will support multiple organizations with three potential approaches:

### Option A: Workspace Model (Recommended for SMB)
- **Access:** Single domain `app.trellis.com` with workspace switcher
- **UX:** Users can join/create multiple workspaces (like Linear, Slack, Notion)
- **Authentication:** Global OAuth initially (Google/Microsoft for all workspaces)
- **Per-Workspace OAuth:** Add later as enterprise feature
- **Best For:** Freelancers, consultants, startups, users managing multiple teams
- **Timeline:** 10-12 weeks
- **Database:** `workspaces` table + `workspace_members` (many-to-many) + workspace context in session

**Key Benefits:**
- Familiar UX for SMB/startup users
- Users easily switch between multiple teams
- Faster onboarding (no subdomain confusion)
- Ideal for consultants managing multiple client workspaces

**Technical Considerations:**
- Workspace context must be threaded through app (session cookie or query param)
- Deep links need workspace parameter: `app.trellis.com/feedback?workspace=pocketworks`
- RLS policies filter by workspace_id from session context
- Global OAuth simplifies initial implementation

### Option B: Subdomain Model (Enterprise-Ready)
- **Access:** Each organization gets subdomain: `company.trellis.com`
- **UX:** Branded access per company, bookmark-based workspace switching
- **Authentication:** Per-workspace OAuth configuration (company A uses Google, company B uses Okta)
- **Custom Domains:** `feedback.company.com` → CNAME to subdomain
- **Best For:** Enterprise customers (50+ employees), companies requiring SSO/custom OAuth
- **Timeline:** 8 weeks
- **Database:** `tenants` table + tenant_id on all tables + RLS

**Key Benefits:**
- Simpler OAuth implementation (tenant known from hostname)
- Enterprise-grade isolation and branding
- Custom domains easy to implement
- Clear per-tenant billing model

**Technical Considerations:**
- Nitro plugin detects tenant from subdomain
- Each tenant can have different OAuth provider
- RLS policies use PostgreSQL session variable from hostname
- Multi-org users must manage multiple browser tabs/bookmarks

### Option C: Hybrid Model
- **Access:** Subdomains + workspace switcher for multi-org users
- **UX:** Best of both worlds (enterprise branding + easy workspace switching)
- **Authentication:** Per-workspace OAuth via subdomains
- **Best For:** Supporting both enterprise and SMB customers
- **Timeline:** 10-11 weeks
- **Database:** `tenants` + `workspace_members` + RLS

**Key Benefits:**
- Enterprise customers get branded subdomains
- Multi-org users get seamless switching (redirects between subdomains)
- Per-workspace OAuth naturally supported
- Future-proof architecture

**Current Status:** Single-tenant (Pocketworks only)

**Detailed Plans:**
- Full subdomain architecture: `.cursor/plans/multi-tenancy-saas-architecture.md`
- Workspace model comparison: `.cursor/plans/workspace-model-comparison.md` (to be created)
- Implementation guide: `.cursor/plans/workspace-model-implementation.md` (to be created)

## Deployment & Environments

### Environment Strategy

Trellis uses a three-environment deployment strategy:

| Environment | Purpose | Git Branch | Auto-Deploy | Database |
|-------------|---------|------------|-------------|----------|
| **Local** | Development | Any | No | Local PostgreSQL |
| **Staging** | Pre-production testing | `staging` | Yes (GitHub Actions) | Railway Staging DB |
| **Production** | Live application | `main` | Yes (GitHub Actions) | Railway Production DB |

### Deployment Workflow

```
feature-branch → PR → staging branch → test → PR → main branch → production
```

**Typical Development Cycle:**

1. **Feature Development:**
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes, commit
   git push origin feature/your-feature-name
   ```

2. **Deploy to Staging:**
   ```bash
   git checkout staging
   git merge feature/your-feature-name
   git push origin staging  # Auto-deploys to Railway staging
   ```

3. **Test on Staging:**
   - Visit staging URL
   - Test all changes thoroughly
   - Verify database migrations succeeded

4. **Deploy to Production:**
   ```bash
   # Create PR: staging → main
   git checkout main
   git pull origin main
   git checkout -b release/staging-to-main
   git merge staging
   git push origin release/staging-to-main
   # Get PR approval, merge to main
   # Auto-deploys to Railway production
   ```

### Version Management

Trellis uses **Semantic Versioning (SemVer)** to track releases:

**Version Format:** `MAJOR.MINOR.PATCH` (e.g., `0.1.0`, `1.2.3`)
- **MAJOR**: Breaking changes (e.g., `1.0.0` → `2.0.0`)
- **MINOR**: New features, backwards compatible (e.g., `0.1.0` → `0.2.0`)
- **PATCH**: Bug fixes (e.g., `0.1.0` → `0.1.1`)

**Current Phase:** Pre-release (`0.x.x`) until public launch, then `1.0.0`

#### Versioning Workflow (PR-Based)

**When to Bump Version:**
- Bump version on `staging` branch after merging multiple features
- This allows bundling multiple PRs into a single release
- Version bump happens BEFORE creating the staging → main PR

**Step-by-Step:**

1. **Merge features to staging via PRs:**
   ```bash
   # Example: Multiple features merged to staging this week
   feature/add-notifications → staging (PR #1) ✅ merged
   feature/fix-dashboard-bug → staging (PR #2) ✅ merged
   feature/improve-performance → staging (PR #3) ✅ merged
   ```

2. **Bump version on staging branch:**
   ```bash
   git checkout staging
   git pull origin staging

   # Choose version bump based on changes
   npm version patch   # Bug fixes only: 0.1.0 → 0.1.1
   npm version minor   # New features: 0.1.0 → 0.2.0
   npm version major   # Breaking changes: 0.1.0 → 1.0.0

   # Push version bump (includes commit + tag)
   git push origin staging --follow-tags
   ```

   **What `npm version` does:**
   - Updates `package.json` with new version
   - Creates a git commit (e.g., "v0.2.0")
   - Creates a git tag (e.g., "v0.2.0")

3. **Test on staging:**
   - Visit staging URL and verify all changes work
   - Check version in Settings → General → About section

4. **Deploy to production:**
   ```bash
   # Create PR: staging → main (includes version tag)
   git checkout -b release/v0.2.0
   git merge staging
   git push origin release/v0.2.0

   # Create PR, get approval, merge to main
   # GitHub Actions automatically:
   # - Deploys to production
   # - Creates GitHub release with changelog
   # - Tags production deployment
   ```

#### Version Display

**User-Facing:**
- Version displayed in **Settings → General → About** section
- Shows current semantic version (e.g., "v0.2.0")

**GitHub Releases:**
- Production workflow automatically creates GitHub releases
- Includes changelog generated from commit messages
- Links to full diff between versions

#### Example Timeline

```
Week 1: features/bugs → staging (multiple PRs)
Week 1 Friday: npm version minor on staging → v0.2.0
Week 1 Friday: Test on staging
Week 2 Monday: staging → main PR (includes v0.2.0)
Week 2 Monday: Merge to main → Production deploy + GitHub release
```

**Benefits:**
- ✅ Bundle multiple features into logical releases
- ✅ Version bump happens after testing features individually
- ✅ Clear release history in GitHub
- ✅ Users can see what version they're running
- ✅ Bug tracking tied to specific versions

### GitHub Actions CI/CD

**Three automated workflows:**

1. **PR Testing** (`.github/workflows/test.yml`)
   - Triggers on all PRs to `staging` and `main`
   - Runs: ESLint → TypeScript type-check → Build verification
   - Blocks merge if checks fail

2. **Staging Deploy** (`.github/workflows/deploy-staging.yml`)
   - Triggers on push to `staging` branch
   - Runs: Database migrations → Deploy to Railway staging
   - Auto-deploys on every push

3. **Production Deploy** (`.github/workflows/deploy-production.yml`)
   - Triggers on push to `main` branch
   - Runs: Database migrations → Deploy to Railway production
   - Creates GitHub release with semantic version (e.g., `v0.2.0`)
   - Auto-generates changelog from commits since last version
   - Auto-deploys on every push

### Required GitHub Secrets

Configure in: **Repository Settings → Secrets and variables → Actions**

**Secrets:**
- `RAILWAY_TOKEN`: Railway API token
- `STAGING_DATABASE_URL`: Staging database connection string
- `PRODUCTION_DATABASE_URL`: Production database connection string

**Variables:**
- `STAGING_URL`: Staging app URL
- `PRODUCTION_URL`: Production app URL
- `RAILWAY_STAGING_SERVICE_NAME`: Railway staging service name
- `RAILWAY_PRODUCTION_SERVICE_NAME`: Railway production service name

### Railway Configuration

**Environment Variables (set in Railway dashboard):**

**Staging:**
- `NODE_ENV=production`
- `DATABASE_URL`: [Railway staging database]
- `BETTER_AUTH_SECRET`: [Generate unique: `openssl rand -base64 32`]
- `BETTER_AUTH_URL`: https://your-staging-app.railway.app
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `ANTHROPIC_API_KEY`: [Optional for staging]
- `NUXT_PUBLIC_SENTRY_DSN`: [Staging Sentry project DSN - get from Sentry dashboard]

**Production:**
- `NODE_ENV=production`
- `DATABASE_URL`: [Railway production database]
- `BETTER_AUTH_SECRET`: [Generate unique: `openssl rand -base64 32`] (DIFFERENT from staging!)
- `BETTER_AUTH_URL`: https://your-production-app.railway.app
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `ANTHROPIC_API_KEY`: [Required for AI insights]
- `NUXT_PUBLIC_SENTRY_DSN`: [Production Sentry project DSN - DIFFERENT from staging!]

**Google OAuth Setup:**
- Add authorized redirect URIs for each environment:
  - Staging: `https://your-staging-app.railway.app/api/auth/callback/google`
  - Production: `https://your-production-app.railway.app/api/auth/callback/google`

**Sentry Error Tracking:**

Sentry is integrated for error tracking and performance monitoring with version-based release tracking:

1. **Create Separate Sentry Projects:**
   - Go to [sentry.io](https://sentry.io) → Projects
   - Create two projects:
     - `trellis-staging` (for staging environment)
     - `trellis-production` (for production environment)

2. **Get DSN for Each Project:**
   - Click project → Settings → Client Keys (DSN)
   - Copy the DSN (format: `https://key@o1234567.ingest.sentry.io/1234567`)

3. **Configure Environment Variables:**
   - Add `NUXT_PUBLIC_SENTRY_DSN` to Railway staging environment
   - Add `NUXT_PUBLIC_SENTRY_DSN` to Railway production environment (different DSN!)

**What Sentry Tracks:**
- ✅ JavaScript errors (client-side)
- ✅ API errors (server-side)
- ✅ Performance metrics
- ✅ User session replays
- ✅ Release versions (automatically set from `package.json`)

**Benefits:**
- Errors are tagged with semantic version (e.g., `v0.2.0`)
- Easily identify which version introduced a bug
- Separate staging errors from production errors
- Performance tracking per release
- Automatic source map uploads for better stack traces

**Example Sentry Dashboard:**
```
Release v0.2.0 (Production)
├─ 15 errors (down from 23 in v0.1.0)
├─ Avg response time: 245ms
└─ 127 users affected

Release v0.3.0 (Staging)
├─ 3 errors (new bug introduced!)
└─ Testing in progress...
```

### Local Development Setup

**Prerequisites:**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create local database
createdb cohort
```

**Environment Configuration:**
```bash
# Copy example environment file
cp .env.example .env.local

# Update .env.local with local values
DATABASE_URL=postgresql://localhost:5432/cohort
BETTER_AUTH_URL=http://localhost:3000
# ... other variables (see .env.example)
```

**Database Setup:**
```bash
npm install
npm run db:migrate    # Run migrations
npm run db:seed       # Seed test data
```

**Start Development:**
```bash
npm run dev
# Visit: http://localhost:3000
```

### Database Migrations

**Local Development:**
```bash
npm run db:generate    # Generate migration from schema changes
npm run db:migrate     # Run migrations
npm run db:check       # Check migration status
npm run db:studio      # Open database GUI
```

**Staging/Production:**
- Migrations run automatically via GitHub Actions
- Manual intervention only if migration fails

### Rollback Procedures

**Via Railway Dashboard:**
1. Go to Railway → Environment → Deployments
2. Find last working deployment
3. Click "Redeploy"

**Via Git:**
```bash
# Revert problematic commit
git revert [bad-commit-hash]
git push origin main

# Or hard reset (destructive)
git reset --hard [good-commit-hash]
git push origin main --force
```

**Detailed Guide:** See `.cursor/plans/deployment-guide.md` for comprehensive deployment documentation.

## Future Enhancements (Phase 2)

- Notion API integration for goals and review sync
- Email notifications (weekly digest, reminders)
- Advanced analytics (sentiment analysis, network graphs)
- Mobile app (React Native or PWA)

## UI Reference

The example dashboard UI (`docs/example-dashboard-ui.png`) demonstrates the desired aesthetic:
- Dark theme with near-black background (#0f1419)
- Clean, modern sidebar navigation with collapsible sections
- Stats cards with icons, large numbers, and trend indicators (percentage badges)
- Smooth area charts with teal/green accent colors
- Generous whitespace and 8px grid spacing
- Rounded corners on cards and buttons
- Subtle shadows for depth
- Data table with status badges

This visual style should guide the implementation using Nuxt UI components.

## Notes

- ESLint config extends from `.nuxt/eslint.config.mjs` (auto-generated)
- TypeScript uses project references to `.nuxt/` for type generation
- The `postinstall` script runs `nuxt prepare` to generate types
- Detailed specifications available in `docs/cohort-tech-spec.md` and `docs/cohort-wireframes.md`
- UI design reference in `docs/example-dashboard-ui.png`
