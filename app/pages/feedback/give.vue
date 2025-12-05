<script setup lang="ts">
definePageMeta({
  layout: "default",
});

const { user } = useAuth();
const toast = useToast();

// Form state
const selectedUser = ref(null);
const feedbackText = ref("");
const isSubmitting = ref(false);
const showSuccess = ref(false);

// Fetch users from API
const { data: usersData } = await useFetch("/api/users");
const users = computed(() => usersData.value?.users || []);

// Fetch random feedback prompt
const { data: promptData, refresh: refreshPrompt } = await useFetch("/api/feedback-prompts/random");
const currentPrompt = computed(() => promptData.value?.prompt);
const isRefreshingPrompt = ref(false);

// Randomize the question prompt
const randomizePrompt = async () => {
  isRefreshingPrompt.value = true;
  await refreshPrompt();
  isRefreshingPrompt.value = false;
};

// Filter out current user from list and format for USelectMenu
const availableUsers = computed(() => {
  return users.value
    .filter((u) => u.id !== user.value?.id)
    .map((u) => ({
      ...u,
      label: u.name,
      value: u.id,
    }));
});

// Check if user can give feedback (not already reviewed this week)
const canReviewUser = ref(true);

// Form validation
const isFormValid = computed(() => {
  return (
    selectedUser.value &&
    feedbackText.value.trim().length >= 10 &&
    canReviewUser.value
  );
});

// Get the selected user object from the ID
const selectedUserObject = computed(() => {
  if (!selectedUser.value) return null;
  return availableUsers.value.find((u) => u.id === selectedUser.value);
});

