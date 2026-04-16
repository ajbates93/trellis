export const useUnreadCount = () => {
  const { data, refresh } = useApi("/feedback/unread-count", {
    key: "unread-feedback-count",
    lazy: true,
    default: () => null,
  });

  const count = computed(() => data.value?.count || 0);

  return {
    unreadCount: count,
    refreshUnreadCount: refresh,
  };
};
