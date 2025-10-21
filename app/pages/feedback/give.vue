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

// Mock users list - will be replaced with API call
const users = ref([
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@pocketworks.co.uk",
    avatarUrl: "https://avatar.vercel.sh/john",
    roleType: "dev",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@pocketworks.co.uk",
    avatarUrl: "https://avatar.vercel.sh/jane",
    roleType: "design",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob.johnson@pocketworks.co.uk",
    avatarUrl: "https://avatar.vercel.sh/bob",
    roleType: "qa",
  },
]);

// Filter out current user from list
const availableUsers = computed(() => {
  return users.value.filter((u) => u.id !== user.value?.id);
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
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Give Feedback
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Share constructive feedback with your colleagues
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
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
            <!-- User Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Who would you like to give feedback to?
              </label>
              <USelectMenu
                v-model="selectedUser"
                :options="availableUsers"
                placeholder="Search for a colleague..."
                searchable
                value-attribute="id"
              >
                <template #label>
                  <div v-if="selectedUser" class="flex items-center gap-2">
                    <UAvatar
                      :src="selectedUser.avatarUrl"
                      :alt="selectedUser.name"
                      size="xs"
                    />
                    <span>{{ selectedUser.name }}</span>
                  </div>
                  <span v-else class="text-gray-500">Select a colleague...</span>
                </template>

                <template #option="{ option }">
                  <div class="flex items-center gap-3 w-full">
                    <UAvatar
                      :src="option.avatarUrl"
                      :alt="option.name"
                      size="sm"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-900 dark:text-white truncate">
                        {{ option.name }}
                      </p>
                      <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {{ option.email }}
                      </p>
                    </div>
                    <UBadge :label="option.roleType" size="xs" color="neutral" />
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
                :rows="8"
                placeholder="Share your feedback here... Be specific, constructive, and kind."
                :disabled="!selectedUser"
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
                    <li>Focus on behaviors, not personality</li>
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
