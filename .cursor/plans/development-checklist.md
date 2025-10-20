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

## Phase 2: Core Layout & Navigation
- [ ] Create main layout with sidebar
  - [ ] Logo and app branding
  - [ ] Navigation menu (Dashboard, Feedback, Goals, Reviews, Admin)
  - [ ] User profile section with avatar
  - [ ] Dark mode toggle
  - [ ] Logout button
- [ ] Create dashboard page (employee view)
  - [ ] Welcome header with user name
  - [ ] Stats cards (4 across)
    - [ ] Feedback given this week
    - [ ] Feedback received this week
    - [ ] Active goals count
    - [ ] Next review date countdown
  - [ ] Quick actions panel
  - [ ] Recent feedback preview

## Phase 3: Feedback System
- [ ] Give Feedback page
  - [ ] User selection dropdown (searchable)
  - [ ] Feedback text area with validation
  - [ ] Check if already reviewed this week
  - [ ] Submit feedback functionality
  - [ ] Success confirmation with confetti
- [ ] Feedback Inbox page
  - [ ] Tabs: Received / Given / For My Buddies
  - [ ] Feedback list with cards
  - [ ] Filter by date range, role, read/unread
  - [ ] Mark as read functionality
  - [ ] Pagination (20 per page)
- [ ] API endpoints
  - [ ] POST /api/feedback - Submit feedback
  - [ ] GET /api/feedback/received - Get received feedback
  - [ ] GET /api/feedback/given - Get given feedback
  - [ ] GET /api/feedback/for-buddy - Get feedback for buddies
  - [ ] PATCH /api/feedback/:id/read - Mark as read
  - [ ] GET /api/feedback/can-review/:userId - Check weekly limit

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
**Last Updated:** 2025-10-20
**Current Phase:** Phase 2 - Core Layout & Navigation
**Next Task:** Create main layout with sidebar navigation
