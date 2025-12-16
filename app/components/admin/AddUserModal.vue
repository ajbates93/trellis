<template>
  <UModal
    v-model:open="isOpen"
    title="Add New User"
    description="Create a new invited user who can log in via Google OAuth"
    class="sm:max-w-md"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Full Name <span class="text-red-500">*</span>
          </label>
          <UInput
            v-model="formData.name"
            placeholder="John Doe"
            icon="i-heroicons-user"
            :disabled="saving"
            class="w-full"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Email <span class="text-red-500">*</span>
          </label>
          <UInput
            v-model="formData.email"
            type="email"
            placeholder="john.doe@pocketworks.co.uk"
            icon="i-heroicons-envelope"
            :disabled="saving"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Must be a @pocketworks.co.uk email
          </p>
        </div>

        <!-- Job Role -->
        <div>
          <label class="block text-sm font-medium mb-2"> Job Role </label>
          <USelectMenu
            v-model="formData.roleType"
            :items="roleTypeOptions"
            placeholder="Select job role"
            :disabled="saving"
            class="w-full"
          />
        </div>

        <!-- Buddy Assignment -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Buddy (Optional)
          </label>
          <USelectMenu
            v-model="formData.buddyId"
            :items="buddyOptions"
            placeholder="Select buddy"
            value-attribute="value"
            option-attribute="label"
            :disabled="saving"
            class="w-full"
          >
            <template #leading>
              <UIcon name="i-heroicons-user-group" class="text-gray-400" />
            </template>
          </USelectMenu>
        </div>

        <!-- Error Message -->
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
          icon="i-heroicons-exclamation-triangle"
        />
      </form>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" :disabled="saving" @click="close">
        Cancel
      </UButton>
      <UButton color="primary" :loading="saving" @click="onSubmit">
        Add User
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { User } from '~/types';

const props = defineProps<{
  modelValue: boolean;
  allUsers: User[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  success: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
    if (!value) {
      // Modal closed, reset form after animation
      setTimeout(() => {
        errorMessage.value = "";
        formData.value = {
          name: "",
          email: "",
          roleType: null,
          buddyId: null,
        };
      }, 300);
    }
  },
});

const saving = ref(false);
const errorMessage = ref("");

const formData = ref({
  name: "",
  email: "",
  roleType: null as string | null,
  buddyId: null as string | null,
});

const roleTypeOptions = [
  { value: null, label: "None" },
  { value: "dev", label: "Developer" },
  { value: "design", label: "Designer" },
  { value: "qa", label: "QA" },
  { value: "growth", label: "Growth" },
];

const buddyOptions = computed(() => {
  return [
    { value: null, label: "No buddy" },
    ...props.allUsers.map((u) => ({
      value: u.id,
      label: u.name,
    })),
  ];
});

const close = () => {
  isOpen.value = false;
};

const onSubmit = async () => {
  errorMessage.value = "";

  // Validation
  if (!formData.value.name || !formData.value.email) {
    errorMessage.value = "Name and email are required";
    return;
  }

  if (!formData.value.email.endsWith("@pocketworks.co.uk")) {
    errorMessage.value = "Email must be @pocketworks.co.uk";
    return;
  }

  saving.value = true;
  try {
    // Extract value property if object, otherwise use as-is
    const roleTypeValue = typeof formData.value.roleType === 'object' && formData.value.roleType !== null
      ? (formData.value.roleType as { value: string }).value
      : formData.value.roleType;

    const buddyIdValue = typeof formData.value.buddyId === 'object' && formData.value.buddyId !== null
      ? (formData.value.buddyId as { value: string }).value
      : formData.value.buddyId;

    await $fetch("/api/admin/users", {
      method: "POST",
      body: {
        name: formData.value.name,
        email: formData.value.email,
        roleType: roleTypeValue,
        buddyId: buddyIdValue,
      },
    });

    emit("success");
    close();
  } catch (error) {
    console.error("Failed to create user:", error);
    errorMessage.value = (error as { data?: { message?: string } }).data?.message || "Failed to create user";
  } finally {
    saving.value = false;
  }
};
</script>
