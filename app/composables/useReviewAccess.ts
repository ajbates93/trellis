export function useReviewAccess(review: any) {
  const { user } = useUserSession();

  const canView = computed(() => {
    if (!user.value || !review) return false;

    return (
      review.userId === user.value.id ||
      review.buddyId === user.value.id ||
      user.value.role === "admin"
    );
  });

  const canEdit = computed(() => {
    if (!user.value || !review) return false;

    return review.buddyId === user.value.id || user.value.role === "admin";
  });

  return { canView, canEdit };
}
