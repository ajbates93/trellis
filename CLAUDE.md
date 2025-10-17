# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cohort** is a buddy management and peer feedback platform for Pocketworks. It streamlines feedback collection, provides visibility into personal development, and maintains alignment with Notion-based formal reviews. The platform is being built as an internal tool with potential to evolve into a SaaS product.

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
- Only `@pocketworks.co.uk` emails permitted
- First user automatically becomes admin (`is_admin = true`)
- Server-side sessions stored in PostgreSQL (30-day duration)
- Protected routes require valid session

## Database Schema

### Core Tables

**users**: Employee profiles and buddy relationships
- `id` (UUID), `email`, `name`, `role_type` (dev/design/qa)
- `buddy_id` (self-referential), `next_review_date`, `is_admin`
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
1. **Authentication**: Google OAuth for @pocketworks.co.uk
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
email,name,role_type,buddy_email,next_review_date
john.doe@pocketworks.co.uk,John Doe,dev,jane.smith@pocketworks.co.uk,2025-03-15
```

## Security Considerations

- All endpoints (except auth) require valid session
- Admin endpoints verify `is_admin` flag
- SQL injection prevention via parameterized queries
- XSS protection via content sanitization
- CSRF protection via Better-auth
- Rate limiting on feedback submission (max 10/hour)
- Input validation on all user-submitted content

## Performance Targets

- Dashboard load: <2 seconds
- Feedback submission: <500ms
- Database queries: <100ms
- Concurrent users: 100+ without degradation

## Development Phases

### Week 1-2: Foundation
- Set up Nuxt 4 + Nuxt UI
- Configure Railway deployment
- PostgreSQL setup and migrations
- Better-auth with Google OAuth

### Week 3-4: Core Features
- User dashboard with visualizations
- Feedback submission and inbox
- Goals management

### Week 5-6: Admin & Polish
- Admin panel and CSV onboarding
- Responsive design refinement
- Data visualizations

### Week 7-8: Testing & Launch
- User acceptance testing
- Performance optimization
- Production deployment

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
