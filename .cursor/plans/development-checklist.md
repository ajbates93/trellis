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

## Phase 3: Feedback System (In Progress)
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
- [ ] Feedback Inbox page
  - [ ] Tabs: Received / Given / For My Buddies
  - [ ] Feedback list with cards
  - [ ] Filter by date range, role, read/unread
  - [ ] Mark as read functionality
  - [ ] Pagination (20 per page)
- [x] API endpoints (partial)
  - [x] POST /api/feedback - Submit feedback
  - [ ] GET /api/feedback/received - Get received feedback
  - [ ] GET /api/feedback/given - Get given feedback
  - [ ] GET /api/feedback/for-buddy - Get feedback for buddies
  - [ ] PATCH /api/feedback/:id/read - Mark as read
  - [x] GET /api/feedback/can-review/:userId - Check weekly limit

## Phase 4: Goals Management
- [ ] Goals page with Kanban layout
  - [ ] Three columns: Active / Completed / Archived
  - [ ] Goal cards with inline editing
  - [ ] Drag and drop between columns
  - [ ] Add new goal functionality
  - [ ] Target date picker
  - [ ] Progress tracking
- [ ] API endpoints
  - [ ] GET /api/goals - Get user's goals
  - [ ] POST /api/goals - Create new goal
  - [ ] PUT /api/goals/:id - Update goal
  - [ ] DELETE /api/goals/:id - Delete goal
  - [ ] PATCH /api/goals/:id/complete - Mark as completed

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

## Phase 6: Admin Panel
- [ ] Admin dashboard page
  - [ ] Platform-wide stats cards
  - [ ] Team engagement chart
  - [ ] Feedback distribution (donut chart)
  - [ ] Top contributors leaderboard
  - [ ] Recent activity feed
- [ ] User management
  - [ ] Buddy relationships table
  - [ ] Reassign buddy functionality
  - [ ] Set review dates (bulk actions)
- [ ] CSV onboarding
  - [ ] Upload CSV interface
  - [ ] Preview and validation
  - [ ] Import users functionality
  - [ ] Error reporting
- [ ] API endpoints
  - [ ] POST /api/admin/onboard - CSV import
  - [ ] GET /api/admin/stats - Platform statistics
  - [ ] GET /api/admin/engagement - Engagement metrics
  - [ ] PUT /api/users/:id/buddy - Update buddy assignment

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

## Phase 8: Polish & Testing
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
  - [ ] Error pages (404, 500)
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

## Phase 9: Deployment & Launch
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

## Phase 10: Future Enhancements (Phase 2)
- [ ] Notion API integration
  - [ ] Sync goals from Notion
  - [ ] Export feedback to Notion
  - [ ] Bi-directional review sync
- [ ] Email notifications
  - [ ] Weekly digest
  - [ ] Review reminders
  - [ ] New feedback notifications
- [ ] Advanced analytics
  - [ ] Sentiment analysis
  - [ ] Network graphs
  - [ ] Predictive scheduling
- [ ] Mobile app consideration

---

## Current Status
**Last Updated:** 2025-10-21
**Current Phase:** Phase 3 - Feedback System (In Progress)
**Completed This Session:**
- Give Feedback page with full validation and weekly limit checking
- User linking system for automatic OAuth/seeded user merging
- Comprehensive database seeding with team data and buddy assignments
- Feedback submission API with weekly tracking
- Feedback activity chart visualization with Unovis

**Next Task:** Build Feedback Inbox page with tabs (Received / Given / For My Buddies)
