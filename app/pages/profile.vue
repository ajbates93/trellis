<template>
  <UDashboardPanel id="profile">
    <template #body>
      <div class="pt-16 p-4 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
        <!-- Page header -->
        <div class="mb-8">
          <h1
            class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            My Profile
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Update your personal information and preferences
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
                  <img
                    :src="
                      previewAvatar ||
                      user?.avatarUrl ||
                      user?.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user?.name || 'User',
                      )}&background=059669&color=fff`
                    "
                    :alt="user?.name || 'User avatar'"
                    class="w-32 h-32 rounded-lg object-cover"
                  />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ user?.name }}
                </h3>
                <p
                  v-if="user?.pronouns"
                  class="text-sm text-gray-600 dark:text-gray-400 mt-1"
                >
                  {{ user.pronouns }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-3">
                  {{ user?.email }}
                </p>
                <p
                  v-if="workspace"
                  class="text-xs text-gray-400 dark:text-gray-500 mt-1"
                >
                  {{ workspace.name }}
                </p>

                <!-- Avatar upload -->
                <div class="mt-6 space-y-3">
                  <div class="flex gap-2">
                    <input
                      ref="fileInput"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="onAvatarSelected"
                    />
                    <UButton
                      class="flex-1"
                      variant="outline"
                      size="sm"
                      :loading="uploadingAvatar"
                      @click="$refs.fileInput.click()"
                    >
                      {{ user?.avatarUrl ? "Change Avatar" : "Upload Avatar" }}
                    </UButton>
                    <UButton
                      v-if="user?.avatarUrl"
                      variant="outline"
                      size="sm"
                      color="red"
                      icon="i-heroicons-trash"
                      @click="removeAvatar"
                    />
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-500">
                    Max 500 KB
                  </p>
                </div>
              </div>
            </UCard>

            <!-- Info card -->
            <UCard>
              <h3
                class="text-sm font-semibold text-gray-900 dark:text-white mb-4"
              >
                Account Information
              </h3>
              <div class="space-y-3 text-sm">
                <div>
                  <p class="text-gray-600 dark:text-gray-400">Role</p>
                  <p class="text-gray-900 dark:text-white font-medium">
                    {{ getRoleLabel(user?.roleType) }}
                  </p>
                </div>
                <div>
                  <p class="text-gray-600 dark:text-gray-400">Buddy</p>
                  <p
                    v-if="buddy"
                    class="text-gray-900 dark:text-white font-medium"
                  >
                    {{ buddy.name }}
                  </p>
                  <p v-else class="text-gray-500">Not assigned</p>
                </div>
                <div>
                  <p class="text-gray-600 dark:text-gray-400">Next Review</p>
                  <p
                    v-if="nextReview"
                    class="text-gray-900 dark:text-white font-medium"
                  >
                    {{ formatDate(nextReview.scheduledDate) }}
                  </p>
                  <p v-else class="text-gray-500">Not scheduled</p>
                </div>
                <div>
                  <p class="text-gray-600 dark:text-gray-400">Member Since</p>
                  <p class="text-gray-900 dark:text-white font-medium">
                    {{ formatDate(user?.createdAt) }}
                  </p>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Right column: Edit form -->
          <div class="lg:col-span-2">
            <form class="space-y-6" @submit.prevent="saveProfile">
              <!-- Basic Information -->
              <UCard>
                <template #header>
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Basic Information
                  </h3>
                </template>

                <div class="space-y-6">
                  <UFormField
                    label="Full Name"
                    name="name"
                    :error="errors.name || undefined"
                  >
                    <UInput
                      v-model="form.name"
                      placeholder="Your full name"
                      :disabled="isSaving"
                      class="w-full"
                      @blur="validateName"
                    />
                  </UFormField>

                  <div>
                    <UInput
                      v-model="form.preferredName"
                      placeholder="How you'd like to be called (optional)"
                      :disabled="isSaving"
                      class="w-full"
                      @blur="validatePreferredName"
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Used for personal greetings. If empty, we'll use your
                      first name.
                    </p>
                  </div>

                  <UFormField
                    label="Pronouns (Optional)"
                    name="pronouns"
                    :error="errors.pronouns || undefined"
                  >
                    <UInput
                      v-model="form.pronouns"
                      placeholder="e.g., he/him, she/her, they/them"
                      :disabled="isSaving"
                      class="w-full"
                      @blur="validatePronouns"
                    />
                  </UFormField>
                </div>
              </UCard>

              <!-- About -->
              <UCard>
                <template #header>
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    About
                  </h3>
                </template>

                <div class="space-y-4">
                  <UFormField
                    label="Bio (Optional)"
                    name="bio"
                    :error="errors.bio || undefined"
                    help="Tell us about yourself (max 500 characters)"
                  >
                    <UTextarea
                      v-model="form.bio"
                      placeholder="Share a bit about yourself, your interests, or your role..."
                      :rows="4"
                      :disabled="isSaving"
                      class="w-full"
                      @blur="validateBio"
                    />
                  </UFormField>
                  <p
                    v-if="form.bio"
                    class="text-xs text-gray-500 dark:text-gray-500 text-right"
                  >
                    {{ form.bio.length }} / 500 characters
                  </p>
                </div>
              </UCard>

              <!-- Cohort-Specific Preferences -->
              <UCard>
                <template #header>
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Cohort Preferences
                  </h3>
                </template>

                <div class="space-y-6">
                  <!-- Review Preference -->
                  <UFormField
                    label="How do you prefer to have reviews?"
                    name="reviewPreference"
                    :error="errors.reviewPreference || undefined"
                  >
                    <URadioGroup
                      v-model="form.reviewPreference"
                      :items="[
                        { value: 'in-person', label: 'In-Person' },
                        { value: 'remote', label: 'Remote (Video Call)' },
                        { value: 'hybrid', label: 'Flexible (Both)' },
                        { value: 'no-preference', label: 'No Preference' },
                      ]"
                      :disabled="isSaving"
                    />
                  </UFormField>

                  <!-- Communication Preferences -->
                  <UFormField
                    label="Communication Preferences (Optional)"
                    name="communicationPreferences"
                    :error="errors.communicationPreferences || undefined"
                    help="Let your buddy know your preferred communication style and best times for feedback discussions"
                  >
                    <UTextarea
                      v-model="form.communicationPreferences"
                      placeholder="e.g., Prefer async written feedback; Best time for calls: mornings; Timezone: PST"
                      :rows="3"
                      :disabled="isSaving"
                      class="w-full"
                      @blur="validateCommunicationPreferences"
                    />
                  </UFormField>
                  <p
                    v-if="form.communicationPreferences"
                    class="text-xs text-gray-500 dark:text-gray-500 text-right"
                  >
                    {{ form.communicationPreferences.length }} / 300 characters
                  </p>
                </div>
              </UCard>

              <!-- Form actions -->
              <div class="flex gap-3">
                <UButton
                  type="submit"
                  color="primary"
                  size="lg"
                  :loading="isSaving"
                  class="flex-1"
                >
                  Save Changes
                </UButton>
                <UButton
                  type="button"
                  variant="outline"
                  size="lg"
                  :disabled="isSaving"
                  class="flex-1"
                  @click="resetForm"
                >
                  Cancel
                </UButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/useAuth";
import type { User } from "~/types";

definePageMeta({
  layout: "default",
  middleware: "auth",
});

const { user, refreshSession } = useAuth();
const fileInput = ref<HTMLInputElement>();
const isSaving = ref(false);
const uploadingAvatar = ref(false);
const previewAvatar = ref<string | null>(null);
const buddy = ref<User | null>(null);

// Fetch current workspace
const { data: workspaceData } = useFetch("/api/workspace/current");
const workspace = computed(() => workspaceData.value?.workspace);

const form = reactive({
  name: "",
  preferredName: "",
  pronouns: "",
  bio: "",
  reviewPreference: "no-preference",
  communicationPreferences: "",
  avatarUrl: "",
});

const errors = reactive({
  name: "",
  preferredName: "",
  pronouns: "",
  bio: "",
  reviewPreference: "",
  communicationPreferences: "",
});

// Initialize form with user data
watch(
  () => user.value,
  (newUser) => {
    if (newUser) {
      form.name = newUser.name || "";
      form.preferredName = newUser.preferredName || "";
      form.pronouns = newUser.pronouns || "";
      form.bio = newUser.bio || "";
      form.reviewPreference = newUser.reviewPreference || "no-preference";
      form.communicationPreferences = newUser.communicationPreferences || "";
    }
  },
  { immediate: true },
);

// Fetch buddy info
watch(
  () => user.value?.buddyId,
  async (buddyId) => {
    if (buddyId) {
      try {
        const allUsers = await $fetch<{ users: User[] }>("/api/users");
        buddy.value = allUsers.users.find((u) => u.id === buddyId) || null;
      } catch (error) {
        console.error("Error fetching buddy:", error);
      }
    }
  },
  { immediate: true },
);

// Fetch next upcoming review
const { data: upcomingReviewsData } = useFetch("/api/reviews/upcoming");
const nextReview = computed(() => {
  const reviews = upcomingReviewsData.value?.reviews || [];
  return reviews.length > 0 ? reviews[0] : null;
});

// Helper to format role type for display
const getRoleLabel = (roleType: string | null | undefined) => {
  if (!roleType) return "Not assigned";
  const labels: Record<string, string> = {
    dev: "Developer",
    design: "Designer",
    qa: "QA",
  };
  return labels[roleType] || roleType;
};

// Validation functions
const validateName = () => {
  errors.name = "";
  if (!form.name.trim()) {
    errors.name = "Name is required";
  } else if (form.name.length > 255) {
    errors.name = "Name must be 255 characters or less";
  }
};

const validatePreferredName = () => {
  errors.preferredName = "";
  if (form.preferredName && form.preferredName.length > 100) {
    errors.preferredName = "Preferred name must be 100 characters or less";
  }
};

const validatePronouns = () => {
  errors.pronouns = "";
  if (form.pronouns && form.pronouns.length > 50) {
    errors.pronouns = "Pronouns must be 50 characters or less";
  }
};

const validateBio = () => {
  errors.bio = "";
  if (form.bio && form.bio.length > 500) {
    errors.bio = "Bio must be 500 characters or less";
  }
};

const validateCommunicationPreferences = () => {
  errors.communicationPreferences = "";
  if (
    form.communicationPreferences &&
    form.communicationPreferences.length > 300
  ) {
    errors.communicationPreferences =
      "Communication preferences must be 300 characters or less";
  }
};

// Avatar upload
const onAvatarSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validate file size (500 KB max)
  if (file.size > 500 * 1024) {
    useToast().add({
      title: "File too large",
      description: "Avatar must be less than 500 KB",
      color: "red",
    });
    return;
  }

  uploadingAvatar.value = true;

  try {
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      // Store base64 for upload when saving profile
      form.avatarUrl = base64;
      previewAvatar.value = base64;
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error reading file:", error);
    useToast().add({
      title: "Error",
      description: "Failed to process avatar",
      color: "red",
    });
  } finally {
    uploadingAvatar.value = false;
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const removeAvatar = () => {
  form.avatarUrl = "";
  previewAvatar.value = null;
};

// Save profile
const saveProfile = async () => {
  // Validate all fields
  validateName();
  validatePreferredName();
  validatePronouns();
  validateBio();
  validateCommunicationPreferences();

  // Check for errors
  if (Object.values(errors).some((error) => error)) {
    useToast().add({
      title: "Validation Error",
      description: "Please fix the errors above",
      color: "error",
    });
    return;
  }

  isSaving.value = true;

  try {
    const updateData: {
      name: string;
      preferredName?: string;
      pronouns?: string;
      bio?: string;
      reviewPreference: string;
      communicationPreferences?: string;
      avatarUrl?: string;
    } = {
      name: form.name,
      preferredName: form.preferredName || undefined,
      pronouns: form.pronouns || undefined,
      bio: form.bio || undefined,
      reviewPreference: form.reviewPreference,
      communicationPreferences: form.communicationPreferences || undefined,
    };

    // Include avatar if it was changed
    if (previewAvatar.value) {
      updateData.avatarUrl = previewAvatar.value;
      previewAvatar.value = null;
    }

    await $fetch("/api/users/profile", {
      method: "PATCH",
      body: updateData,
    });

    // Refresh user data
    await refreshSession();

    useToast().add({
      title: "Success",
      description: "Profile updated successfully",
      color: "success",
    });
  } catch (error) {
    console.error("Error saving profile:", error);
    useToast().add({
      title: "Error",
      description: "Failed to save profile",
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
};

const resetForm = () => {
  if (user.value) {
    form.name = user.value.name || "";
    form.preferredName = user.value.preferredName || "";
    form.pronouns = user.value.pronouns || "";
    form.bio = user.value.bio || "";
    form.reviewPreference = user.value.reviewPreference || "no-preference";
    form.communicationPreferences = user.value.communicationPreferences || "";
    form.avatarUrl = "";
  }
  previewAvatar.value = null;
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
};

// Utility functions
const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>
