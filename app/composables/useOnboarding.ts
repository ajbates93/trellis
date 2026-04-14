export interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  icon: string;
  completed: boolean;
}

const ONBOARDING_TASKS = [
  {
    id: "submit-feedback",
    label: "Submit your first feedback",
    description: "Share feedback with a colleague",
    icon: "i-lucide-message-square-plus",
  },
  {
    id: "view-inbox",
    label: "View your inbox",
    description: "Check out feedback you've received",
    icon: "i-lucide-inbox",
  },
  {
    id: "create-goal",
    label: "Create a goal",
    description: "Set a personal development goal",
    icon: "i-lucide-target",
  },
  {
    id: "add-achievement",
    label: "Add to your brag bucket",
    description: "Record an achievement you're proud of",
    icon: "i-lucide-trophy",
  },
];

export const useOnboarding = () => {
  const { user, refreshSession } = useAuth();

  // Panel open state (for floating trigger on non-dashboard pages)
  const isOpen = useState<boolean>("onboarding-wizard-open", () => false);

  // Animation state for the floating trigger button
  const isAnimating = useState<boolean>("onboarding-animation", () => false);

  // Optimistic local state for immediate UI updates
  const optimisticCompletedTasks = useState<string[]>("onboarding-optimistic", () => []);

  // Compute tasks with completion status (combines server + optimistic state)
  const tasks = computed<OnboardingTask[]>(() => {
    const serverTasks = user.value?.onboardingTasks || [];
    const allCompleted = [...new Set([...serverTasks, ...optimisticCompletedTasks.value])];
    return ONBOARDING_TASKS.map((task) => ({
      ...task,
      completed: allCompleted.includes(task.id),
    }));
  });

  // Progress tracking
  const completedCount = computed(() => tasks.value.filter((t) => t.completed).length);
  const totalCount = computed(() => ONBOARDING_TASKS.length);
  const progressPercent = computed(() =>
    Math.round((completedCount.value / totalCount.value) * 100)
  );

  // Check if all tasks are complete
  const isComplete = computed(() => completedCount.value === totalCount.value);

  // Should show the wizard (incomplete and user logged in)
  const shouldShow = computed(() => {
    return !!user.value && !isComplete.value;
  });

  // Mark a task as complete
  const markTaskComplete = async (taskId: string): Promise<boolean> => {
    // Check if already completed locally
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task || task.completed) {
      return false;
    }

    // Optimistic update - immediately update local state
    optimisticCompletedTasks.value = [...optimisticCompletedTasks.value, taskId];

    // Trigger animation immediately
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
    }, 1500);

    try {
      await $api("/users/onboarding", {
        method: "PATCH",
        body: { taskId },
      });

      // Refresh session in background to sync server state
      refreshSession();
      return true;
    } catch (error) {
      // Rollback optimistic update on error
      optimisticCompletedTasks.value = optimisticCompletedTasks.value.filter(
        (id) => id !== taskId
      );
      console.error("Failed to mark onboarding task complete:", error);
      return false;
    }
  };

  // Toggle the floating panel
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  return {
    // State
    isOpen,
    isAnimating,
    tasks,
    completedCount,
    totalCount,
    progressPercent,
    isComplete,
    shouldShow,

    // Actions
    markTaskComplete,
    toggle,
    open,
    close,
  };
};
