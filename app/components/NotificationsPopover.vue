<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

const { items, unreadCount, fetchPopover, markRead, markAllRead } = useNotifications();
const router = useRouter();

const filter = ref<"all" | "unread">("unread");

const visible = computed(() =>
  filter.value === "all"
    ? items.value
    : items.value.filter((i) => !i.readAt),
);

onMounted(() => fetchPopover());

const iconFor = (type: string) => {
  if (type.startsWith("feedback_") || type === "buddy_feedback_received") return "i-heroicons-chat-bubble-left-right";
  if (type.startsWith("review_")) return "i-heroicons-calendar-days";
  if (type.startsWith("goal_")) return "i-heroicons-flag";
  return "i-heroicons-bell";
};

const handleClick = async (id: string, link: string) => {
  await markRead(id);
  router.push(link);
};
</script>

<template>
  <div class="w-96 max-w-full">
    <div class="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
      <h3 class="text-lg font-semibold">Notifications</h3>
      <button
        v-if="unreadCount > 0"
        class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        @click="markAllRead"
      >
        Mark all read
      </button>
    </div>
    <div class="flex gap-2 px-4 py-2 border-b border-gray-300 dark:border-gray-700">
      <UButton
        size="xs"
        :variant="filter === 'all' ? 'solid' : 'soft'"
        @click="filter = 'all'"
      >All</UButton>
      <UButton
        size="xs"
        :variant="filter === 'unread' ? 'solid' : 'soft'"
        @click="filter = 'unread'"
      >Unread</UButton>
    </div>
    <div class="max-h-96 overflow-y-auto bg-white dark:bg-gray-900">
      <div
        v-if="visible.length === 0"
        class="px-6 py-10 text-center"
      >
        <UIcon name="i-heroicons-rocket-launch" class="w-8 h-8 text-primary-500 mb-2 mx-auto" />
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">You're all caught up</p>
        <p class="text-xs text-gray-500 mt-1">Nothing new right now.</p>
      </div>
      <button
        v-for="n in visible"
        :key="n.id"
        class="w-full text-left flex items-start gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-800 last:border-b-0"
        @click="handleClick(n.id, n.link)"
      >
        <UIcon :name="iconFor(n.type)" class="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-500" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium" :class="!n.readAt ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">
            {{ n.title }}
          </div>
          <div v-if="n.body" class="text-xs text-gray-500 truncate">{{ n.body }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) }}</div>
        </div>
        <span v-if="!n.readAt" class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
      </button>
    </div>
    <div class="p-2 border-t border-gray-300 dark:border-gray-700 text-center">
      <NuxtLink to="/notifications" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
        See all
      </NuxtLink>
    </div>
  </div>
</template>
