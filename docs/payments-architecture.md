# Trellis Payment Architecture

## Overview

Trellis uses Stripe for payment processing with a 14-day free trial period. When a customer purchases a subscription from the marketing site, a workspace and admin user are automatically provisioned via Stripe webhooks.

**Pricing Model (MVP)**: Per-seat pricing with tiered plan extensibility
**Payment Processor**: Stripe Checkout (hosted payment flow)
**Workspace Provisioning**: Immediate (upon successful checkout)
**Trial Period**: 14 days (workspace active immediately, payment collected after trial)

## Purchase Flow

```
Marketing Site → Nuxt App (/checkout) → Create Stripe Session → Stripe Hosted Checkout
    ↓
Stripe Webhook (checkout.session.completed) → Provision Workspace + Admin User
    ↓
Success Page → User Clicks "Log In" → Google OAuth → User Linking → Dashboard
```

### Detailed Flow

1. **Marketing Site**: User clicks "Get Started" button
   - Redirects to: `app.trellis.com/checkout?plan=per_seat_starter&seats=5`

2. **Checkout Page** (`pages/checkout.vue`):
   - Displays plan details and pricing
   - Captures: email, company name, seat count
   - User clicks "Start 14-Day Trial"

3. **API Call**: `POST /api/billing/create-checkout-session`
   - Validates plan and seat count
   - Creates Stripe Checkout Session with 14-day trial
   - Stores `checkout_sessions` record in database
   - Returns Stripe Checkout URL

4. **Stripe Hosted Checkout**:
   - User enters payment details (card, billing address)
   - Stripe validates payment method
   - User completes checkout

5. **Webhook**: `POST /api/webhooks/stripe` (event: `checkout.session.completed`)
   - Verifies webhook signature
   - Checks idempotency (prevents duplicate processing)
   - **Creates workspace** with company name
   - **Creates pre-created admin user** (`emailVerified = false`)
   - **Creates subscription record** (status: `trialing`)
   - Stores payment method details
   - Sends welcome email with login link

6. **User Login**:
   - User clicks login link → Google OAuth flow
   - Better-auth **user linking** merges pre-created user with OAuth user
   - Transfers `workspaceId` to OAuth user
   - Deletes pre-created user record
   - Creates session → Redirects to dashboard

7. **Trial End** (Day 14):
   - Stripe automatically charges payment method
   - Webhook: `invoice.paid` → Updates subscription status to `active`
   - If payment fails: `invoice.payment_failed` → Subscription marked `past_due`

## Database Schema

### New Tables

**subscription_plans**: Defines available pricing tiers
- `id` (text PK): e.g., "per_seat_starter", "tier_pro"
- `billingModel`: "per_seat" or "tiered"
- Per-seat fields: `pricePerSeatMonthly`, `pricePerSeatYearly`, `minSeats`, `maxSeats`
- Tiered fields: `flatPriceMonthly`, `includedSeats`, `additionalSeatPrice`
- `features` (JSON): Feature flags for plan
- `stripePriceIdMonthly`, `stripePriceIdYearly`: Stripe Price IDs

**subscriptions**: Links workspaces to Stripe subscriptions
- `workspaceId` (FK to workspaces)
- `planId` (FK to subscription_plans)
- `stripeSubscriptionId`, `stripeCustomerId`
- `status`: "trialing", "active", "past_due", "canceled", "unpaid"
- `currentSeats`, `billingInterval` ("month" or "year")
- `currentPeriodStart`, `currentPeriodEnd`
- `trialStart`, `trialEnd`

**invoices**: Audit trail of all payments
- `subscriptionId` (FK to subscriptions)
- `workspaceId` (FK to workspaces)
- `stripeInvoiceId`, `stripeInvoiceNumber`
- `status`: "draft", "open", "paid", "void", "uncollectible"
- `amountDue`, `amountPaid`, `currency`
- `hostedInvoiceUrl`, `invoicePdfUrl`

**payment_methods**: Stored payment methods for workspaces
- `workspaceId` (FK to workspaces)
- `stripePaymentMethodId`
- `cardBrand`, `cardLast4`, `cardExpMonth`, `cardExpYear`
- `isDefault`

