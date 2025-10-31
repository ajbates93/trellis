# Multi-Tenancy SaaS Architecture Plan

**Last Updated:** 2025-10-31
**Status:** Planning Phase
**Target Implementation:** Phase 11 (Future Enhancements)

## Executive Summary

This document outlines the strategy for transforming Cohort from a single-tenant internal tool (Pocketworks) into a multi-tenant B2B SaaS platform. The architecture uses subdomain-based tenant identification (`company.cohort.com`), a shared PostgreSQL database with Row-Level Security (RLS), and per-tenant OAuth configuration.

## Architecture Decisions

### 1. Tenant Access Model: Subdomain-Based ✅

**Decision:** Primary access via subdomains (`pocketworks.cohort.com`, `microsoft.cohort.com`)

**Rationale:**
- **B2B Best Practice**: Matches industry standards (Slack, Linear, Height, Basecamp)
- **Professional Branding**: Each company gets their own branded space
- **Clear Mental Model**: Teams think "our feedback platform"
- **Enterprise Ready**: Large customers expect this level of separation
- **Custom Domains**: Easy to add CNAMEs later (`feedback.pocketworks.com`)
- **Simpler Auth Flow**: One subdomain = one tenant = one OAuth config
- **Security**: Reduces risk of users seeing wrong tenant's data

