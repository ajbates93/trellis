<script setup lang="ts">
const config = useRuntimeConfig();
const appVersion = (config.public as any).appVersion || "";
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
      <div>
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg">
          <TrellisLogo :size="24" />
          <span>Trellis</span>
        </NuxtLink>
        <p class="mt-3 text-sm text-white/50">Peer feedback that grows your team.</p>
        <p class="mt-4 text-xs text-white/30">
          Built by
          <a href="https://pocketworks.co.uk" class="text-white/60 hover:text-white underline" target="_blank" rel="noopener">
            Pocketworks
          </a>
        </p>
      </div>

      <div>
        <h4 class="text-xs uppercase tracking-widest text-white/40 font-semibold">Product</h4>
        <ul class="mt-3 space-y-2 text-sm text-white/60">
          <li><a href="#features" class="hover:text-white">Features</a></li>
          <li><a href="#how-it-works" class="hover:text-white">How it works</a></li>
          <li><a href="#demo-form" class="hover:text-white">Book a demo</a></li>
          <li><a href="https://my.jointrellis.app" class="hover:text-white">Log in</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-xs uppercase tracking-widest text-white/40 font-semibold">Contact</h4>
        <ul class="mt-3 space-y-2 text-sm text-white/60">
          <li>
            <a href="mailto:hello@jointrellis.app" class="hover:text-white">hello@jointrellis.app</a>
          </li>
        </ul>

        <h4 class="mt-6 text-xs uppercase tracking-widest text-white/40 font-semibold">Legal</h4>
        <ul class="mt-3 space-y-2 text-sm text-white/60">
          <li><NuxtLink to="/privacy" class="hover:text-white">Privacy</NuxtLink></li>
          <li><NuxtLink to="/terms" class="hover:text-white">Terms</NuxtLink></li>
        </ul>
      </div>
    </div>

    <div class="border-t border-white/5">
      <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/40">
        <span>&copy; {{ year }} Pocketworks Mobile Ltd.</span>
        <span v-if="appVersion">v{{ appVersion }}</span>
      </div>
    </div>
  </footer>
</template>
