# Trellis - Technical Specification

## Project Overview

**Trellis** is a buddy management and peer feedback platform for Pocketworks, designed to streamline the feedback collection process, provide visibility into personal development, and maintain alignment with Notion-based formal reviews.

### Goals
- Centralize feedback submission and viewing
- Provide actionable dashboard for employees and buddies
- Track review schedules and goals
- Enable data-driven insights into team engagement
- Maintain flexibility to evolve into a SaaS product

---

## Technical Architecture

### Stack
- **Frontend Framework**: Nuxt 4
- **UI Library**: Nuxt UI
- **Authentication**: Better-auth with Google OAuth (Pocketworks workspace)
- **Database**: PostgreSQL
- **Hosting**: Railway (Nuxt app + PostgreSQL database)
- **Future Integration**: Notion API

### Architecture Pattern
- Server-side rendering (SSR) with Nuxt
- API routes handled by Nuxt server endpoints
- Better-auth middleware for protected routes
- PostgreSQL for relational data storage

---

## Database Schema

### Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role_type VARCHAR(50) CHECK (role_type IN ('dev', 'design', 'qa')),
  buddy_id UUID REFERENCES users(id),
  next_review_date DATE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_buddy ON users(buddy_id);
```

#### `feedback`
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  week_year VARCHAR(10), -- Format: '2025-W43'
  is_read BOOLEAN DEFAULT false,
  
  CONSTRAINT different_users CHECK (reviewer_id != reviewee_id)
);

CREATE INDEX idx_feedback_reviewer ON feedback(reviewer_id);
CREATE INDEX idx_feedback_reviewee ON feedback(reviewee_id);
CREATE INDEX idx_feedback_week ON feedback(week_year);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
```

#### `goals`
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  status VARCHAR(50) CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  target_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
```

#### `review_schedules`
```sql
CREATE TABLE review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(50) CHECK (status IN ('scheduled', 'completed', 'rescheduled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_user ON review_schedules(user_id);
CREATE INDEX idx_review_date ON review_schedules(scheduled_date);
```

#### `onboarding_imports`
```sql
CREATE TABLE onboarding_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  filename VARCHAR(255),
  rows_imported INTEGER,
  status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'failed')),
  error_log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication
