# Google OAuth Production Setup Guide

This guide walks through setting up Google OAuth credentials for production deployment on Railway.

## Overview

You need **separate OAuth credentials** for development and production:
- **Development:** `http://localhost:3000`
- **Production:** `https://your-app.railway.app`

Google requires different redirect URIs for each environment, so you'll need to create separate OAuth clients or add multiple redirect URIs to the same client.

---

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Pocketworks Google Workspace admin account (or access to the project)
- Your Railway app URL (e.g., `https://cohort-production.up.railway.app`)

---

## Step 1: Access Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Sign in with your Pocketworks Google account
3. Select your existing project (or create a new one for Cohort)

**Recommended:** Use the same project for both development and production, but with different OAuth clients or multiple redirect URIs.

---

## Step 2: Enable Required APIs

1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Google+ API** (or People API for newer projects)
   - **Google OAuth 2.0**

These should already be enabled if you've set up development credentials.

---

## Step 3: Create OAuth Consent Screen (if not already done)

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **Internal** (for Pocketworks workspace only)
3. Fill in the form:
   - **App name:** Cohort
   - **User support email:** Your email
   - **App logo:** (Optional) Upload Cohort logo
   - **App domain:**
     - Homepage: `https://your-app.railway.app`
     - Privacy policy: `https://your-app.railway.app/privacy` (create later)
     - Terms of service: `https://your-app.railway.app/terms` (create later)
   - **Authorized domains:** `railway.app`
   - **Developer contact:** Your email

4. Click **Save and Continue**
5. **Scopes:** Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`

6. Click **Save and Continue**
7. Review and submit

---

## Step 4: Create Production OAuth Credentials

You have two options:

### Option A: Separate OAuth Client (Recommended)

**Pros:** Clear separation between dev and prod
**Cons:** Need to manage two sets of credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth 2.0 Client ID**
3. Configure:
   - **Application type:** Web application
   - **Name:** Cohort Production
   - **Authorized JavaScript origins:**
     - `https://your-app.railway.app`
   - **Authorized redirect URIs:**
     - `https://your-app.railway.app/api/auth/callback/google`

4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

**Save these securely!** You'll add them to Railway environment variables.

### Option B: Add Production URI to Existing Client

**Pros:** Single set of credentials
**Cons:** Dev and prod share credentials (less secure)

1. Go to **APIs & Services** > **Credentials**
2. Click on your existing OAuth 2.0 Client ID (the one used for development)
3. Under **Authorized redirect URIs**, click **+ ADD URI**
4. Add: `https://your-app.railway.app/api/auth/callback/google`
5. Click **Save**

**Note:** You can use the same Client ID and Secret for both environments.

---

## Step 5: Configure Railway Environment Variables

1. Go to your Railway project dashboard
2. Select your Cohort service
3. Go to **Variables** tab
4. Add the following environment variables:

```bash
# Node Environment
NODE_ENV=production

# Database (auto-configured by Railway)
DATABASE_URL=<Railway will set this automatically>

# Google OAuth (use production credentials)
GOOGLE_CLIENT_ID=<your-production-client-id>
GOOGLE_CLIENT_SECRET=<your-production-client-secret>

# Better-auth Secret (IMPORTANT: Generate a NEW secret for production!)
BETTER_AUTH_SECRET=<generate-new-secret-with-openssl>

# Better-auth URL (must match your Railway app URL exactly)
BETTER_AUTH_URL=https://your-app.railway.app
```

### Generate Production Secret

Run this command locally:
```bash
openssl rand -base64 32
```

Copy the output and paste it as `BETTER_AUTH_SECRET` in Railway.

**Security Note:** NEVER use the same `BETTER_AUTH_SECRET` for development and production!

---

## Step 6: Update Railway App URL

Railway generates a URL like `https://cohort-production-abc123.up.railway.app`

Once you know your exact URL:

1. Update `BETTER_AUTH_URL` in Railway environment variables
2. Update the Google OAuth redirect URI to match exactly:
   - `https://cohort-production-abc123.up.railway.app/api/auth/callback/google`

---

## Step 7: Test Production OAuth Flow

