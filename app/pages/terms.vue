<script setup lang="ts">
useHead({
  title: "Terms of Service - Trellis",
  meta: [
    {
      name: "description",
      content: "The terms that govern your use of Trellis.",
    },
  ],
  link: [{ rel: "canonical", href: "https://jointrellis.app/terms" }],
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

      <h1 class="text-3xl font-bold text-white">Terms of Service</h1>
      <p class="mt-2 text-sm text-white/50">Last updated: draft</p>

      <div class="mt-10 space-y-10 text-sm leading-relaxed">
        <section>
          <h2 class="text-lg font-semibold text-white">1. The service</h2>
          <p class="mt-3">
            Trellis is a peer feedback and buddy management platform. It lets organizations invite team members,
            collect and share peer feedback, track personal development goals, and schedule buddy reviews and
            check-ins. Access is invitation-based - you must be added by an administrator of your organization
            before you can sign in.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">2. Acceptable use</h2>
          <p class="mt-3">
            You agree to use Trellis only for its intended purpose of giving and receiving peer feedback and
            managing development goals and reviews within your organization. You must not use the service to
            submit unlawful, harassing, or abusive content, attempt to access accounts or data you are not
            authorized to see, or interfere with the normal operation of the service.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">3. Disclaimer</h2>
          <p class="mt-3">
            Trellis is provided "as is" and "as available", without warranties of any kind, whether express or
            implied. We do not guarantee that the service will be uninterrupted, error-free, or fit for any
            particular purpose.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">4. Limitation of liability</h2>
          <p class="mt-3">
            To the fullest extent permitted by law, Pocketworks and Trellis will not be liable for any indirect,
            incidental, or consequential damages arising from your use of the service. Nothing in these terms
            excludes or limits liability that cannot lawfully be excluded or limited.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">5. Changes to these terms</h2>
          <p class="mt-3">
            We may update these terms from time to time. If we make material changes, we will make reasonable
            efforts to let you know. Continuing to use Trellis after changes take effect means you accept the
            updated terms.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-white">6. Contact</h2>
          <p class="mt-3">
            Questions about these terms can be sent to
            <a href="mailto:hello@jointrellis.app" class="underline hover:text-white">hello@jointrellis.app</a>.
          </p>
        </section>
      </div>
    </main>
    <MarketingFooter />
  </div>
</template>
