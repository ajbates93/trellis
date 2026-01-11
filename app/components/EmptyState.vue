<script setup lang="ts">
interface Props {
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  heading: string;
  description?: string;
  buttonText?: string;
  buttonIcon?: string;
  buttonTo?: string;
  buttonSize?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "minimal";
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: "text-primary",
  iconBgColor: "bg-primary/10",
  description: undefined,
  buttonText: undefined,
  buttonIcon: undefined,
  buttonTo: undefined,
  buttonSize: "lg",
  variant: "primary",
});

const emit = defineEmits<{
  buttonClick: [];
}>();

const containerClasses = computed(() => {
  const base = "text-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50";

  switch (props.variant) {
    case "primary":
      return `${base} py-16 px-6`;
    case "secondary":
      return `${base} py-16 px-6`;
    case "minimal":
      return `${base} py-12 px-6`;
    default:
      return `${base} py-16 px-6`;
  }
});

const iconContainerClasses = computed(() => {
  const base = "mx-auto rounded-full flex items-center justify-center";
  const size =
    props.variant === "minimal" ? "w-12 h-12 mb-3" : "w-16 h-16 mb-4";
  return `${base} ${size} ${props.iconBgColor}`;
});

const iconClasses = computed(() => {
  const size = props.variant === "minimal" ? "w-6 h-6" : "w-8 h-8";
  return `${size} ${props.iconColor}`;
});

const headingClasses = computed(() => {
  return props.variant === "minimal"
    ? "text-sm font-medium text-gray-900 dark:text-white mb-1"
    : "text-lg font-semibold text-gray-900 dark:text-white mb-2";
});

const descriptionClasses = computed(() => {
  const base = "text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto";
  const margin = props.buttonText ? "mb-6" : "";
  return `${base} ${margin}`;
});

const handleButtonClick = () => {
  if (!props.buttonTo) {
    emit("buttonClick");
  }
};
</script>

<template>
  <div :class="containerClasses">
    <div :class="iconContainerClasses">
      <UIcon :name="icon" :class="iconClasses" />
    </div>
    <h3 :class="headingClasses">
      {{ heading }}
    </h3>
    <p v-if="description" :class="descriptionClasses">
      {{ description }}
    </p>
    <UButton
      v-if="buttonText"
      :icon="buttonIcon"
      :size="buttonSize"
      :to="buttonTo"
      @click="handleButtonClick"
    >
      {{ buttonText }}
    </UButton>
  </div>
</template>
