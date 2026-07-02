import { computed, ref, watch, type Ref } from "vue";

interface Options<T> {
  modelValue: Ref<T | undefined>;
  defaultValue: T;
  onChange?: (next: T) => void;
}

export function useControllableState<T>(options: Options<T>) {
  const internal = ref(options.defaultValue) as Ref<T>;

  watch(
    options.modelValue,
    (value) => {
      if (value !== undefined) {
        internal.value = value;
      }
    },
    { immediate: true },
  );

  const isControlled = computed(() => options.modelValue.value !== undefined);

  const value = computed<T>(() => {
    return options.modelValue.value !== undefined ? options.modelValue.value : internal.value;
  });

  function setValue(next: T) {
    if (!isControlled.value) {
      internal.value = next;
    }
    options.onChange?.(next);
  }

  return { value, isControlled, setValue };
}
