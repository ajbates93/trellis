<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ workspaceName }} Garden
        </h3>
        <div class="flex items-center gap-2">
          <UPopover>
            <UButton
              icon="i-heroicons-information-circle"
              variant="ghost"
              color="neutral"
              size="xs"
            />
            <template #content>
              <div class="p-3 max-w-xs space-y-2 text-sm">
                <p class="font-semibold text-gray-900 dark:text-white">
                  How does the Trellis Garden work?
                </p>
                <p class="text-gray-600 dark:text-gray-400">
                  The plant reflects your team's feedback activity over the last
                  2 weeks. The more feedback your team submits, the healthier
                  the plant becomes.
                </p>
                <p class="text-gray-600 dark:text-gray-400">
                  The expected rate is
                  <strong>1 feedback per person per week</strong>. When everyone
                  contributes, the plant thrives!
                </p>
                <div
                  class="text-xs text-gray-500 dark:text-gray-500 space-y-1 pt-1 border-t border-gray-200 dark:border-gray-700"
                >
                  <p>0–20% = Dead</p>
                  <p>21–40% = Wilting</p>
                  <p>41–65% = Growing</p>
                  <p>66–85% = Healthy</p>
                  <p>86–100% = Thriving</p>
                </div>
              </div>
            </template>
          </UPopover>
          <UIcon name="i-heroicons-heart" class="text-green-500 text-xl" />
        </div>
      </div>
    </template>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-4xl text-gray-400"
      />
    </div>

    <div
      v-else-if="error"
      class="flex items-center justify-center h-64 text-red-500"
    >
      <p>Failed to load garden</p>
    </div>

    <div v-else class="flex flex-col items-center gap-4">
      <!-- Plant SVG with crossfade -->
      <div class="w-40 h-56 relative">
        <Transition name="plant-fade" mode="out-in">
          <component :is="plantComponent" :key="health.state" />
        </Transition>
      </div>

      <!-- State label -->
      <p class="text-lg font-semibold" :class="stateColor">
        {{ stateLabel }}
      </p>

      <!-- Health bar -->
      <div class="w-full max-w-xs">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">Health</span>
          <span class="text-xs font-medium" :class="stateColor"
            >{{ health.healthPercent }}%</span
          >
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            class="h-2.5 rounded-full transition-all duration-700 ease-out"
            :class="barColor"
            :style="{ width: `${health.healthPercent}%` }"
          />
        </div>
      </div>

      <!-- Message -->
      <p class="text-sm text-center text-gray-600 dark:text-gray-400 max-w-xs">
        {{ health.message }}
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import PlantDead from "./plants/PlantDead.vue";
import PlantWilting from "./plants/PlantWilting.vue";
import PlantGrowing from "./plants/PlantGrowing.vue";
import PlantHealthy from "./plants/PlantHealthy.vue";
import PlantThriving from "./plants/PlantThriving.vue";

interface PlantHealthData {
  state: "dead" | "wilting" | "growing" | "healthy" | "thriving";
  healthPercent: number;
  feedbackCount: number;
  expectedCount: number;
  message: string;
}

const { data: workspaceData } = useApi("/workspace/current");
const workspaceName = computed(
  () => workspaceData.value?.workspace?.name || "Trellis",
);

const loading = ref(true);
const error = ref(false);
const health = ref<PlantHealthData>({
  state: "dead",
  healthPercent: 0,
  feedbackCount: 0,
  expectedCount: 0,
  message: "",
});

const plantComponents = {
  dead: PlantDead,
  wilting: PlantWilting,
  growing: PlantGrowing,
  healthy: PlantHealthy,
  thriving: PlantThriving,
} as const;

const plantComponent = computed(() => plantComponents[health.value.state]);

const stateLabel = computed(() => {
  const labels: Record<string, string> = {
    dead: "Needs some sunlight!",
    wilting: "Could use some water",
    growing: "Sprouting nicely",
    healthy: "Looking good!",
    thriving: "In full bloom!",
  };
  return labels[health.value.state];
});

const stateColor = computed(() => {
  const colors: Record<string, string> = {
    dead: "text-red-500 dark:text-red-400",
    wilting: "text-amber-500 dark:text-amber-400",
    growing: "text-lime-500 dark:text-lime-400",
    healthy: "text-green-500 dark:text-green-400",
    thriving: "text-emerald-500 dark:text-emerald-400",
  };
  return colors[health.value.state];
});

const barColor = computed(() => {
  const colors: Record<string, string> = {
    dead: "bg-red-500",
    wilting: "bg-amber-500",
    growing: "bg-lime-500",
    healthy: "bg-green-500",
    thriving: "bg-emerald-500",
  };
  return colors[health.value.state];
});

onMounted(async () => {
  try {
    const data = await $api("/community/plant-health");
    if (data) {
      console.log(data);
      health.value = data;
    }
  } catch (e) {
    console.error("Failed to load plant health:", e);
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.plant-fade-enter-active,
.plant-fade-leave-active {
  transition: opacity 0.5s ease;
}

.plant-fade-enter-from,
.plant-fade-leave-to {
  opacity: 0;
}
</style>
