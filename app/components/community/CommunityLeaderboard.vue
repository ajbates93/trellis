<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Community Leaderboard
          </h3>
          <UIcon name="i-heroicons-trophy" class="text-amber-500 text-xl" />
          <UPopover>
            <UButton
              icon="i-heroicons-information-circle"
              variant="ghost"
              color="neutral"
              size="xs"
            />
            <template #content>
              <div class="p-3 max-w-xs space-y-2 text-sm">
                <p class="font-semibold text-gray-900 dark:text-white">
                  How is the score calculated?
                </p>
                <p class="text-gray-600 dark:text-gray-400">
                  The leaderboard rewards
                  <strong>consistent, diverse feedback</strong> - not just
                  volume. You can't game it by submitting lots of feedback in
                  one go.
                </p>
                <div
                  class="space-y-1.5 pt-1 border-t border-gray-200 dark:border-gray-700"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-fire" class="text-amber-500" />
                    <span class="text-gray-600 dark:text-gray-400"
                      ><strong>Streak</strong> - consecutive weeks with feedback
                      (10 points/week)</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-user-group"
                      class="text-blue-500"
                    />
                    <span class="text-gray-600 dark:text-gray-400"
                      ><strong>Variety</strong> - unique people you gave
                      feedback to (5 points each)</span
                    >
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-clock" class="text-green-500" />
                    <span class="text-gray-600 dark:text-gray-400"
                      ><strong>Regularity</strong> - steady weekly cadence (up
                      to 20 points)</span
                    >
                  </div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-500">
                  Only users who have submitted feedback appear on the
                  leaderboard.
                </p>
              </div>
            </template>
          </UPopover>
        </div>
        <USelectMenu
          v-model="selectedPeriod"
          :items="periodOptions"
          class="w-40"
          size="sm"
        />
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        See how everyone at {{ workspaceName }} is getting on
      </p>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-48">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-4xl text-gray-400"
      />
    </div>

    <div
      v-else-if="error"
      class="flex items-center justify-center h-48 text-red-500"
    >
      <p>Failed to load leaderboard</p>
    </div>

    <div v-else class="space-y-2 max-h-96 overflow-y-auto">
      <div
        v-for="(entry, index) in leaderboard"
        :key="entry.userId"
        class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div class="flex items-center gap-3">
          <!-- Rank badge -->
          <div class="flex-shrink-0">
            <div
              v-if="index < 3"
              class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              :class="{
                'bg-amber-500 text-white': index === 0,
                'bg-gray-400 text-white': index === 1,
                'bg-amber-700 text-white': index === 2,
              }"
            >
              {{ index + 1 }}
            </div>
            <div
              v-else
              class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              {{ index + 1 }}
            </div>
          </div>

          <!-- Avatar + Name -->
          <UAvatar
            :src="entry.avatarUrl || entry.image || undefined"
            :alt="entry.name"
            size="sm"
          />
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ entry.name }}
            </p>
            <p
              v-if="entry.roleType"
              class="text-xs text-gray-500 dark:text-gray-400 capitalize"
            >
              {{ entry.roleType }}
            </p>
          </div>
        </div>

        <!-- Score breakdown -->
        <div class="flex items-center gap-3">
          <UTooltip :text="`${entry.streakWeeks} week streak`">
            <UBadge color="warning" variant="subtle" size="xs">
              <UIcon name="i-heroicons-fire" class="mr-0.5" />
              {{ entry.streakWeeks }}
            </UBadge>
          </UTooltip>
          <UTooltip :text="`${entry.varietyCount} unique recipients`">
            <UBadge color="info" variant="subtle" size="xs">
              <UIcon name="i-heroicons-user-group" class="mr-0.5" />
              {{ entry.varietyCount }}
            </UBadge>
          </UTooltip>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ entry.totalScore }}
            <span class="text-xs font-normal text-gray-500 dark:text-gray-400"
              >points</span
            >
          </span>
        </div>
      </div>

      <div
        v-if="leaderboard.length === 0"
        class="text-center py-8 text-gray-500"
      >
        <UIcon name="i-heroicons-trophy" class="text-4xl text-gray-400 mb-2" />
        <p class="text-lg font-semibold text-gray-900 dark:text-white">
          No activity yet
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Start submitting feedback to appear on the leaderboard
        </p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const { data: workspaceData } = useFetch("/api/workspace/current");
const workspaceName = computed(
  () => workspaceData.value?.workspace?.name || "your team",
);

interface LeaderboardEntry {
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

const periodOptions = [
  { label: "Last 4 weeks", value: "4weeks" },
  { label: "Last 12 weeks", value: "12weeks" },
  { label: "All time", value: "alltime" },
];

const selectedPeriod = ref(periodOptions[1]);
const loading = ref(true);
const error = ref(false);
const leaderboard = ref<LeaderboardEntry[]>([]);

async function fetchLeaderboard() {
  loading.value = true;
  error.value = false;
  try {
    const data = await $fetch("/api/community/leaderboard", {
      query: { period: selectedPeriod.value.value },
    });
    if (data) {
      leaderboard.value = data.leaderboard;
    }
  } catch (e) {
    console.error("Failed to load leaderboard:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(selectedPeriod, () => fetchLeaderboard());

onMounted(() => fetchLeaderboard());
</script>