1. Deploy your app to Railway
2. Visit your production URL: `https://your-app.railway.app`
3. Click "Sign in with Google"
4. Authorize the app
5. Verify successful login

**Expected Behavior:**
- Redirects to Google OAuth login page
- Shows consent screen (first time only for internal apps)
- Redirects back to your app
- User is logged in successfully

---

## Step 8: Restrict Access (Optional)

If you want to restrict OAuth to specific Pocketworks users:

### Option 1: Google Workspace Domain Restriction

1. In Google Cloud Console, go to **OAuth consent screen**
2. Under **App domain**, ensure only `pocketworks.co.uk` emails can access

### Option 2: Application-Level Restriction

The Cohort app already implements invitation-based access control:
- Users must be pre-created by admin before they can log in
- Unauthorized OAuth attempts are automatically rejected
- See `/server/utils/auth.ts` for implementation

**Recommended:** Use both methods for maximum security.

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** The redirect URI in your Google OAuth config doesn't match the one sent by your app.

**Solution:**
1. Check `BETTER_AUTH_URL` in Railway environment variables
2. Ensure it matches exactly: `https://your-app.railway.app`
3. In Google Cloud Console, verify redirect URI:
   - `https://your-app.railway.app/api/auth/callback/google`
4. No trailing slash in URLs!

### Error: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen is not properly configured.

**Solution:**
1. Go to **OAuth consent screen** in Google Cloud Console
2. Ensure status is "Published" or "In production"
3. Verify all required fields are filled in
4. For internal apps, ensure your account is part of the Pocketworks workspace

### Error: "unauthorized_client"

**Cause:** Client ID or Secret is incorrect, or app is not authorized.

**Solution:**
1. Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway
2. Ensure no extra spaces or newlines
3. Regenerate secret if needed (in Google Cloud Console)

### Users Can't Log In (Invitation-Based Access)

**Cause:** User not pre-created in database.

**Solution:**
1. Log in as admin
2. Go to **Admin** > **Onboarding**
3. Upload CSV with user details:
   ```csv
   email,name,roleType,buddyEmail,nextReviewDate
   user@pocketworks.co.uk,John Doe,dev,buddy@pocketworks.co.uk,2025-03-15
   ```
4. User can now authenticate via Google OAuth

---

## Security Checklist

Before launching to production:

- [ ] Separate OAuth credentials for production (recommended)
- [ ] New `BETTER_AUTH_SECRET` generated for production (REQUIRED)
- [ ] `BETTER_AUTH_URL` matches exact Railway app URL
- [ ] Google OAuth redirect URI matches exactly (no trailing slash)
- [ ] OAuth consent screen configured as "Internal"
- [ ] Authorized domains include `railway.app`
- [ ] Only Pocketworks workspace users can access (Google Workspace restriction)
- [ ] Invitation-based access control is active (app-level)
- [ ] Test login flow with real Pocketworks account
- [ ] Verify unauthorized users are rejected

---

## Production Credentials Template

Save this template securely (e.g., in 1Password, LastPass, or team password manager):

```
=================================
COHORT PRODUCTION CREDENTIALS
=================================

Google Cloud Project: [project-name]
Google OAuth Client Name: Cohort Production

GOOGLE_CLIENT_ID=
[paste client ID here]

GOOGLE_CLIENT_SECRET=
[paste client secret here]

BETTER_AUTH_SECRET=
[paste generated secret here]

BETTER_AUTH_URL=
https://your-app.railway.app

Redirect URI:
https://your-app.railway.app/api/auth/callback/google

Created: [date]
Last Updated: [date]
Owner: [your email]
```

**IMPORTANT:** Store these in a secure location. Do NOT commit to git or share in plaintext.

---

## Next Steps

Once OAuth is configured:

1. ✅ Deploy to Railway
2. ✅ Test login flow
3. ✅ Import Pocketworks team via CSV
4. ✅ Assign buddy relationships
5. ✅ Send onboarding email to team
6. ✅ Monitor logs for any OAuth errors

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Better-auth Documentation](https://better-auth.com)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)
- [Google Workspace Admin Console](https://admin.google.com)
