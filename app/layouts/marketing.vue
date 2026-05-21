<script setup lang="ts">
// No auth, no sidebar - just a dark canvas for marketing pages

const config = useRuntimeConfig();
const plausibleToken = (config.public as { plausibleToken?: string }).plausibleToken;

if (plausibleToken) {
  useHead({
    script: [
      {
        async: true,
        src: `https://plausible.io/js/pa-${plausibleToken}.js`,
      },
      {
        innerHTML:
          "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()",
      },
    ],
  });
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0f1a] text-white antialiased">
    <slot />
  </div>
</template>

<style>
/* Dot-grid background pattern matching the product UI */
.marketing-dot-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 16px 16px;
}
</style>
