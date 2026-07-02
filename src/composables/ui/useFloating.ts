import { useEventListener } from "@vueuse/core";
import { computed, nextTick, ref, watch, type Ref } from "vue";

type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

interface Options {
  active: Ref<boolean>;
  placement?: Placement;
  offset?: number;
  minWidthFromAnchor?: boolean;
}

export function useFloating(
  anchor: Ref<HTMLElement | null>,
  floating: Ref<HTMLElement | null>,
  options: Options,
) {
  const isPositioned = ref(false);
  const style = ref<Record<string, string>>({
    position: "fixed",
    top: "0px",
    left: "0px",
    zIndex: "1000",
    visibility: "hidden",
  });

  const placement = computed(() => options.placement ?? "bottom-start");
  const offset = computed(() => options.offset ?? 8);

  function updatePosition() {
    const anchorEl = anchor.value;
    const floatingEl = floating.value;
    if (!anchorEl || !floatingEl) return;

    const a = anchorEl.getBoundingClientRect();
    const f = floatingEl.getBoundingClientRect();
    const top = placement.value.startsWith("bottom")
      ? a.bottom + offset.value
      : a.top - f.height - offset.value;
    const left = placement.value.endsWith("end") ? a.right - f.width : a.left;
    const viewportPadding = 8;
    const maxWidth = Math.max(240, window.innerWidth - viewportPadding * 2);
    const maxHeight = Math.max(180, window.innerHeight - viewportPadding * 2);
    const boundedTop = Math.min(
      Math.max(viewportPadding, top),
      Math.max(viewportPadding, window.innerHeight - f.height - viewportPadding),
    );
    const boundedLeft = Math.min(
      Math.max(viewportPadding, left),
      Math.max(viewportPadding, window.innerWidth - f.width - viewportPadding),
    );

    style.value = {
      position: "fixed",
      top: `${boundedTop}px`,
      left: `${boundedLeft}px`,
      zIndex: "1000",
      visibility: "visible",
      maxWidth: `${maxWidth}px`,
      maxHeight: `${maxHeight}px`,
      overflowY: "auto",
      ...(options.minWidthFromAnchor !== false ? { minWidth: `${a.width}px` } : {}),
    };
    isPositioned.value = true;
  }

  watch(
    () => options.active.value,
    async (isActive) => {
      if (!isActive) {
        isPositioned.value = false;
        style.value = {
          ...style.value,
          visibility: "hidden",
        };
        return;
      }
      await nextTick();
      updatePosition();
    },
    { immediate: true },
  );

  const listener = () => {
    if (options.active.value) updatePosition();
  };

  useEventListener(window, "resize", listener);
  useEventListener(window, "scroll", listener, { capture: true });

  return { floatingStyle: style, updatePosition };
}
