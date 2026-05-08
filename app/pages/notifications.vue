<script setup lang="ts">
import { formatDistanceToNow } from "date-fns";

definePageMeta({ middleware: "auth" });

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const filter = ref<"all" | "unread">("all");
const items = ref<NotificationItem[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);

const router = useRouter();
const { markRead, markAllRead, refreshCount } = useNotifications();

const load = async (reset = false) => {
  loading.value = true;
  const params = new URLSearchParams({ filter: filter.value, limit: "30" });
  if (!reset && nextCursor.value) params.set("cursor", nextCursor.value);
  const data = await $fetch<{ items: NotificationItem[]; nextCursor: string | null }>(
    `/api/notifications?${params.toString()}`,
  );
  items.value = reset ? data.items : [...items.value, ...data.items];
  nextCursor.value = data.nextCursor;
  loading.value = false;
};

watch(filter, () => {
  nextCursor.value = null;
  load(true);
});

onMounted(() => {
  load(true);
  refreshCount();
});

const iconFor = (type: string) => {
  if (type.startsWith("feedback_") || type === "buddy_feedback_received") return "i-heroicons-chat-bubble-left-right";
  if (type.startsWith("review_")) return "i-heroicons-calendar-days";
  if (type.startsWith("goal_")) return "i-heroicons-flag";
  return "i-heroicons-bell";
};

const handleClick = async (n: NotificationItem) => {
  if (!n.readAt) {
    await markRead(n.id);
    n.readAt = new Date().toISOString();
  }
  router.push(n.link);
};

const handleMarkAll = async () => {
  await markAllRead();
  const now = new Date().toISOString();
  items.value = items.value.map((i) => (i.readAt ? i : { ...i, readAt: now }));
};
</script>

<template>
  <UDashboardPanel id="notifications-page">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2 max-w-3xl">
        <div class="mb-6 flex items-center justify-between">
          <h1 class="text-3xl font-bold">Notifications</h1>
          <UButton variant="soft" size="sm" @click="handleMarkAll">Mark all read</UButton>
        </div>

        <div class="flex gap-2 mb-4">
          <UButton size="xs" :variant="filter === 'all' ? 'solid' : 'soft'" @click="filter = 'all'">All</UButton>
          <UButton size="xs" :variant="filter === 'unread' ? 'solid' : 'soft'" @click="filter = 'unread'">Unread</UButton>
        </div>

        <div v-if="items.length === 0 && !loading" class="text-center py-12 text-gray-500">
          You're all caught up.
        </div>

        <div class="divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <button
            v-for="n in items"
            :key="n.id"
            class="w-full text-left flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="handleClick(n)"
          >
            <UIcon :name="iconFor(n.type)" class="w-5 h-5 mt-0.5 text-gray-500 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium" :class="!n.readAt ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">
                {{ n.title }}
              </div>
              <div v-if="n.body" class="text-xs text-gray-500">{{ n.body }}</div>
              <div class="text-xs text-gray-400 mt-1">{{ formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) }}</div>
            </div>
            <span v-if="!n.readAt" class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
          </button>
        </div>

        <div v-if="nextCursor" class="text-center mt-4">
          <UButton variant="soft" :loading="loading" @click="load(false)">Load more</UButton>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