**Phase 2 Enhancement:** Add workspace switcher for users invited to multiple tenants (like GitHub's organization dropdown)

### 2. Database Architecture: Shared Database with tenant_id ✅

**Decision:** Single PostgreSQL instance, all tenants share tables, filtered by `tenant_id` column + RLS

**Database Pattern:**
```sql
-- Every table includes tenant_id
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email TEXT NOT NULL,
  name TEXT,
  ...
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- PostgreSQL Row-Level Security enforces isolation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Benefits:**
- **Cost Effective**: One database serves 100s-1000s of tenants
- **Simple Operations**: Single backup, single migration process
- **Performance**: Shared connection pool, efficient resource usage
- **SQL-Level Safety**: RLS prevents cross-tenant data leakage even if application code has bugs
- **Scalable**: Can handle mix of small (5 users) to large (200 users) tenants

**Escape Hatch (Enterprise):**
- If a large customer pays premium, migrate their data to dedicated database
- Architecture supports this future flexibility
- Example: Enterprise customer on `bigcorp.cohort.com` → dedicated DB instance

**vs. Other Options:**
- ❌ **Separate DB per tenant**: Too expensive, hard to manage 100s of databases
- ❌ **Separate schema per tenant**: Better isolation but limits to ~10s of tenants, complex migrations
- ✅ **Shared with tenant_id + RLS**: Industry standard for B2B SaaS serving 100s of customers

### 3. Authentication: Per-Tenant OAuth Configuration ✅

**Decision:** Each tenant configures their own OAuth provider during onboarding

**Supported Providers (Phase 1):**
1. Google Workspace OAuth
2. Microsoft Entra (Azure AD)
3. Okta (Enterprise)

**Onboarding Flow:**
```
1. Admin visits cohort.com/signup
   ↓
2. Enter company name → auto-generate subdomain
   (e.g., "Pocketworks" → pocketworks.cohort.com)
   ↓
3. Choose OAuth provider (Google/Microsoft/Okta)
   ↓
4. Configure OAuth credentials:
   - Client ID
   - Client Secret (encrypted at rest)
   - Tenant ID (for Azure AD)
   - Allowed email domains (@pocketworks.co.uk)
   ↓
5. First successful login → user becomes admin
   ↓
6. Admin invites team (CSV import or manual)
```

**Technical Implementation:**
- Better-auth supports dynamic OAuth configuration
- Credentials stored encrypted in `tenants.oauth_*` columns
- Nitro plugin loads tenant config based on subdomain
- Each tenant gets unique callback URL: `{subdomain}.cohort.com/api/auth/callback/{provider}`

**Example Tenants:**
- **Pocketworks**: Google OAuth, `@pocketworks.co.uk` only
- **Microsoft**: Microsoft Entra, `@microsoft.com` only
- **Startup Inc**: Google OAuth, `@startupinc.io` + `@startupinc.com`

---

## Database Schema Changes

### New Tables

#### `tenants` Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT UNIQUE NOT NULL,          -- 'pocketworks', 'microsoft'
  name TEXT NOT NULL,                       -- 'Pocketworks', 'Microsoft Corporation'
  custom_domain TEXT UNIQUE,                -- Optional: 'feedback.pocketworks.com'

  -- Subscription & Limits
  plan_type TEXT NOT NULL DEFAULT 'free',  -- 'free', 'pro', 'enterprise'
  max_users INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at TIMESTAMP,

  -- OAuth Configuration
  oauth_provider TEXT NOT NULL,             -- 'google', 'microsoft', 'okta'
  oauth_client_id TEXT NOT NULL,
  oauth_client_secret TEXT NOT NULL,        -- AES-256 encrypted
  oauth_tenant_id TEXT,                     -- For Azure AD multi-tenant apps
  allowed_email_domains TEXT[] NOT NULL,    -- ['@pocketworks.co.uk']

  -- Branding & Settings
  logo_url TEXT,
  primary_color TEXT,                       -- Hex color for branding
  settings JSONB DEFAULT '{}',              -- Flexible config storage

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id UUID                   -- First admin who created tenant
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;
```

#### `tenant_invitations` Table
```sql
CREATE TABLE tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by_user_id UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,               -- Secure random token for invitation link
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_pending_invitation UNIQUE (tenant_id, email)
);

CREATE INDEX idx_tenant_invitations_token ON tenant_invitations(token);
CREATE INDEX idx_tenant_invitations_tenant ON tenant_invitations(tenant_id);
```

### Modified Tables (Add tenant_id)

All existing tables need `tenant_id` column:

```sql
-- users table
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
ALTER TABLE users ADD CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email);

-- feedback table
ALTER TABLE feedback ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_feedback_tenant ON feedback(tenant_id);

-- goals table
ALTER TABLE goals ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_goals_tenant ON goals(tenant_id);

-- goal_notes table
ALTER TABLE goal_notes ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_goal_notes_tenant ON goal_notes(tenant_id);

-- review_schedules table
ALTER TABLE review_schedules ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_review_schedules_tenant ON review_schedules(tenant_id);

-- onboarding_imports table
ALTER TABLE onboarding_imports ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
CREATE INDEX idx_onboarding_imports_tenant ON onboarding_imports(tenant_id);

-- feedback_prompts table (if shared across tenants, skip this)
-- OR make prompts tenant-specific for customization
ALTER TABLE feedback_prompts ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_feedback_prompts_tenant ON feedback_prompts(tenant_id);
```

### Row-Level Security (RLS) Policies

**Enable RLS on all tenant-scoped tables:**

```sql
-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_admin_all_access_users ON users
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::UUID
    AND current_setting('app.is_admin', true)::BOOLEAN = true
  );

-- Feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_feedback ON feedback
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Goals table
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_goals ON goals
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Goal notes table
ALTER TABLE goal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_goal_notes ON goal_notes
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Review schedules table
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_review_schedules ON review_schedules
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Onboarding imports table
ALTER TABLE onboarding_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_onboarding_imports ON onboarding_imports
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
```

**How RLS Works:**
1. Nitro plugin sets PostgreSQL session variable: `SET app.current_tenant_id = '<uuid>'`
2. All queries automatically filtered by RLS policy
3. Even if application code forgets `WHERE tenant_id = ?`, PostgreSQL enforces it
4. Prevents entire class of data leakage bugs

---

## Technical Implementation

### 1. Tenant Detection (Nitro Plugin)

**File:** `server/plugins/tenant.ts`

```typescript
import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import { db } from '../db'
import { tenants } from '../db/schema'
import { eq, or } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    // Skip for health checks, static assets
    if (event.path.startsWith('/_nuxt') || event.path === '/health') {
      return
    }

    // Extract hostname
    const hostname = getRequestHost(event, { xForwardedHost: true })

    // Parse subdomain or custom domain
    // Examples:
    // - pocketworks.cohort.com → subdomain = 'pocketworks'
    // - feedback.pocketworks.com → custom_domain = 'feedback.pocketworks.com'
    // - localhost:3000 → subdomain = 'app' (default for dev)

    let subdomain: string
    let customDomain: string | null = null

    if (hostname.includes('cohort.com')) {
      subdomain = hostname.split('.')[0]
    } else if (hostname === 'localhost' || hostname.startsWith('localhost:')) {
      subdomain = 'app' // Default tenant for local development
    } else {
      // Custom domain (e.g., feedback.pocketworks.com)
      customDomain = hostname
      subdomain = '' // Will lookup by custom_domain
    }

    // Look up tenant by subdomain or custom domain
    const tenant = await db.query.tenants.findFirst({
      where: customDomain
        ? eq(tenants.custom_domain, customDomain)
        : eq(tenants.subdomain, subdomain)
    })

    if (!tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found',
        message: `No tenant found for ${customDomain || subdomain}`
      })
    }

    if (!tenant.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Tenant suspended',
        message: 'This workspace has been suspended. Please contact support.'
      })
    }

    // Set PostgreSQL session variables for RLS
    await db.execute(sql`SET app.current_tenant_id = ${tenant.id}`)

    // Attach tenant to event context for application code
    event.context.tenant = tenant

    console.log(`[Tenant] ${tenant.name} (${tenant.subdomain})`)
  })
})
```

### 2. Database Helpers with Automatic Tenant Scoping

**File:** `server/utils/tenant.ts`

```typescript
import type { H3Event } from 'h3'
import type { Tenant } from '../db/schema'

/**
 * Get current tenant from request context
 */
export function getTenant(event: H3Event): Tenant {
  const tenant = event.context.tenant

  if (!tenant) {
    throw createError({
      statusCode: 500,
      message: 'Tenant context not found. This should never happen.'
    })
  }

  return tenant
}

/**
 * Get current tenant ID (convenience function)
 */
export function getTenantId(event: H3Event): string {
  return getTenant(event).id
}

/**
 * Check if tenant plan allows feature
 */
export function checkTenantFeature(
  tenant: Tenant,
  feature: 'custom_domain' | 'advanced_analytics' | 'sso' | 'api_access'
): boolean {
  const featuresByPlan = {
    free: [],
    pro: ['custom_domain', 'advanced_analytics'],
    enterprise: ['custom_domain', 'advanced_analytics', 'sso', 'api_access']
  }

  return featuresByPlan[tenant.plan_type]?.includes(feature) ?? false
}

/**
 * Check if tenant has reached user limit
 */
export async function checkTenantUserLimit(event: H3Event): Promise<boolean> {
  const tenant = getTenant(event)

  const userCount = await db
    .select({ count: sql`count(*)` })
    .from(users)
    .where(eq(users.tenant_id, tenant.id))
    .then(result => Number(result[0].count))

  return userCount >= tenant.max_users
}
```

### 3. Modified API Routes (Example)

**File:** `server/api/feedback/index.post.ts`

```typescript
import { db } from '~/server/db'
import { feedback } from '~/server/db/schema'
import { getTenantId, getTenant } from '~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const tenantId = getTenantId(event)

  const body = await readBody(event)

  // Validate reviewee belongs to same tenant (security check)
  const reviewee = await db.query.users.findFirst({
    where: and(
      eq(users.id, body.revieweeId),
      eq(users.tenant_id, tenantId) // Ensures user can't review someone from another tenant
    )
  })

  if (!reviewee) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Insert feedback with tenant_id
  await db.insert(feedback).values({
    tenant_id: tenantId, // Always include tenant_id
    reviewer_id: session.user.id,
    reviewee_id: body.revieweeId,
    content: body.content,
    week_year: getCurrentWeek()
  })

  return { success: true }
})
```

**Pattern for all API routes:**
1. Extract `tenantId` using `getTenantId(event)`
2. Always include `tenant_id` in INSERT queries
3. RLS automatically filters SELECT queries, but explicit WHERE clause is good practice
4. Validate all foreign key relationships within same tenant

### 4. Dynamic OAuth Configuration

**File:** `server/utils/auth.ts` (Modified)

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Tenant } from '../db/schema'

