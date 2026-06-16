<script setup lang="ts">
const props = defineProps<{ modelValue: number | null; readonly?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();

const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const select = (n: number) => {
  if (props.readonly) return;
  emit("update:modelValue", props.modelValue === n ? null : n);
};
</script>

<template>
  <div>
    <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">
      Overall, how do you feel this period has gone? (1–10)
    </p>
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="n in scores"
        :key="n"
        :variant="modelValue === n ? 'solid' : 'outline'"
        :color="modelValue === n ? 'primary' : 'neutral'"
        :disabled="readonly"
        @click="select(n)"
      >
        {{ n }}
      </UButton>
    </div>
  </div>
</template>
