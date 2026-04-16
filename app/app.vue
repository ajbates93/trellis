<script setup lang="ts">
onMounted(() => {
  document.body.classList.add("hydrated");
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Screen-reader announcer for dynamic in-page updates (feedback
         publish, mark-as-read, autosave success, etc.). See useAnnouncer. -->
    <NuxtAnnouncer />
  </UApp>
</template>
