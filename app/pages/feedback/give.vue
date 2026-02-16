<script setup lang="ts">
import type { StepperItem, AccordionItem } from "@nuxt/ui";
import { formatDistanceToNow } from "date-fns";

definePageMeta({
  layout: "default",
});

useHead({
  title: "Give Feedback",
});

const { user } = useAuth();
const toast = useToast();
const { markTaskComplete } = useOnboarding();

// Stepper
const stepper = useTemplateRef("stepper");
const currentStep = ref<string | number>("choose");

const steps: StepperItem[] = [
  {
    title: "Choose a Colleague",
    description: "Who would you like to review?",
    icon: "i-heroicons-users",
    value: "choose",
    slot: "choose",
  },
  {
    title: "Write Feedback",
    description: "Share your thoughts",
    icon: "i-heroicons-pencil-square",
    value: "write",
    slot: "write",
  },
];

// Form state
const selectedUserId = ref<string | null>(null);
const feedbackText = ref("");
const isSubmitting = ref(false);
const showSuccess = ref(false);
const searchQuery = ref("");

// Fetch users
const { data: usersData } = await useFetch("/api/users");
const allUsers = computed(() => usersData.value?.users || []);

// Filter out current user
const availableUsers = computed(() => {
  return allUsers.value.filter((u) => u.id !== user.value?.id);
});

// Smart suggestion
const excludeIds = ref<string[]>([]);
const {
  data: suggestionData,
  refresh: refreshSuggestion,
  status: suggestionStatus,
} = useFetch(() => {
  const params = excludeIds.value.length > 0 ? `?excludeIds=${excludeIds.value.join(",")}` : "";
  return `/api/feedback/suggestions${params}`;
}, { key: () => `suggestion-${excludeIds.value.join(",")}` });

const suggestion = computed(() => suggestionData.value?.suggestion);
const suggestionsExhausted = computed(() => suggestionData.value?.exhausted);
const reviewStatus = computed(() => suggestionData.value?.reviewStatus || {} as Record<string, { lastReviewedAt: string | null; reviewCount: number; reviewedThisWeek: boolean }>);

const suggestSomeoneElse = async () => {
  if (suggestion.value) {
    excludeIds.value = [...excludeIds.value, suggestion.value.user.id];
  }
  await refreshSuggestion();
};

// Fetch random feedback prompt
const { data: promptData, refresh: refreshPrompt } = await useFetch("/api/feedback-prompts/random");
const currentPrompt = computed(() => promptData.value?.prompt);
const isRefreshingPrompt = ref(false);

const randomizePrompt = async () => {
  isRefreshingPrompt.value = true;
  await refreshPrompt();
  isRefreshingPrompt.value = false;
};

// User review status (checked per-user when we have feedback history from suggestion endpoint)
const canReviewUser = ref(true);
const alreadyReviewedWarning = ref(false);

// Get selected user object
const selectedUserObject = computed(() => {
  if (!selectedUserId.value) return null;
  return availableUsers.value.find((u) => u.id === selectedUserId.value) || null;
});

// Build user review info from suggestion data
// We'll fetch can-review status when a user is selected
const checkCanReview = async (userId: string) => {
  try {
    const { alreadyReviewedThisWeek } = await $fetch(`/api/feedback/can-review/${userId}`);
    canReviewUser.value = !alreadyReviewedThisWeek;
    alreadyReviewedWarning.value = alreadyReviewedThisWeek;
  } catch {
    canReviewUser.value = true;
    alreadyReviewedWarning.value = false;
  }
};

// Select a user and move to step 2
const selectUser = async (userId: string) => {
  selectedUserId.value = userId;
  await checkCanReview(userId);
  stepper.value?.next();
};

// Go back to step 1
const goBackToStep1 = () => {
  stepper.value?.prev();
};

// Search filtered users
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return availableUsers.value;
  const q = searchQuery.value.toLowerCase();
  return availableUsers.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
  );
});

// Get last reviewed text for a user from the reviewStatus map
const getLastReviewedText = (userId: string) => {
  const status = reviewStatus.value[userId];
  if (!status) return "";
  if (!status.lastReviewedAt) return "Never reviewed";
  return `Last reviewed ${formatDistanceToNow(new Date(status.lastReviewedAt), { addSuffix: true })}`;
};

// Check if user was reviewed this week
const isReviewedThisWeek = (userId: string) => {
  return reviewStatus.value[userId]?.reviewedThisWeek || false;
};

// Form validation
const isFormValid = computed(() => {
  return selectedUserId.value && feedbackText.value.trim().length >= 10;
});

