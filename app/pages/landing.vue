<script setup lang="ts">
definePageMeta({
  middleware: () => {
    return navigateTo("/", { redirectCode: 301 });
  },
});
</script>

<template>
  <div />
</template>
