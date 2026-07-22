<script setup lang="ts">
/**
 * Catch-all for unmatched routes.
 *
 * Without this page, client-side navigation to an unknown path never reaches
 * the server's 404 handling: Vue Router logs a "No match found" warning, the
 * URL updates, and the loading indicator hangs with nothing rendered. Matching
 * every leftover path and raising a fatal 404 makes both SSR requests and
 * client-side navigations render app/error.vue.
 */
throw createError({
  statusCode: 404,
  statusMessage: "Page Not Found",
  fatal: true,
});
</script>

<!-- Never rendered (setup always throws), but Vue warns without a template. -->
<template>
  <div />
</template>
