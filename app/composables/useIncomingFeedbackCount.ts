/**
 * Composable for getting the count of unpublished feedback for buddies
 * Used to show badge on "Review Incoming" card on homepage and navigation
 */
export const useIncomingFeedbackCount = () => {
  const { hasBuddies } = useBuddies();

  const {
    data,
    pending,
    refresh: refreshData,
  } = useFetch("/api/feedback/for-buddy", {
    key: "incoming-feedback-count",
    server: false,
    immediate: true,
  });

  const incomingCount = computed(() => {
    if (!data.value || !hasBuddies.value) return 0;

    const assignments = data.value.buddyAssignments || [];
    return assignments.reduce(
      (total: number, assignment: { feedback?: unknown[] }) => {
        return total + (assignment.feedback?.length || 0);
      },
      0,
    );
  });

  // Refresh function to manually update the count
  const refresh = async () => {
    await refreshData();
  };

  return {
    incomingCount,
    pending,
    refresh,
  };
};
