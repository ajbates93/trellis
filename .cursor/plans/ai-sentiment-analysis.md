# AI-Driven Feedback Sentiment Analysis

## Overview

Add intelligent feedback analysis to automatically identify recurring themes in user feedback and suggest relevant goals based on patterns.

**Status:** 📋 Planned (Blocked by: Goals Management - Phase 4)
**Estimated Effort:** 3-4 days (Balanced approach)
**Priority:** High - Differentiating feature for Cohort

---

## The Problem

Users receive dozens of pieces of feedback over time. Without analysis, it's difficult to:
- Identify recurring themes (e.g., "communication skills" mentioned 8 times)
- Spot areas for improvement that multiple people have flagged
- Set meaningful goals based on actual feedback patterns
- Track improvement over time

**Manual analysis is time-consuming and subjective. AI can automate this.**

---

## User Experience

### Dashboard/Inbox - Insights Card

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Feedback Insights                                    │
│                                                         │
│ Based on 28 pieces of feedback received:               │
│                                                         │
│ 🔍 Common Themes:                                      │
│   • Client Communication (mentioned 8×) 🔴             │
│   • Technical Documentation (mentioned 5×) 🟡          │
│   • Code Review Feedback (mentioned 4×) 🟢             │
│                                                         │
│ 💭 Suggested Goal:                                     │
│ ┌─────────────────────────────────────────────────┐   │
│ │ We've noticed feedback around Client             │   │
│ │ Communication Skills. Consider setting a goal    │   │
│ │ to improve this area.                            │   │
│ │                                                  │   │
│ │ [Create Goal] [Dismiss]                          │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Last analyzed: 2 days ago                              │
│ [🔄 Refresh Insights]                                   │
└─────────────────────────────────────────────────────────┘
```

### When New Feedback Arrives

```
┌─────────────────────────────────────────────────────────┐
│ 💡 Feedback Insights                                    │
│                                                         │
│ [Shows cached results from 2 days ago]                 │
│                                                         │
│ 🆕 5 new pieces of feedback since last analysis        │
│    [Analyze Now]                                        │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture

### Core Challenge: Freshness vs. Cost vs. Performance

**Chosen Solution: Event-Driven Hybrid with Smart Caching**

- ✅ Fast page loads (show cached results)
- ✅ Consistent results (no variation on each load)
- ✅ Controlled costs (trigger only when needed)
- ✅ Good UX with freshness indicators

### When Does Analysis Happen?

**Automatic Triggers:**
1. **Weekly scheduled job** - Railway Cron runs nightly, analyzes users with 5+ new feedback
2. **After significant feedback accumulation** - When user receives 5+ new pieces since last analysis

**Manual Trigger:**
3. **User clicks "Refresh Insights"** - Rate limited to 1× per day per user

---

## Database Schema

### New Table: `feedback_insights`

```typescript
{
  id: uuid (PK)
  user_id: uuid (FK to users) - indexed
  analysis_date: timestamp - indexed
  feedback_analyzed_count: int
  feedback_ids: uuid[] // Array of feedback IDs included in this analysis

  themes: jsonb
  // Structure:
  // [
  //   {
  //     theme: "Client Communication",
  //     count: 8,
  //     sentiment: "needs_improvement", // positive/neutral/needs_improvement
  //     confidence: 0.85,
  //     feedback_ids: [uuid, uuid, ...],
  //     keywords: ["communication", "client", "meetings", "updates"]
  //   }
  // ]

  suggested_goals: jsonb
  // Structure:
  // [
  //   {
  //     goal_text: "Improve client communication by providing more frequent project updates",
  //     confidence: 0.85,
  //     based_on_theme: "Client Communication",
  //     dismissed: false,
  //     acted_upon: false,
  //     created_goal_id: uuid | null
  //   }
  // ]

  status: enum ('pending', 'completed', 'failed')
  llm_model: string // e.g., "claude-3-5-haiku-20250219"
  error_message: text | null

  created_at: timestamp
  updated_at: timestamp
}

// Indexes
CREATE INDEX idx_feedback_insights_user_id ON feedback_insights(user_id);
CREATE INDEX idx_feedback_insights_created_at ON feedback_insights(created_at);
```

