<template>
  <div
    v-if="demoMode"
    class="w-full bg-amber-500 text-amber-950 text-center text-sm font-medium py-1.5 px-4"
    role="status"
  >
    Demo environment - sample data, no real emails, resets regularly.
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const demoMode = computed(() => Boolean(config.public.demoMode));
</script>
