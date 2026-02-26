/**
 * Pure functions for computing community insight metrics.
 * All functions are stateless and operate on pre-queried data.
 */

// ===== TYPES =====

export type PlantState =
  | "dead"
  | "wilting"
  | "growing"
  | "healthy"
  | "thriving";

export interface PlantHealth {
  state: PlantState;
  healthPercent: number;
  feedbackCount: number;
  expectedCount: number;
  message: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  image: string | null;
  roleType: string | null;
  streakWeeks: number;
  varietyCount: number;
  regularityScore: number;
  totalScore: number;
}

export interface WeekFeedback {
  reviewerId: string;
  revieweeId: string;
  weekYear: string;
}

// ===== PLANT HEALTH =====

export function getPlantState(healthPercent: number): PlantState {
  if (healthPercent <= 20) return "dead";
  if (healthPercent <= 40) return "wilting";
  if (healthPercent <= 65) return "growing";
  if (healthPercent <= 85) return "healthy";
  return "thriving";
}

export function getPlantMessage(state: PlantState): string {
  switch (state) {
    case "dead":
      return "Your team plant needs attention! Start submitting feedback to bring it back to life.";
    case "wilting":
      return "The plant is struggling. A few more feedback submissions will help it recover.";
    case "growing":
      return "The plant is growing! Keep the feedback flowing to help it flourish.";
    case "healthy":
      return "Great job! The plant is healthy thanks to your team's feedback.";
    case "thriving":
      return "Amazing! The plant is thriving - your team's feedback culture is excellent!";
  }
}

export function computePlantHealth(
  feedbackCount: number,
  activeUserCount: number,
): PlantHealth {
  // Expected: 1 feedback per user per week, over a 2-week window
  const expectedCount = activeUserCount * 2;
  const healthPercent =
    expectedCount > 0
      ? Math.min(Math.round((feedbackCount / expectedCount) * 100), 100)
      : 0;
  const state = getPlantState(healthPercent);

  return {
    state,
    healthPercent,
    feedbackCount,
    expectedCount,
    message: getPlantMessage(state),
  };
}

// ===== STREAKS =====

/**
 * Given a sorted list of ISO week strings (e.g. '2025-W03') for a single user,
 * compute the current consecutive-week streak ending at the most recent week.
 */
export function computeStreak(weekYears: string[]): number {
  if (weekYears.length === 0) return 0;

  const sorted = [...new Set(weekYears)].sort().reverse();
  let streak = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (areConsecutiveWeeks(sorted[i]!, sorted[i - 1]!)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Check if weekB is the immediate next week after weekA.
 * Handles year boundaries (e.g. 2024-W52 → 2025-W01).
 */
export function areConsecutiveWeeks(weekA: string, weekB: string): boolean {
  const [yearA, weekNumA] = parseWeekYear(weekA);
  const [yearB, weekNumB] = parseWeekYear(weekB);

  if (yearA === yearB) {
    return weekNumB - weekNumA === 1;
  }

  // Year boundary: last week of yearA → first week of yearB
  if (yearB === yearA + 1 && weekNumB === 1) {
    const maxWeek = getISOWeeksInYear(yearA);
    return weekNumA === maxWeek;
  }

  return false;
}

function parseWeekYear(weekYear: string): [number, number] {
  const parts = weekYear.split("-W");
  return [parseInt(parts[0]!, 10), parseInt(parts[1]!, 10)];
}

function getISOWeeksInYear(year: number): number {
  // A year has 53 ISO weeks if Jan 1 is Thursday,
  // or Dec 31 is Thursday (for leap years)
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  return jan1.getDay() === 4 || dec31.getDay() === 4 ? 53 : 52;
}

// ===== VARIETY =====

/**
 * Count unique recipients for a user within a set of feedback entries.
 */
export function computeVariety(
  feedbackEntries: WeekFeedback[],
  userId: string,
): number {
  const recipients = new Set(
    feedbackEntries
      .filter((f) => f.reviewerId === userId)
      .map((f) => f.revieweeId),
  );
  return recipients.size;
}

// ===== REGULARITY =====

/**
 * Compute regularity score based on standard deviation of weekly submission counts.
 * Lower stddev = more regular = higher score.
 * Score = (1 / (1 + stddev)) * 20
 */
export function computeRegularity(weeklyCounts: number[]): number {
  if (weeklyCounts.length === 0) return 0;

  const mean = weeklyCounts.reduce((a, b) => a + b, 0) / weeklyCounts.length;
  const variance =
    weeklyCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
    weeklyCounts.length;
  const stddev = Math.sqrt(variance);

  return parseFloat(((1 / (1 + stddev)) * 20).toFixed(1));
}

// ===== TOTAL SCORE =====

export function computeTotalScore(
  streakWeeks: number,
  varietyCount: number,
  regularityScore: number,
): number {
  const streakScore = streakWeeks * 10;
  const varietyScore = varietyCount * 5;
  return parseFloat((streakScore + varietyScore + regularityScore).toFixed(1));
}
