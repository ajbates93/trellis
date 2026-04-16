<script setup lang="ts">
definePageMeta({
  layout: "default",
});

useHead({
  title: "Reviews",
});

const toast = useToast();

// Fetch upcoming and past reviews
const { data: upcomingData, refresh: refreshUpcoming } = await useApi(
  "/reviews/upcoming",
);
const { data: pastData } = await useApi("/reviews/past");

const upcomingReviews = computed(() => upcomingData.value?.reviews || []);
const pastReviews = computed(() => pastData.value?.reviews || []);

// Only need formatDate for display in slots
const { formatDate } = useReviewHelpers();
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #body>
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
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
            <ReviewsUpcomingReviewCard
              v-for="(review, index) in upcomingReviews"
              :key="review.id"
              :review="review"
              :index="index"
            >
              <template #metadata="{ review }">
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
              </template>

              <template #actions="{ review }">
                <UButton :to="`/reviews/${review.id}`" variant="soft">
                  View Details
                </UButton>
              </template>
            </ReviewsUpcomingReviewCard>
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
            <ReviewsPastReviewCard
              v-for="review in pastReviews"
              :key="review.id"
              :review="review"
            >
              <template #metadata="{ review }">
                <UIcon name="i-heroicons-user" class="w-4 h-4" />
                <span>Buddy: {{ review.buddy?.name || "Unassigned" }}</span>
              </template>
            </ReviewsPastReviewCard>
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
