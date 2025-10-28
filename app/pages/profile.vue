<template>
  <UDashboardPanel id="profile">
    <template #body>
      <ComingSoon
        title="User Profile"
        description="View and edit your profile information"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});
</script>
