<script setup lang="ts">
const { user, signOut, session, authClient, refreshSession } = useAuth();
const { hasBuddies } = useBuddies();

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
    window.location.href = "/";
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

// Dashboard link (top level)
const dashboardLink = computed(() => ({
  label: "Dashboard",
  icon: "i-heroicons-squares-2x2",
  to: "/",
  active: route.path === "/",
}));

// Personal section links (without Dashboard)
const personalLinks = computed(() => [
  {
    label: "Submit",
    icon: "i-heroicons-paper-airplane",
    to: "/feedback/give",
    active: route.path === "/feedback/give",
  },
  {
    label: "Feedback",
    icon: "i-heroicons-chat-bubble-left-right",
    to: "/feedback/inbox",
    badge: unreadCount.value > 0 ? unreadCount.value.toString() : undefined,
    active: route.path === "/feedback/inbox",
  },
  {
    label: "Goals",
    icon: "i-heroicons-flag",
    to: "/goals",
    active: route.path === "/goals",
  },
  {
    label: "Brag Bucket",
    icon: "i-heroicons-star",
    to: "/brag-bucket",
    active: route.path === "/brag-bucket",
  },
  {
    label: "Reviews",
    icon: "i-heroicons-calendar-days",
    to: "/reviews",
    active: route.path === "/reviews",
  },
]);

// Buddy section links (shown only if user has buddies)
const buddyLinks = computed(() => {
  if (!hasBuddies.value) return [];
  return [
    {
      label: "Feedback",
      icon: "i-heroicons-chat-bubble-left-right",
      to: "/buddies/feedback",
      active: route.path.startsWith("/buddies/feedback"),
    },
    {
      label: "Goals",
      icon: "i-heroicons-flag",
      to: "/buddies/goals",
      active: route.path.startsWith("/buddies/goals"),
    },
    {
      label: "Reviews",
      icon: "i-heroicons-calendar-days",
      to: "/buddies/reviews",
      active: route.path.startsWith("/buddies/reviews"),
    },
  ];
});

// Settings and admin links
const settingsAndAdminLinks = computed(() => [
  {
    label: "Settings",
    icon: "i-heroicons-cog-6-tooth",
    active: route.path.startsWith("/settings"),
    children: [
      {
        label: "General",
        to: "/settings/general",
        active: route.path === "/settings/general",
      },
      {
        label: "Notifications",
        to: "/settings/notifications",
        active: route.path === "/settings/notifications",
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
        active: route.path === "/admin/dashboard",
      },
      {
        label: "Users",
        to: "/admin/users",
        active: route.path === "/admin/users",
      },
      {
        label: "Onboarding",
        to: "/admin/onboard",
        active: route.path === "/admin/onboard",
      },
    ],
  },
]);

// Combine all links with section structure
const navigationLinks = computed(() => {
  const allPersonalLinks = personalLinks;
  const allBuddyLinks = buddyLinks.value;
  const adminLinks = settingsAndAdminLinks.filter(
    (item) => !item.requiresAdmin || user.value?.role === "admin",
  );

  // Only include sections if there are links in them
  const links = [...allPersonalLinks];

  // Add buddy section if user has buddies
  if (allBuddyLinks.length > 0) {
    links.push(...allBuddyLinks);
  }

  // Add settings and admin links
  links.push(...adminLinks);

  return links;
});

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
          <SidebarNavigation
            :dashboard-link="dashboardLink"
            :personal-links="personalLinks"
            :buddy-links="buddyLinks"
            :settings-and-admin-links="
              settingsAndAdminLinks.filter(
                (item) => !item.requiresAdmin || user?.role === 'admin',
              )
            "
            :has-buddies="hasBuddies"
            :collapsed="collapsed"
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
                    user.avatarUrl ||
                    user.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=059669&color=fff`,
                }"
                :label="
                  collapsed
                    ? undefined
                    : user.preferredName ||
                      user.name?.split(' ')[0] ||
                      user.email ||
                      'User'
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
