<script setup lang="ts">
import type { AccordionItem } from "@nuxt/ui";
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

// Form state
const selectedUserId = ref<string | null>(null);
const feedbackText = ref("");
const isSubmitting = ref(false);
const showSuccess = ref(false);
const searchQuery = ref("");
const showColleaguePicker = ref(false);

// Fetch users
const { data: usersData } = await useApi("/users");
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
} = useApi(
  () => {
    const params =
      excludeIds.value.length > 0
        ? `?excludeIds=${excludeIds.value.join(",")}`
        : "";
    return `/feedback/suggestions${params}`;
  },
  { key: () => `suggestion-${excludeIds.value.join(",")}` },
);

const suggestion = computed(() => suggestionData.value?.suggestion);
const suggestionsExhausted = computed(() => suggestionData.value?.exhausted);
const reviewStatus = computed(() => {
  // The suggestions route returns a union: the "exhausted" shape has no
  // reviewStatus key, so narrow before accessing it.
  const data = suggestionData.value;
  if (data && "reviewStatus" in data && data.reviewStatus) {
    return data.reviewStatus;
  }
  return {} as Record<
    string,
    {
      lastReviewedAt: string | null;
      reviewCount: number;
      reviewedThisWeek: boolean;
    }
  >;
});

// Fetch random feedback prompt
const { data: promptData, refresh: refreshPrompt } = await useApi(
  "/feedback-prompts/random",
);
const currentPrompt = computed(() => promptData.value?.prompt);
const isRefreshingPrompt = ref(false);

const randomizePrompt = async () => {
  isRefreshingPrompt.value = true;
  await refreshPrompt();
  isRefreshingPrompt.value = false;
};

// User review status
const canReviewUser = ref(true);
const alreadyReviewedWarning = ref(false);

// Get selected user object
const selectedUserObject = computed(() => {
  if (!selectedUserId.value) return null;
  return (
    availableUsers.value.find((u) => u.id === selectedUserId.value) || null
  );
});

const checkCanReview = async (userId: string) => {
  try {
    const { alreadyReviewedThisWeek } = await $api(
      `/feedback/can-review/${userId}`,
    );
    canReviewUser.value = !alreadyReviewedThisWeek;
    alreadyReviewedWarning.value = alreadyReviewedThisWeek;
  } catch {
    canReviewUser.value = true;
    alreadyReviewedWarning.value = false;
  }
};

// Auto-select suggested user when data loads
watch(
  suggestionData,
  (data) => {
    if (data?.suggestion && !selectedUserId.value) {
      selectedUserId.value = data.suggestion.user.id;
      checkCanReview(data.suggestion.user.id);
    }
  },
  { immediate: true },
);

// Select a user from the colleague picker
const selectUser = async (userId: string) => {
  selectedUserId.value = userId;
  await checkCanReview(userId);
  showColleaguePicker.value = false;
  searchQuery.value = "";
};

// Search filtered users
const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return availableUsers.value;
  const q = searchQuery.value.toLowerCase();
  return availableUsers.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
});

// Get last reviewed text for a user
const getLastReviewedText = (userId: string) => {
  const status = reviewStatus.value[userId];
  if (!status) return "";
  if (!status.lastReviewedAt) return "Not yet given feedback";
  return `Feedback given ${formatDistanceToNow(new Date(status.lastReviewedAt), { addSuffix: true })}`;
};

// Check if user was reviewed this week
const isReviewedThisWeek = (userId: string) => {
  return reviewStatus.value[userId]?.reviewedThisWeek || false;
};

// Get subtitle text for the selected user card
const selectedUserSubtext = computed(() => {
  if (suggestion.value && selectedUserId.value === suggestion.value.user.id) {
    return suggestion.value.reason;
  }
  if (selectedUserId.value) {
    return getLastReviewedText(selectedUserId.value) || null;
  }
  return null;
});

// Form validation
const isFormValid = computed(() => {
  return selectedUserId.value && feedbackText.value.trim().length >= 10;
});

