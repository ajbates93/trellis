<template>
  <UDashboardPanel id="admin-onboard">
    <template #body>
      <ComingSoon
        title="CSV Onboarding"
        description="Bulk user import and onboarding management - Phase 6"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});
</script>
