# Launch Readiness

What's needed before Trellis can be publicly launched at `jointrellis.app`, broken into tiers by urgency.

## Tier 1 - Genuinely blocks launch

Do these before pointing anyone at the marketing site.

1. **DNS**
   - Cloudflare: add `CNAME my` pointing at `jz925815.up.railway.app` (proxied, TTL auto).
   - Railway: add `my.jointrellis.app` as a custom domain on the production service. Wait ~2 min for cert provisioning.

2. **Production deploy**
   - Merge `feat/marketing-homepage` into `staging` via PR.
   - Smoke-test on staging.
   - Bump version on staging: `npm version minor` (this is a feature add).
   - Open PR `staging` to `main`, merge to trigger production deploy.

3. **End-to-end test in production**
   - Visit `jointrellis.app/` - marketing page renders.
   - Submit the demo form with a real address - confirm an email arrives at `alex.bates@pocketworks.co.uk` and a row lands in the production `demo_requests` table.
   - Visit `jointrellis.app/dashboard` - confirm 302 redirect to `my.jointrellis.app/dashboard`.
   - Visit `my.jointrellis.app/` - confirm 302 redirect to `/dashboard` (then to `/login` if logged out).

4. **Replace the Tobin testimonial quote**
   - Currently a placeholder marked in `app/components/marketing/TestimonialSection.vue`. Either swap with Tobin's actual words or remove the section entirely. Don't ship with a faked quote attributed to a real person.

5. **Set Plausible analytics token on Railway production**
   - Env var: `NUXT_PUBLIC_PLAUSIBLE_TOKEN` (the alphanumeric token from your Plausible site's tracking snippet, e.g. `PP63S8SuHEtqDK6vMAYSW`).
   - The Plausible script only loads in the marketing layout, so it never runs on the authenticated app at `my.jointrellis.app`.
   - Leave the var unset on staging if you don't want staging traffic polluting the marketing analytics.

That's the bar for "go live". A weekend's work at most.

## Tier 2 - Within the first 1-3 customers

Address these reactively as the first demos and onboarding cycles happen. Don't pre-build.

5. **Demo workspace seed script**
   - A `npm run db:seed:demo` that wipes and re-creates a `JotWorks` workspace with `Sarah Barnes` + a fake team, populated feedback, goals, reviews, brag bucket entries.
   - Lets every demo run on the same clean baseline without hand-editing the dev DB.
   - Worth building after 2-3 demos when you're tired of re-resetting state.

6. **Consistent screenshots**
   - Re-capture the 4 feature shots while logged in as Sarah / JotWorks (currently they show Alex / Pocketworks while the hero shows Sarah / JotWorks).
   - Replace `public/marketing/feature-{submit,inbox,goals,insights}.png` in place. No code changes needed.

7. **Real OG image**
   - Currently uses the hero crop as a placeholder.
   - Design a proper 1200x630 with logo + headline at `public/og-image.png`.

8. **Admin view for demo requests**
   - Small `pages/admin/demo-requests.vue` listing rows from the `demo_requests` table with status toggles (`new`, `contacted`, `demoed`, `converted`, `dropped`).
   - Stops you having to dig through your inbox to find recent leads.

## Tier 3 - Only when manual provisioning becomes the bottleneck

Don't build any of this until you've manually onboarded ~5 customers. Trying to predict what self-serve and pricing look like before having real customers is wasted work.

9. **Self-serve signup endpoint**
   - Public form that creates a workspace and makes the signing-up user its admin without Alex's involvement.
   - Needs: workspace creation API, slug uniqueness, admin invite, first-user-becomes-admin logic.
   - Required before you can scale past ~10 customers without losing your weekends.

10. **Stripe integration**
    - Subscription management, checkout, billing portal, paywall behaviour for past-due accounts.
    - See `docs/payments-architecture.md` for the current thinking on this.
    - Required before you have a real business model.

11. **Pricing page**
    - Real tiers, not just "book a demo".
    - Connects to whatever Stripe products you've defined.

12. **Customer admin tools**
    - Invite flow, role management, workspace deletion, billing changes.
    - All the SaaS table-stakes that customers expect once they're paying.

## Recommendation

Ship Tier 1 this week. Capture demo requests in your inbox. Start having calls with prospects. You will learn more about what to build next from your first five demos than from any amount of solo speculation about pricing tiers or self-serve UX.

Build Tier 2 reactively as the friction shows up. Don't build Tier 3 until manual provisioning genuinely hurts.
