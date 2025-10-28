<script setup lang="ts">
const { user, signOut } = useAuth();

// Navigation links
const route = useRoute();

// Loading indicator for page navigation
const { isLoading } = useLoadingIndicator();

// Fetch unread feedback count
const { unreadCount } = useUnreadCount();

const allLinks = [
  {
    label: "Home",
    icon: "i-heroicons-home",
    to: "/",
    active: route.path === "/",
  },
  {
    label: "Feedback",
    icon: "i-heroicons-chat-bubble-left-right",
    active: route.path.startsWith("/feedback"),
    children: [
      {
        label: "Give Feedback",
        to: "/feedback/give",
      },
      {
        label: "Inbox",
        to: "/feedback/inbox",
        badge: unreadCount.value > 0 ? unreadCount.value.toString() : undefined,
      },
    ],
  },
  {
    label: "Goals",
    icon: "i-heroicons-flag",
    to: "/goals",
    active: route.path === "/goals",
  },
  {
    label: "Reviews",
    icon: "i-heroicons-calendar-days",
    to: "/reviews",
    active: route.path === "/reviews",
  },
  {
    label: "Settings",
    icon: "i-heroicons-cog-6-tooth",
    active: route.path.startsWith("/settings"),
    children: [
      {
        label: "General",
        to: "/settings/general",
      },
      {
        label: "Notifications",
        to: "/settings/notifications",
      },
    ],
  },
  {
    label: "Admin",
    icon: "i-heroicons-shield-check",
    active: route.path.startsWith("/admin"),
    requiresAdmin: true,
    children: [
      {
        label: "Dashboard",
        to: "/admin/dashboard",
      },
      {
        label: "Users",
        to: "/admin/users",
      },
      {
        label: "Onboarding",
        to: "/admin/onboard",
      },
    ],
  },
];

const navigationLinks = computed(() =>
  allLinks.filter((item) => !item.requiresAdmin || user.value?.isAdmin),
);

// User dropdown menu
const userMenuItems = [
  [
    {
      label: "Profile",
      icon: "i-heroicons-user-circle",
      click: () => navigateTo("/profile"),
    },
  ],
  [
    {
      label: "Sign out",
      icon: "i-heroicons-arrow-right-on-rectangle",
      click: signOut,
    },
  ],
];
</script>

<template>
  <div class="relative">
    <!-- Global loading indicator for page navigation -->
    <UProgress
      v-if="isLoading"
      color="primary"
      animation="carousel"
      class="fixed top-0 left-0 right-0 z-50"
    />

    <UDashboardGroup unit="rem">
      <UDashboardSidebar
        collapsible
        resizable
        :ui="{
          footer: 'lg:border-t lg:border-gray-200 dark:lg:border-gray-800',
        }"
      >
        <!-- Logo and branding -->
        <template #header="{ collapsed }">
          <div class="flex items-center gap-3 px-4 py-4">
            <div
              class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
            >
              <UIcon name="i-heroicons-users" class="text-white text-lg" />
            </div>
            <span v-if="!collapsed" class="text-lg font-semibold">Cohort</span>
          </div>
        </template>

        <!-- Main navigation -->
        <template #default="{ collapsed }">
          <UNavigationMenu
            :items="navigationLinks"
            :collapsed="collapsed"
            orientation="vertical"
            tooltip
            popover
          />
        </template>

        <!-- Bottom section with user profile -->
        <template #footer="{ collapsed }">
          <div class="px-4 py-4 space-y-4">
            <!-- Color mode toggle -->
            <div
              v-if="!collapsed"
              class="flex items-center justify-between gap-3"
            >
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >Dark Mode</span
              >
              <UColorModeSwitch />
            </div>
            <UColorModeSwitch v-else />

            <!-- User profile -->
            <UDropdownMenu :items="userMenuItems">
              <template #trigger>
                <button class="w-full">
                  <UUser
                    v-if="!collapsed"
                    :name="user?.name || 'User'"
                    :description="user?.email"
                    :avatar="{ src: user?.image || user?.avatarUrl }"
                    class="w-full"
                  />
                  <UAvatar
                    v-else
                    :src="user?.image || user?.avatarUrl"
                    :alt="user?.name || 'User'"
                    size="sm"
                  />
                </button>
              </template>
            </UDropdownMenu>
          </div>
        </template>
      </UDashboardSidebar>

      <!-- Main content area -->
      <slot />
    </UDashboardGroup>
  </div>
</template>
