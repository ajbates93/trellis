<script setup lang="ts">
import { format, differenceInDays } from "date-fns";

definePageMeta({
  layout: "default",
});

// Fetch upcoming and past reviews
const { data: upcomingData } = await useFetch("/api/reviews/upcoming");
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
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Reviews
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            View and manage your review schedule
          </p>
        </div>

        <!-- Upcoming Reviews -->
        <div class="mb-12">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Reviews
          </h2>

          <div v-if="upcomingReviews.length === 0" class="text-center py-12">
            <UIcon
              name="i-heroicons-calendar"
              class="text-gray-400 text-4xl mb-2"
            />
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              No upcoming reviews
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Your next review will appear here when scheduled
            </p>
          </div>

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
                      <h3 class="font-semibold text-gray-900 dark:text-white">
                        {{ review.name }}
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
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
                      with {{ review.buddy?.name }}
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

        <!-- Past Reviews -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Past Reviews
          </h2>

          <div v-if="pastReviewsByYear.length === 0" class="text-center py-12">
            <UIcon
              name="i-heroicons-archive-box"
              class="text-gray-400 text-4xl mb-2"
            />
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              No completed reviews
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Past reviews will appear here
            </p>
          </div>

          <UAccordion
            v-else
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
                        <h3 class="font-semibold text-gray-900 dark:text-white">
                          {{ review.name }}
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {{
                            formatDate(
                              review.completedDate || review.scheduledDate,
                            )
                          }}
                        </p>
                      </div>

                      <div class="flex items-center gap-2">
                        <UAvatar
                          :src="review.buddy?.avatarUrl"
                          :alt="review.buddy?.name"
                          size="xs"
                        />
                        <span class="text-sm text-gray-600 dark:text-gray-400">
                          with {{ review.buddy?.name }}
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
  </UDashboardPanel>
</template>
