<script setup lang="ts">
definePageMeta({
  layout: "default",
});
</script>

<template>
  <UDashboardPanel id="goals-test">
    <template #body>
      <div class="p-8">
        <h1 class="text-3xl font-bold text-red-500">GOALS TEST PAGE - CAN YOU SEE THIS?</h1>
        <p class="mt-4 text-xl">If you can see this text, the basic page structure works</p>

        <div class="mt-8 p-4 bg-blue-500 text-white">
          <p>This is a test div with blue background</p>
        </div>

        <UButton class="mt-8">Test Button</UButton>
      </div>
    </template>
  </UDashboardPanel>
</template>
