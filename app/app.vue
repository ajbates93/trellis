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
  </UApp>
</template>