// Submit feedback
const submitFeedback = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    await $fetch("/api/feedback", {
      method: "POST",
      body: {
        revieweeId: selectedUserId.value,
        content: feedbackText.value,
      },
    });

    showSuccess.value = true;
    markTaskComplete("submit-feedback");

    toast.add({
      title: "Feedback submitted successfully!",
      description: `Your feedback will be shared with ${selectedUserObject.value?.name} during their next buddy review.`,
      color: "success",
      icon: "i-heroicons-check-circle",
    });
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

// Reset and review another
const reviewAnother = () => {
  showSuccess.value = false;
  selectedUserId.value = null;
  feedbackText.value = "";
  canReviewUser.value = true;
  alreadyReviewedWarning.value = false;
  excludeIds.value = [];
  currentStep.value = "choose";
  refreshSuggestion();
};

// Role label helper
const getRoleLabel = (roleType: string | null | undefined) => {
  if (!roleType) return null;
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
    growth: "Growth",
    management: "Management",
  };
  return labels[roleType] || roleType;
};

// Tips accordion items
const tipsAccordionItems: AccordionItem[] = [
  {
    label: "What to Write About",
    icon: "i-heroicons-briefcase",
    content:
      "Projects they've been working on, anything you've noticed they've been trying hard with, how they approached and solved a problem, anything that impressed you.",
  },
  {
    label: "Quick Tips",
    icon: "i-heroicons-light-bulb",
    content:
      "Be specific with examples. Mention the positive impact they had. Balance praise with constructive suggestions. Keep it genuine and thoughtful.",
  },
  {
    label: "Example",
    icon: "i-heroicons-chat-bubble-left-ellipsis",
    content: `"I was really impressed by how you handled the API integration on the dashboard project. When we hit that tricky caching issue, you took the time to properly investigate it rather than just patching it. The solution you came up with was elegant and the documentation you added will help the whole team."`,
  },
  {
    label: "Things to Avoid",
    icon: "i-heroicons-x-circle",
    content:
      'Vague statements like "good job". Feedback without specific examples. Comparisons with other colleagues. Making it personal rather than about the work.',
  },
];
</script>

