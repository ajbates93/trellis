<script setup lang="ts">
interface Props {
  feedback: any[];
  goals: any[];
  achievements: any[];
  isReviewee: boolean;
  formatDate: (date: string) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "open-feedback", item: any): void;
}>();

const selectedTab = ref<"feedback" | "goals" | "achievements">("feedback");

const tabs = computed(() => [
  {
    label: "Feedback",
    value: "feedback" as const,
    icon: "i-heroicons-chat-bubble-left-right",
    count: props.feedback.length,
  },
  {
    label: "Goals",
    value: "goals" as const,
    icon: "i-heroicons-flag",
    count: props.goals.length,
  },
  {
    label: "Brag Bucket",
    value: "achievements" as const,
    icon: "i-heroicons-star",
    count: props.achievements.length,
  },
]);

const goalsPagePath = computed(() =>
  props.isReviewee ? "/goals" : "/buddies/goals",
);
const feedbackPagePath = computed(() =>
  props.isReviewee ? "/feedback" : "/buddies/feedback",
);

// Goal progress helpers — milestones if present, otherwise time-elapsed against targetDate.
const goalProgress = (goal: any): { pct: number; label: string } | null => {
  const milestones = goal.milestones as
    | { isCompleted: boolean }[]
    | undefined;
  if (milestones && milestones.length > 0) {
    const done = milestones.filter((m) => m.isCompleted).length;
    return {
      pct: Math.round((done / milestones.length) * 100),
      label: `${done}/${milestones.length} milestones`,
    };
  }
  return null;
};

const goalStatusColor = (status: string) => {
  if (status === "completed") return "success" as const;
  if (status === "archived") return "neutral" as const;
  return "primary" as const;
};

// Achievements: most recent first.
const sortedAchievements = computed(() =>
  [...props.achievements].sort((a, b) => {
    const da = new Date(a.achievedDate).getTime();
    const db = new Date(b.achievedDate).getTime();
    return db - da;
  }),
);

const monthShort = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
const dayOfMonth = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric" });

const truncate = (text: string | null | undefined, max = 120) => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
};
</script>

