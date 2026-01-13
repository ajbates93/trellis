<script setup lang="ts">
import { format, differenceInDays } from "date-fns";
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Reviews",
});

const toast = useToast();

// Fetch upcoming and past reviews
const { data: upcomingData, refresh: refreshUpcoming } = await useFetch(
  "/api/reviews/upcoming",
);
const { data: pastData } = await useFetch("/api/reviews/past");

const upcomingReviews = computed(() => upcomingData.value?.reviews || []);
const pastReviews = computed(() => pastData.value?.reviews || []);

// Calculate days until review
const daysUntil = (date: string) => {
  return differenceInDays(new Date(date), new Date());
};

// Get formatted days until text
const getDaysUntilText = (date: string) => {
  const days = daysUntil(date);
  if (days === 0) return "Today";
  if (days < 0)
    return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago`;
  return `${days} ${days === 1 ? "day" : "days"} left`;
};

// Check if review is overdue
const isOverdue = (date: string) => {
  return daysUntil(date) < 0;
};

// Check if review is today
const isToday = (date: string) => {
  return daysUntil(date) === 0;
};

// Format date using user's timezone
const { formatDateInUserTZ } = useUserTimezone();

const formatDate = (date: string | Date | null) => {
  return formatDateInUserTZ(date);
};
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Page header -->
        <div class="mb-6">
          <div class="flex items-start justify-between">
            <div>
              <h1
                class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
              >
                Reviews
              </h1>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                View and manage your review schedule
              </p>
            </div>
          </div>
        </div>

        <!-- Upcoming Reviews Section -->
        <section class="mb-12">
          <h2
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-calendar-days" class="text-primary-500" />
            Upcoming Reviews
            <UBadge
              v-if="upcomingReviews.length > 0"
              :label="upcomingReviews.length.toString()"
              color="primary"
            />
          </h2>

          <div v-if="upcomingReviews.length > 0" class="space-y-4">
            <UCard
              v-for="(review, index) in upcomingReviews"
              :key="review.id"
              :class="
                index === 0
                  ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'
                  : 'bg-gray-50 dark:bg-gray-800'
              "
            >
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div class="space-y-2">
                  <div class="flex items-center gap-3">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                      {{ review.name }}
                    </h3>
                    <UBadge
                      v-if="index === 0"
                      label="Next"
                      color="primary"
                      variant="subtle"
                    />
                    <UBadge
                      v-else
                      :label="review.status"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>

                  <div
                    class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                      <span>{{ formatDate(review.scheduledDate) }}</span>
                    </div>
                    <div
                      class="flex items-center gap-1.5"
                      :class="
                        isOverdue(review.scheduledDate)
                          ? 'text-amber-600 dark:text-amber-400'
                          : isToday(review.scheduledDate)
                            ? 'text-green-600 dark:text-green-400'
                            : ''
                      "
                    >
                      <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                      <span>{{ getDaysUntilText(review.scheduledDate) }}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <UAvatar
                      :src="review.buddy?.avatarUrl"
                      :alt="review.buddy?.name"
                      size="sm"
                    />
                    <div class="text-sm">
                      <span class="text-gray-500 dark:text-gray-400"
                        >Buddy:
                      </span>
                      <span class="font-medium text-gray-900 dark:text-white">{{
                        review.buddy?.name
                      }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <UButton :to="`/reviews/${review.id}`" variant="soft">
                    View Details
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>

          <EmptyState
            v-else
            icon="i-heroicons-calendar-days"
            icon-color="text-gray-400"
            icon-bg-color="bg-gray-100 dark:bg-gray-800"
            heading="No upcoming reviews"
            description="You're all caught up! Your buddy will schedule your next review."
            variant="secondary"
          />
        </section>

        <!-- Past Reviews Section -->
        <section>
          <h2
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-archive-box" class="text-gray-500" />
            Past Reviews
          </h2>

          <div
            v-if="pastReviews.length > 0"
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <NuxtLink
              v-for="review in pastReviews"
              :key="review.id"
              :to="`/reviews/${review.id}`"
              class="block group"
            >
              <UCard
                class="h-full hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
              >
                <div class="flex justify-between items-start mb-4">
                  <UBadge
                    :label="
                      formatDate(review.completedDate || review.scheduledDate)
                    "
                    color="neutral"
                    variant="solid"
                  />
                  <UIcon
                    name="i-heroicons-arrow-right"
                    class="text-gray-400 group-hover:text-primary-500"
                  />
                </div>
                <h3 class="font-bold text-lg mb-1">{{ review.name }}</h3>
                <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <UIcon name="i-heroicons-user" class="w-4 h-4" />
                  <span>Buddy: {{ review.buddy?.name || "Unassigned" }}</span>
                </div>
                <div
                  v-if="review.completionNotes"
                  class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"
                >
                  {{ review.completionNotes }}
                </div>
              </UCard>
            </NuxtLink>
          </div>

          <EmptyState
            v-else
            icon="i-heroicons-archive-box"
            icon-color="text-gray-400"
            icon-bg-color="bg-gray-100 dark:bg-gray-800"
            heading="No past reviews"
            description="Your completed reviews will appear here."
            variant="secondary"
          />
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
