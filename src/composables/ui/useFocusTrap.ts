import { useFocusTrap as useVueUseFocusTrap } from "@vueuse/integrations/useFocusTrap";
import { watch, type Ref } from "vue";

export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const focusTrap = useVueUseFocusTrap(container, {
    immediate: false,
    escapeDeactivates: false,
    clickOutsideDeactivates: false,
    allowOutsideClick: true,
    fallbackFocus: () => container.value ?? document.body,
  });

  watch(
    active,
    (isActive) => {
      if (isActive) {
        focusTrap.activate();
      } else {
        focusTrap.deactivate();
      }
    },
    { immediate: true },
  );
}
