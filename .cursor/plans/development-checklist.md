# Cohort Development Checklist

## Phase 1: Foundation ✅
- [x] Set up Nuxt 4 project with Nuxt UI
- [x] Install and configure Drizzle ORM
- [x] Create database schema (users, feedback, goals, reviews, sessions, accounts)
- [x] Configure Railway PostgreSQL connection
- [x] Install and configure Better-auth
- [x] Implement Google OAuth authentication
- [x] Create login page
- [x] Test authentication flow

## Phase 2: Core Layout & Navigation ✅
- [x] Create main layout with sidebar
  - [x] Logo and app branding
  - [x] Navigation menu (Dashboard, Feedback, Goals, Reviews, Admin)
  - [x] Conditional admin navigation (filter-based rendering)
  - [x] User profile section with avatar
  - [x] Dark mode toggle
  - [x] Logout button
- [x] Create dashboard page (employee view)
  - [x] Welcome header with user name
  - [x] Stats cards (4 across)
    - [x] Feedback given this week
    - [x] Feedback received this week
    - [x] Active goals count
    - [x] Next review date countdown
  - [x] Quick actions panel
  - [x] Recent feedback preview
  - [x] Feedback activity chart (12 weeks)
- [x] Authentication & Authorization
  - [x] Extended Better Auth types (isAdmin, roleType, buddyId, avatarUrl, nextReviewDate)
  - [x] Route middleware for authentication (app/middleware/auth.ts)
  - [x] Route middleware for admin access (app/middleware/admin.ts)
  - [x] Applied middleware to admin pages
  - [x] Custom error page (403, 404, 500) with proper UX

## Phase 3: Feedback System ✅
- [x] Database setup
  - [x] Added feedback_prompts table to schema
  - [x] Created comprehensive seed script with team data
  - [x] Implemented user linking system (seeded users → OAuth users)
  - [x] Added buddy assignments for all team members
  - [x] Seeded 21 feedback questions across 6 categories
- [x] Give Feedback page
  - [x] User selection dropdown (searchable)
  - [x] Feedback text area with validation
  - [x] Check if already reviewed this week
  - [x] Submit feedback functionality
  - [x] Success confirmation (confetti deferred)
  - [x] Feedback guidelines card
  - [x] Character count validation (min 10 chars)
- [x] Feedback Inbox page
  - [x] Tabs: Received / Given / For My Buddies
  - [x] Feedback list with cards
  - [x] Content truncation with popovers
  - [x] Mark as read functionality
  - [x] Publish feedback (single and batch)
  - [x] Loading states (page navigation + button spinners)
- [x] API endpoints
  - [x] POST /api/feedback - Submit feedback
  - [x] GET /api/feedback/received - Get received feedback
  - [x] GET /api/feedback/given - Get given feedback
  - [x] GET /api/feedback/for-buddy - Get feedback for buddies
  - [x] PATCH /api/feedback/:id/read - Mark as read
  - [x] PATCH /api/feedback/:id/publish - Publish single feedback
  - [x] POST /api/feedback/publish-batch - Publish multiple feedback
  - [x] GET /api/feedback/can-review/:userId - Check weekly limit

