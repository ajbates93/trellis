/**
 * Composable for managing buddy-related functionality
 */
export const useBuddies = () => {
  // Fetch list of buddies (users where current user is their buddy)
  const { data: buddyData, pending } = useFetch("/api/users/my-buddies");

  const buddies = computed(() => buddyData.value?.buddies || []);

  // Check if user has any buddies assigned
  const hasBuddies = computed(() => buddies.value.length > 0);

  // Get buddy by ID
  const getBuddyById = (buddyId: string) => {
    return buddies.value.find((b) => b.id === buddyId);
  };

  return {
    buddies,
    hasBuddies,
    pending,
    getBuddyById,
  };
};
