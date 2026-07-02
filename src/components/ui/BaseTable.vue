<script setup lang="ts" generic="TRow extends Record<string, unknown>">
import { computed, ref } from "vue";
import { tv } from "@/lib/tv";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { uiMotion } from "@/lib/ui-tv";

type SortDirection = "asc" | "desc" | null;

const props = withDefaults(
  defineProps<{
    columns: Array<{
      key: string;
      label: string;
      sortable?: boolean;
      align?: "left" | "center" | "right";
      width?: string;
    }>;
    rows: TRow[];
    loading?: boolean;
    emptyText?: string;
    rowKey?: string;
  }>(),
  { loading: false, emptyText: "No data", rowKey: "id" },
);

const emit = defineEmits<{
  "sort-change": [{ key: string; direction: SortDirection }];
  "row-click": [TRow];
}>();
const sortKey = ref<string | null>(null);
const sortDirection = ref<SortDirection>(null);

const tableTv = tv({
  slots: {
    wrap: "w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
    table: "w-full min-w-[36rem] border-collapse text-xs sm:text-sm",
    head: "bg-slate-50 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    th: "border-b border-slate-200 px-2 py-2 font-semibold sm:px-3 dark:border-slate-700",
    td: "border-b border-slate-100 px-2 py-2 text-slate-700 sm:px-3 dark:border-slate-800 dark:text-slate-200",
    empty: "px-2 py-5 text-center text-slate-500 sm:px-3 dark:text-slate-400",
    loading: "px-2 py-5 text-center text-slate-500 sm:px-3 dark:text-slate-400",
  },
});
const ui = computed(() => tableTv());

function toggleSort(columnKey: string) {
  if (sortKey.value !== columnKey) {
    sortKey.value = columnKey;
    sortDirection.value = "asc";
  } else if (sortDirection.value === "asc") {
    sortDirection.value = "desc";
  } else if (sortDirection.value === "desc") {
    sortDirection.value = null;
  } else {
    sortDirection.value = "asc";
  }
  emit("sort-change", { key: columnKey, direction: sortDirection.value });
}
</script>

<template>
  <div :class="ui.wrap()">
    <table :class="ui.table()">
      <thead :class="ui.head()">
        <tr>
          <th
            v-for="column in props.columns"
            :key="column.key"
            :class="ui.th()"
            :style="{ width: column.width, textAlign: column.align ?? 'left' }"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="inline-flex items-center gap-1 whitespace-nowrap"
              @click="toggleSort(column.key)"
            >
              <span>{{ column.label }}</span>
              <BaseIcon
                :name="
                  sortKey === column.key && sortDirection === 'desc' ? 'chevron-down' : 'chevron-up'
                "
                size="xs"
              />
            </button>
            <span v-else>{{ column.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="props.loading">
          <td :colspan="props.columns.length" :class="ui.loading()">Loading...</td>
        </tr>
        <tr v-else-if="!props.rows.length">
          <td :colspan="props.columns.length" :class="ui.empty()">{{ props.emptyText }}</td>
        </tr>
        <tr
          v-for="row in props.rows"
          v-else
          :key="String(row[props.rowKey] ?? '')"
          :class="`transition-colors ${uiMotion.fast} hover:bg-slate-50 dark:hover:bg-slate-800`"
          @click="emit('row-click', row)"
        >
          <td
            v-for="column in props.columns"
            :key="column.key"
            :class="ui.td()"
            :style="{ textAlign: column.align ?? 'left' }"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