/**
 * Create Better Auth instance with tenant-specific OAuth config
 */
export function createAuthForTenant(tenant: Tenant) {
  const config: any = {
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { /* ... */ }
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 // Update every day
    },
    socialProviders: {}
  }

  // Configure OAuth provider based on tenant settings
  switch (tenant.oauth_provider) {
    case 'google':
      config.socialProviders.google = {
        clientId: tenant.oauth_client_id,
        clientSecret: decryptSecret(tenant.oauth_client_secret),
        allowedDomains: tenant.allowed_email_domains,
        redirectURI: `https://${tenant.subdomain}.cohort.com/api/auth/callback/google`
      }
      break

    case 'microsoft':
      config.socialProviders.microsoft = {
        clientId: tenant.oauth_client_id,
        clientSecret: decryptSecret(tenant.oauth_client_secret),
        tenant: tenant.oauth_tenant_id, // Azure AD tenant
        redirectURI: `https://${tenant.subdomain}.cohort.com/api/auth/callback/microsoft`
      }
      break

    case 'okta':
      config.socialProviders.okta = {
        clientId: tenant.oauth_client_id,
        clientSecret: decryptSecret(tenant.oauth_client_secret),
        issuer: tenant.settings.okta_issuer, // From tenant settings JSONB
        redirectURI: `https://${tenant.subdomain}.cohort.com/api/auth/callback/okta`
      }
      break
  }

  return betterAuth(config)
}

