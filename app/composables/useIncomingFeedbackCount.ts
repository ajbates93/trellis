/**
 * Composable for getting the count of unpublished feedback for buddies
 * Used to show badge on "Review Incoming" card on homepage
 */
export const useIncomingFeedbackCount = () => {
  const { hasBuddies } = useBuddies()

  const { data, pending } = useFetch('/api/feedback/for-buddy', {
    key: 'incoming-feedback-count',
    server: false,
    watch: [hasBuddies],
    immediate: hasBuddies.value,
  })

  const incomingCount = computed(() => {
    if (!data.value || !hasBuddies.value) return 0

    const assignments = data.value.buddyAssignments || []
    return assignments.reduce((total: number, assignment: { feedback?: unknown[] }) => {
      return total + (assignment.feedback?.length || 0)
    }, 0)
  })

  // Refresh function to manually update the count
  const refresh = async () => {
    if (hasBuddies.value) {
      await refreshNuxtData('incoming-feedback-count')
    }
  }

  return {
    incomingCount,
    pending,
    refresh,
  }
}
