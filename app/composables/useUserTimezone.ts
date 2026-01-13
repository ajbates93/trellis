import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Composable for managing user timezone preferences
 * Handles timezone detection, storage, and date formatting
 */
export const useUserTimezone = () => {
  const { user, refreshSession } = useAuth();

  /**
   * Get browser's detected timezone
   */
  const getBrowserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  /**
   * Get user's configured timezone (from database) or browser timezone as fallback
   */
  const getUserTimezone = (): string => {
    // Return user's configured timezone if available
    if (user.value?.timezone) {
      return user.value.timezone;
    }

    // Fallback to browser timezone
    return getBrowserTimezone();
  };

  /**
   * Update user's timezone preference in database
   */
  const updateUserTimezone = async (timezone: string) => {
    try {
      await $fetch("/api/user/timezone", {
        method: "PATCH",
        body: { timezone },
      });

      // Refresh session to get updated timezone
      await refreshSession();

      return { success: true };
    } catch (error) {
      console.error("Error updating timezone:", error);
      return { success: false, error };
    }
  };

  /**
   * Format a date in the user's timezone
   * @param date - ISO string, Date object, or null
   * @param formatString - date-fns format string (default: "MMM d, yyyy")
   * @param showTime - whether to include time (default: true)
   */
  const formatDateInUserTZ = (
    date: string | Date | null,
    formatString?: string,
    showTime = true
  ): string => {
    if (!date) return "N/A";

    const userTz = getUserTimezone();
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    // Check if this is an "all day" event (stored as midnight UTC)
    // Only midnight UTC (00:00) is considered "all day"
    const dateString = typeof date === "string" ? date : dateObj.toISOString();
    const utcHours = parseInt(dateString.substring(11, 13));
    const utcMinutes = parseInt(dateString.substring(14, 16));
    const isAllDay = utcHours === 0 && utcMinutes === 0;

    // If all day event, show date only
    if (isAllDay) {
      return formatInTimeZone(dateObj, userTz, "MMM d, yyyy") + " (All day)";
    }

    // Format with time
    if (showTime) {
      const defaultFormat = formatString || "MMM d, yyyy 'at' h:mm a";
      return formatInTimeZone(dateObj, userTz, defaultFormat);
    }

    // Format date only
    const defaultFormat = formatString || "MMM d, yyyy";
    return formatInTimeZone(dateObj, userTz, defaultFormat);
  };

  /**
   * Get current time in user's timezone
   */
  const getCurrentTimeInUserTZ = (): string => {
    const userTz = getUserTimezone();
    const now = new Date();
    return formatInTimeZone(now, userTz, "h:mm a");
  };

  /**
   * Get timezone offset string (e.g., "GMT+1")
   */
  const getTimezoneOffset = (timezone?: string): string => {
    const tz = timezone || getUserTimezone();
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });

    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((part) => part.type === "timeZoneName");
    return offsetPart?.value || "";
  };

  /**
   * List of common timezones for selection
   * Organized alphabetically by city with country and GMT offset
   * Based on UX research: users search by city first, then region
   */
  const commonTimezones = [
    // United Kingdom (GMT+0)
    { value: "Europe/London", label: "London, United Kingdom (GMT+0)" },
    { value: "Europe/Dublin", label: "Dublin, Ireland (GMT+0)" },

    // Western Europe (GMT+1)
    { value: "Europe/Amsterdam", label: "Amsterdam, Netherlands (GMT+1)" },
    { value: "Europe/Berlin", label: "Berlin, Germany (GMT+1)" },
    { value: "Europe/Bratislava", label: "Bratislava, Slovakia (GMT+1)" },
    { value: "Europe/Brussels", label: "Brussels, Belgium (GMT+1)" },
    { value: "Europe/Budapest", label: "Budapest, Hungary (GMT+1)" },
    { value: "Europe/Copenhagen", label: "Copenhagen, Denmark (GMT+1)" },
    { value: "Europe/Madrid", label: "Madrid, Spain (GMT+1)" },
    { value: "Europe/Paris", label: "Paris, France (GMT+1)" },
    { value: "Europe/Prague", label: "Prague, Czech Republic (GMT+1)" },
    { value: "Europe/Rome", label: "Rome, Italy (GMT+1)" },
    { value: "Europe/Stockholm", label: "Stockholm, Sweden (GMT+1)" },
    { value: "Europe/Vienna", label: "Vienna, Austria (GMT+1)" },
    { value: "Europe/Warsaw", label: "Warsaw, Poland (GMT+1)" },
    { value: "Europe/Zurich", label: "Zurich, Switzerland (GMT+1)" },

    // Portugal (GMT+0)
    { value: "Europe/Lisbon", label: "Lisbon, Portugal (GMT+0)" },

    // Eastern Europe (GMT+2)
    { value: "Europe/Athens", label: "Athens, Greece (GMT+2)" },
    { value: "Europe/Bucharest", label: "Bucharest, Romania (GMT+2)" },
    { value: "Europe/Helsinki", label: "Helsinki, Finland (GMT+2)" },
  ];

  return {
    getUserTimezone,
    getBrowserTimezone,
    updateUserTimezone,
    formatDateInUserTZ,
    getCurrentTimeInUserTZ,
    getTimezoneOffset,
    commonTimezones,
  };
};
