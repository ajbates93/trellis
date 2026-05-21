<script setup lang="ts">
// useAuth is auto-imported from app/composables/useAuth.ts.
// On marketing pages (no auth middleware) the session will simply be null/undefined
// when not logged in, which is the expected logged-out behaviour.
const { user } = useAuth();

const isLoggedIn = computed(() => !!user.value);

const appUrl = computed(() => {
  if (import.meta.dev) {
    return "/dashboard";
  }
  return "https://my.jointrellis.app";
});

const mobileOpen = ref(false);

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Buddy system", href: "#buddy-system" },
];

function scrollToDemo() {
  document.getElementById("demo-form")?.scrollIntoView({ behavior: "smooth" });
  mobileOpen.value = false;
}
</script>

<template>
  <header class="sticky top-0 z-50 bg-[#0a0f1a]/80 backdrop-blur border-b border-white/5">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg">
        <TrellisLogo :size="28" />
        <span>Trellis</span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-8 text-sm text-white/70">
        <a v-for="link in navLinks" :key="link.href" :href="link.href" class="hover:text-white transition">
          {{ link.label }}
        </a>
      </nav>

      <div class="hidden md:flex items-center gap-3">
        <template v-if="isLoggedIn">
          <a :href="appUrl" class="bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md hover:bg-emerald-400 transition">
            Open Trellis
          </a>
        </template>
        <template v-else>
          <a :href="appUrl" class="text-sm text-white/70 hover:text-white transition">Log in</a>
          <button
            class="bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md hover:bg-emerald-400 transition text-sm"
            @click="scrollToDemo"
          >
            Book a demo
          </button>
        </template>
      </div>

      <button class="md:hidden text-white" aria-label="Toggle menu" @click="mobileOpen = !mobileOpen">
        <UIcon :name="mobileOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="size-6" />
      </button>
    </div>

    <div v-if="mobileOpen" class="md:hidden border-t border-white/5 px-6 py-4 space-y-3">
      <a v-for="link in navLinks" :key="link.href" :href="link.href" class="block text-white/80" @click="mobileOpen = false">
        {{ link.label }}
      </a>
      <hr class="border-white/10">
      <template v-if="isLoggedIn">
        <a :href="appUrl" class="block bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md text-center">Open Trellis</a>
      </template>
      <template v-else>
        <a :href="appUrl" class="block text-white/70">Log in</a>
        <button class="block w-full bg-emerald-500 text-emerald-950 font-semibold px-4 py-2 rounded-md" @click="scrollToDemo">
          Book a demo
        </button>
      </template>
    </div>
  </header>
</template>
