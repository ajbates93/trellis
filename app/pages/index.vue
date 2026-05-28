<script setup lang="ts">
useHead({
  title: "Trellis - Peer feedback that grows your team",
  meta: [
    {
      name: "description",
      content:
        "Trellis is the peer feedback platform that makes feedback a habit. Track goals, run lightweight reviews, and grow your team together.",
    },
    {
      property: "og:title",
      content: "Trellis - Peer feedback that grows your team",
    },
    {
      property: "og:description",
      content: "Regular peer feedback, buddy reviews, and goal tracking - in one calm tool.",
    },
    {
      property: "og:image",
      content: "/og-image.png",
    },
    {
      property: "og:url",
      content: "https://jointrellis.app/",
    },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  link: [{ rel: "canonical", href: "https://jointrellis.app/" }],
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
    <main>
      <MarketingHeroSection />
      <MarketingProblemSection />
      <MarketingFeatureShowcase />
      <MarketingHowItWorks />
      <MarketingBuddySystem />
      <MarketingTestimonialSection />
      <MarketingDemoForm />
    </main>
    <MarketingFooter />
  </div>
</template>
