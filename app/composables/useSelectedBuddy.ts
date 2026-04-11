/**
 * Composable for managing selected buddy state across buddy zone pages.
 * Persists in-memory across the session via useState, and syncs two-way
 * with the `?buddy=<uuid>` query parameter on /buddies/* routes so that
 * buddy-zone pages support deep links and refresh-safe bookmarks.
 */
export const useSelectedBuddy = () => {
  const selectedBuddyId = useState<string | null>("selected-buddy-id", () => null);
  const { buddies, pending, getBuddyById } = useBuddies();
  const route = useRoute();
  const router = useRouter();

  const isOnBuddyRoute = () => route.path.startsWith("/buddies/");

  // Hydrate from URL query param when buddies load, or react to query param changes.
  // Falls back to first-buddy auto-select if query param is missing or invalid.
  watch(
    [() => pending.value, () => route.query.buddy, () => buddies.value.length],
    ([isPending, queryBuddyRaw]) => {
      if (isPending) return;
      if (buddies.value.length === 0) return;

      const queryBuddy = typeof queryBuddyRaw === "string" ? queryBuddyRaw : null;

      if (queryBuddy) {
        if (getBuddyById(queryBuddy)) {
          // Valid query param — honour it
          if (selectedBuddyId.value !== queryBuddy) {
            selectedBuddyId.value = queryBuddy;
          }
          return;
        }
        // Invalid query param — strip it (client-only) and fall through to default
        if (import.meta.client && isOnBuddyRoute()) {
          const { buddy: _removed, ...rest } = route.query;
          router.replace({ query: rest });
        }
      }

      // No (valid) query param: auto-select first buddy if nothing selected yet
      const firstBuddy = buddies.value[0];
      if (selectedBuddyId.value === null && firstBuddy) {
        selectedBuddyId.value = firstBuddy.id;
      }
    },
    { immediate: true },
  );

  // Two-way sync: when selection changes (e.g. user picks from BuddySelector),
  // reflect the new id in the URL so refresh/bookmark stays correct.
  watch(selectedBuddyId, (newId) => {
    if (!import.meta.client) return;
    if (!newId) return;
    if (!isOnBuddyRoute()) return;
    if (route.query.buddy === newId) return;
    router.replace({ query: { ...route.query, buddy: newId } });
  });

  return { selectedBuddyId };
};