- `POST /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/session` - Get current user session

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id/buddy` - Update buddy relationship (admin only)

### Feedback
- `POST /api/feedback` - Submit new feedback
- `GET /api/feedback/received` - Get feedback received by current user
- `GET /api/feedback/given` - Get feedback given by current user
- `GET /api/feedback/for-buddy` - Get feedback for users you're buddy to
- `PATCH /api/feedback/:id/read` - Mark feedback as read
- `GET /api/feedback/stats` - Get feedback statistics
- `GET /api/feedback/can-review/:userId` - Check if current user can review target user this week

### Goals
- `GET /api/goals` - Get current user's goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `PATCH /api/goals/:id/complete` - Mark goal as completed

### Reviews
- `GET /api/reviews/upcoming` - Get upcoming review schedules
- `GET /api/reviews/history` - Get review history
- `POST /api/reviews` - Schedule new review (admin only)
- `PATCH /api/reviews/:id/complete` - Mark review as completed

### Admin
- `POST /api/admin/onboard` - Upload CSV to onboard users
- `GET /api/admin/stats` - Get platform-wide statistics
- `GET /api/admin/engagement` - Get engagement metrics

### Analytics
- `GET /api/analytics/feedback-timeline` - Feedback over time
- `GET /api/analytics/activity-heatmap` - Weekly activity heatmap
- `GET /api/analytics/team-engagement` - Team-level engagement data

---

## Feature Specifications

### Phase 1: MVP Features

#### 1. Authentication & Onboarding
**User Stories:**
- As an employee, I can sign in with my Pocketworks Google account
- As an admin, I can upload a CSV to onboard all users and buddy relationships
- As a user, I can see my profile with my assigned buddy

**Acceptance Criteria:**
- Only @pocketworks.co.uk emails can sign in
- First user to sign in becomes admin by default
- CSV format: `email, name, role_type, buddy_email`
- Validation for missing buddies, duplicate emails
- Error reporting for failed imports

#### 2. Dashboard (Employee View)
**User Stories:**
- As an employee, I can see my personalized dashboard showing:
  - Action items (pending reviews to submit)
  - New feedback notifications
  - Next review date
  - Active goals
  - Feedback activity statistics

**Acceptance Criteria:**
- Dashboard loads in <2 seconds
- Real-time counts for unread feedback
- Visual indicators for overdue actions
- Quick access to submit feedback
- Responsive design for mobile

#### 3. Feedback Submission
**User Stories:**
- As an employee, I can submit feedback about any colleague
- As an employee, I'm notified if I've already reviewed someone this week
- As an employee, I can see who I haven't reviewed recently

**Acceptance Criteria:**
- Dropdown lists all users except self
- Text area with minimum 20 characters
- Validates one submission per person per week (suggestion, not hard block)
- Success confirmation with option to submit another
- Feedback immediately visible to reviewee and their buddy

#### 4. Feedback Inbox
**User Stories:**
- As an employee, I can see all feedback submitted about me
- As a buddy, I can see all feedback about my assigned buddies
- As an employee, I can filter feedback by date range

**Acceptance Criteria:**
- Shows reviewer name, date, and content
- Mark as read functionality
- Badge showing unread count
- Sort by newest/oldest
- Pagination for 20+ items

#### 5. Goals Management
**User Stories:**
- As an employee, I can create, update, and complete goals
- As an employee, I can see my goal progress on the dashboard

**Acceptance Criteria:**
- CRUD operations for goals
- Status: active, completed, archived
- Optional target date
- Progress visualization on dashboard

#### 6. Admin Panel
**User Stories:**
- As an admin, I can view all buddy relationships
- As an admin, I can reassign buddies
- As an admin, I can set review dates
- As an admin, I can see engagement statistics

**Acceptance Criteria:**
- Table view of all users and their buddies
- Drag-and-drop or select interface for reassignment
- Bulk actions for setting review dates
- Charts showing: feedback volume, active users, review completion rate

---

## Data Visualizations Specifications

### Employee Dashboard

#### Stats Cards (Top Row)
- **Feedback Given This Month**: Count with % change from last month
- **Feedback Received This Month**: Count with % change
- **Active Goals**: Count of incomplete goals
- **Days Until Review**: Countdown with visual indicator (red if <7 days)

#### Feedback Timeline (Line Chart)
- X-axis: Weeks (last 12 weeks)
- Y-axis: Count of feedback
- Two lines: Given (green) vs Received (blue)
- Hover tooltip shows exact counts

#### Activity Heatmap (GitHub Style)
- 12 weeks of activity
- Darker shade = more feedback submitted/received that week
- Tooltip shows exact count on hover

#### Weekly Progress (Bar Chart)
- Current week's activity
- Stacked bars: Feedback given + received per day
- Goal: Visualize if user is on track for weekly engagement

### Admin Dashboard

#### Team Engagement Overview (Stats Cards)
- **Total Active Users**: Count with % of total
- **Total Feedback This Month**: Count with trend
- **Avg Feedback Per User**: Number with benchmark
- **Reviews Due This Month**: Count

#### Feedback Distribution (Donut Chart)
- By role type (Dev, Design, QA)
- Shows which teams are most engaged

#### Top Contributors (Leaderboard)
- Top 10 users by feedback given
- Avatar, name, count
- Highlight if current user is in top 10

#### Review Schedule (Timeline)
- Calendar view of upcoming reviews
- Color-coded by status (scheduled, completed, overdue)

---

## Authentication Flow

### Google OAuth with Better-auth

1. User clicks "Sign in with Google"
2. Better-auth redirects to Google OAuth consent screen
3. User authorizes with @pocketworks.co.uk email
4. Google redirects back to `/api/auth/callback`
5. Better-auth validates email domain
6. If valid:
   - Check if user exists in database
   - If not, create new user record
   - If first user, set `is_admin = true`
   - Create session
   - Redirect to `/dashboard`
7. If invalid domain:
   - Show error: "Please use your Pocketworks email"
   - Redirect to login page

### Session Management
- Server-side sessions stored in PostgreSQL
- Session duration: 30 days
- Refresh tokens for long-lived sessions
- Logout clears session from database

---

## Future Enhancements (Phase 2)

### Notion Integration
- Sync goals from Notion buddy pages
- Export feedback to Notion for reviews
- Bi-directional sync for review dates

### Email Notifications
- Weekly digest of feedback received
- Reminder emails for upcoming reviews
- Notification when someone submits feedback about you

### Advanced Analytics
- Sentiment analysis on feedback text
- Network graph of feedback relationships
- Predictive analytics for review scheduling

### Mobile App
- React Native or Progressive Web App
- Push notifications
- Offline support for viewing feedback

---

## Security Considerations

- All endpoints except auth require valid session
- Admin endpoints check `is_admin` flag
- SQL injection prevention via parameterized queries
- XSS protection via content sanitization
- CSRF protection via Better-auth
- Rate limiting on feedback submission (max 10/hour)
- Input validation on all user-submitted content

---

## Performance Targets

- Dashboard load: <2 seconds
- Feedback submission: <500ms
- Database queries: <100ms
- Concurrent users: 100+ without degradation
- Uptime: 99.5%

---

## CSV Import Format

### Expected Format for Onboarding

```csv
email,name,role_type,buddy_email,next_review_date
john.doe@pocketworks.co.uk,John Doe,dev,jane.smith@pocketworks.co.uk,2025-03-15
jane.smith@pocketworks.co.uk,Jane Smith,design,john.doe@pocketworks.co.uk,2025-03-20
```

### Validation Rules
- Email must end with `@pocketworks.co.uk`
- Name cannot be empty
- Role type must be: dev, design, or qa
- Buddy email must exist in the CSV or database
- Next review date must be in format YYYY-MM-DD
- Circular buddy relationships are allowed (buddy pairs)

---

## Development Roadmap

### Week 1-2: Foundation
- Set up Nuxt 4 project with Nuxt UI
- Configure Railway deployment
- Set up PostgreSQL database
- Implement Better-auth with Google OAuth
- Create database migrations

### Week 3-4: Core Features
- Build user dashboard
- Implement feedback submission
- Create feedback inbox
- Add goals management

### Week 5-6: Admin & Polish
- Build admin panel
- Implement CSV onboarding
- Add data visualizations
- Responsive design refinement

### Week 7-8: Testing & Launch
- User acceptance testing
- Bug fixes
- Performance optimization
- Deploy to production
- Onboard Pocketworks team

---

## Success Metrics

- **Adoption Rate**: 80% of employees using within 2 weeks
- **Engagement**: Average 3+ feedback submissions per user per week
- **Review Completion**: 90% of scheduled reviews completed on time
- **User Satisfaction**: 4+ star rating from team
- **System Performance**: <2s dashboard load time maintained