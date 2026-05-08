interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const _state = reactive({
  unreadCount: 0,
  items: [] as NotificationItem[],
  loaded: false,
});

export const useNotifications = () => {
  const refreshCount = async () => {
    const data = await $fetch<{ count: number }>("/api/notifications/unread-count");
    _state.unreadCount = data.count;
  };

  const fetchPopover = async () => {
    const data = await $fetch<{ items: NotificationItem[]; nextCursor: string | null }>(
      "/api/notifications?limit=10&filter=all",
    );
    _state.items = data.items;
    _state.loaded = true;
  };

  const markRead = async (id: string) => {
    await $fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    const idx = _state.items.findIndex((i) => i.id === id);
    if (idx >= 0 && !_state.items[idx]!.readAt) {
      _state.items[idx]!.readAt = new Date().toISOString();
      _state.unreadCount = Math.max(0, _state.unreadCount - 1);
    }
  };

  const markAllRead = async () => {
    await $fetch("/api/notifications/mark-all-read", { method: "POST" });
    const now = new Date().toISOString();
    _state.items = _state.items.map((i) => (i.readAt ? i : { ...i, readAt: now }));
    _state.unreadCount = 0;
  };

  return {
    unreadCount: computed(() => _state.unreadCount),
    items: computed(() => _state.items),
    loaded: computed(() => _state.loaded),
    refreshCount,
    fetchPopover,
    markRead,
    markAllRead,
  };
};