**webhook_events**: Idempotency + audit trail
- `stripeEventId` (unique): For idempotency checks
- `eventType`: "checkout.session.completed", "invoice.paid", etc.
- `status`: "pending", "processed", "failed"
- `attempts`, `errorMessage`
- `payload`: Full JSON event (for debugging)

**checkout_sessions**: Tracks Stripe Checkout sessions
- `stripeCheckoutSessionId`
- `planId`, `seats`, `billingInterval`
- `customerEmail`, `companyName`
- `status`: "pending", "completed", "expired"
- `workspaceId`: Linked after provisioning

### Updated Tables

**workspaces**: Add billing fields
- `stripeCustomerId` (text, unique)
- `subscriptionStatus` (varchar): "trialing", "active", "past_due", "canceled"
- `trialEndsAt` (timestamp)

## API Endpoints

### Public Endpoints

**POST /api/billing/create-checkout-session**
- Creates Stripe Checkout Session
- Input: `{ planId, seats, billingInterval, customerEmail, companyName }`
- Output: `{ checkoutUrl, sessionId }`

**POST /api/webhooks/stripe**
- Receives Stripe webhook events
- Verifies signature
- Routes to event handlers (workspace provisioning, subscription updates, payment failures)

### Admin Endpoints (Workspace Admin)

**GET /api/admin/billing/subscription**
- Returns current subscription details, payment method, recent invoices

**POST /api/admin/billing/update-seats**
- Upgrades/downgrades seat count
- Input: `{ seats }`
- Prorates immediately via Stripe

**POST /api/admin/billing/cancel-subscription**
- Cancels subscription at end of billing period

**GET /api/admin/billing/invoices**
- Lists invoice history for workspace

### Super Admin Endpoints

**GET /api/super-admin/billing/stats**
- Platform-wide billing statistics (MRR, churn, trial conversions)

## Stripe Configuration

### Environment Variables

```bash
# Stripe API keys
STRIPE_SECRET_KEY=sk_test_... (dev) or sk_live_... (prod)
STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...

# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Marketing site URL (for post-checkout redirects)
MARKETING_SITE_URL=http://localhost:3000 (dev) or https://trellis.com (prod)
```

### Stripe Setup Steps

1. **Create Products & Prices** (Stripe Dashboard → Products)
   - Create Product: "Trellis Starter"
   - Create Price: $10/seat/month (recurring, per-seat)
   - Create Price: $96/seat/year (recurring, per-seat)
   - Copy Price IDs → Store in `subscription_plans` table