## Phase 4: Goals Management ✅
- [x] Goals page with accordion layout
  - [x] Three sections: Active / Completed / Archived (accordion style)
  - [x] Goal cards with view/edit modal functionality
  - [x] Responsive grid layout (1/2/3 columns)
  - [x] Add new goal functionality
  - [x] Target date picker
  - [x] Rich text descriptions with TipTap editor
    - [x] Bold and italic formatting
    - [x] Bullet lists
    - [x] Task lists (checkboxes)
  - [x] Goal notes/comments system
  - [x] Buddy visibility (view buddies' goals and add notes)
- [x] API endpoints
  - [x] GET /api/goals - Get user's goals (with description)
  - [x] GET /api/goals/buddies - Get buddy goals
  - [x] POST /api/goals - Create new goal
  - [x] PATCH /api/goals/:id - Update goal
  - [x] PATCH /api/goals/:id/status - Change status
  - [x] DELETE /api/goals/:id - Delete goal
  - [x] GET /api/goals/:id/notes - Get notes
  - [x] POST /api/goals/:id/notes - Add note
- [x] Components
  - [x] GoalCard.vue - Goal display with status actions
  - [x] GoalModal.vue - Create/edit modal
  - [x] GoalDescriptionEditor.vue - TipTap rich text editor
  - [x] GoalNoteThread.vue - Comments/notes display

## Phase 5: Reviews Management
- [ ] Reviews page
  - [ ] Upcoming reviews section
  - [ ] Review cards with buddy info
  - [ ] Days until review countdown
  - [ ] Status badges
  - [ ] Past reviews section (accordion)
- [ ] API endpoints
  - [ ] GET /api/reviews/upcoming - Get upcoming reviews
  - [ ] GET /api/reviews/history - Get review history
  - [ ] POST /api/reviews - Schedule review (admin)
  - [ ] PATCH /api/reviews/:id/complete - Mark as completed

## Phase 6: Admin Panel 🚧
- [x] Admin dashboard page
  - [x] Platform-wide stats cards (total users, active/invited, feedback, goals, reviews)
  - [x] Team engagement chart (12-week feedback timeline with @unovis/vue)
  - [x] Feedback distribution (donut chart by role type)
  - [x] Top contributors leaderboard (top 10 with medals)
  - [x] Recent activity feed (feedback and goals)
- [x] User management
  - [x] User table with tabs (All/Active/Invited)
  - [x] Edit user modal (role, buddy, roleType, nextReviewDate)
  - [x] Add user modal (create invited users)
  - [x] Reassign buddy functionality
  - [x] Set review dates (individual)
  - [ ] Bulk actions for buddy assignment and review dates
- [ ] CSV onboarding
  - [ ] Upload CSV interface
  - [ ] Preview and validation
  - [ ] Import users functionality (page)
  - [ ] Error reporting
- [x] API endpoints
  - [x] POST /api/admin/onboard/import - CSV import
  - [x] GET /api/admin/onboard/history - Import history
  - [x] GET /api/admin/onboard/template - CSV template download
  - [x] GET /api/admin/stats - Platform statistics
  - [x] GET /api/admin/engagement - Engagement metrics (12 weeks)
  - [x] GET /api/admin/feedback-distribution - Role distribution
  - [x] GET /api/admin/top-contributors - Top 10 feedback givers
  - [x] GET /api/admin/recent-activity - Latest feedback and goals
  - [x] GET /api/admin/users - List users with filtering
  - [x] PATCH /api/admin/users/:id - Update user (role, buddy, roleType)
  - [x] POST /api/admin/users - Create new invited user

## Phase 7: Data Visualizations
- [ ] Dashboard charts
  - [ ] Feedback timeline (line chart - last 12 weeks)
  - [ ] Activity heatmap (GitHub-style)
  - [ ] Weekly progress bar chart
- [ ] Admin charts
  - [ ] Team engagement over time
  - [ ] Feedback distribution by role
  - [ ] Review completion rates
- [ ] API endpoints
  - [ ] GET /api/analytics/feedback-timeline
  - [ ] GET /api/analytics/activity-heatmap
  - [ ] GET /api/analytics/team-engagement

## Phase 8: AI-Driven Feedback Insights ✅ (MVP Complete)
**Dependencies:** Requires Phase 3 (Feedback) ✅ and Phase 4 (Goals) ✅

**Overview:** Intelligent analysis of feedback patterns using LLM to identify recurring themes and suggest actionable goals.

**Detailed Plan:** See `.cursor/plans/ai-sentiment-analysis.md`

- [x] Database schema
  - [x] Create feedback_insights table (with comprehensive documentation)
  - [x] Add lastInsightsDate column to users table
  - [x] Updated reset script to include new tables
- [x] LLM Analysis Service
  - [x] Create /server/services/anthropicClient.ts (Claude 3.5 Haiku)
  - [x] Prompt engineering for theme extraction and goal suggestions
  - [x] JSON response parsing and validation
  - [x] Error handling and retries
- [x] API Endpoints (MVP)
  - [x] POST /api/insights/analyze - Trigger analysis (rate limited 1x/24hrs)
  - [x] GET /api/insights/user-summary - Fetch cached insights
  - [ ] PATCH /api/insights/dismiss - Dismiss suggestion (deferred)
  - [ ] PATCH /api/insights/mark-acted - Mark acted upon (deferred)
- [ ] Background Job (Railway Cron) - Deferred to Phase 2
  - [ ] Create /server/cron/analyze-feedback.ts
  - [ ] Configure railway.toml for nightly runs
  - [ ] Batch processing (max 10 users per run)
  - [ ] Auto-trigger when 5+ new feedback items
- [x] UI Components
  - [x] Create SentimentAnalysis.vue component
  - [x] Donut chart visualization (@unovis/vue)
  - [x] Theme cards with count badges and sentiment colors
  - [x] Suggested goal cards with "Create Goal" action
  - [x] "Last analyzed" timestamp and refresh button
  - [x] Loading/analyzing states
  - [x] Empty state with progress indicator (0-2 feedback)
  - [x] Smart button states (disabled when <3 feedback)
- [x] Integration
  - [x] Add insights to Dashboard (index.vue)
  - [x] Connect to Goals page (pre-fill suggestions via query params)
  - [x] Goal modal reactive to prop changes
  - [x] Clean URL handling after navigation
  - [ ] Add insights to Inbox (feedback/inbox.vue) - deferred
  - [ ] Track conversion metrics (suggestions → goals created) - deferred
- [x] Testing & Data
  - [x] Enhanced seed script with 25+ diverse feedback items
  - [x] Varied sentiments (positive/constructive/neutral)
  - [x] Multiple themes (communication, technical, collaboration, client relations, etc.)
  - [x] TypeScript type safety (all errors resolved)

**Completed:** 2025-01-09
**Actual Effort:** ~1 day (MVP approach)
**Cost:** ~$0.001 per analysis with Claude 3.5 Haiku

## Phase 9: Polish & Testing
- [ ] Responsive design
  - [ ] Mobile layouts
  - [ ] Tablet layouts
  - [ ] Touch interactions
- [ ] Loading states
  - [ ] Skeleton screens
  - [ ] Loading spinners
  - [ ] Optimistic updates
- [ ] Error handling
  - [ ] Toast notifications
  - [x] Error pages (403, 404, 500)
  - [ ] Validation messages
- [ ] Performance optimization
  - [ ] Image optimization
  - [ ] Code splitting
  - [ ] Lazy loading
- [ ] Accessibility
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] ARIA labels
  - [ ] Color contrast

