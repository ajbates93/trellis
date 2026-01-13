import { differenceInDays } from "date-fns";

/**
 * Composable for shared review display and formatting logic
 * Used by both /pages/reviews/index.vue and /pages/buddies/reviews.vue
 */
export const useReviewHelpers = () => {
  const { formatDateInUserTZ } = useUserTimezone();

  /**
   * Calculate days until a review date
   */
  const getDaysUntil = (date: string): number | null => {
    try {
      return differenceInDays(new Date(date), new Date());
    } catch {
      return null;
    }
  };

  /**
   * Get formatted text for days until review
   * Examples: "Today", "5 days left", "3 days ago"
   */
  const getDaysUntilText = (date: string): string => {
    const days = getDaysUntil(date);
    if (days === null) return "";
    if (days === 0) return "Today";
    if (days < 0)
      return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
    return `${days} ${days === 1 ? "day" : "days"} left`;
  };

  /**
   * Check if a review date is overdue (in the past)
   */
  const isOverdue = (date: string): boolean => {
    const days = getDaysUntil(date);
    return days !== null && days < 0;
  };

  /**
   * Check if a review date is today
   */
  const isToday = (date: string): boolean => {
    const days = getDaysUntil(date);
    return days === 0;
  };

  /**
   * Get the appropriate color classes for a review date
   * Returns Tailwind classes for text color based on date status
   */
  const getDateColorClass = (date: string): string => {
    if (isOverdue(date)) return "text-amber-600 dark:text-amber-400";
    if (isToday(date)) return "text-green-600 dark:text-green-400";
    return "";
  };

  /**
   * Get badge color based on review status
   */
  const getStatusColor = (
    status: string,
  ): "neutral" | "success" | "warning" => {
    switch (status) {
      case "scheduled":
        return "neutral";
      case "completed":
        return "success";
      case "rescheduled":
        return "warning";
      default:
        return "neutral";
    }
  };

  /**
   * Format a date string using the user's configured timezone
   */
  const formatDate = (date: string | Date | null): string => {
    return formatDateInUserTZ(date);
  };

  return {
    getDaysUntil,
    getDaysUntilText,
    isOverdue,
    isToday,
    getDateColorClass,
    getStatusColor,
    formatDate,
  };
};
