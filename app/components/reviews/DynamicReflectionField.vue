<script setup lang="ts">
interface Field {
  id: string;
  type: "long_text" | "multiple_choice" | "section";
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

const props = defineProps<{
  field: Field;
  modelValue: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const proxy = computed({
  get: () => props.modelValue,
  set: (v: string) => emit("update:modelValue", v),
});

const radioItems = computed(() =>
  (props.field.options ?? []).map((o) => ({ label: o, value: o })),
);
</script>

<template>
  <div>
    <div v-if="field.type === 'section'" class="pt-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ field.label }}</h3>
      <p v-if="field.helpText" class="text-sm text-gray-500 mt-1">{{ field.helpText }}</p>
    </div>

    <ReviewsReflectionEditor
      v-else-if="field.type === 'long_text'"
      v-model="proxy"
      :label="field.label + (field.required ? ' *' : '')"
      icon="i-heroicons-pencil"
      :placeholder="field.helpText"
      :readonly="readonly"
    />

    <UFormField
      v-else-if="field.type === 'multiple_choice'"
      :label="field.label + (field.required ? ' *' : '')"
      :help="field.helpText"
    >
      <URadioGroup v-model="proxy" :items="radioItems" :disabled="readonly" />
    </UFormField>
  </div>
</template>