## Phase 10: Deployment & Launch
- [ ] Environment configuration
  - [ ] Production environment variables
  - [ ] Google OAuth production callback URLs
- [ ] Railway deployment
  - [ ] Connect GitHub repository
  - [ ] Configure build settings
  - [ ] Set up environment variables
  - [ ] Deploy to production
- [ ] Testing
  - [ ] User acceptance testing
  - [ ] Bug fixes
  - [ ] Performance testing
- [ ] Documentation
  - [ ] User guide
  - [ ] Admin guide
  - [ ] Deployment notes

## Phase 11: Multi-Tenancy & SaaS Launch (Future Enhancements)

### Decision Point: Architecture Model
- [ ] Evaluate multi-tenancy approaches based on customer demand
- [ ] Choose: Workspace Model (SMB focus) OR Subdomain Model (Enterprise) OR Hybrid
- [ ] Review `.cursor/plans/workspace-model-comparison.md` for detailed trade-offs

### Option A: Workspace Model (10-12 weeks)
**Best for:** SMB/Startups (5-50 employees), freelancers, users managing multiple teams

- [ ] Phase 11a: Global OAuth Implementation (2 weeks)
  - [ ] Refactor Better-auth for global authentication
  - [ ] User signup flow at `app.cohort.com`
  - [ ] Workspace selection after OAuth callback
  - [ ] Session management with workspace context
