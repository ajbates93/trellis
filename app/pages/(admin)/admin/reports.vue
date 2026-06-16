<template>
  <UDashboardPanel id="admin-reports">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-2">
            <UIcon name="i-heroicons-chart-bar" class="text-blue-500 text-3xl" />
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Reports
            </h1>
          </div>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View past reviews, achievements, and goals for any user
          </p>
        </div>

        <!-- User Selector -->
        <div class="mb-8">
          <div class="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div class="w-full sm:w-96">
              <label class="block text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select User
              </label>

              <ClientOnly>
                <USelectMenu
:model-value="selectedUser" :items="users" option-attribute="name" searchable class="w-80"
                  :loading="loadingUsers" @update:model-value="(user) => (selectedUser = user)">
                  <template #leading>
                    <div v-if="selectedUser" class="flex items-center gap-2 truncate">
                      <UAvatar :src="selectedUser.avatarUrl || undefined" :alt="selectedUser.name" size="2xs" />
                      <span class="truncate">{{ selectedUser.name }}</span>
                    </div>
                    <span v-else class="text-gray-400 truncate">Search for a user...</span>
                  </template>
                  <template #item="{ item: option }">
                    <div class="flex items-center gap-2">
                      <UAvatar :src="option.avatarUrl || undefined" :alt="option.name" size="2xs" />
                      <div class="flex flex-col text-left">
                        <span class="font-medium">{{ option.name }}</span>
                        <span class="text-xs text-gray-500">{{
                          option.email
                          }}</span>
                      </div>
                    </div>
                  </template>
                  <template #trailing>
                    <UButton
v-if="selectedUser" color="neutral" variant="link" icon="i-heroicons-x-mark"
                      :padded="false" @click.stop="selectedUser = null" />
                    <UIcon
v-else name="i-heroicons-chevron-down-20-solid"
                      class="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </template>
                </USelectMenu>
              </ClientOnly>
            </div>
          </div>
        </div>

        <!-- Report Content -->
        <div v-if="selectedUser" class="space-y-8">


          <!-- Review Breakdown Section -->
          <section>
            <div class="flex items-center gap-4 mb-4">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-clipboard-document-check" class="text-primary-500" />
                Review Breakdown
              </h2>
            </div>

            <div v-if="loadingReviews">
              <div class="space-y-3">
                <div v-for="i in 3" :key="i" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <USkeleton class="h-5 w-1/3 mb-2" />
                  <USkeleton class="h-4 w-full" />
                </div>
              </div>
            </div>

            <div v-else-if="reviews.length === 0" class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p class="text-gray-500">No completed reviews found for this user.</p>
            </div>

            <div v-else-if="reviewsWithContent.length === 0" class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p class="text-gray-500">No reflections recorded for this user.</p>
            </div>

            <UAccordion
              v-else
              :items="reflectionAccordionItems"
              type="multiple"
              :ui="{
                item: 'border border-gray-200 dark:border-gray-700 rounded-lg mb-3 last:mb-0 bg-gray-50/50 dark:bg-gray-800/30 px-4',
                trigger: 'py-3 cursor-pointer',
                label: 'font-semibold text-gray-900 dark:text-white',
              }"
            >
              <template #body="{ item }">
                <div class="pb-4">
                  <div v-if="item.selfScore != null" class="mb-3 flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Self-score</span>
                    <UBadge :label="`${item.selfScore} / 10`" color="primary" variant="subtle" size="sm" />
                  </div>
                  <div v-if="item.entries.length" class="space-y-3">
                    <div
                      v-for="entry in item.entries"
                      :key="entry.id"
                      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4"
                    >
                      <div class="flex items-center gap-2 mb-3">
                        <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="text-primary-500" />
                        <span class="font-semibold text-sm text-gray-700 dark:text-gray-300">{{ entry.label }}</span>
                      </div>
                      <div
                        v-if="entry.type === 'long_text'"
                        class="prose prose-sm dark:prose-invert max-w-none"
                        v-html="sanitize(entry.content)"
                      />
                      <p v-else class="text-sm text-gray-900 dark:text-gray-100">{{ entry.content }}</p>
                    </div>
                  </div>
                  <p v-else class="text-gray-500 text-sm">No reflections recorded</p>
                </div>
              </template>
            </UAccordion>
          </section>

          <!-- Achievements Section -->
          <section>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-star" class="text-yellow-500" />
              Achievements (Last 12 Months)
            </h2>

            <div v-if="loadingAchievements" class="grid gap-4 sm:grid-cols-2">
              <div
v-for="i in 4" :key="i"
                class="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                <div class="flex items-start gap-3">
                  <USkeleton class="h-10 w-10 rounded-full" />
                  <div class="flex-1 space-y-2">
                    <USkeleton class="h-5 w-3/4" />
                    <USkeleton class="h-3 w-1/4" />
                    <USkeleton class="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>

            <div