2. **Create Webhook Endpoint** (Stripe Dashboard → Developers → Webhooks)
   - URL: `https://your-app.railway.app/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
   - Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

3. **Configure Subscription Settings** (Stripe Dashboard → Settings → Billing)
   - Trial period: Default 14 days
   - Payment retry logic: 3 attempts over 7 days (Stripe default)
   - Failed payment email notifications: Enabled

## Security Considerations

### Webhook Signature Verification
- **Always** verify Stripe webhook signature using `stripe.webhooks.constructEvent()`
- Reject webhooks with invalid signatures (400 error)
- Use environment-specific webhook secrets

### Idempotency
- Check `webhook_events.stripeEventId` before processing
- If `status = 'processed'`, return early (prevents duplicate workspace creation)
- Stripe may send duplicate webhooks (retries, network issues)

### Rate Limiting
- Limit checkout session creation: 10 requests/minute per IP
- No rate limiting on webhook endpoint (trusted source)

### Database Transactions
- Wrap workspace provisioning in database transaction for atomicity
- If any step fails, entire provisioning is rolled back

### Stripe Key Management
- Use test keys (`sk_test_`) for development/staging
- Use live keys (`sk_live_`) for production only
- Store in environment variables, never commit to git

## Edge Cases

### 1. Webhook Failures (Server Downtime)
- **Problem**: Server down during webhook delivery
- **Solution**: Stripe retries webhooks automatically (up to 3 days)
- **Action**: Monitor `webhook_events` table for `status = 'failed'`

### 2. Payment Declines After Trial
- **Problem**: Card declined when trial ends
- **Solution**: Subscription marked `past_due`, workspace remains active for grace period
- **Action**: Notify admin via email, give 7 days to update payment method

### 3. User Tries to Login Before Webhook Completes
- **Problem**: Race condition between webhook and user login
- **Solution**: Pre-created user exists (created by webhook), so user linking proceeds normally
- **Action**: No special handling needed (user linking system handles this)

### 4. Duplicate Checkout Sessions
- **Problem**: User clicks "back" and creates new session
- **Solution**: Each session is independent, only completed one provisions workspace
- **Action**: Track via `checkoutSessions.status`

### 5. Workspace Already Exists for Email
- **Problem**: User tries to purchase again with same email
- **Solution**: Check for existing workspace in checkout flow
- **Action**: Redirect to login or show "You already have a workspace"

## Future Extensibility: Tiered Plans

The database schema supports both **per-seat** and **tiered** pricing models.

### Per-Seat Plan (MVP)
```typescript
{
  billingModel: 'per_seat',
  pricePerSeatMonthly: 1000, // $10/seat
  minSeats: 1,
  maxSeats: null, // unlimited
  features: { customBranding: false }
}
```

### Tiered Plan (Future)
```typescript
{
  billingModel: 'tiered',
  flatPriceMonthly: 9900, // $99/month base
  includedSeats: 50, // 50 seats included
  additionalSeatPrice: 200, // $2 per extra seat
  features: { customBranding: true, advancedAnalytics: true }
}
```

### Feature Gating
Check `subscription.plan.features` JSON to enable/disable features:
```typescript
const features = JSON.parse(subscription.plan.features);
if (!features.advancedAnalytics) {
  throw createError({ statusCode: 403, message: 'Upgrade required' });
}
```

## Testing Strategy

### Development Testing (Stripe Test Mode)
1. Use test credit cards: `4242 4242 4242 4242` (Visa)
2. Test declined cards: `4000 0000 0000 0002` (generic decline)
3. Use Stripe CLI for webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Staging Testing
1. Create test subscriptions in Stripe Dashboard
2. Manually trigger webhooks using Stripe Dashboard → Events → Resend
3. Verify workspace provisioning end-to-end

### Production Monitoring
1. Set up Stripe webhook monitoring (Stripe Dashboard → Events)
2. Monitor `webhook_events` table for failed events
3. Alert on subscription status changes (`past_due`, `canceled`)

## Implementation Checklist

- [ ] Add billing tables to `schema.ts`
- [ ] Create database migration
- [ ] Seed default subscription plans
- [ ] Create Stripe Products & Prices in Stripe Dashboard
- [ ] Implement `POST /api/billing/create-checkout-session`
- [ ] Implement `POST /api/webhooks/stripe` with all event handlers
- [ ] Implement admin billing management endpoints
- [ ] Create checkout page (`pages/checkout.vue`)
- [ ] Create success page (`pages/checkout/success.vue`)
- [ ] Add Stripe environment variables to Railway
- [ ] Configure Stripe webhook endpoint
- [ ] Add subscription status banner to dashboard (trial countdown)
- [ ] Test end-to-end flow in development
- [ ] Test webhook idempotency
- [ ] Deploy to staging and test with test cards
- [ ] Configure production Stripe keys and webhook

## Critical Files

**Backend:**
- `server/database/schema.ts` - Add billing tables
- `server/utils/stripe.ts` - Stripe SDK initialization
- `server/api/webhooks/stripe.post.ts` - Webhook handler (MOST CRITICAL)
- `server/api/billing/create-checkout-session.post.ts` - Checkout session creation
- `server/api/admin/billing/subscription.get.ts` - View subscription
- `server/api/admin/billing/update-seats.post.ts` - Update seat count
- `server/api/admin/billing/cancel-subscription.post.ts` - Cancel subscription

**Frontend:**
- `pages/checkout.vue` - Checkout page with plan selection
- `pages/checkout/success.vue` - Post-purchase success page
- `components/SubscriptionBanner.vue` - Trial countdown banner
- `components/admin/BillingSettings.vue` - Admin billing management UI

**Deployment:**
- `.env.example` - Add Stripe environment variables
- `server/database/migrations/00XX_add_billing_tables.sql` - Database migration