- [ ] Phase 11b: Workspace Schema & Membership (2 weeks)
  - [ ] Create `workspaces` table (id, slug, name, plan_type, settings, oauth_*)
  - [ ] Create `workspace_members` table (user ↔ workspace many-to-many)
  - [ ] Add `workspace_id` columns to all tables (users, feedback, goals, etc.)
  - [ ] Implement Row-Level Security (RLS) policies
  - [ ] Backfill existing data with default workspace
- [ ] Phase 11c: Workspace Switcher UI (2 weeks)
  - [ ] Build workspace picker component (navbar dropdown)
  - [ ] Workspace creation flow (name, slug validation)
  - [ ] Workspace invitation system (email invites + CSV import)
  - [ ] Current workspace context management (composable)
  - [ ] Empty state when user has no workspaces
- [ ] Phase 11d: Workspace Context Middleware (1-2 weeks)
  - [ ] Nitro plugin to detect workspace from session/query param
  - [ ] Update all API routes to use workspace context
  - [ ] Deep link handling (`?workspace=abc`)
  - [ ] Workspace-scoped RLS enforcement
- [ ] Phase 11e: Multi-Workspace Onboarding (2-3 weeks)
  - [ ] Workspace settings page (branding, members, billing)
  - [ ] Member invitation (CSV + manual)
  - [ ] Workspace branding (logo, colors)
  - [ ] Workspace admin role management
  - [ ] Workspace deletion/archival
- [ ] Phase 11f: Billing Integration (2 weeks)
  - [ ] Per-workspace subscription (Stripe/Paddle)
  - [ ] Usage limits per plan (Free: 10 users, Pro: 50 users)
  - [ ] Upgrade/downgrade flows
  - [ ] Billing dashboard per workspace

### Option B: Subdomain Model (8 weeks)
**Best for:** Enterprise customers (50+ employees), per-workspace OAuth, custom domains

- [ ] Follow existing plan in `.cursor/plans/multi-tenancy-saas-architecture.md`
- [ ] Week 1-2: Database Preparation
  - [ ] Create `tenants` table
  - [ ] Add `tenant_id` columns to all tables (nullable)
  - [ ] Backfill existing data with default tenant
  - [ ] Make `tenant_id` NOT NULL
  - [ ] Add indexes on tenant_id
- [ ] Week 3-4: Tenant Detection
  - [ ] Create Nitro plugin for subdomain detection
  - [ ] Update all API routes to use `getTenantId(event)`
  - [ ] Test locally with subdomain routing
  - [ ] Deploy to staging
- [ ] Week 5-6: RLS Implementation
  - [ ] Enable RLS on `users` table, test thoroughly
  - [ ] Enable RLS on `feedback` table, test thoroughly
  - [ ] Enable RLS on remaining tables
  - [ ] Monitor query performance
- [ ] Week 7: OAuth Refactoring
  - [ ] Implement OAuth secret encryption/decryption (AES-256-GCM)
  - [ ] Refactor Better-auth to use tenant-specific OAuth config
  - [ ] Test Google OAuth with Pocketworks tenant
- [ ] Week 8: Multi-Tenant Onboarding + Billing
  - [ ] Build `/signup` page (subdomain selection, OAuth config)
  - [ ] Create tenant creation API
  - [ ] Build tenant settings dashboard
  - [ ] Integrate Stripe for billing
  - [ ] Set up subscription plans

