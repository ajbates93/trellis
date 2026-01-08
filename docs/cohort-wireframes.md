# Trellis - Wireframes & UI Specification

## Design Principles

Following the inspiration from your dashboard examples, Trellis will embody:
- **Clean & Modern**: Minimal clutter, generous whitespace
- **Data-Forward**: Visualizations are the star
- **Action-Oriented**: Clear CTAs and next steps
- **Delightful**: Smooth animations, thoughtful micro-interactions
- **Flexible**: Works beautifully in light or dark mode

### Visual Style
- **Typography**: Clean, modern sans-serif (Nuxt UI defaults)
- **Color Palette**: 
  - Primary: Teal/Green (action, growth)
  - Secondary: Blue (feedback, information)
  - Accent: Purple (admin, special features)
  - Semantic: Green (positive), Red (urgent), Yellow (warning)
- **Spacing**: 8px grid system
- **Corners**: Rounded (8-12px for cards)
- **Shadows**: Subtle, layered depth

---

## Screen Flows

### 1. Login / Landing Page

**Layout**: Centered card on gradient background

**Elements**:
- **Logo/Wordmark**: "Trellis" with tagline "Peer feedback made simple"
- **Hero Image/Illustration**: Abstract people connected in a circle
- **Primary CTA**: Large "Sign in with Google" button
  - Google logo icon
  - Hover state: Slight lift shadow
- **Footer**: Small text "For Pocketworks employees only"

**Behavior**:
- Clicking CTA triggers Google OAuth flow
- Loading spinner while authenticating
- Error toast if non-Pocketworks email used

---

### 2. Dashboard (Employee View)

**Layout**: Sidebar + main content area

#### Sidebar (Left, Fixed)
**Top Section**:
- **User Avatar & Name** (clickable → profile)
- **Role Badge**: Small pill showing "Developer" / "Designer" / "QA"

**Navigation**:
- 🏠 **Dashboard** (active state highlighted)
- 💬 **Feedback**
  - → Give Feedback
  - → My Feedback (badge showing unread count)
- 🎯 **Goals** 
- 📅 **Reviews**
- ⚙️ **Settings**
- 👑 **Admin** (only visible to admins)

**Bottom Section**:
- Dark mode toggle
- Logout button

#### Main Content Area

**Header**:
- **Welcome back, [Name]!** 
- Subtitle: "Here's what's happening today"
- Date display: "Friday, October 17, 2025"

**Stats Cards (4-across on desktop, 2-across tablet, stacked mobile)**:

1. **Feedback Given This Week**
   - Large number: "5"
   - Small trend: "↑ 2 from last week" (green)
   - Icon: Paper airplane

2. **Feedback Received This Week**
   - Large number: "7"
   - Small trend: "↑ 3 from last week" (green)
   - Badge: "2 unread" (red dot)
   - Icon: Inbox

3. **Active Goals**
   - Large number: "3"
   - Progress bar: "67% complete"
   - Icon: Target

4. **Next Review**
   - Date: "March 15, 2025"
   - Countdown: "28 days away"
   - Icon: Calendar
   - Color: Changes based on proximity (green → yellow → red)

**Action Items Panel**:
- Card with header "Quick Actions"
- **Pending Reviews**: List of people user hasn't reviewed this week
  - Small avatar + name
  - "Review [Name]" button (green)
  - Shows "Already reviewed ✓" if done
- Maximum 5 shown, "View all" link if more

**Feedback Timeline (Line Chart)**:
- Title: "Feedback Activity (Last 12 Weeks)"
- Legend: Given (teal line) vs Received (blue line)
- X-axis: Week numbers
- Y-axis: Count
- Hover tooltip shows exact numbers
- Area fill under lines (subtle gradient)

**Activity Heatmap**:
- Title: "Your Weekly Activity"
- GitHub-style contribution grid
- 12 weeks × 7 days
- Color intensity: White (0) → Teal (5+)
- Tooltip on hover: "3 feedback submissions on Mon, Oct 14"

**Recent Feedback Preview**:
- Card showing last 3 feedback items received
- Each item:
  - Avatar of reviewer
  - Name + time ago ("2 days ago")
  - Truncated preview (50 chars) + "Read more"
- "View all feedback →" link at bottom

---

### 3. Give Feedback Page

**Layout**: Centered form card (max-width 800px)

**Header**:
- Back arrow to dashboard
- Title: "Give Feedback"
- Subtitle: "Share constructive feedback with your teammates"

