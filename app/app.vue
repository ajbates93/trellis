<template>
  <UApp>
    <DemoBanner />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- Screen-reader announcer for dynamic in-page updates (feedback
         publish, mark-as-read, autosave success, etc.). See useAnnouncer. -->
    <NuxtAnnouncer />
  </UApp>
</template>