// Submit feedback
const submitFeedback = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;

  try {
    await $api("/feedback", {
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
  showColleaguePicker.value = false;
  searchQuery.value = "";
  refreshSuggestion();
};

// Role-based text color for role labels
const getRoleColor = (roleType: string | null | undefined): string => {
  switch (roleType) {
    case "dev":
      return "text-blue-600 dark:text-blue-400";
    case "design":
      return "text-purple-600 dark:text-purple-400";
    case "qa":
      return "text-amber-600 dark:text-amber-400";
    case "growth":
      return "text-emerald-600 dark:text-emerald-400";
    case "management":
      return "text-rose-600 dark:text-rose-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
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
      <div class="pt-16 sm:pt-16 lg:pt-8 lg:px-2">
        <!-- Success State -->
        <div
          v-if="showSuccess"
          class="max-w-md mx-auto text-center py-20 space-y-8"
        >
          <div class="relative w-24 h-24 mx-auto">
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-teal-500/20 animate-ping"
              style="animation-duration: 2s"
            />
            <div
              class="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-xl shadow-primary-500/25"
            >
              <UIcon name="i-heroicons-check" class="w-12 h-12 text-white" />
            </div>
          </div>

          <div class="space-y-2">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Feedback Submitted!
            </h1>
            <p class="text-gray-500 dark:text-gray-400">
              Your feedback for
              <span class="font-semibold text-gray-900 dark:text-white">{{
                selectedUserObject?.name
              }}</span>
              will be shared during their next buddy review.
            </p>
          </div>

          <div class="flex items-center justify-center gap-3 pt-2">
            <UButton color="primary" size="lg" @click="reviewAnother">
              Review Another Colleague
            </UButton>
            <UButton to="/dashboard" variant="ghost" color="neutral" size="lg">
              Back to Dashboard
            </UButton>
          </div>
        </div>

        <!-- Main Single-Page Layout -->
        <div v-else class="space-y-6">
          <!-- Page Header -->
          <div>
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-paper-airplane-solid"
                class="text-primary-600 dark:text-primary-400 text-3xl sm:text-4xl flex-shrink-0"
              />
              <h1
                class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
              >
                Submit Feedback
              </h1>
            </div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Share feedback with a colleague - it'll be shared during their
              next buddy review
            </p>
          </div>

          <!-- Selected User Card -->
          <div v-if="selectedUserObject && !suggestionsExhausted">
            <div
              class="relative overflow-hidden rounded-xl border border-teal-300 dark:border-teal-700/30 bg-teal-100 dark:bg-teal-900/20"
            >
              <div class="relative p-5 sm:p-6">
                <div class="flex items-center gap-4">
                  <UAvatar
                    :src="
                      selectedUserObject.image ||
                      selectedUserObject.avatarUrl ||
                      undefined
                    "
                    :alt="selectedUserObject.name"
                    size="xl"
                    :ui="{ root: 'ring-2 ring-primary-500/30 dark:ring-white/10' }"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p
                        class="text-lg font-bold text-gray-900 dark:text-white"
                      >
                        {{ selectedUserObject.name }}
                      </p>
                      <span
                        v-if="getRoleLabel(selectedUserObject.roleType)"
                        class="text-xs font-medium"
                        :class="getRoleColor(selectedUserObject.roleType)"
                      >
                        {{ getRoleLabel(selectedUserObject.roleType) }}
                      </span>
                    </div>
                    <p
                      v-if="selectedUserSubtext"
                      class="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
                    >
                      {{ selectedUserSubtext }}
                    </p>
                  </div>
                  <button
                    class="flex-shrink-0 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                    @click="showColleaguePicker = !showColleaguePicker"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- All Caught Up Banner (when no selected user or suggestions exhausted) -->
          <div v-else-if="suggestionsExhausted">
            <div
              class="rounded-xl border border-green-500/20 dark:border-green-500/15 bg-green-500/[0.05] dark:bg-green-500/[0.08] p-5"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-green-800 dark:text-green-200">
                    You've reviewed everyone recently - nice work!
                  </p>
                  <p
                    class="text-sm text-green-600/80 dark:text-green-400/70 mt-1"
                  >
                    You can still select someone below to add more feedback.
                  </p>
                </div>
                <button
                  class="flex-shrink-0 text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 font-medium transition-colors"
                  @click="showColleaguePicker = !showColleaguePicker"
                >
                  {{ selectedUserObject ? "Change" : "Choose" }}
                </button>
              </div>
            </div>

            <!-- Show selected user below the banner if one is picked -->
            <div
              v-if="selectedUserObject"
              class="mt-3 flex items-center gap-3 px-1"
            >
              <UAvatar
                :src="
                  selectedUserObject.image ||
                  selectedUserObject.avatarUrl ||
                  undefined
                "
                :alt="selectedUserObject.name"
                size="md"
              />
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">
                  {{ selectedUserObject.name }}
                </p>
                <span
                  v-if="getRoleLabel(selectedUserObject.roleType)"
                  class="text-xs font-medium"
                  :class="getRoleColor(selectedUserObject.roleType)"
                >
                  {{ getRoleLabel(selectedUserObject.roleType) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Loading state while suggestion loads -->
          <div
            v-else-if="suggestionStatus === 'pending'"
            class="rounded-xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
              />
              <div class="space-y-2">
                <div
                  class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                />
                <div
                  class="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                />
              </div>
            </div>
          </div>

          <!-- Collapsible Colleague Picker -->
          <div v-if="selectedUserId || suggestionsExhausted">
            <button
              class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              @click="showColleaguePicker = !showColleaguePicker"
            >
              <UIcon
                name="i-heroicons-chevron-right"
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'rotate-90': showColleaguePicker }"
              />
              <span
                >Choose a different colleague ({{
                  availableUsers.length
                }})</span
              >
            </button>

            <div v-if="showColleaguePicker" class="mt-3 space-y-3">
              <!-- Search -->
              <UInput
                v-model="searchQuery"
                placeholder="Search colleagues..."
                icon="i-heroicons-magnifying-glass"
                class="w-full"
              />

              <!-- Compact list -->
              <div
                class="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto bg-white dark:bg-transparent"
              >
                <button
                  v-for="u in filteredUsers"
                  :key="u.id"
                  class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  :class="{
                    'bg-primary-50/50 dark:bg-primary-900/10':
                      selectedUserId === u.id,
                  }"
                  @click="selectUser(u.id)"
                >
                  <UAvatar
                    :src="u.image || u.avatarUrl || undefined"
                    :alt="u.name"
                    size="sm"
                  />
                  <span
                    class="font-medium text-sm text-gray-900 dark:text-white truncate"
                    >{{ u.name }}</span
                  >
                  <span
                    v-if="getRoleLabel(u.roleType)"
                    class="text-xs font-medium"
                    :class="getRoleColor(u.roleType)"
                  >
                    {{ getRoleLabel(u.roleType) }}
                  </span>
                  <span
                    v-if="isReviewedThisWeek(u.id)"
                    class="text-xs text-green-600 dark:text-green-400"
                  >
                    Reviewed
                  </span>
                  <span
                    class="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:inline"
                  >
                    {{ getLastReviewedText(u.id) }}
                  </span>
                </button>
              </div>

              <div v-if="filteredUsers.length === 0" class="text-center py-6">
                <p class="text-gray-400 dark:text-gray-500 text-sm">
                  No one found matching "{{ searchQuery }}"
                </p>
              </div>
            </div>
          </div>

          <!-- Feedback Form + Writing Tips -->
          <div v-if="selectedUserId" class="flex flex-col lg:flex-row gap-8">
            <!-- Left: Form -->
            <div class="flex-1">
              <form class="space-y-4" @submit.prevent="submitFeedback">
                <!-- Already reviewed warning -->
                <UAlert
                  v-if="alreadyReviewedWarning"
                  icon="i-heroicons-exclamation-triangle"
                  color="warning"
                  variant="subtle"
                  title="Already reviewed this week"
                  description="You've already given feedback to this person this week. You can still submit more if needed."
                />

                <!-- Question Prompt -->
                <div
                  v-if="currentPrompt"
                  class="flex items-start gap-3 rounded-lg bg-teal-100 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700/30 px-4 py-3"
                >
                  <UIcon
                    name="i-heroicons-light-bulb"
                    class="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5"
                  />
                  <div class="flex-1 min-w-0">
                    <p
                      class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                    >
                      <span
                        class="font-medium text-teal-600 dark:text-teal-400"
                        >Need inspiration?</span
                      >
                      {{ currentPrompt.question }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="flex-shrink-0 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                    :disabled="isRefreshingPrompt"
                    @click="randomizePrompt"
                  >
                    <UIcon
                      name="i-heroicons-arrow-path"
                      class="w-4 h-4"
                      :class="{ 'animate-spin': isRefreshingPrompt }"
                    />
                  </button>
                </div>

                <div>
                  <UTextarea
                    v-model="feedbackText"
                    :rows="14"
                    placeholder="What have you noticed about their work recently? Be specific - examples make feedback actionable."
                    class="w-full"
                    autofocus
                  />
                  <p
                    class="mt-2 text-xs"
                    :class="[
                      feedbackText.length < 10 && feedbackText.length > 0
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500',
                    ]"
                  >
                    {{ feedbackText.length }} characters (minimum 10)
                  </p>
                </div>

                <div class="flex items-center justify-end gap-3 pt-2">
                  <UButton
                    type="submit"
                    color="primary"
                    size="lg"
                    :disabled="!isFormValid || isSubmitting"
                    :loading="isSubmitting"
                  >
                    Submit Feedback
                  </UButton>
                </div>
              </form>
            </div>

            <!-- Right: Writing Tips sidebar -->
            <div class="lg:w-[320px] flex-shrink-0">
              <div class="lg:sticky lg:top-8 space-y-5">
                <UAccordion
                  :items="tipsAccordionItems"
                  type="multiple"
                  :default-value="['What to Write About']"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
