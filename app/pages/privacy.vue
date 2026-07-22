<script setup lang="ts">
useHead({
  title: "Privacy Policy - Trellis",
  meta: [
    {
      name: "description",
      content: "How Trellis collects, uses, and protects your data.",
    },
  ],
  link: [{ rel: "canonical", href: "https://jointrellis.app/privacy" }],
});

definePageMeta({
  layout: "marketing",
  colorMode: "dark",
  auth: false, // marketing page does not require auth
});
</script>

<template>
  <div>
    <MarketingHeader />
    <main class="max-w-3xl mx-auto px-6 py-16 text-white/80">
      <div class="mb-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
        DRAFT - pending legal review. This page is placeholder copy and has not been reviewed by a lawyer.
      </div>

      <h1 class="text-3xl font-bold text-white">Privacy Policy</h1>
      <p class="mt-2 text-sm text-white/50">Last updated: draft</p>

      <div class="mt-10 space-y-10 text-sm leading-relaxed">
        <section>
          <h2 class="text-lg font-semibold text-white">1. Who we are</h2>
          <p class="mt-3">
            Trellis is a peer feedback and buddy management platform, built by Pocketworks. This policy explains
            what data we collect when you use Trellis, why we collect it, and what rights you have over it.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">2. What we collect</h2>
          <p class="mt-3">We collect and process the following categories of data:</p>
          <ul class="mt-3 list-disc list-inside space-y-2">
            <li>
              <span class="text-white/90 font-medium">Account details</span> - name, email address, role type, and
              your buddy relationships, so we can identify you and connect you with your buddy or team.
            </li>
            <li>
              <span class="text-white/90 font-medium">Peer feedback content</span> - the text of feedback you give
              and receive, so it can be delivered to the right people and tracked over time.
            </li>
            <li>
              <span class="text-white/90 font-medium">Goals</span> - personal development goals you create, so you
              and your buddy can track progress.
            </li>
            <li>
              <span class="text-white/90 font-medium">Reviews and check-ins</span> - scheduling information, notes,
              and status for formal reviews and regular check-ins.
            </li>
          </ul>
          <p class="mt-3">
            We collect this data because it is what makes the product work - Trellis exists to store and surface
            feedback, goals, and review information for you and your organization.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">3. Retention</h2>
          <p class="mt-3">
            We keep your account and content data for as long as your account is active, and for a reasonable
            period afterwards in case you or your organization need it restored. If you delete your account,
            identifying account details are removed. Free-text feedback content may reference other people and
            events, so rather than deleting it outright, it is retained in an anonymized form (with the
            identifying link to your account removed) after account deletion.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">4. Who else sees your data (sub-processors)</h2>
          <p class="mt-3">
            We use a small number of third-party services to run Trellis. Each only receives the data it needs to
            perform its function:
          </p>
          <ul class="mt-3 list-disc list-inside space-y-2">
            <li><span class="text-white/90 font-medium">Railway</span> - hosting and our PostgreSQL database.</li>
            <li><span class="text-white/90 font-medium">Resend</span> - sending transactional emails (for example, invitations and notifications).</li>
            <li><span class="text-white/90 font-medium">Anthropic</span> - generating AI-powered feedback insights.</li>
            <li><span class="text-white/90 font-medium">Plausible</span> - privacy-friendly, cookieless website analytics.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">5. Your rights</h2>
          <p class="mt-3">
            You can access, export, and delete your data. Go to
            <NuxtLink to="/settings/privacy" class="underline hover:text-white">Settings &gt; Privacy</NuxtLink>
            to download a copy of your data or delete your account. If you need help with a request, or have a
            question about how your data is used, contact us and we'll assist.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">6. Contact</h2>
          <p class="mt-3">
            Questions about this policy or your data can be sent to
            <a href="mailto:hello@jointrellis.app" class="underline hover:text-white">hello@jointrellis.app</a>.
          </p>
        </section>
      </div>
    </main>
    <MarketingFooter />
  </div>
</template>