// Submit feedback
const submitFeedback = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: {
        revieweeId: selectedUser.value,
        content: feedbackText.value,
      },
    });

    showSuccess.value = true;

    toast.add({
      title: "Feedback submitted successfully!",
      description: `Your feedback will be shared with ${selectedUserObject.value?.name} during their next buddy review.`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });

    setTimeout(() => {
      selectedUser.value = null;
      feedbackText.value = "";
      showSuccess.value = false;
    }, 2000);
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    toast.add({
      title: "Failed to submit feedback",
      description: "Please try again.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Watch selected user to check if can review
watch(selectedUser, async (userId) => {
  if (userId) {
    try {
      const { alreadyReviewedThisWeek } = await $fetch(
        `/api/feedback/can-review/${userId}`,
      );
      canReviewUser.value = !alreadyReviewedThisWeek;
    } catch (error) {
      console.error("Failed to check review status:", error);
      canReviewUser.value = true;
    }
  }
});
</script>

<template>
  <UDashboardPanel id="give-feedback">
    <template #body>
      <div class="p-4 sm:p-6 lg:p-8">
        <!-- Two-column layout -->
        <div class="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <!-- Left Column: Form -->
          <div class="flex-1 max-w-2xl space-y-6">
            <!-- Header -->
            <div class="animate-item" :style="{ '--delay': '0ms' }">
              <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Submit Feedback
              </h1>
              <p class="mt-2 text-gray-500 dark:text-gray-400">
                Share constructive feedback with your colleagues
              </p>
            </div>

            <!-- Success Message -->
            <div
              v-if="showSuccess"
              class="animate-item bg-gradient-to-br from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 border border-teal-200/50 dark:border-teal-700/30 rounded-xl p-4"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-100 dark:bg-teal-900/40">
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-5 h-5 text-teal-600 dark:text-teal-400"
                  />
                </div>
                <div>
                  <p class="font-semibold text-gray-900 dark:text-white">
                    Feedback submitted successfully!
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Your feedback will be shared with
                    {{ selectedUserObject?.name }} during their next buddy review.
                  </p>
                </div>
              </div>
            </div>

            <!-- Random Question Prompt -->
            <div
              v-if="currentPrompt"
              class="animate-item bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200/50 dark:border-primary-700/30 rounded-xl p-4"
              :style="{ '--delay': '100ms' }"
            >
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary-100 dark:bg-primary-900/40">
                  <UIcon
                    name="i-heroicons-light-bulb"
                    class="w-4 h-4 text-primary-600 dark:text-primary-400"
                  />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Question to consider:
                  </p>
                  <div class="flex items-start justify-between gap-4">
                    <p class="text-base font-semibold text-gray-900 dark:text-white">
                      {{ currentPrompt.question }}
                    </p>
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-100/50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors flex-shrink-0"
                      :disabled="isRefreshingPrompt"
                      @click="randomizePrompt"
                    >
                      <UIcon
                        name="i-heroicons-arrow-path"
                        class="w-3.5 h-3.5"
                        :class="{ 'animate-spin': isRefreshingPrompt }"
                      />
                      <span>New question</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Form -->
            <form class="space-y-6" @submit.prevent="submitFeedback">
              <!-- User Selection -->
              <div class="animate-item" :style="{ '--delay': '200ms' }">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Who would you like to give feedback to?
                </label>
                <USelectMenu
                  v-model="selectedUser"
                  :items="availableUsers"
                  placeholder="Search for a colleague..."
                  value-key="id"
                  :search-input="{ placeholder: 'Search colleagues...' }"
                  class="w-full"
                >
                  <template #leading>
                    <UAvatar
                      v-if="selectedUserObject"
                      :src="selectedUserObject.image || selectedUserObject.avatarUrl"
                      :alt="selectedUserObject.name"
                      size="xs"
                    />
                    <UIcon
                      v-else
                      name="i-heroicons-user-circle"
                      class="w-5 h-5 text-gray-400 dark:text-gray-500"
                    />
                  </template>

                  <template #item="{ item }">
                    <div class="flex items-center gap-4 w-full">
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
                      <UBadge
                        v-if="item.roleType"
                        :label="item.roleType"
                        size="xs"
                        color="neutral"
                      />
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
                  class="mt-3 flex items-start gap-2 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/30 rounded-lg text-sm"
                >
                  <UIcon
                    name="i-heroicons-exclamation-triangle"
                    class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                  />
                  <p class="text-amber-700 dark:text-amber-300">
                    You've already given feedback to this person this week. You
                    can still submit more feedback if needed.
                  </p>
                </div>
              </div>

              <!-- Feedback Text Area -->
              <div class="animate-item" :style="{ '--delay': '300ms' }">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Feedback
                </label>
                <UTextarea
                  v-model="feedbackText"
                  :rows="12"
                  placeholder="Share your feedback here... Be specific, constructive, and kind."
                  :disabled="!selectedUser"
                  class="w-full"
                />
                <div class="mt-2 flex items-center justify-between">
                  <p
                    class="text-sm"
                    :class="[
                      feedbackText.length < 10 && feedbackText.length > 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400',
                    ]"
                  >
                    {{ feedbackText.length }} characters (minimum 10)
                  </p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="animate-item flex items-center justify-between pt-2" :style="{ '--delay': '400ms' }">
                <UButton to="/" variant="ghost" color="neutral">
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
          </div>

          <!-- Right Column: Tips Sidebar (Sticky) -->
          <div class="lg:w-80 xl:w-96 flex-shrink-0">
            <div class="lg:sticky lg:top-8 space-y-6 animate-item" :style="{ '--delay': '200ms' }">
              <!-- Tips Header -->
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
                  Writing Great Feedback
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Help your colleagues grow
                </p>
              </div>

              <!-- What to Write About -->
              <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  What to Write About
                </h3>
                <div class="space-y-2">
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-briefcase" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Projects they've been working on</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-fire" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Anything you've noticed they've been trying hard with</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-puzzle-piece" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">How they approached and solved a problem</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-star" class="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Anything that impressed you</span>
                  </div>
                </div>
              </div>

              <!-- Quick Tips -->
              <div class="space-y-3">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Quick Tips
                </h3>
                <div class="space-y-2">
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Be specific with examples</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Mention the positive impact they had</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Balance praise with constructive suggestions</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Keep it genuine and thoughtful</span>
                  </div>
                </div>
              </div>

              <!-- Example Feedback -->
              <div class="space-y-3">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Example
                </h3>
                <div class="bg-primary-50/30 dark:bg-primary-900/10 border border-primary-200/30 dark:border-primary-700/20 rounded-xl p-4">
                  <p class="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    "I was really impressed by how you handled the API integration on the dashboard project.
                    When we hit that tricky caching issue, you took the time to properly investigate it
                    rather than just patching it. The solution you came up with was elegant and the documentation
                    you added will help the whole team. Maybe next time we could pair on the initial design
                    to catch these edge cases earlier?"
                  </p>
                </div>
              </div>

              <!-- Avoid Section -->
              <div class="space-y-3">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Things to Avoid
                </h3>
                <div class="space-y-2">
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-x-circle" class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Vague statements like "good job"</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-x-circle" class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Feedback without specific examples</span>
                  </div>
                  <div class="flex items-start gap-2 text-sm">
                    <UIcon name="i-heroicons-x-circle" class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span class="text-gray-600 dark:text-gray-400">Comparisons with other colleagues</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
.animate-item {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
