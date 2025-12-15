<script setup lang="ts">
import { format, differenceInDays } from "date-fns";
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: "default",
});

const toast = useToast();

// Fetch upcoming and past reviews
const { data: upcomingData, refresh: refreshUpcoming } = await useFetch(
  "/api/reviews/upcoming",
);
const { data: pastData } = await useFetch("/api/reviews/past");

const upcomingReviews = computed(() => upcomingData.value?.reviews || []);
const pastReviews = computed(() => pastData.value?.reviews || []);

// Group past reviews by year
const pastReviewsByYear = computed(() => {
  const grouped = new Map<number, any[]>();

  pastReviews.value.forEach((review) => {
    const year = new Date(
      review.completedDate || review.scheduledDate,
    ).getFullYear();
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(review);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0]) // Sort years descending
    .map(([year, reviews]) => ({
      year,
      reviews: reviews.sort(
        (a, b) =>
          new Date(b.completedDate || b.scheduledDate).getTime() -
          new Date(a.completedDate || a.completedDate).getTime(),
      ),
    }));
});

// Calculate days until review
const daysUntil = (date: string) => {
  return differenceInDays(new Date(date), new Date());
};

// Format date
const formatDate = (date: string) => {
  return format(new Date(date), "MMM d, yyyy");
};

// Tab state
const activeTab = ref('upcoming');

// Tab items
const tabItems = computed<TabsItem[]>(() => [
  {
    label: 'Upcoming',
    icon: 'i-heroicons-calendar-days',
    badge: upcomingReviews.value.length > 0 ? upcomingReviews.value.length : undefined,
    value: 'upcoming',
    slot: 'upcoming',
  },
  {
    label: 'Past',
    icon: 'i-heroicons-archive-box',
    badge: pastReviews.value.length > 0 ? pastReviews.value.length : undefined,
    value: 'past',
    slot: 'past',
  },
]);
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                Reviews
              </h1>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                View and manage your review schedule
              </p>
            </div>
          </div>
        </div>

        <!-- Tabbed Reviews Interface -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          variant="pill"
          color="neutral"
          size="lg"
          class="w-full"
          :ui="{
            list: 'bg-gray-100 dark:bg-gray-800 rounded-xl p-1',
            trigger: 'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100',
            indicator: 'bg-white dark:bg-gray-900 shadow-sm',
          }"
        >
          <!-- Upcoming Reviews Tab -->
          <template #upcoming>
            <div class="pt-6">
              <!-- Empty state -->
              <div v-if="upcomingReviews.length === 0">
                <div class="text-center py-16 px-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <UIcon name="i-heroicons-calendar-days" class="w-8 h-8 text-primary" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No upcoming reviews
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Your next review will appear here when scheduled
                  </p>
                </div>
              </div>

              <!-- Reviews grid -->
              <div
                v-else
                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <NuxtLink
                  v-for="review in upcomingReviews"
                  :key="review.id"
                  :to="`/reviews/${review.id}`"
                  class="block"
                >
                  <UCard
                    class="hover:shadow-lg transition-shadow cursor-pointer h-full"
                  >
                    <div class="space-y-3">
                      <div class="flex items-start justify-between">
                        <div>
                          <div class="flex items-center gap-2 mb-1">
                            <UAvatar
                              :src="review.user?.avatarUrl"
                              :alt="review.user?.name"
                              size="xs"
                            />
                            <h3 class="font-semibold text-gray-900 dark:text-white">
                              {{ review.user?.name }}
                            </h3>
                          </div>
                          <p class="text-xs text-gray-500 dark:text-gray-500">
                            {{ review.name }}
                          </p>
                          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {{ formatDate(review.scheduledDate) }}
                          </p>
                        </div>
                        <UBadge color="primary" size="xs">
                          {{ daysUntil(review.scheduledDate) }} days
                        </UBadge>
                      </div>

                      <div class="flex items-center gap-2">
                        <UAvatar
                          :src="review.buddy?.avatarUrl"
                          :alt="review.buddy?.name"
                          size="xs"
                        />
                        <span class="text-sm text-gray-600 dark:text-gray-400">
                          Buddy: {{ review.buddy?.name }}
                        </span>
                      </div>

                      <div
                        class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <div class="flex items-center gap-1">
                          <UIcon name="i-heroicons-chat-bubble-left" />
                          <span>{{ review.feedbackCount }} feedback</span>
                        </div>
                      </div>
                    </div>
                  </UCard>
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- Past Reviews Tab -->
          <template #past>
            <div class="pt-6">
              <!-- Empty state -->
              <div v-if="pastReviewsByYear.length === 0">
                <div class="text-center py-16 px-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UIcon name="i-heroicons-archive-box" class="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No past reviews
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Reviews scheduled in the past will appear here
                  </p>
                </div>
              </div>

              <!-- Past reviews grouped by year -->
              <div v-else class="space-y-6">
                <UAccordion
                  :items="
                    pastReviewsByYear.map(({ year, reviews }) => ({
                      label: `${year} (${reviews.length} reviews)`,
                      slot: `year-${year}`,
                      defaultOpen: year === new Date().getFullYear(),
                    }))
                  "
                >
                  <template
                    v-for="{ year, reviews } in pastReviewsByYear"
                    :key="year"
                    #[`year-${year}`]
                  >
                    <div
                      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4"
                    >
                      <NuxtLink
                        v-for="review in reviews"
                        :key="review.id"
                        :to="`/reviews/${review.id}`"
                        class="block"
                      >
                        <UCard
                          class="hover:shadow-lg transition-shadow cursor-pointer h-full"
                        >
                          <div class="space-y-3">
                            <div>
                              <div class="flex items-center gap-2 mb-1">
                                <UAvatar
                                  :src="review.user?.avatarUrl"
                                  :alt="review.user?.name"
                                  size="xs"
                                />
                                <h3
                                  class="font-semibold text-gray-900 dark:text-white"
                                >
                                  {{ review.user?.name }}
                                </h3>
                              </div>
                              <p class="text-xs text-gray-500 dark:text-gray-500">
                                {{ review.name }}
                              </p>
                              <p
                                class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                              >
                                {{ formatDate(review.scheduledDate) }}
                              </p>
                            </div>

                            <div class="flex items-center gap-2 flex-wrap">
                              <UBadge
                                :label="review.status"
                                :color="review.status === 'completed' ? 'success' : 'warning'"
                                size="xs"
                              />
                              <UAvatar
                                :src="review.buddy?.avatarUrl"
                                :alt="review.buddy?.name"
                                size="xs"
                              />
                              <span class="text-sm text-gray-600 dark:text-gray-400">
                                Buddy: {{ review.buddy?.name }}
                              </span>
                            </div>

                            <div
                              class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"
                            >
                              <UIcon name="i-heroicons-chat-bubble-left" />
                              <span>{{ review.feedbackCount }} feedback</span>
                            </div>

                            <div
                              v-if="review.completionNotes"
                              class="text-xs text-gray-500 dark:text-gray-500 truncate"
                            >
                              {{ review.completionNotes }}
                            </div>
                          </div>
                        </UCard>
                      </NuxtLink>
                    </div>
                  </template>
                </UAccordion>
              </div>
            </div>
          </template>
        </UTabs>
      </div>

    </template>
  </UDashboardPanel>
</template>
