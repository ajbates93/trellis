<script setup lang="ts">
import { format } from "date-fns";

definePageMeta({
  middleware: ["auth", "buddy"],
});

const route = useRoute();
const buddyId = computed(() => route.params.id as string);

// Fetch buddy profile
const {
  data: buddyData,
  pending,
  error,
} = useFetch(() => `/api/buddies/${buddyId.value}`, { watch: [buddyId] });

const buddy = computed(() => buddyData.value?.buddy);

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "Not set";
  return format(new Date(date), "MMMM d, yyyy");
};

const getAvatarUrl = (buddyProfile: typeof buddy.value) => {
  if (!buddyProfile) return "";
  if (buddyProfile.avatarUrl) return buddyProfile.avatarUrl;
  const name =
    buddyProfile.preferredName || buddyProfile.name || buddyProfile.email;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`;
};

const getRoleLabel = (roleType: string | null | undefined) => {
  if (!roleType) return "Not assigned";
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
  };
  return labels[roleType] || roleType;
};

const getReviewPreferenceLabel = (preference: string | null | undefined) => {
  if (!preference) return "Not set";
  const labels: Record<string, string> = {
    "in-person": "In-Person",
    remote: "Remote (Video Call)",
    hybrid: "Flexible (Both)",
    "no-preference": "No Preference",
  };
  return labels[preference] || preference;
};
</script>

<template>
  <UDashboardPanel id="buddy-profile">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Back button -->
        <div class="mb-4">
          <NuxtLink to="/buddies"
            class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            Back to Buddies
          </NuxtLink>
        </div>

        <!-- Loading state -->
        <div v-if="pending" class="flex justify-center py-16">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary animate-spin" />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-16 px-6 rounded-xl bg-red-50 dark:bg-red-900/20">
          <div
            class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Unable to load profile
          </h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {{
              error.statusCode === 403
                ? "You are not authorized to view this buddy's profile."
                : "Something went wrong loading this profile. Please try again."
            }}
          </p>
          <NuxtLink to="/buddies">
            <UButton class="mt-6" variant="outline">
              Return to Buddies
            </UButton>
          </NuxtLink>
        </div>

        <!-- Profile content -->
        <div v-else-if="buddy">
          <!-- Page header -->
          <div class="mb-8">
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              {{ buddy.preferredName || buddy.name }}'s Profile
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              View your buddy's profile and communication preferences
            </p>
          </div>

          <!-- Main content grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left column: Avatar and basic info -->
            <div class="lg:col-span-1">
              <!-- Avatar section -->
              <UCard class="mb-6">
                <div class="text-center">
                  <div class="mb-4 flex justify-center">
                    <img :src="getAvatarUrl(buddy)" :alt="buddy.name" class="w-32 h-32 rounded-lg object-cover" />
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ buddy.preferredName || buddy.name }}
                  </h3>
                  <p v-if="buddy.pronouns" class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {{ buddy.pronouns }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-500 mt-3">
                    {{ buddy.email }}
                  </p>
                </div>
              </UCard>

              <!-- Info card -->
              <UCard>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                <div class="space-y-3 text-sm">
                  <div>
                    <p class="text-gray-600 dark:text-gray-400">Role</p>
                    <p class="text-gray-900 dark:text-white font-medium">
                      {{ getRoleLabel(buddy.roleType) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-600 dark:text-gray-400">Member Since</p>
                    <p class="text-gray-900 dark:text-white font-medium">
                      {{ formatDate(buddy.createdAt) }}
                    </p>
                  </div>
                </div>
              </UCard>
            </div>

            <!-- Right column: Profile info (read-only) -->
            <div class="lg:col-span-2 space-y-6">
              <!-- About Section -->
              <UCard>
                <template #header>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    About
                  </h3>
                </template>

                <div v-if="buddy.bio" class="prose prose-sm dark:prose-invert max-w-none">
                  <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {{ buddy.bio }}
                  </p>
                </div>
                <p v-else class="text-gray-500 dark:text-gray-400 text-sm italic">
                  No bio provided
                </p>
              </UCard>

              <!-- Trellis Preferences Section -->
              <UCard>
                <template #header>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    Trellis Preferences
                  </h3>
                </template>

                <div class="space-y-6">
                  <!-- Review Preference -->
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Review Preference
                    </p>
                    <p class="text-gray-900 dark:text-white">
                      {{ getReviewPreferenceLabel(buddy.reviewPreference) }}
                    </p>
                  </div>

                  <!-- Communication Preferences -->
                  <div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Communication Preferences
                    </p>
                    <p v-if="buddy.communicationPreferences" class="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {{ buddy.communicationPreferences }}
                    </p>
                    <p v-else class="text-gray-500 dark:text-gray-400 text-sm italic">
                      No communication preferences set
                    </p>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