### Additions to Existing Tables

```typescript
// users table
users {
  ...existing fields
  last_insights_date: timestamp | null
  insights_count: int (default 0)
}

// feedback table
feedback {
  ...existing fields
  included_in_insights: boolean (default false)
  insight_id: uuid | null (FK to feedback_insights)
}
```

---

## Implementation Plan (3-4 Days)

### Day 1: Database & Core Structure

**Tasks:**
1. Create database migration for `feedback_insights` table
2. Add new columns to `users` and `feedback` tables
3. Update Drizzle schema definitions
4. Run migrations on development database
5. Create TypeScript types for insights data structures

**Deliverables:**
- `/server/database/migrations/XXXX_add_feedback_insights.ts`
- Updated `/server/database/schema.ts`
- Type definitions in place

---

### Day 2: LLM Analysis Service

**Tasks:**
1. Create `/server/services/feedbackAnalysis.ts`:
   - LLM client setup (start with Claude 3.5 Haiku for cost/quality balance)
   - Fallback to Gemini Flash if budget is tight
   - Prompt engineering for theme extraction
   - JSON response parsing
   - Error handling & retries

2. Create API endpoint: `POST /api/feedback/analyze`
   - Check authentication
   - Rate limiting (1 analysis per user per day for manual triggers)
   - Check if recent analysis exists (<24 hours)
   - If exists, return cached results
   - If not, trigger new analysis
   - Return status: "cached" | "analyzing" | "completed"

3. Create API endpoint: `GET /api/feedback/insights`
   - Fetch most recent insights for authenticated user
   - Include metadata: last analysis date, feedback count, etc.

4. Create API endpoint: `PATCH /api/feedback/insights/[id]/dismiss`
   - Mark suggested goal as dismissed
   - Don't show same suggestion for 30 days

**Deliverables:**
- `/server/services/feedbackAnalysis.ts` - LLM integration
- `/server/api/feedback/analyze.post.ts` - Trigger analysis
- `/server/api/feedback/insights.get.ts` - Fetch insights
- `/server/api/feedback/insights/[id]/dismiss.patch.ts` - Dismiss suggestion

**LLM Prompt Structure:**

```typescript
const prompt = `Analyze the following feedback received by an employee and identify:

1. **Recurring Themes** (top 3-5 themes):
   - Theme name (2-4 words)
   - Count (how many feedback items mention this)
   - Sentiment (positive, neutral, needs_improvement)
   - Confidence score (0.0-1.0)
   - Key keywords associated with theme

2. **Suggested Goals** (1-2 actionable goals):
   - Specific, actionable goal text (1-2 sentences)
   - Which theme it addresses
   - Confidence score (0.0-1.0)

3. **Overall Sentiment**:
   - positive | neutral | constructive | mixed

Return ONLY valid JSON matching this schema:
{
  "themes": [
    {
      "theme": "Client Communication",
      "count": 8,
      "sentiment": "needs_improvement",
      "confidence": 0.85,
      "keywords": ["communication", "client", "updates", "meetings"]
    }
  ],
  "suggested_goals": [
    {
      "goal_text": "Improve client communication by scheduling weekly update meetings",
      "based_on_theme": "Client Communication",
      "confidence": 0.80
    }
  ],
  "overall_sentiment": "constructive"
}

Feedback items (${feedbackCount}):
${feedbackItems.map((f, i) => `${i + 1}. "${f.content}"`).join('\n')}

Return JSON:`;
```

---

### Day 3: Background Job & Railway Cron

