<template>
  <UDashboardPanel id="admin-users">
    <template #body>
      <ComingSoon
        title="User Management"
        description="Manage users, buddy assignments, and permissions - Phase 6"
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
