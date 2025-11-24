/**
 * Composable for managing selected buddy state across buddy zone pages
 * Uses Nuxt's useState for in-memory persistence during the session
 */
export const useSelectedBuddy = () => {
  const selectedBuddyId = useState<string | null>("selected-buddy-id", () => null);
  const { buddies, pending } = useBuddies();

  // Auto-select first buddy when they load
  watch(
    () => pending.value,
    (isPending) => {
      if (!isPending && selectedBuddyId.value === null && buddies.value.length > 0) {
        selectedBuddyId.value = buddies.value[0].id;
      }
    },
    { immediate: true },
  );

  return { selectedBuddyId };
};
