import { useEventListener, useMediaQuery } from "@vueuse/core";
import { computed, ref, type CSSProperties, type Ref } from "vue";

interface UseBottomSheetDismissOptions {
  active: Ref<boolean>;
  panelRef: Ref<HTMLElement | null>;
  onDismiss: () => void;
  dismissThresholdPx?: number;
}

export function useBottomSheetDismiss(options: UseBottomSheetDismissOptions) {
  const isMobileOrTablet = useMediaQuery("(max-width: 1023px)");
  const translateY = ref(0);
  const dragging = ref(false);
  const startY = ref(0);
  const pointerId = ref<number | null>(null);
  const dismissThresholdPx = options.dismissThresholdPx ?? 120;

  const sheetStyle = computed<CSSProperties>(() => ({
    transform: `translateY(${translateY.value}px)`,
    transition: dragging.value ? "none" : "transform 180ms ease-out",
  }));

  function resetPosition() {
    translateY.value = 0;
    dragging.value = false;
    startY.value = 0;
    pointerId.value = null;
  }

  function onPointerDown(event: PointerEvent) {
    if (!isMobileOrTablet.value || !options.active.value) return;

    const panel = options.panelRef.value;
    if (!panel || !panel.contains(event.target as Node)) return;

    pointerId.value = event.pointerId;
    dragging.value = true;
    startY.value = event.clientY - translateY.value;
    panel.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging.value || pointerId.value !== event.pointerId) return;
    const next = Math.max(0, event.clientY - startY.value);
    translateY.value = next;
  }

  function onPointerEnd(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    const panel = options.panelRef.value;
    if (panel) panel.releasePointerCapture(event.pointerId);

    if (translateY.value >= dismissThresholdPx) {
      resetPosition();
      options.onDismiss();
      return;
    }

    resetPosition();
  }

  useEventListener(window, "pointerdown", onPointerDown);
  useEventListener(window, "pointermove", onPointerMove);
  useEventListener(window, "pointerup", onPointerEnd);
  useEventListener(window, "pointercancel", onPointerEnd);

  return {
    isMobileOrTablet: computed(() => isMobileOrTablet.value),
    isDragging: computed(() => dragging.value),
    sheetStyle,
  };
}
