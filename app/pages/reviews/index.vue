<script setup lang="ts">
import { format, differenceInDays } from "date-fns";

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

// Fetch current user's buddies
const { data: buddiesData } = await useFetch("/api/users/my-buddies");
const myBuddies = computed(() => buddiesData.value?.users || []);

// Create review modal state
const isCreateModalOpen = ref(false);
const selectedBuddyId = ref<string>("");
const scheduledDate = ref<string>("");
const reviewName = ref<string>("");
const notes = ref<string>("");
const isCreating = ref(false);

// Watch scheduled date to auto-generate review name
watch(scheduledDate, (newDate) => {
  if (newDate) {
    const date = new Date(newDate);
    reviewName.value = format(date, "MMMM yyyy");
  }
});

// Reset form
const resetForm = () => {
  selectedBuddyId.value = "";
  scheduledDate.value = "";
  reviewName.value = "";
  notes.value = "";
};

// Create review
const createReview = async () => {
  if (!selectedBuddyId.value || !scheduledDate.value) {
    toast.add({
      title: "Missing required fields",
      description: "Please select a buddy and scheduled date",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  isCreating.value = true;

  try {
    await $fetch("/api/reviews", {
      method: "POST",
      body: {
        userId: selectedBuddyId.value,
        scheduledDate: scheduledDate.value,
        name: reviewName.value,
        notes: notes.value,
      },
    });

    await refreshUpcoming();
    isCreateModalOpen.value = false;
    resetForm();

    toast.add({
      title: "Review created",
      description: "The review has been scheduled successfully",
      color: "success",
      icon: "i-heroicons-check-circle",
    });
  } catch (error: any) {
    console.error("Failed to create review:", error);
    toast.add({
      title: "Failed to create review",
      description: error?.data?.message || "Please try again",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isCreating.value = false;
  }
};

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
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                Reviews
              </h1>
              <p class="mt-2 text-gray-600 dark:text-gray-400">
                View and manage your review schedule
              </p>
            </div>
            <UButton
              v-if="myBuddies.length > 0"
              icon="i-heroicons-plus"
              @click="isCreateModalOpen = true"
            >
              Create Review
            </UButton>
          </div>
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

      <!-- Create Review Modal -->
      <UModal
        v-model:open="isCreateModalOpen"
        title="Create Review"
        class="sm:max-w-2xl"
        :ui="{
          footer: 'justify-end',
        }"
      >
        <template #body>
          <div class="space-y-4">
            <!-- Buddy Selection -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Select Buddy <span class="text-red-500">*</span>
              </label>
              <USelect
                v-model="selectedBuddyId"
                :items="
                  myBuddies.map((buddy) => ({
                    label: buddy.name,
                    value: buddy.id,
                  }))
                "
                placeholder="Select a buddy"
                size="lg"
              />
            </div>

            <!-- Scheduled Date -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Scheduled Date <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="scheduledDate"
                type="date"
                :min="new Date().toISOString().split('T')[0]"
              />
            </div>

            <!-- Review Name -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Review Name
              </label>
              <UInput
                v-model="reviewName"
                placeholder="e.g., January 2026"
                size="lg"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Auto-generated from date if left empty
              </p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <UTextarea
                v-model="notes"
                placeholder="Add any notes about this review..."
                :rows="4"
              />
            </div>
          </div>
        </template>

        <template #footer>
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="isCreating"
            @click="
              isCreateModalOpen = false;
              resetForm();
            "
          >
            Cancel
          </UButton>
          <UButton
            :loading="isCreating"
            :disabled="!selectedBuddyId || !scheduledDate"
            @click="createReview"
          >
            Create Review
          </UButton>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