<template>
  <UDashboardPanel id="give-feedback">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Success State -->
        <div v-if="showSuccess" class="max-w-lg mx-auto text-center py-16 space-y-6">
          <div
            class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-check" class="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Feedback Submitted!
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Your feedback for
              <span class="font-semibold">{{ selectedUserObject?.name }}</span>
              will be shared during their next buddy review.
            </p>
          </div>

          <div class="flex items-center justify-center gap-3">
            <UButton color="primary" size="lg" @click="reviewAnother">
              Review Another Colleague
            </UButton>
            <UButton to="/" variant="outline" color="neutral" size="lg">
              Back to Dashboard
            </UButton>
          </div>
        </div>

        <!-- Stepper Flow -->
        <div v-else>
          <!-- Header -->
          <div class="mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Submit Feedback
            </h1>
            <p class="mt-2 text-gray-500 dark:text-gray-400">
              Share constructive feedback with your colleagues
            </p>
          </div>

          <UStepper
            ref="stepper"
            v-model="currentStep"
            :items="steps"
            disabled
            class="w-full"
          >
            <!-- Step 1: Choose a Colleague -->
            <template #choose>
              <div class="mt-8 space-y-6">
                <!-- Smart Suggestion Card -->
                <div
                  v-if="suggestion && !suggestionsExhausted"
                  class="bg-gradient-to-br from-primary-500/10 to-teal-500/10 dark:from-primary-900/30 dark:to-teal-900/30 border border-primary-200/50 dark:border-primary-700/30 rounded-xl p-5"
                >
                  <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                      <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-primary-700 dark:text-primary-300 mb-3">
                        Suggested for you
                      </p>
                      <div class="flex items-center gap-3 mb-2">
                        <UAvatar
                          :src="suggestion.user.image || suggestion.user.avatarUrl || undefined"
                          :alt="suggestion.user.name"
                          size="lg"
                        />
                        <div>
                          <p class="font-semibold text-gray-900 dark:text-white">
                            {{ suggestion.user.name }}
                          </p>
                          <UBadge
                            v-if="suggestion.user.roleType"
                            :label="getRoleLabel(suggestion.user.roleType) || ''"
                            size="xs"
                            color="neutral"
                            variant="subtle"
                          />
                        </div>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {{ suggestion.reason }}
                      </p>
                      <div class="flex items-center gap-2">
                        <UButton
                          color="primary"
                          @click="selectUser(suggestion.user.id)"
                        >
                          Review {{ suggestion.user.name.split(' ')[0] }}
                        </UButton>
                        <UButton
                          variant="ghost"
                          color="neutral"
                          :loading="suggestionStatus === 'pending'"
                          @click="suggestSomeoneElse"
                        >
                          Suggest someone else
                        </UButton>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Exhausted message -->
                <div
                  v-else-if="suggestionsExhausted"
                  class="bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/30 rounded-xl p-4 text-center"
                >
                  <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p class="font-medium text-green-800 dark:text-green-200">
                    You've reviewed everyone recently!
                  </p>
                  <p class="text-sm text-green-600 dark:text-green-400 mt-1">
                    You can still select someone below to give additional feedback.
                  </p>
                </div>

                <!-- Search -->
                <UInput
                  v-model="searchQuery"
                  placeholder="Search colleagues..."
                  icon="i-heroicons-magnifying-glass"
                  size="lg"
                  class="w-full"
                />

                <!-- User Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FeedbackUserReviewCard
                    v-for="u in filteredUsers"
                    :key="u.id"
                    :user="u"
                    :is-reviewed-this-week="isReviewedThisWeek(u.id)"
                    :last-reviewed-text="getLastReviewedText(u.id)"
                    :is-selected="selectedUserId === u.id"
                    @select="selectUser(u.id)"
                  />
                </div>

                <div v-if="filteredUsers.length === 0" class="text-center py-8">
                  <UIcon name="i-heroicons-user-group" class="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p class="text-gray-500 dark:text-gray-400">
                    No colleagues found matching "{{ searchQuery }}"
                  </p>
                </div>
              </div>
            </template>

            <!-- Step 2: Write Feedback -->
            <template #write>
              <div class="mt-8">
                <!-- Selected user header -->
                <div
                  class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-6"
                >
                  <UAvatar
                    v-if="selectedUserObject"
                    :src="selectedUserObject.image || selectedUserObject.avatarUrl || undefined"
                    :alt="selectedUserObject.name"
                    size="lg"
                  />
                  <div class="flex-1">
                    <p class="font-semibold text-gray-900 dark:text-white">
                      {{ selectedUserObject?.name }}
                    </p>
                    <UBadge
                      v-if="selectedUserObject?.roleType"
                      :label="getRoleLabel(selectedUserObject.roleType) || ''"
                      size="xs"
                      color="neutral"
                      variant="subtle"
                    />
                  </div>
                  <UButton variant="ghost" color="neutral" @click="goBackToStep1">
                    Change
                  </UButton>
                </div>

                <!-- Already reviewed warning -->
                <UAlert
                  v-if="alreadyReviewedWarning"
                  icon="i-heroicons-exclamation-triangle"
                  color="warning"
                  title="Already reviewed this week"
                  description="You've already given feedback to this person this week. You can still submit more feedback if needed."
                  class="mb-6"
                />

                <!-- Two-column layout -->
                <div class="flex flex-col lg:flex-row gap-8">
                  <!-- Left: Textarea + buttons -->
                  <div class="flex-1 space-y-4">
                    <form class="space-y-4" @submit.prevent="submitFeedback">
                      <div>
                        <UTextarea
                          v-model="feedbackText"
                          :rows="14"
                          placeholder="Share your feedback here... Be specific, constructive, and kind."
                          class="w-full"
                          autofocus
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

                      <div class="flex items-center justify-between pt-2">
                        <UButton variant="ghost" color="neutral" @click="goBackToStep1">
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

                  <!-- Right: Tips sidebar -->
                  <div class="lg:w-[340px] flex-shrink-0">
                    <div class="lg:sticky lg:top-8 space-y-5">
                      <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-primary-500" />
                          Writing Great Feedback
                        </h2>
                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Help your colleagues grow
                        </p>
                      </div>

                      <UAccordion
                        :items="tipsAccordionItems"
                        type="multiple"
                        :default-value="['What to Write About']"
                      />

                      <!-- Question Generator -->
                      <div v-if="currentPrompt" class="space-y-3">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                          Need a Starting Point?
                        </h3>
                        <div
                          class="bg-primary-50/50 dark:bg-primary-900/10 border border-primary-200/50 dark:border-primary-700/30 rounded-xl p-4 space-y-3"
                        >
                          <div class="flex items-start gap-3">
                            <UIcon
                              name="i-heroicons-light-bulb"
                              class="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0"
                            />
                            <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {{ currentPrompt.question }}
                            </p>
                          </div>
                          <button
                            type="button"
                            class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 bg-primary-100/50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
                            :disabled="isRefreshingPrompt"
                            @click="randomizePrompt"
                          >
                            <UIcon
                              name="i-heroicons-arrow-path"
                              class="w-4 h-4"
                              :class="{ 'animate-spin': isRefreshingPrompt }"
                            />
                            <span>Generate new question</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UStepper>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