/**
 * Decrypt OAuth client secret (AES-256-GCM)
 */
function decryptSecret(encryptedSecret: string): string {
  const key = process.env.ENCRYPTION_KEY!
  // Implementation: AES-256-GCM decryption
  // Store IV + auth tag + ciphertext in encryptedSecret
  return decrypt(encryptedSecret, key)
}
```

**File:** `server/api/auth/[...].ts` (Modified)

```typescript
import { createAuthForTenant } from '~/server/utils/auth'
import { getTenant } from '~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const tenant = getTenant(event)
  const auth = createAuthForTenant(tenant)

  return auth.handler(event)
})
```

### 5. Frontend Subdomain Detection

**File:** `composables/useTenant.ts`

```typescript
export function useTenant() {
  const tenant = useState<Tenant | null>('tenant', () => null)

  async function loadTenant() {
    // Extract subdomain from window.location
    const hostname = window.location.hostname
    const subdomain = hostname.split('.')[0]

    // Fetch tenant info (for branding, features, etc.)
    const data = await $fetch('/api/tenant/info')
    tenant.value = data
  }

  return {
    tenant: readonly(tenant),
    loadTenant,
    subdomain: computed(() => tenant.value?.subdomain),
    isPro: computed(() => tenant.value?.plan_type === 'pro'),
    isEnterprise: computed(() => tenant.value?.plan_type === 'enterprise')
  }
}
```

**File:** `app.vue` (Modified)

```vue
<script setup lang="ts">
const { loadTenant, tenant } = useTenant()

onMounted(() => {
  loadTenant()
})
</script>

<template>
  <NuxtLayout>
    <!-- Apply tenant branding -->
    <div :style="{ '--primary-color': tenant?.primary_color }">
      <NuxtPage />
    </div>
  </NuxtLayout>
