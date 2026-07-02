import { ref } from "vue";
import { onClickOutside, onKeyStroke } from "@vueuse/core";

interface UseOverlayOptions {
  initialOpen?: boolean;
  closeOnOutside?: boolean;
  closeOnEscape?: boolean;
}

export function useOverlay(options: UseOverlayOptions = {}) {
  const isOpen = ref(Boolean(options.initialOpen));
  const rootRef = ref<HTMLElement | null>(null);

  function open() {
    isOpen.value = true;
  }
  function close() {
    isOpen.value = false;
  }
  function toggle(force?: boolean) {
    isOpen.value = force ?? !isOpen.value;
  }

  onKeyStroke("Escape", () => {
    if (!isOpen.value || options.closeOnEscape === false) return;
    close();
  });

  onClickOutside(rootRef, () => {
    if (!isOpen.value || options.closeOnOutside === false) return;
    close();
  });

  return { isOpen, rootRef, open, close, toggle };
}