### Option C: Hybrid Model (10-11 weeks)
**Best for:** Supporting both enterprise and SMB customers

- [ ] Implement subdomain model (8 weeks) — see Option B
- [ ] Add `workspace_members` table (1 week)
  - [ ] Create schema for user-workspace many-to-many
  - [ ] Backfill with existing user-tenant relationships
- [ ] Build workspace switcher that changes subdomain (1-2 weeks)
  - [ ] Navbar dropdown component
  - [ ] Fetch user's workspace memberships
  - [ ] Redirect to selected workspace's subdomain
  - [ ] Support users in multiple subdomains via membership

### Common Tasks (All Options)
- [ ] Security & Performance
  - [ ] Implement audit logging per workspace/tenant
  - [ ] Add rate limiting per workspace/tenant
  - [ ] Cross-tenant isolation testing (security audit)
  - [ ] Load testing with multiple tenants/workspaces
- [ ] User Features
  - [ ] Data export functionality (per workspace)
  - [ ] Workspace/tenant analytics dashboard
  - [ ] Workspace member management UI
  - [ ] Invitation email templates
- [ ] Billing & Compliance
  - [ ] Usage metering and reporting
  - [ ] Subscription management UI
  - [ ] Invoice generation
  - [ ] GDPR compliance (data deletion requests)

### Future Enhancements (Post-Launch)
- [ ] Per-workspace OAuth (enterprise add-on for workspace model)
- [ ] Custom domains (`feedback.company.com`)
- [ ] Dedicated databases for enterprise tier
- [ ] API access with workspace-scoped keys
- [ ] Notion API integration
  - [ ] Sync goals from Notion
  - [ ] Export feedback to Notion
  - [ ] Bi-directional review sync
- [ ] Email notifications
  - [ ] Weekly digest
  - [ ] Review reminders
  - [ ] New feedback notifications
- [ ] Advanced analytics
  - [ ] Sentiment analysis (already in Phase 8)
  - [ ] Network graphs
  - [ ] Predictive scheduling
- [ ] Mobile app consideration

---

## Current Status
**Last Updated:** 2025-10-29
**Current Phase:** Phase 6 - Admin Panel (In Progress - 75% Complete)
**Recently Completed:**
- ✅ Phase 6: Admin Panel (Partial)
  - Integrated Better Auth admin plugin for user role management
  - Built admin dashboard with 5 data visualizations (@unovis/vue charts)
  - Created user management interface (table with tabs, edit/add modals)
  - Implemented 11 admin API endpoints (stats, engagement, users, onboarding)
  - Fixed SSR/hydration issues by switching from useFetch to $fetch
  - User table with proper column definitions and filtering
  - Role-based access control using Better Auth roles
- ✅ Phase 4: Goals Management (COMPLETE)
  - Goals page with accordion layout (Active/Completed/Archived)
  - Rich text descriptions using Nuxt TipTap editor with formatting, lists, and checkboxes
  - View/Edit modal system for goal details
  - Goal notes/comments system for collaboration
  - Buddy visibility (view and comment on buddies' goals)
  - Responsive grid layout (1/2/3 columns based on screen size)
  - All 8 goals API endpoints operational
  - Database migration for description field
- ✅ Phase 3: Feedback System (COMPLETE)
  - Give Feedback page with full validation and weekly limit checking
  - Feedback Inbox with 3 tabs (Received, Given, For My Buddies)
  - Mark as read and publish feedback functionality
  - All 8 feedback API endpoints operational
  - User linking system for automatic OAuth/seeded user merging
  - Comprehensive database seeding with team data and buddy assignments

**Remaining in Phase 6:**
- CSV onboarding UI (upload interface, preview, validation, import history page)
- Bulk actions for user management (bulk buddy assignment, bulk review dates)

**Next Task:** Complete Phase 6 (CSV onboarding UI) OR proceed to Phase 5 (Reviews Management)