</template>
```

---

## Migration Strategy

### Phase 1: Prepare Database (Non-Breaking)

**Goal:** Add multi-tenancy schema without breaking existing app

1. **Create `tenants` table**
   ```bash
   npm run db:migrate -- create-tenants-table
   ```

2. **Add default tenant** (Pocketworks)
   ```sql
   INSERT INTO tenants (id, subdomain, name, plan_type, oauth_provider, oauth_client_id, oauth_client_secret, allowed_email_domains)
   VALUES (
     gen_random_uuid(),
     'app', -- Use 'app' for existing deployment
     'Pocketworks',
     'enterprise',
     'google',
     '<existing_client_id>',
     '<encrypted_existing_secret>',
     ARRAY['@pocketworks.co.uk']
   );
   ```

3. **Add `tenant_id` columns** (nullable at first)
   ```sql
   ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
   -- Repeat for all tables
   ```

4. **Backfill existing data**
   ```sql
   UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'app');
   UPDATE feedback SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'app');
   UPDATE goals SET tenant_id = (SELECT id FROM tenants WHERE subdomain = 'app');
   -- Repeat for all tables
   ```

5. **Make `tenant_id` NOT NULL**
   ```sql
   ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
   -- Repeat for all tables
   ```

6. **Add indexes**
   ```sql
   CREATE INDEX idx_users_tenant ON users(tenant_id);
   -- Repeat for all tables
   ```

**Test:** Existing app continues working exactly as before

### Phase 2: Enable Tenant Detection

**Goal:** Add Nitro plugin, test with subdomain routing

1. **Create Nitro plugin** (`server/plugins/tenant.ts`)
2. **Update API routes** to use `getTenantId(event)`
3. **Deploy to staging**
4. **Test:**
   - `app.cohort.com` → loads Pocketworks tenant
   - `pocketworks.cohort.com` → loads Pocketworks tenant
   - All existing functionality works

**Rollback Plan:** Remove plugin if issues arise

### Phase 3: Enable RLS (Gradual)

**Goal:** Add Row-Level Security for defense-in-depth

1. **Enable RLS on one table** (e.g., `feedback`)
   ```sql
   ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation_feedback ON feedback
     USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);
   ```

2. **Test thoroughly** - ensure no queries break
3. **Gradually enable on remaining tables**
4. **Monitor query performance** (RLS adds minimal overhead)

### Phase 4: Multi-Tenant Onboarding

**Goal:** Allow new tenants to sign up

1. **Build signup flow** (`/signup` page)
2. **Create tenant onboarding API** (`/api/tenant/create`)
3. **Implement OAuth credential encryption**
4. **Build tenant admin dashboard** (manage OAuth, branding, billing)
5. **Test with second tenant** (e.g., internal test company)
6. **Launch beta** (invite friendly customers)

### Phase 5: Billing Integration

**Goal:** Monetize with Stripe/Paddle

1. **Integrate Stripe/Paddle**
2. **Add subscription management**
3. **Implement usage limits** (max users per plan)
4. **Build upgrade flow** (Free → Pro → Enterprise)

---

## Code Changes Required

### New Files to Create

1. **Database Schema:**
   - `server/db/migrations/001_add_tenants_table.sql`
   - `server/db/migrations/002_add_tenant_id_columns.sql`
   - `server/db/migrations/003_enable_rls.sql`

2. **Server Plugins:**
   - `server/plugins/tenant.ts` (tenant detection)

3. **Utilities:**
   - `server/utils/tenant.ts` (tenant helpers)
   - `server/utils/encryption.ts` (OAuth secret encryption/decryption)

4. **API Routes:**
   - `server/api/tenant/info.get.ts` (get current tenant)
   - `server/api/tenant/create.post.ts` (signup flow)
   - `server/api/tenant/settings.patch.ts` (update branding/OAuth)

5. **Frontend:**
   - `pages/signup.vue` (tenant onboarding)
   - `pages/admin/tenant-settings.vue` (tenant admin dashboard)
   - `composables/useTenant.ts` (tenant context)

### Files to Modify

1. **Server:**
   - `server/utils/auth.ts` (dynamic OAuth config)
   - `server/db/schema.ts` (add tenant_id to tables)
   - All `server/api/**/*.ts` files (add tenant scoping)

2. **Frontend:**
   - `app.vue` (load tenant context)
   - `layouts/default.vue` (apply tenant branding)
   - `middleware/admin.ts` (check tenant admin vs platform admin)

---

## Pricing Model

### Free Tier
- **Price:** $0/month
- **Limits:**
  - Up to 10 users
  - 100 feedback submissions/month
  - Basic analytics
- **Features:**
  - Google OAuth only
  - Email support (48h response)
  - Community resources

### Pro Tier
- **Price:** $99/month (or $79/month billed annually)
- **Limits:**
  - Up to 50 users ($2/user/month)
  - Unlimited feedback
  - Advanced analytics
- **Features:**
  - Google + Microsoft OAuth
  - Custom branding (logo, colors)
  - Email support (24h response)
  - Data export
  - 90-day data retention

### Enterprise Tier
- **Price:** Custom (starts at $499/month)
- **Limits:**
  - Unlimited users
  - Unlimited feedback
  - Full analytics suite
- **Features:**
  - All Pro features
  - Okta/SSO (SAML)
  - Custom domain (`feedback.company.com`)
  - Dedicated account manager
  - SLA (99.9% uptime)
  - Dedicated database instance (optional)
  - API access
  - 2-year data retention
  - Audit logs
  - Priority support (4h response)

**Add-Ons:**
- Extra users: $2/user/month (Pro), $1.50/user/month (Enterprise)
- Extended data retention: $50/month per additional year
- Notion integration: $29/month
- AI insights: $49/month (when Phase 8 launches)

---

## Security Considerations

### 1. Data Isolation

**Multi-Layered Approach:**

1. **Application Layer:** Always include `tenant_id` in queries
2. **Database Layer:** RLS policies enforce tenant isolation
3. **Session Layer:** PostgreSQL session variable `app.current_tenant_id`

**Why All Three?**
- Application layer: Primary defense, most efficient
- Database layer: Backup defense if application has bug
- Session layer: Enables RLS to work transparently

### 2. OAuth Secret Encryption

**AES-256-GCM Encryption:**
```typescript
// Encryption (during tenant creation)
function encryptSecret(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (hex encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

// Decryption (when loading OAuth config)
function decryptSecret(encryptedSecret: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const [ivHex, authTagHex, ciphertextHex] = encryptedSecret.split(':')

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString('utf8')
}
```

**Environment Variable:**
```bash
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=<64-character-hex-string>
```

### 3. Subdomain Validation

**Prevent Subdomain Hijacking:**
```typescript
// Only allow alphanumeric subdomains + hyphens
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

function validateSubdomain(subdomain: string): boolean {
  // Reserved subdomains
  const reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'localhost']

  if (reserved.includes(subdomain)) {
    return false
  }

  return SUBDOMAIN_REGEX.test(subdomain)
}
```

### 4. Rate Limiting (Per Tenant)

**Implement tenant-aware rate limiting:**
```typescript
// server/middleware/rateLimit.ts
const rateLimits = new Map<string, { count: number, resetAt: number }>()

export default defineEventHandler((event) => {
  const tenant = getTenant(event)
  const key = `${tenant.id}:${event.path}`

  const now = Date.now()
  const limit = rateLimits.get(key)

  if (limit && limit.resetAt > now) {
    if (limit.count >= getMaxRequests(tenant.plan_type)) {
      throw createError({ statusCode: 429, message: 'Rate limit exceeded' })
    }
    limit.count++
  } else {
    rateLimits.set(key, { count: 1, resetAt: now + 60000 }) // 1 minute
  }
})

function getMaxRequests(planType: string): number {
  return {
    free: 100,      // 100 req/min
    pro: 500,       // 500 req/min
    enterprise: 2000 // 2000 req/min
  }[planType] || 100
}
```

### 5. Audit Logging

**Track sensitive operations:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,           -- 'user.created', 'feedback.deleted', etc.
  resource_type TEXT NOT NULL,    -- 'user', 'feedback', 'goal'
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
```

---

## Future Enhancements

### Phase 1.5: Workspace Switching

**Allow users to be members of multiple tenants:**

1. **New table:** `user_tenant_memberships`
   ```sql
   CREATE TABLE user_tenant_memberships (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES users(id),
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member'
     invited_at TIMESTAMP NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, tenant_id)
   );
   ```

2. **Workspace switcher UI** (top-left dropdown)
3. **Redirect logic:** Switch subdomain when changing workspace

### Phase 2: Custom Domains

**Allow tenants to use `feedback.pocketworks.com` instead of `pocketworks.cohort.com`:**

1. **DNS Setup:**
   - Customer adds CNAME: `feedback.pocketworks.com` → `pocketworks.cohort.com`
   - Cloudflare/Vercel handles SSL certificate generation

2. **Tenant Configuration:**
   - Add custom domain to `tenants.custom_domain`
   - Verify DNS ownership (TXT record challenge)

3. **Nitro Plugin Update:**
   - Check `custom_domain` in addition to subdomain

### Phase 3: Dedicated Databases (Enterprise)

**For large customers who need compliance/isolation:**

1. **Separate PostgreSQL instance** on Railway/AWS RDS
2. **Update tenant record:**
   ```sql
   ALTER TABLE tenants ADD COLUMN dedicated_db_url TEXT;
   ```
3. **Connection routing:**
   ```typescript
   function getDbConnection(tenant: Tenant) {
     if (tenant.dedicated_db_url) {
       return drizzle(postgres(tenant.dedicated_db_url))
     }
     return db // Shared connection
   }
   ```

### Phase 4: API Access (Enterprise)

**RESTful API for integrations:**

1. **API Keys per tenant:**
   ```sql
   CREATE TABLE api_keys (
     id UUID PRIMARY KEY,
     tenant_id UUID NOT NULL REFERENCES tenants(id),
     name TEXT NOT NULL,
     key_hash TEXT NOT NULL,
     scopes TEXT[], -- ['feedback:read', 'users:write']
     created_at TIMESTAMP NOT NULL DEFAULT NOW()
   );
   ```

2. **API endpoints:** `/api/v1/feedback`, `/api/v1/users`, etc.
3. **Rate limiting:** Separate limits for API keys
4. **Documentation:** OpenAPI/Swagger spec

---

## Testing Strategy

### 1. Local Development

**Setup:**
```bash
# Add to /etc/hosts
127.0.0.1 pocketworks.localhost
127.0.0.1 testcorp.localhost
```

**Test:**
- Visit `http://pocketworks.localhost:3000` → Pocketworks tenant
- Visit `http://testcorp.localhost:3000` → Test tenant

### 2. Staging Environment

**Deploy to Railway with subdomain routing:**
1. Create second test tenant in database
2. Configure DNS: `*.cohort-staging.com` → Railway deployment
3. Test cross-tenant isolation:
   - Create user in Tenant A
   - Try to access from Tenant B → should fail
   - Verify RLS policies block cross-tenant queries

### 3. Automated Tests

**E2E Tests (Playwright):**
```typescript
test('tenant isolation', async ({ page }) => {
  // Login to Tenant A
  await page.goto('https://tenantA.cohort.com')
  await loginAs('user@tenantA.com')

  // Create feedback
  const feedbackId = await createFeedback('Great work!')

  // Switch to Tenant B
  await page.goto('https://tenantB.cohort.com')
  await loginAs('user@tenantB.com')

  // Try to access Tenant A's feedback via API
  const response = await page.request.get(`/api/feedback/${feedbackId}`)
  expect(response.status()).toBe(404) // Should not exist
})
```

**Unit Tests (Vitest):**
```typescript
test('getTenantId throws if tenant not in context', () => {
  const mockEvent = { context: {} }
  expect(() => getTenantId(mockEvent)).toThrow('Tenant context not found')
})

test('RLS policy prevents cross-tenant access', async () => {
  await db.execute(sql`SET app.current_tenant_id = ${tenantA.id}`)

  const users = await db.select().from(usersTable)

  // Should only return Tenant A users
  expect(users.every(u => u.tenant_id === tenantA.id)).toBe(true)
})
```

---

## Performance Considerations

### 1. Database Query Optimization

**Add Compound Indexes:**
```sql
-- Frequently queried: feedback for a user within tenant
CREATE INDEX idx_feedback_tenant_reviewee ON feedback(tenant_id, reviewee_id, created_at DESC);

-- Frequently queried: goals by status within tenant
CREATE INDEX idx_goals_tenant_status ON goals(tenant_id, status, created_at DESC);
```

**Avoid N+1 Queries:**
```typescript
// Bad: N+1 query
const users = await db.select().from(usersTable)
for (const user of users) {
  user.feedbackCount = await db.select({ count: sql`count(*)` })
    .from(feedbackTable)
    .where(eq(feedbackTable.reviewee_id, user.id))
}

// Good: Join with aggregation
const users = await db
  .select({
    ...usersTable,
    feedbackCount: sql`count(feedback.id)`
  })
  .from(usersTable)
  .leftJoin(feedbackTable, eq(feedbackTable.reviewee_id, usersTable.id))
  .groupBy(usersTable.id)
```

### 2. Caching

**Tenant Configuration Cache:**
```typescript
// Cache tenant config for 5 minutes (reduces DB load)
const tenantCache = new Map<string, { tenant: Tenant, expiresAt: number }>()

async function getCachedTenant(subdomain: string): Promise<Tenant> {
  const cached = tenantCache.get(subdomain)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenant
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, subdomain)
  })

  tenantCache.set(subdomain, {
    tenant,
    expiresAt: Date.now() + 300000 // 5 minutes
  })

  return tenant
}
```

**Invalidate on Update:**
```typescript
// When tenant settings change
async function updateTenant(subdomain: string, updates: Partial<Tenant>) {
  await db.update(tenants)
    .set(updates)
    .where(eq(tenants.subdomain, subdomain))

  // Invalidate cache
  tenantCache.delete(subdomain)
}
```

### 3. Connection Pooling

**PostgreSQL Connection Pool Settings:**
```typescript
// server/db/index.ts
const pool = postgres(process.env.DATABASE_URL!, {
  max: 20,              // Max connections (adjust based on Railway plan)
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // Connection timeout
  prepare: false        // Required for RLS with session variables
})
```

**Monitor Pool Usage:**
```typescript
setInterval(() => {
  console.log('DB Pool:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  })
}, 60000) // Log every minute
```

---

## Rollout Plan

### Week 1: Database Preparation
- [ ] Create `tenants` table migration
- [ ] Add default Pocketworks tenant
- [ ] Add `tenant_id` columns to all tables (nullable)
- [ ] Backfill existing data with default tenant ID
- [ ] Make `tenant_id` NOT NULL
- [ ] Add indexes
- [ ] Test: Verify existing app works unchanged

### Week 2: Tenant Detection
- [ ] Create Nitro plugin for tenant detection
- [ ] Update all API routes to use `getTenantId()`
- [ ] Test locally with subdomain routing
- [ ] Deploy to staging
- [ ] Test: Verify Pocketworks tenant loads correctly

### Week 3: RLS Implementation
- [ ] Enable RLS on `users` table, test thoroughly
- [ ] Enable RLS on `feedback` table, test thoroughly
- [ ] Enable RLS on remaining tables
- [ ] Monitor query performance
- [ ] Test: Verify no queries break

### Week 4: OAuth Refactoring
- [ ] Implement OAuth secret encryption/decryption
- [ ] Refactor Better-auth to use tenant config
- [ ] Test Google OAuth with Pocketworks tenant
- [ ] Test: Verify login still works

### Week 5-6: Multi-Tenant Onboarding
- [ ] Build `/signup` page
- [ ] Create tenant creation API
- [ ] Build tenant settings dashboard
- [ ] Implement subdomain validation
- [ ] Test: Create second test tenant, verify isolation

### Week 7: Beta Testing
- [ ] Invite 2-3 friendly customers
- [ ] Monitor for bugs/issues
- [ ] Gather feedback on onboarding flow
- [ ] Fix critical issues

### Week 8: Launch
- [ ] Integrate Stripe for billing
- [ ] Set up subscription plans
- [ ] Public launch announcement
- [ ] Marketing push

---

## Success Metrics

**Technical Metrics:**
- Database query time: <100ms p95 (with RLS)
- Tenant detection overhead: <5ms p95
- Zero cross-tenant data leaks (audit via RLS logs)
- 99.9% uptime SLA

**Business Metrics:**
- 10 paying tenants in first 3 months
- Average 20 users per tenant
- <5% churn rate
- $2k MRR within 6 months

**User Experience:**
- Onboarding completion rate: >80%
- Time to first feedback submission: <10 minutes
- User satisfaction (NPS): >40

---

## Open Questions

1. **Custom Domain SSL:** Use Cloudflare for automatic SSL, or implement Let's Encrypt automation?
2. **Billing:** Stripe vs. Paddle? (Stripe better for US, Paddle better for EU/VAT)
3. **Data Residency:** Some enterprises require data in specific regions (EU, US). Support multiple Railway regions?
4. **User Limit Enforcement:** Hard block at limit, or allow grace period + upgrade prompt?
5. **Tenant Deletion:** Soft delete with 30-day retention, or immediate hard delete?

---

## Resources

- **Multi-Tenancy Blog Post:** https://www.adamdehaven.com/articles/powering-multi-tenant-applications-with-nuxt
- **PostgreSQL RLS Docs:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Better Auth Docs:** https://better-auth.com/docs
- **Stripe Billing:** https://stripe.com/docs/billing
- **Railway Docs:** https://docs.railway.app

---

## Conclusion

This multi-tenancy architecture positions Cohort as a scalable B2B SaaS product while maintaining the simplicity and performance of the current single-tenant implementation. The subdomain-based approach, shared database with RLS, and per-tenant OAuth configuration provide the right balance of isolation, cost-effectiveness, and enterprise-readiness.

**Next Steps:**
1. Review this plan with team
2. Decide on timeline (alongside Phase 5-6 or after MVP launch)
3. Begin Week 1 database preparation
4. Set up staging environment for testing
5. Start building!