v-else-if="achievements.length === 0"
              class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p class="text-gray-500">
                No achievements recorded in the last year.
              </p>
            </div>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <div
v-for="achievement in achievements" :key="achievement.id"
                class="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                <div class="flex items-start gap-3">
                  <div class="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-900 dark:text-white">
                      {{ achievement.title }}
                    </h3>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ formatDate(achievement.achievedDate) }}
                    </p>
                    <p v-if="achievement.description" class="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {{ achievement.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Goals Section -->
          <section>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-flag" class="text-green-500" />
              Current Goals
            </h2>

            <div v-if="loadingGoals" class="space-y-4">
              <div
v-for="i in 2" :key="i"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-start justify-between mb-4">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <USkeleton class="h-6 w-48" />
                      <USkeleton class="h-5 w-16" />
                    </div>
                    <USkeleton class="h-4 w-32" />
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <USkeleton class="h-8 w-12" />
                    <USkeleton class="h-3 w-16" />
                  </div>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <div v-for="j in 2" :key="j" class="flex items-center gap-3">
                    <USkeleton class="h-5 w-5 rounded-full" />
                    <USkeleton class="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="goals.length === 0" class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p class="text-gray-500">No active goals found.</p>
            </div>

            <div v-else class="space-y-4">
              <div
v-for="goal in sortedGoals" :key="goal.id"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {{ goal.goalText }}
                      </h3>
                      <UBadge :label="goal.status" :color="getGoalStatusColor(goal.status)" size="xs" />
                    </div>
                    <p class="text-sm text-gray-500">
                      Target: {{ formatDate(goal.targetDate) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-bold text-primary-500">
                      {{ calculateProgress(goal) }}%
                    </span>
                    <p class="text-xs text-gray-500">Completed</p>
                  </div>
                </div>

                <!-- Milestones -->
                <div
v-if="goal.milestones?.length"
                  class="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div v-for="milestone in goal.milestones" :key="milestone.id" class="flex items-center gap-3 text-sm">
                    <UIcon
:name="milestone.isCompleted
                      ? 'i-heroicons-check-circle'
                      : 'i-heroicons-stop'
                      " :class="milestone.isCompleted
                        ? 'text-green-500'
                        : 'text-gray-300'
                        " class="w-5 h-5" />
                    <span
:class="{
                      'text-gray-500 line-through': milestone.isCompleted,
                    }">
                      {{ milestone.title }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Recent Feedback Section -->
          <section>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-chat-bubble-left-right" class="text-purple-500" />
              Recent Feedback
            </h2>

            <div v-if="loadingFeedback" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <UCard v-for="i in 3" :key="i">
                <div class="flex items-start gap-4">
                  <USkeleton class="h-12 w-12 rounded-full flex-shrink-0" />
                  <div class="flex-1 min-w-0 space-y-2">
                    <div class="flex justify-between items-start">
                      <div class="space-y-1">
                        <USkeleton class="h-5 w-32" />
                        <USkeleton class="h-3 w-20" />
                      </div>
                      <USkeleton class="h-3 w-16" />
                    </div>
                    <USkeleton class="h-16 w-full" />
                  </div>
                </div>
              </UCard>
            </div>

            <div
v-else-if="recentFeedback.length === 0"
              class="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p class="text-gray-500">No feedback received yet.</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
v-for="item in recentFeedback" :key="item.id"
                class="flex flex-col items-stretch bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div class="flex items-start gap-4 flex-1">
                  <UAvatar
:src="item.reviewer.image || item.reviewer.avatarUrl || undefined" :alt="item.reviewer.name"
                    size="lg" class="flex-shrink-0" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <div class="min-w-0">
                        <span class="font-semibold text-gray-900 dark:text-white truncate block">
                          {{ item.reviewer.name }}
                        </span>
                      </div>
                      <span class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {{ formatRelativeTime(item.publishedAt) }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {{ item.content }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Empty State -->
        <div
v-else
          class="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <UIcon name="i-heroicons-user" class="text-6xl text-gray-300 mb-4" />
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a User
          </h3>
          <p class="text-gray-500 max-w-sm mx-auto">
            Choose a user from the dropdown above to view their achievements,
            reviews, and goals.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { format, formatDistanceToNow } from "date-fns";
import type { TypedInternalResponse } from "nitropack/types";
import type { User } from "~/types";

type ReceivedFeedbackItem = TypedInternalResponse<
  "/api/feedback/received",
  unknown,
  "get"
>["feedback"][number];

const { sanitize } = useSanitizeHtml();

definePageMeta({
  layout: "default",
});

useHead({
  title: "Reports",
});

const users = ref<any[]>([]);
const selectedUser = ref<User | null>(null);
const loadingUsers = ref(false);

const reviews = ref<any[]>([]);
const achievements = ref<any[]>([]);
const goals = ref<any[]>([]);
const feedback = ref<ReceivedFeedbackItem[]>([]);

const loadingReviews = ref(false);
const loadingAchievements = ref(false);
const loadingGoals = ref(false);
const loadingFeedback = ref(false);

// Fetch users for selector
const fetchUsers = async () => {
  loadingUsers.value = true;
  try {
    const data = await $api("/admin/users", { method: "GET" });
    if (data) {
      users.value = data.users;
    }
  } catch (e) {
    console.error("Failed to load users:", e);
  } finally {
    loadingUsers.value = false;
  }
};

// Fetch user data when selected
watch(selectedUser, async (user) => {
  // Reset all data and set loading states immediately
  reviews.value = [];
  achievements.value = [];
  goals.value = [];
  feedback.value = [];

  if (!user) {
    return;
  }

  loadingReviews.value = true;
  loadingAchievements.value = true;
  loadingGoals.value = true;
  loadingFeedback.value = true;

  // Fetch Reviews
  try {
    const data = await $api("/reviews/past", {
      query: { userId: user.id },
    });
    reviews.value = data.reviews || [];
  } catch (e) {
    console.error("Failed to load reviews:", e);
  } finally {
    loadingReviews.value = false;
  }

  // Fetch Achievements
  try {
    const data = await $api("/achievements", {
      query: { userId: user.id },
    });
    achievements.value = data.achievements || [];
  } catch (e) {
    console.error("Failed to load achievements:", e);
  } finally {
    loadingAchievements.value = false;
  }

  // Fetch Goals
  try {
    const data = await $api("/goals", {
      query: { userId: user.id },
    });
    goals.value = data.goals || [];
  } catch (e) {
    console.error("Failed to load goals:", e);
  } finally {
    loadingGoals.value = false;
  }

  // Fetch Feedback
  try {
    const data = await $api("/feedback/received", {
      query: { userId: user.id },
    });
    feedback.value = data.feedback || [];
  } catch (e) {
    console.error("Failed to load feedback:", e);
  } finally {
    loadingFeedback.value = false;
  }
});

interface ReflectionEntry {
  id: string;
  label: string;
  type: "long_text" | "multiple_choice" | "section";
  content: string;
}

// All non-empty reflection entries for a review, derived from snapshot+answers,
// falling back to the legacy columns for reviews without a snapshot.
const reviewReflectionEntries = (review: any): ReflectionEntry[] => {
  const snapshot = review.templateSnapshot;
  const answers = review.answers || {};
  if (Array.isArray(snapshot) && snapshot.length) {
    return snapshot
      .filter((f: any) => f.type !== "section")
      .map((f: any) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        content: answers[f.id] || "",
      }))
      .filter((e: ReflectionEntry) => e.content);
  }
  // Legacy fallback (reviews predating the backfill / with no snapshot)
  const legacy: ReflectionEntry[] = [];
  if (review.reflectionLearnings)
    legacy.push({ id: "learnings", label: "Learnings", type: "long_text", content: review.reflectionLearnings });
  if (review.reflectionHighlights)
    legacy.push({ id: "highlights", label: "Highlights", type: "long_text", content: review.reflectionHighlights });
  if (review.reflectionConcerns)
    legacy.push({ id: "concerns", label: "Concerns", type: "long_text", content: review.reflectionConcerns });
  return legacy;
};

// A review surfaces in the breakdown if it has any reflection answers or a
// recorded self-score. Each review shows all of its own template fields - there
// is no cross-review filter, since templates are dynamic.
const hasSelfScore = (review: any): boolean =>
  review.selfScore !== null && review.selfScore !== undefined;

const reviewsWithContent = computed(() =>
  reviews.value.filter(
    (r: any) => reviewReflectionEntries(r).length > 0 || hasSelfScore(r),
  ),
);

const reflectionAccordionItems = computed(() =>
  reviewsWithContent.value.map((review: any) => ({
    label: `Review: ${review.name || "Untitled"}`,
    review,
    entries: reviewReflectionEntries(review),
    selfScore: review.selfScore ?? null,
  })),
);

const sortedGoals = computed(() => {
  return [...goals.value]
    .filter((g) => g.status !== "archived")
    .sort((a, b) => {
      // Sort by status priority: in_progress/at_risk > completed
      const aActive = ["in_progress", "at_risk"].includes(a.status);
      const bActive = ["in_progress", "at_risk"].includes(b.status);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });
});

const recentFeedback = computed(() => {
  return feedback.value.slice(0, 9);
});

const formatDate = (date: string) => {
  if (!date) return "";
  return format(new Date(date), "MMM d, yyyy");
};

const formatRelativeTime = (date: string | Date | null) => {
  if (!date) return "";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

const getGoalStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "at_risk":
      return "error";
    default:
      return "neutral";
  }
};

const calculateProgress = (goal: any) => {
  if (!goal.milestones || goal.milestones.length === 0) return 0;
  const completed = goal.milestones.filter((m: any) => m.isCompleted).length;
  return Math.round((completed / goal.milestones.length) * 100);
};

onMounted(() => {
  fetchUsers();
});
</script>
