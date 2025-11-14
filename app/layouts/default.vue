<script setup lang="ts">
const { user, signOut, session, authClient, refreshSession } = useAuth();

// Navigation links
const route = useRoute();

// Check if currently impersonating
// Better Auth stores impersonation info in the session's impersonatedBy field
const isImpersonating = computed(() => {
  // Check if impersonatedBy exists and has a truthy value
  return Boolean(session.value?.impersonatedBy);
});

const stopImpersonating = async () => {
  try {
    const toast = useToast();
    await authClient.admin.stopImpersonating();

    // Refresh the session to update the UI
    await refreshSession();

    toast.add({
      title: "Stopped impersonating",
      description: "You are back to your admin account",
      color: "success",
    });

    // Redirect to admin dashboard to force a fresh page load
    await navigateTo("/admin/users", { replace: true });
  } catch (error) {
    console.error("Failed to stop impersonating:", error);
    const toast = useToast();
    toast.add({
      title: "Error",
      description: "Failed to stop impersonating. Please try again.",
      color: "error",
    });
  }
};

// Logout confirmation modal
const isLogoutModalOpen = ref(false);

const handleLogout = async () => {
  isLogoutModalOpen.value = false;
  await signOut();
};

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
  allLinks.filter(
    (item) => !item.requiresAdmin || user.value?.role === "admin",
  ),
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

    <!-- Impersonation banner -->
    <div
      v-if="isImpersonating"
      class="fixed top-0 left-0 right-0 z-40 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 flex items-center justify-between shadow-lg"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-xl" />
        <span class="font-medium">
          You are viewing as <strong>{{ user?.name || user?.email }}</strong>
        </span>
      </div>
      <UButton
        label="Stop Impersonating"
        icon="i-heroicons-x-mark"
        color="neutral"
        variant="solid"
        size="sm"
        class="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-all duration-200 shadow-sm hover:shadow-md"
        @click="stopImpersonating"
      />
    </div>

    <UDashboardGroup unit="rem" :class="{ 'pt-12': isImpersonating }">
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
          <div class="flex flex-col gap-2 w-full">
            <!-- User profile + Sign out row -->
            <div v-if="user" class="flex justify-between items-center gap-2">
              <UButton
                :avatar="{
                  src:
                    user.image ||
                    user.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=10b981&color=fff`,
                }"
                :label="
                  collapsed ? undefined : user.name || user.email || 'User'
                "
                color="neutral"
                variant="ghost"
                class="min-w-0 !w-auto text-left"
                :block="!collapsed"
                @click="navigateTo('/profile')"
              />

              <!-- Sign out icon button -->
              <UButton
                icon="i-heroicons-arrow-right-on-rectangle"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                @click="isLogoutModalOpen = true"
              />
            </div>
          </div>
        </template>
      </UDashboardSidebar>

      <!-- Main content area -->
      <slot />
    </UDashboardGroup>

    <!-- Logout confirmation modal -->
    <UModal
      v-model:open="isLogoutModalOpen"
      title="Confirm Logout"
      description="Are you sure you want to log out of Cohort?"
    >
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isLogoutModalOpen = false"
        />
        <UButton label="Log Out" color="error" @click="handleLogout" />
      </template>
    </UModal>
  </div>
</template>