**Form**:

1. **Who are you reviewing?**
   - Searchable dropdown
   - Shows avatar + name + role
   - Excludes self
   - Recently reviewed people at top (with checkmark icon)

2. **Your feedback**
   - Large textarea (min 20 chars)
   - Character counter
   - Placeholder: "What would you like [Name] to know? Be specific, constructive, and kind."
   - Helper text: "Good feedback is actionable, balanced, and timely."

3. **Preview**
   - Shows how feedback will appear to recipient
   - Your name, date, content

**Actions**:
- **Submit Feedback** (primary button, teal)
- **Cancel** (secondary, ghost button)

**Validation**:
- Warning toast if user already reviewed this person this week: "You've already reviewed [Name] this week. Are you sure you want to submit more feedback?"
- Error if content too short

**Success State**:
- Confetti animation 🎉
- Success toast: "Feedback sent to [Name] and their buddy!"
- Option to "Review someone else" or "Back to dashboard"

---

### 4. Feedback Inbox

**Layout**: Two-column (filters + content)

#### Left Column (Filters/Sidebar)
**Tabs**:
- **Received** (default, shows badge count)
- **Given**
- **For My Buddies** (if user is a buddy)

**Filters**:
- Date range picker
- Role type filter (Dev/Design/QA)
- Read/Unread toggle
- Search box

#### Right Column (Feedback List)

**List View**:
Each feedback item is a card:
- **Header**: 
  - Avatar + reviewer name
  - Time ago ("3 days ago")
  - Unread indicator (blue dot)
- **Content**: 
  - Full feedback text
  - Expandable if >200 chars
- **Footer**:
  - "Mark as read" button (if unread)
  - "Reply via email" link (opens mailto to buddy)

**Empty State**:
- Illustration of empty inbox
- "No feedback yet! Keep up the great work."
- "Encourage your team to share feedback" CTA

**Pagination**:
- Show 20 per page
- Load more button (not infinite scroll)

---

### 5. Goals Page

**Layout**: Kanban-style columns

**Columns**:
1. **Active** (green accent)
2. **Completed** (blue accent)
3. **Archived** (gray)

**Goal Cards**:
- Goal text (editable inline)
- Target date (if set)
- Created date
- Progress indicator (manual %)
- Actions menu (⋮):
  - Edit
  - Mark complete
  - Archive
  - Delete

**Add Goal CTA**:
- Floating action button (bottom right)
- Or "+ New Goal" in each column header
- Modal form:
  - Goal text (textarea)
  - Target date (optional)
  - Create button

**Empty State** (if no goals):
- Illustration
- "Set your first goal"
- Suggested goal templates:
  - "Learn [new skill]"
  - "Ship [project]"
  - "Mentor a teammate"

---

### 6. Reviews Page

**Layout**: Timeline view

**Upcoming Reviews Section**:
- Card for each scheduled review
- Shows:
  - Date (large, left side)
  - Buddy avatar + name
  - Status badge: "Scheduled" / "Overdue"
  - Days until: "In 12 days"
  - "Prepare for review" button → opens checklist

**Past Reviews Section**:
- Accordion/expandable list
- Groups by quarter
- Each review shows:
  - Date completed
  - Buddy name
  - Notes summary (expandable)
  - Link to Notion page (if available)

**Empty State**:
- "No reviews scheduled yet"
- Admin action: "Talk to your admin about scheduling"

---

### 7. Profile / Settings Page

**Layout**: Tabbed interface

**Tabs**:
1. **Profile**
2. **Preferences**
3. **Notifications** (future)

#### Profile Tab
- **Avatar**: Upload/change
- **Display Name**: Editable
- **Email**: Read-only
- **Role**: Dropdown (Dev/Design/QA)
- **My Buddy**: Shows buddy's avatar + name (admin-assigned, read-only for regular users)
- **Next Review Date**: Read-only (set by admin)
- Save button

#### Preferences Tab
- **Theme**: Light / Dark / System
- **Dashboard View**: Compact / Detailed
- **Weekly Feedback Goal**: Number input (default 3)
- Save button

---

### 8. Admin Dashboard

**Layout**: Different from employee dashboard, more data-dense

**Header**:
- Title: "Admin Dashboard"
- Date range selector
- Export data button

**Stats Cards (5-across)**:
1. **Total Users** (count)
2. **Active This Week** (count + %)
3. **Total Feedback** (count + trend)
4. **Avg Per User** (number)
5. **Reviews Due** (count)