<template>
  <UCard
    :ui="{
      body: 'p-0 sm:p-0',
      header: 'px-4 py-3 sm:px-4',
    }"
  >
    <template #header>
      <div>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          From this cycle
        </h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Feedback, goals & achievements to draw on
        </p>
      </div>
    </template>

    <!-- Tab switcher -->
    <div
      class="flex border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 bg-white dark:bg-gray-900"
    >
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="flex-1 min-w-0 px-2 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
        :class="
          selectedTab === tab.value
            ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent'
        "
        @click="selectedTab = tab.value"
      >
        <UIcon :name="tab.icon" class="w-3.5 h-3.5 flex-shrink-0" />
        <span class="truncate">{{ tab.label }}</span>
        <span
          class="text-[11px] leading-none flex-shrink-0"
          :class="
            selectedTab === tab.value
              ? 'text-primary-600/70 dark:text-primary-400/70'
              : 'text-gray-400 dark:text-gray-500'
          "
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Tab content -->
    <div class="p-3">
      <!-- Feedback -->
      <div v-if="selectedTab === 'feedback'">
        <div v-if="feedback.length === 0" class="text-center py-10 px-4">
          <UIcon
            name="i-heroicons-chat-bubble-left"
            class="text-gray-400 w-8 h-8 mx-auto mb-2"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No feedback for this review yet
          </p>
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="item in feedback"
            :key="item.id"
            type="button"
            class="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            @click="emit('open-feedback', item)"
          >
            <div class="flex items-start gap-2.5">
              <UAvatar
                :src="item.reviewer?.avatarUrl || undefined"
                :alt="item.reviewer?.name"
                size="xs"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white truncate"
                  >
                    {{ item.reviewer?.name }}
                  </span>
                  <span
                    class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0"
                  >
                    {{ formatDate(item.createdAt) }}
                  </span>
                </div>
                <p
                  class="text-sm text-gray-700 dark:text-gray-300 leading-snug"
                >
                  {{ truncate(item.content) }}
                </p>
              </div>
            </div>
          </button>

          <NuxtLink
            :to="feedbackPagePath"
            target="_blank"
            class="flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span>Open all feedback</span>
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- Goals -->
      <div v-else-if="selectedTab === 'goals'">
        <div v-if="goals.length === 0" class="text-center py-10 px-4">
          <UIcon
            name="i-heroicons-flag"
            class="text-gray-400 w-8 h-8 mx-auto mb-2"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No goals
          </p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="goal in goals"
            :key="goal.id"
            class="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <p
                class="font-medium text-sm text-gray-900 dark:text-white leading-snug flex-1"
              >
                {{ goal.goalText }}
              </p>
              <NuxtLink
                :to="goalsPagePath"
                target="_blank"
                class="flex-shrink-0 text-gray-400 hover:text-primary-500 transition-colors"
                aria-label="Open goal"
              >
                <UIcon
                  name="i-heroicons-arrow-top-right-on-square"
                  class="w-4 h-4"
                />
              </NuxtLink>
            </div>

            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <UBadge
                :label="goal.status"
                size="xs"
                :color="goalStatusColor(goal.status)"
                variant="subtle"
                class="capitalize"
              />
              <span
                v-if="goal.targetDate"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ formatDate(goal.targetDate) }}
              </span>
            </div>

            <!-- Milestone progress -->
            <div
              v-if="goalProgress(goal)"
              class="mt-2"
            >
              <div
                class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1"
              >
                <span>{{ goalProgress(goal)!.label }}</span>
                <span>{{ goalProgress(goal)!.pct }}%</span>
              </div>
              <div
                class="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"
              >
                <div
                  class="h-full bg-primary-500 transition-all"
                  :style="{ width: goalProgress(goal)!.pct + '%' }"
                />
              </div>
            </div>
          </div>

          <NuxtLink
            :to="goalsPagePath"
            target="_blank"
            class="flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span>Open all goals</span>
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>

      <!-- Achievements -->
      <div v-else-if="selectedTab === 'achievements'">
        <div v-if="achievements.length === 0" class="text-center py-10 px-4">
          <UIcon
            name="i-heroicons-star"
            class="text-gray-400 w-8 h-8 mx-auto mb-2"
          />
          <p class="text-sm text-gray-500 dark:text-gray-400">
            No achievements yet
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Items added to the Brag Bucket appear here
          </p>
        </div>

        <div v-else>
          <!-- Timeline. Layout in three columns: date | line+dot | content -->
          <ol class="relative">
            <!-- Vertical line: positioned at the centre of the middle gutter -->
            <span
              class="absolute left-[60px] top-3 bottom-3 w-px bg-primary-500/30 z-0"
              aria-hidden="true"
            />

            <li
              v-for="achievement in sortedAchievements"
              :key="achievement.id"
              class="relative pb-5 last:pb-0 flex items-start gap-3"
            >
              <!-- Date column (fixed width, sits to the left of the line) -->
              <div class="w-12 flex-shrink-0 text-right select-none pt-0.5">
                <div
                  class="text-[10px] font-semibold tracking-wider text-gray-500 dark:text-gray-400 leading-none"
                >
                  {{ monthShort(achievement.achievedDate) }}
                </div>
                <div
                  class="text-base font-bold text-gray-900 dark:text-white leading-tight mt-1"
                >
                  {{ dayOfMonth(achievement.achievedDate) }}
                </div>
              </div>

              <!-- Dot, sits on top of the line -->
              <span
                class="absolute left-[55px] top-2 w-2.5 h-2.5 rounded-full bg-primary-500 ring-[3px] ring-white dark:ring-gray-900 z-10"
                aria-hidden="true"
              />

              <!-- Content -->
              <div class="flex-1 min-w-0 ml-3">
                <div class="flex items-start justify-between gap-2">
                  <p
                    class="font-medium text-sm text-gray-900 dark:text-white leading-snug flex-1"
                  >
                    {{ achievement.title }}
                  </p>
                  <NuxtLink
                    to="/brag-bucket"
                    target="_blank"
                    class="flex-shrink-0 text-gray-400 hover:text-primary-500 transition-colors mt-0.5"
                    aria-label="Open in Brag Bucket"
                  >
                    <UIcon
                      name="i-heroicons-arrow-top-right-on-square"
                      class="w-3.5 h-3.5"
                    />
                  </NuxtLink>
                </div>
                <p
                  v-if="achievement.description"
                  class="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
                >
                  {{ truncate(achievement.description, 140) }}
                </p>
              </div>
            </li>
          </ol>

          <NuxtLink
            to="/brag-bucket"
            target="_blank"
            class="flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span>Open Brag Bucket</span>
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </UCard>
</template>
