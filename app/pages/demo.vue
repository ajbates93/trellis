<template>
  <div class="max-w-md w-full space-y-8 p-8 text-center">
    <div class="flex justify-center">
      <TrellisLogo :size="64" />
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Trellis Demo
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Explore Trellis with realistic sample data. This is a sandbox - it resets
      regularly and sends no real emails.
    </p>
    <UButton
      color="primary"
      size="xl"
      block
      :loading="loading"
      @click="enterDemo"
    >
      Enter the demo
    </UButton>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
  auth: false,
});

useHead({
  title: "Demo",
});

const loading = ref(false);
const toast = useToast();

const enterDemo = async () => {
  loading.value = true;
  try {
    const res = await $fetch<{ ok: boolean; redirect: string }>(
      "/api/demo/login",
      { method: "POST" },
    );
    // Hard navigation so the freshly-set session cookie is applied.
    window.location.href = res.redirect;
  } catch {
    loading.value = false;
    toast.add({
      title: "Could not start the demo",
      description: "Please try again in a moment.",
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  }
};
</script>