**Team Engagement Chart (Bar Chart)**:
- X-axis: Weeks
- Y-axis: Unique active users
- Shows participation trends
- Goal line overlay (e.g., 80% target)

**Feedback Distribution (Donut Chart)**:
- By role type
- Shows balance of engagement across teams
- Click slice to filter other views

**Top Contributors (Leaderboard Table)**:
- Rank | Avatar | Name | Feedback Given | Feedback Received
- Top 10
- Highlight if admin is in list
- Trophy icons for top 3

**Buddy Relationships Table**:
- Searchable/filterable
- Columns: Employee | Buddy | Next Review | Last Feedback
- Inline edit for buddy assignment
- Bulk actions: Set review dates, export

**Recent Activity Feed**:
- Real-time stream of actions:
  - "[Name] gave feedback to [Name]" (2m ago)
  - "[Name] completed a goal" (15m ago)
  - "[Name] joined Trellis" (1h ago)

---

### 9. Onboarding Flow (Admin)

**Step 1: Welcome**
- Congratulatory message: "You're the first admin!"
- Explanation of Trellis
- "Get Started" button

**Step 2: Upload Team CSV**
- Drag-and-drop area or file picker
- Download CSV template link
- Format instructions
- Preview table shows parsed data
- Validation warnings highlighted in red

**Step 3: Review & Import**
- Table showing all users to be imported
- Error summary (if any)
- Fix errors inline or re-upload
- "Import [N] Users" button

**Step 4: Success**
- Success animation
- Summary: "Imported 47 users with 23 buddy pairs"
- "Invite team to join" (email template generator)
- "Go to Dashboard" button

---

## Responsive Breakpoints

- **Desktop**: 1280px+ (full layout)
- **Tablet**: 768px - 1279px (sidebar collapses to hamburger menu)
- **Mobile**: < 768px (stacked layouts, bottom nav)

### Mobile Adaptations
- Sidebar becomes bottom nav bar (5 icons)
- Stats cards stack vertically
- Charts adapt to vertical orientation
- Forms are single column
- Tables become card lists

---

## Component Patterns

### Cards
```
- Background: White (light) / Dark-gray (dark)
- Border: 1px subtle gray
- Border-radius: 12px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)
- Hover: Slight lift + shadow increase
```

### Buttons
```
Primary:
- Background: Teal-500
- Text: White
- Hover: Teal-600
- Padding: 12px 24px
- Border-radius: 8px

Secondary:
- Background: Transparent
- Border: 1px gray
- Text: Gray-700
- Hover: Gray-100 background
```

### Badges
```
- Small pill shape
- Role badges: Color-coded by type
- Count badges: Red dot with number
- Status badges: Semantic colors
```

### Tooltips
```
- Dark background
- White text
- Small arrow pointer
- Appear on hover (300ms delay)
- Max-width: 200px
```

---

## Animations & Micro-interactions

1. **Page Transitions**: 150ms fade + slight slide up
2. **Card Hover**: 200ms lift transform + shadow
3. **Button Click**: Scale down to 0.98, bounce back
4. **Toast Notifications**: Slide in from top-right, auto-dismiss in 5s
5. **Loading States**: Skeleton screens (not spinners)
6. **Success Actions**: Confetti or checkmark animation
7. **Chart Animations**: Staggered reveal on load
8. **Number Counters**: Count-up animation on dashboard load

---

## Accessibility Considerations

- **Keyboard Navigation**: All interactive elements focusable
- **Focus Indicators**: Clear blue outline
- **ARIA Labels**: All icons have descriptive labels
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
- **Screen Reader**: Semantic HTML, proper heading hierarchy
- **Form Validation**: Clear error messages, not just color-coded
- **Skip Links**: "Skip to main content"

---

## Dark Mode Specifics

Following the Nuxt UI dark theme you liked:
- **Background**: Near-black (#0f1419)
- **Cards**: Slightly lighter gray (#1a1f24)
- **Text**: Off-white (#e6edf3)
- **Accents**: Brighter, more vibrant versions of light mode colors
- **Charts**: Line colors pop against dark background
- **Borders**: Subtle, desaturated

---

## Next Steps

1. **Create high-fidelity mockups** in Figma based on these wireframes
2. **Build component library** in Nuxt UI
3. **Prototype key flows** for user testing
4. **Iterate based on feedback** from Pocketworks team

Would you like me to create actual visual mockups for any specific screens?