interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsState {
  unreadCount: number;
  items: NotificationItem[];
  loaded: boolean;
}

export const useNotifications = () => {
  // useState is per-request on SSR and shared on the client — safe singleton.
  const state = useState<NotificationsState>("notifications", () => ({
    unreadCount: 0,
    items: [],
    loaded: false,
  }));

  const refreshCount = async () => {
    const data = await $fetch<{ count: number }>("/api/notifications/unread-count");
    state.value.unreadCount = data.count;
  };

  const fetchPopover = async () => {
    const data = await $fetch<{ items: NotificationItem[]; nextCursor: string | null }>(
      "/api/notifications?limit=10&filter=all",
    );
    state.value = { ...state.value, items: data.items, loaded: true };
  };

  const markRead = async (id: string) => {
    await $fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    const idx = state.value.items.findIndex((i) => i.id === id);
    if (idx >= 0 && !state.value.items[idx]!.readAt) {
      const items = [...state.value.items];
      items[idx] = { ...items[idx]!, readAt: new Date().toISOString() };
      state.value = {
        ...state.value,
        items,
        unreadCount: Math.max(0, state.value.unreadCount - 1),
      };
    }
  };

  const markAllRead = async () => {
    await $fetch("/api/notifications/mark-all-read", { method: "POST" });
    const now = new Date().toISOString();
    state.value = {
      ...state.value,
      items: state.value.items.map((i) => (i.readAt ? i : { ...i, readAt: now })),
      unreadCount: 0,
    };
  };

  return {
    unreadCount: computed(() => state.value.unreadCount),
    items: computed(() => state.value.items),
    loaded: computed(() => state.value.loaded),
    refreshCount,
    fetchPopover,
    markRead,
    markAllRead,
  };
};
