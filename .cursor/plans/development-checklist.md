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

## Phase 8: AI-Driven Feedback Insights
**Dependencies:** Requires Phase 3 (Feedback) ✅ and Phase 4 (Goals) to be complete

**Overview:** Intelligent analysis of feedback patterns using LLM to identify recurring themes and suggest actionable goals.

**Detailed Plan:** See `.cursor/plans/ai-sentiment-analysis.md`

- [ ] Database schema
  - [ ] Create feedback_insights table
  - [ ] Add insights tracking columns to users/feedback tables
  - [ ] Create database migrations
- [ ] LLM Analysis Service
  - [ ] Create /server/services/feedbackAnalysis.ts (Claude 3.5 Haiku)
  - [ ] Prompt engineering for theme extraction
  - [ ] JSON response parsing and validation
  - [ ] Error handling and retries
- [ ] API Endpoints
  - [ ] POST /api/feedback/analyze - Trigger analysis (rate limited)
  - [ ] GET /api/feedback/insights - Fetch cached insights
  - [ ] PATCH /api/feedback/insights/:id/dismiss - Dismiss suggestion
  - [ ] PATCH /api/feedback/insights/:id/act - Mark acted upon
- [ ] Background Job (Railway Cron)
  - [ ] Create /server/cron/analyze-feedback.ts
  - [ ] Configure railway.toml for nightly runs
  - [ ] Batch processing (max 10 users per run)
  - [ ] Auto-trigger when 5+ new feedback items
- [ ] UI Components
  - [ ] Create FeedbackInsights.vue component
  - [ ] Theme cards with count badges and sentiment colors
  - [ ] Suggested goal banner with create/dismiss actions
  - [ ] "Last analyzed" timestamp and refresh button
  - [ ] Loading/empty/error states
- [ ] Integration
  - [ ] Add insights to Dashboard (index.vue)
  - [ ] Add insights to Inbox (feedback/inbox.vue)
  - [ ] Connect to Goals page (pre-fill suggestions)
  - [ ] Track conversion metrics (suggestions → goals created)

**Estimated Effort:** 3-4 days (Balanced approach)
**Cost:** <$5/month for 50 active users (using Claude 3.5 Haiku)

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

## Phase 11: Future Enhancements (Phase 2)
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
**Last Updated:** 2025-10-27
**Current Phase:** Phase 5 - Reviews Management (Ready to Start)
**Recently Completed:**
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

**Unblocked:**
- ✅ AI-Driven Feedback Insights (Phase 8) - Goals dependency now satisfied
  - Detailed implementation plan available (`.cursor/plans/ai-sentiment-analysis.md`)
  - Can now suggest goals based on feedback themes

**Next Task:** Implement Reviews Management (Phase 5) OR start Phase 8 (AI Insights)
