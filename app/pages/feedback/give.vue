<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const { user } = useAuth();

// Form state
const selectedUser = ref(null);
const feedbackText = ref("");
const isSubmitting = ref(false);
const showSuccess = ref(false);

// Fetch users from API
const { data: usersData } = await useFetch("/api/users");
const users = computed(() => usersData.value?.users || []);

// Fetch random feedback prompt
const { data: promptData } = await useFetch("/api/feedback-prompts/random");
const currentPrompt = computed(() => promptData.value?.prompt);

// Filter out current user from list and format for USelectMenu
const availableUsers = computed(() => {
  return users.value
    .filter((u) => u.id !== user.value?.id)
    .map((u) => ({
      ...u,
      label: u.name, // USelectMenu needs a 'label' property
      value: u.id,
    }));
});

// Check if user can give feedback (not already reviewed this week)
const canReviewUser = ref(true); // Will be checked via API

// Form validation
const isFormValid = computed(() => {
  return (
    selectedUser.value &&
    feedbackText.value.trim().length >= 10 &&
    canReviewUser.value
  );
});

// Submit feedback
const submitFeedback = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: {
        revieweeId: selectedUser.value.id,
        content: feedbackText.value,
      },
    });

    showSuccess.value = true;

    // Reset form after 2 seconds
    setTimeout(() => {
      selectedUser.value = null;
      feedbackText.value = "";
      showSuccess.value = false;
    }, 2000);
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    // TODO: Show error toast notification
    alert("Failed to submit feedback. Please try again.");
  } finally {
    isSubmitting.value = false;
  }
};

// Watch selected user to check if can review
watch(selectedUser, async (newUser) => {
  if (newUser) {
    try {
      const { alreadyReviewedThisWeek } = await $fetch(
        `/api/feedback/can-review/${newUser.id}`
      );
      canReviewUser.value = !alreadyReviewedThisWeek;
    } catch (error) {
      console.error("Failed to check review status:", error);
      canReviewUser.value = true; // Allow on error
    }
  }
});
</script>

<template>
  <UDashboardPanel id="give-feedback">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Give Feedback
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Share constructive feedback with your colleagues
          </p>
        </div>
        <!-- Success Message -->
        <UCard v-if="showSuccess" class="mb-6 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <div class="flex items-center gap-3">
            <UIcon name="i-heroicons-check-circle" class="text-green-500 text-2xl" />
            <div>
              <p class="font-semibold text-green-900 dark:text-green-100">
                Feedback submitted successfully!
              </p>
              <p class="text-sm text-green-700 dark:text-green-300">
                Your feedback has been sent to {{ selectedUser?.name }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Feedback Form -->
        <UCard>
          <form @submit.prevent="submitFeedback" class="space-y-6">
            <!-- Random Question Display -->
            <div v-if="currentPrompt" class="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div class="flex items-start gap-3">
                <UIcon name="i-heroicons-light-bulb" class="text-primary text-xl mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question to consider:
                  </p>
                  <p class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ currentPrompt.question }}
                  </p>
                </div>
              </div>
            </div>

            <!-- User Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Who would you like to give feedback to?
              </label>
              <USelectMenu
                v-model="selectedUser"
                :items="availableUsers"
                placeholder="Search for a colleague..."
                value-key="id"
                :search-input="{ placeholder: 'Search colleagues...' }"
              >
                <template #leading>
                  <UAvatar
                    v-if="selectedUser"
                    :src="selectedUser.image || selectedUser.avatarUrl"
                    :alt="selectedUser.name"
                    size="xs"
                  />
                </template>

                <template #item="{ item }">
                  <div class="flex items-center gap-3 w-full">
                    <UAvatar
                      :src="item.image || item.avatarUrl"
                      :alt="item.name"
                      size="sm"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-900 dark:text-white truncate">
                        {{ item.name }}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {{ item.email }}
                      </p>
                    </div>
                    <UBadge v-if="item.roleType" :label="item.roleType" size="xs" color="neutral" />
                  </div>
                </template>

                <template #empty>
                  <div class="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">
                    No colleagues found
                  </div>
                </template>
              </USelectMenu>

              <!-- Warning if already reviewed this week -->
              <div
                v-if="selectedUser && !canReviewUser"
                class="mt-2 flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400"
              >
                <UIcon name="i-heroicons-exclamation-triangle" class="mt-0.5" />
                <p>
                  You've already given feedback to this person this week. You can still
                  submit more feedback if needed.
                </p>
              </div>
            </div>

            <!-- Feedback Text Area -->
            <div>
              <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Your Feedback
              </label>
              <UTextarea
                v-model="feedbackText"
                :rows="12"
                placeholder="Share your feedback here... Be specific, constructive, and kind."
                :disabled="!selectedUser"
                class="w-full"
                :ui="{ wrapper: 'w-full' }"
              />
              <div class="mt-2 flex items-center justify-between text-sm">
                <p
                  :class="[
                    'text-gray-500 dark:text-gray-400',
                    feedbackText.length < 10 && feedbackText.length > 0
                      ? 'text-red-500'
                      : '',
                  ]"
                >
                  {{ feedbackText.length }} characters (minimum 10)
                </p>
              </div>
            </div>

            <!-- Guidelines -->
            <UCard :ui="{ body: 'space-y-2' }" class="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
              <div class="flex items-start gap-2">
                <UIcon name="i-heroicons-light-bulb" class="text-blue-500 mt-0.5" />
                <div class="text-sm text-blue-900 dark:text-blue-100">
                  <p class="font-semibold mb-2">Tips for great feedback:</p>
                  <ul class="space-y-1 list-disc list-inside text-blue-700 dark:text-blue-300">
                    <li>Be specific with examples</li>
                    <li>Balance positive recognition with constructive suggestions</li>
                    <li>Consider impact and suggest improvements</li>
                  </ul>
                </div>
              </div>
            </UCard>

            <!-- Submit Button -->
            <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
              <UButton
                to="/"
                color="white"
                variant="ghost"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="lg"
                :disabled="!isFormValid || isSubmitting"
                :loading="isSubmitting"
              >
                {{ isSubmitting ? "Submitting..." : "Submit Feedback" }}
              </UButton>
            </div>
          </form>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
