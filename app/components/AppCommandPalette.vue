<script setup lang="ts">
import type { CommandPaletteItem } from "@nuxt/ui";

const { user } = useAuth();
const { hasBuddies } = useBuddies();
const { unreadCount } = useUnreadCount();
const { incomingCount } = useIncomingFeedbackCount();

const open = ref(false);

// Define keyboard shortcut for Cmd+K / Ctrl+K
defineShortcuts({
  meta_k: () => {
    open.value = true;
  },
});

// Command groups
const groups = computed(() => {
  const items: Array<{
    id: string;
    label?: string;
    items: Array<{
      label: string;
      icon: string;
      to?: string;
      suffix?: string;
      onSelect?: () => void;
    }>;
  }> = [
    {
      id: "quick-actions",
      label: "Quick Actions",
      items: [
        {
          label: "Submit Feedback",
          icon: "i-heroicons-paper-airplane",
          to: "/feedback/give",
        },
        {
          label: "View My Feedback",
          icon: "i-heroicons-chat-bubble-left-right",
          to: "/feedback/inbox",
          suffix: unreadCount.value > 0 ? `${unreadCount.value} unread` : undefined,
        },
        {
          label: "View Insights",
          icon: "i-heroicons-chart-bar",
          to: "/insights",
        },
      ],
    },
    {
      id: "personal",
      label: "Personal",
      items: [
        {
          label: "Manage Goals",
          icon: "i-heroicons-flag",
          to: "/goals",
        },
        {
          label: "Brag Bucket",
          icon: "i-heroicons-star",
          to: "/brag-bucket",
        },
        {
          label: "My Reviews",
          icon: "i-heroicons-calendar-days",
          to: "/reviews",
        },
        {
          label: "Profile Settings",
          icon: "i-heroicons-user-circle",
          to: "/profile",
        },
      ],
    },
  ];

  // Add buddy section if user has buddies
  if (hasBuddies.value) {
    items.push({
      id: "buddy",
      label: "Buddy Tasks",
      items: [
        {
          label: "Review Incoming Feedback",
          icon: "i-heroicons-inbox-arrow-down",
          to: "/buddies/feedback",
          suffix: incomingCount.value > 0 ? `${incomingCount.value} pending` : undefined,
        },
        {
          label: "View Buddy Goals",
          icon: "i-heroicons-flag",
          to: "/buddies/goals",
        },
        {
          label: "Buddy Reviews",
          icon: "i-heroicons-calendar-days",
          to: "/buddies/reviews",
        },
      ],
    });
  }

  // Add admin section if user is admin
  if (user.value?.role === "admin") {
    items.push({
      id: "admin",
      label: "Admin",
      items: [
        {
          label: "Admin Dashboard",
          icon: "i-heroicons-shield-check",
          to: "/admin/dashboard",
        },
        {
          label: "Manage Users",
          icon: "i-heroicons-users",
          to: "/admin/users",
        },
        {
          label: "Onboard Users",
          icon: "i-heroicons-user-plus",
          to: "/admin/onboard",
        },
      ],
    });
  }

  return items;
});

// Handle item selection
function onSelect(item: CommandPaletteItem) {
  if (item.to) {
    navigateTo(item.to);
  }
  open.value = false;
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="What would you like to do?"
        :close="true"
        @update:model-value="onSelect"
        @close="open = false"
      />
    </template>
  </UModal>
</template>
