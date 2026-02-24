<script setup lang="ts">
const { user, signOut, session, authClient, refreshSession } = useAuth();
const { hasBuddies } = useBuddies();
const { isOpen: mobileNavOpen, toggle: toggleMobileNav } = useMobileNav();
const { shouldShow: shouldShowOnboarding } = useOnboarding();

// Fetch current workspace
const { data: workspaceData } = useFetch("/api/workspace/current");
const workspace = computed(() => workspaceData.value?.workspace);

// Navigation links
const route = useRoute();

// Show onboarding trigger on non-dashboard pages when wizard is incomplete
const showOnboardingTrigger = computed(() => {
  return shouldShowOnboarding.value && route.path !== "/";
});

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

// Fetch incoming feedback count for buddies
const { incomingCount } = useIncomingFeedbackCount();

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
    label: "Brag Bucket",
    icon: "i-heroicons-star",
    to: "/brag-bucket",
    active: route.path === "/brag-bucket",
  },
  {
    label: "Insights",
    icon: "i-heroicons-chart-bar",
    to: "/insights",
    active: route.path === "/insights",
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
      label: "Buddies",
      icon: "i-heroicons-user-group",
      to: "/buddies",
      active:
        route.path === "/buddies" ||
        (route.path.startsWith("/buddies/") &&
          !route.path.startsWith("/buddies/feedback") &&
          !route.path.startsWith("/buddies/goals") &&
          !route.path.startsWith("/buddies/reviews")),
    },
    {
      label: "Feedback",
      icon: "i-heroicons-chat-bubble-left-right",
      to: "/buddies/feedback",
      badge:
        incomingCount.value > 0 ? incomingCount.value.toString() : undefined,
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
    to: "/settings/general",
    active: route.path.startsWith("/settings"),
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
        label: "Reports",
        to: "/admin/reports",
        active: route.path === "/admin/reports",
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

// Mobile navigation links (personal links only, no buddy/admin/settings)
const mobilePersonalLinks = computed(() => personalLinks.value);
</script>

<template>
  <div class="relative">
    <!-- Mobile header bar (hidden on desktop via CSS) -->
    <header
      class="fixed top-0 left-0 right-0 z-30 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:hidden"
      :class="{ 'top-12': isImpersonating }"
    >
      <button
        aria-label="Open navigation menu"
        :aria-expanded="mobileNavOpen"
        aria-controls="mobile-navigation"
        class="p-2 -ml-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center"
        @click="toggleMobileNav"
      >
        <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-300" />
      </button>

      <!-- App logo/name -->
      <NuxtLink to="/" class="flex items-center gap-2 no-underline text-lg">
        <TrellisLogo :size="28" />
        <span
          class="font-semibold text-white"
          style="font-family: &quot;Plus Jakarta Sans&quot;, sans-serif"
          >Trellis</span
        >
      </NuxtLink>

      <!-- Spacer to balance the layout -->
      <div class="w-10" />
    </header>

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
    <UDashboardGroup
      unit="rem"
      :ui="{
        base: [
          'flex overflow-hidden',
          isImpersonating
            ? 'fixed top-28 lg:top-12 bottom-0 left-0 right-0'
            : 'fixed top-16 lg:top-0 bottom-0 left-0 right-0',
        ].join(' '),
      }"
    >
      <UDashboardSidebar
        class="hidden lg:flex"
        collapsible
        resizable
        :ui="{
          footer: 'lg:border-t lg:border-gray-200 dark:lg:border-gray-800',
        }"
      >
        <!-- Logo and branding -->
        <template #header="{ collapsed }">
          <NuxtLink
            to="/"
            class="-ml-1 flex items-center gap-2 px-4 py-4 no-underline"
          >
            <TrellisLogo :size="32" />
            <span
              v-if="!collapsed"
              class="text-lg font-bold"
              style="font-family: &quot;Plus Jakarta Sans&quot;, sans-serif"
              >Trellis</span
            >
          </NuxtLink>
        </template>

        <!-- Main navigation -->
        <template #default="{ collapsed }">
          <SidebarNavigation
            :dashboard-link="dashboardLink"
            :personal-links="personalLinks"
            :buddy-links="buddyLinks"
            :settings-and-admin-links="
              settingsAndAdminLinks.filter((item) => {
                // Hide items requiring admin if user is not admin
                if (item.requiresAdmin && user?.role !== 'admin') return false;
                return true;
              })
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
              <button
                class="flex items-center gap-3 px-4 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-0 flex-1 text-left"
                @click="navigateTo('/profile')"
              >
                <UAvatar
                  :src="
                    user.avatarUrl ||
                    user.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=059669&color=fff`
                  "
                  :alt="user.name || 'User'"
                  size="sm"
                />
                <div v-if="!collapsed" class="min-w-0 flex-1">
                  <p
                    class="text-sm font-medium text-gray-900 dark:text-white truncate"
                  >
                    {{
                      user.preferredName || user.name || user.email || "User"
                    }}
                  </p>
                  <p
                    v-if="workspace"
                    class="text-xs text-gray-500 dark:text-gray-400 truncate"
                  >
                    {{ workspace.name }}
                  </p>
                </div>
              </button>

              <!-- Sign out icon button -->
              <UButton
                icon="i-heroicons-arrow-right-on-rectangle"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                class="px-4"
                @click="isLogoutModalOpen = true"
              />
            </div>
          </div>
        </template>
      </UDashboardSidebar>

      <!-- Main content area -->
      <slot />
    </UDashboardGroup>

    <!-- Mobile navigation drawer (hidden on desktop via CSS) -->
    <USlideover
      id="mobile-navigation"
      v-model:open="mobileNavOpen"
      class="lg:hidden"
      side="left"
      :close="false"
      :ui="{ header: 'hidden', body: 'p-0' }"
    >
      <template #body>
        <div class="flex flex-col h-full">
          <!-- User profile section -->
          <div v-if="user" class="p-4 border-b border-gray-800">
            <div class="flex items-center gap-3">
              <UAvatar
                :src="
                  user.avatarUrl ||
                  user.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=059669&color=fff`
                "
                :alt="user.name || 'User'"
                size="lg"
                class="ring-2 ring-gray-700"
              />
              <div class="flex-1">
                <h3 class="text-base font-semibold text-white">
                  {{ user.preferredName || user.name || "User" }}
                </h3>
                <p class="text-sm text-gray-400">
                  {{ workspace?.name || "Workspace" }}
                </p>
              </div>
              <button
                aria-label="Close navigation menu"
                class="p-2 -mr-2 rounded-lg hover:bg-gray-800 transition-colors"
                @click="mobileNavOpen = false"
              >
                <UIcon
                  name="i-heroicons-x-mark"
                  class="w-5 h-5 text-gray-400"
                />
              </button>
            </div>
          </div>

          <!-- Navigation sections -->
          <div class="flex-1 overflow-y-auto py-4">
            <!-- Main Menu Section -->
            <div class="px-4 mb-4">
              <p
                class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2"
              >
                Main Menu
              </p>
              <nav class="space-y-1">
                <NuxtLink
                  :to="dashboardLink.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  :class="
                    dashboardLink.active
                      ? 'bg-primary/10 text-primary-400'
                      : 'text-gray-300 hover:bg-gray-800'
                  "
                  @click="mobileNavOpen = false"
                >
                  <UIcon :name="dashboardLink.icon" class="w-5 h-5" />
                  <span class="flex-1 font-medium">{{
                    dashboardLink.label
                  }}</span>
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 text-gray-500"
                  />
                </NuxtLink>
                <NuxtLink
                  v-for="link in mobilePersonalLinks"
                  :key="link.to"
                  :to="link.to"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  :class="
                    link.active
                      ? 'bg-primary/10 text-primary-400'
                      : 'text-gray-300 hover:bg-gray-800'
                  "
                  @click="mobileNavOpen = false"
                >
                  <UIcon :name="link.icon" class="w-5 h-5" />
                  <span class="flex-1 font-medium">{{ link.label }}</span>
                  <UBadge
                    v-if="link.badge"
                    :label="link.badge"
                    size="xs"
                    color="error"
                    class="mr-1"
                  />
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 text-gray-500"
                  />
                </NuxtLink>
              </nav>
            </div>

            <!-- Account Section -->
            <div class="px-4">
              <p
                class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2"
              >
                Account
              </p>
              <nav class="space-y-1">
                <NuxtLink
                  to="/profile"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  :class="
                    route.path === '/profile'
                      ? 'bg-primary/10 text-primary-400'
                      : 'text-gray-300 hover:bg-gray-800'
                  "
                  @click="mobileNavOpen = false"
                >
                  <UIcon name="i-heroicons-user" class="w-5 h-5" />
                  <span class="flex-1 font-medium">My Profile</span>
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 text-gray-500"
                  />
                </NuxtLink>
                <button
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                  @click="isLogoutModalOpen = true"
                >
                  <UIcon
                    name="i-heroicons-arrow-right-on-rectangle"
                    class="w-5 h-5"
                  />
                  <span class="flex-1 font-medium text-left">Sign Out</span>
                  <UIcon
                    name="i-heroicons-chevron-right"
                    class="w-4 h-4 text-gray-500"
                  />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Logout confirmation modal -->
    <UModal
      v-model:open="isLogoutModalOpen"
      title="Confirm Logout"
      description="Are you sure you want to log out of Trellis?"
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

    <!-- Global Command Palette (Cmd+K) -->
    <AppCommandPalette />

    <!-- Onboarding Trigger (floating button, not shown on dashboard) -->
    <OnboardingTrigger v-if="showOnboardingTrigger" />
  </div>
</template>
