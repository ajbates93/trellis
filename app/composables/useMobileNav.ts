export const useMobileNav = () => {
  const isOpen = ref(false);
  const route = useRoute();

  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  const close = () => {
    isOpen.value = false;
  };

  // Auto-close on route change
  watch(route, () => {
    isOpen.value = false;
  });

  // Auto-close on window resize to desktop (>= 1024px)
  if (import.meta.client) {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        isOpen.value = false;
      }
    };

    window.addEventListener("resize", handleResize);

    onBeforeUnmount(() => {
      window.removeEventListener("resize", handleResize);
    });
  }

  return {
    isOpen,
    toggle,
    close,
  };
};