**Tasks:**
1. Create `/server/cron/analyze-feedback.ts`:
   - Find users with 5+ new feedback since last analysis
   - Batch process (max 10 users per run to control costs)
   - Call `feedbackAnalysis.ts` service for each user
   - Store results in `feedback_insights` table
   - Update `users.last_insights_date`
   - Mark feedback as `included_in_insights = true`
   - Log results to console

2. Configure Railway Cron:
   - Create `railway.toml` (if doesn't exist)
   - Add cron job configuration
   - Schedule: Daily at 2 AM UTC (off-peak)

3. Create manual test script:
   - `/server/scripts/test-analysis.ts`
   - Manually trigger analysis for a specific user
   - Useful for development/testing

**Deliverables:**
- `/server/cron/analyze-feedback.ts` - Nightly job
- `railway.toml` - Cron configuration
- `/server/scripts/test-analysis.ts` - Testing utility

**Railway Cron Configuration:**

```toml
# railway.toml
[[crons]]
name = "analyze-feedback"
schedule = "0 2 * * *"  # Daily at 2 AM UTC
command = "node --loader ts-node/esm server/cron/analyze-feedback.ts"
```

---

### Day 4: UI Components & Integration

**Tasks:**
1. Create `/app/components/FeedbackInsights.vue`:
   - Fetch insights on mount
   - Display themes with count badges
   - Show suggested goal banner with actions
   - "Last analyzed: X days ago" indicator
   - Manual "Refresh Insights" button (with rate limit feedback)
   - Loading states (skeleton while fetching)
   - Empty state (not enough feedback yet)
   - Error state (analysis failed)

2. Integrate into Dashboard (`/app/pages/index.vue`):
   - Add `<FeedbackInsights />` component below stats cards
   - Show badge: "New feedback - refresh insights" when applicable

3. Integrate into Inbox (`/app/pages/feedback/inbox.vue`):
   - Add insights panel to "Received" tab
   - Collapsible section to save space

4. Connect to Goals:
   - "Create Goal" button opens goals page with pre-filled text
   - Pass suggested goal text via route query params
   - Goals page accepts `?suggested=true&text=...` params
   - Mark suggestion as `acted_upon` when goal is created

5. Polish UI/UX:
   - Add loading spinners for "Analyze Now" button
   - Show toast notifications on success/error
   - Add subtle animations for theme cards
   - Theme badges with color coding (red/yellow/green based on sentiment)

**Deliverables:**
- `/app/components/FeedbackInsights.vue` - Main insights component
- Updated `/app/pages/index.vue` - Dashboard integration
- Updated `/app/pages/feedback/inbox.vue` - Inbox integration
- Updated `/app/pages/goals.vue` - Accept pre-filled suggestions

---

## Cost Management

### Rate Limiting Strategy

```typescript
// Manual trigger rate limit: 1× per user per day
// Automatic trigger threshold: 5+ new feedback items
// Nightly job batch size: Max 10 users per run

// Estimated costs with Claude 3.5 Haiku:
// - Input: ~$0.25 per 1M tokens
// - Output: ~$1.25 per 1M tokens
// - Avg feedback analysis: ~2,000 input tokens + 500 output tokens
// - Cost per analysis: ~$0.001
// - 50 active users × 2 analyses/month = $0.10/month

// Scale to 500 users: ~$1/month
// Scale to 5,000 users: ~$10/month
```

### LLM Provider Selection

**Primary: Claude 3.5 Haiku**
- Excellent quality-to-cost ratio
- JSON mode native support
- Fast response times (~2-3s)
- Cost: ~$0.001 per analysis

**Fallback: Gemini 1.5 Flash**
- Even cheaper (~$0.0005 per analysis)
- Good for high volume
- Use if budget becomes concern

**Configuration:**
```typescript
// Environment variables
LLM_PROVIDER=claude // or 'gemini'
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_AI_API_KEY=xxx
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/feedback/analyze` | POST | Required | Trigger analysis (rate limited) |
| `/api/feedback/insights` | GET | Required | Fetch cached insights |
| `/api/feedback/insights/[id]/dismiss` | PATCH | Required | Dismiss suggested goal |
| `/api/feedback/insights/[id]/act` | PATCH | Required | Mark suggestion acted upon |

---

## Testing Strategy

### Unit Tests
- `feedbackAnalysis.ts` - Mock LLM responses
- Theme extraction accuracy
- JSON parsing edge cases

### Integration Tests
- Full analysis flow with test data
- Rate limiting enforcement
- Caching behavior

### Manual Testing Checklist
- [ ] Analyze with 5 feedback items - should identify 1-2 themes
- [ ] Analyze with 20 feedback items - should identify 3-5 themes
- [ ] Rate limit: Try analyzing twice in same day (should block)
- [ ] Suggested goal creation flow (click → pre-fill → save)
- [ ] Dismiss suggestion (should not reappear)
- [ ] New feedback badge appears after 5+ new items
- [ ] Loading states work correctly
- [ ] Error handling (invalid LLM response, API timeout)

---

## Future Enhancements (Phase 2)

### Trend Analysis Over Time
- Compare current analysis to previous months
- Show improvement indicators: "Client communication mentions down 40% 📉"
- Line chart of theme evolution over time

### Advanced Features
- **Sentiment scoring** - Overall positivity/negativity trend
- **Peer comparison** - "75% of developers receive feedback on documentation"
- **Email notifications** - Weekly digest with insights
- **AI-powered buddy matching** - Suggest buddy changes based on feedback patterns
- **Network analysis** - Who gives most useful feedback? Who needs more feedback?

### Real-time Streaming
- Use Server-Sent Events (SSE) to stream LLM response
- Show "Analyzing... 45% complete" progress bar
- Better UX for manual "Analyze Now" trigger

---

## Success Metrics

**Engagement:**
- % of users who click "Refresh Insights" at least once
- % of users who create goals from suggestions
- Average time spent viewing insights

**Quality:**
- User feedback on insight accuracy (thumbs up/down)
- % of suggested goals that are acted upon
- % of suggestions that are dismissed

**Technical:**
- Average analysis time (<10 seconds target)
- LLM API cost per user per month (<$0.05 target)
- Error rate (<5% target)

---

## Dependencies

**Blocked by:**
- ✅ Feedback system (Phase 3) - COMPLETE
- ⏳ Goals management (Phase 4) - PENDING

**Blocks:**
- Nothing - this is an enhancement feature

**Required Services:**
- Anthropic API account (or Google AI for Gemini)
- Railway Cron capability (included in Railway hobby plan)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| High LLM costs | Rate limiting + batch processing + cheap model (Haiku/Flash) |
| Poor theme detection | Prompt engineering iteration + user feedback loop |
| Analysis takes too long | Background processing + caching + show stale results |
| Users ignore suggestions | A/B test messaging + gamification (badges for acting on insights) |
| Privacy concerns | Make it opt-in + clear data usage explanation + ability to delete insights |

---

## Launch Plan

1. **Soft launch** - Enable for 5-10 internal users first
2. **Gather feedback** - Iterate on prompt and UI based on real usage
3. **Full rollout** - Enable for all Pocketworks users
4. **Monitor costs** - Track LLM API usage and adjust if needed
5. **Iterate** - Add trend analysis and advanced features in Phase 2

---

## Questions for Stakeholders

- [ ] Should insights be visible to buddies? (Could help them give more targeted feedback)
- [ ] Should we notify users when new insights are available? (Email/in-app)
- [ ] Do we want admin-level insights? (Team-wide patterns, engagement metrics)
- [ ] Privacy: Should users be able to opt-out of AI analysis?
- [ ] Branding: How should we position this feature? (AI-powered? Smart insights? Feedback intelligence?)
