<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { tv } from "@/lib/tv";
import { AppHeader, TwoPaneLayout } from "@/components/layout";
import { useI18n } from "vue-i18n";
import { setAppLocale, type AppLocale } from "@/i18n";
import { uiDemoFormSchema } from "@/schemas/ui";
import { useTheme } from "@/composables/useTheme";
import { useDragDrop } from "@/composables/useDragDrop";
import { useAppEventBus } from "@/composables/useAppEventBus";
import {
  BaseButton,
  BaseInput,
  BaseTextarea,
  BaseCheckbox,
  BaseRadio,
  BaseSwitch,
  BaseField,
  BaseModal,
  BaseDropdown,
  BaseSelect,
  BaseTooltip,
  BasePlatformMenu,
  BaseToast,
  BaseCombobox,
  BaseDatePicker,
  BaseIcon,
  BaseTable,
  BaseContextMenuTrigger,
} from "@/components/ui";

const name = ref("");
const description = ref("");
const agree = ref(false);
const enabled = ref(true);
const gender = ref<string | number>("male");
const role = ref<string | null>("admin");
const pickedDate = ref("");
const city = ref<string | null>(null);
const activeTab = ref("forms");
const modalOpen = ref(false);
const selectedAction = ref("none");
const toastItems = ref<Array<{ id: number; message: string; tone?: "info" | "success" | "error" }>>(
  [],
);
const formErrors = ref<{ name?: string; description?: string }>({});
let toastId = 1;
const { t, locale } = useI18n();
const { theme, toggleTheme } = useTheme();
const sizeScale = ["2xs", "xs", "sm", "md", "lg", "xl"] as const;
const busMessages = ref<string[]>([]);
const emittedCount = ref(0);

const tableRows = ref([
  { id: 1, name: "Notion", price: 12, status: "active" },
  { id: 2, name: "Linear", price: 8, status: "trial" },
  { id: 3, name: "OpenAI", price: 20, status: "active" },
]);

const tableColumns = [
  { key: "name", label: "Name", sortable: true },
  { key: "price", label: "Price", sortable: true, align: "right" as const },
  { key: "status", label: "Status" },
];

const dragDrop = useDragDrop({
  onDrop(paths) {
    pushToast(`Dropped ${paths.length} file(s)`, "success");
  },
});
const eventBus = useAppEventBus();
const dragDropPosition = computed(() => dragDrop.position.value);
const dragDropDroppedCount = computed(() => dragDrop.droppedPaths.value.length);
const menuItems = computed(() => [
  { label: t("formsTab"), value: "forms", icon: "format-list-bulleted" },
  { label: t("overlayTab"), value: "overlay", icon: "layers-outline" },
  { label: t("advancedTab"), value: "advanced", icon: "rocket-launch-outline" },
]);

const pageTv = tv({
  slots: {
    root: "min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100",
    title: "text-2xl font-bold tracking-tight sm:text-3xl",
    subtitle: "text-xs sm:text-sm text-slate-600 dark:text-slate-400",
    grid: "grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2",
    card: "space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:space-y-4 sm:p-4 md:p-5 dark:border-slate-800 dark:bg-slate-900",
    sectionTitle: "text-base font-semibold",
    row: "flex flex-wrap items-center gap-2.5 sm:gap-3",
    label: "text-sm text-slate-600 dark:text-slate-400",
    code: "rounded bg-slate-100 px-2 py-1 text-[11px] sm:text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
});
const ui = computed(() => pageTv());

function pushToast(message: string, tone: "info" | "success" | "error" = "info") {
  const id = toastId++;
  toastItems.value.push({ id, message, tone });
  setTimeout(() => {
    toastItems.value = toastItems.value.filter((item) => item.id !== id);
  }, 2500);
}

function dismissToast(id: number) {
  toastItems.value = toastItems.value.filter((item) => item.id !== id);
}

function validateForm() {
  const result = uiDemoFormSchema.safeParse({
    name: name.value,
    description: description.value,
  });
  if (result.success) {
    formErrors.value = {};
    pushToast(t("save"), "success");
    return;
  }
  const next: { name?: string; description?: string } = {};
  for (const issue of result.error.issues) {
    if (issue.path[0] === "name") next.name = t("validationNameMin");
    if (issue.path[0] === "description") next.description = t("validationDescriptionMin");
  }
  formErrors.value = next;
}

async function toggleLocale() {
  const next = (locale.value === "ru" ? "en" : "ru") as AppLocale;
  await setAppLocale(next);
}

async function emitDemoEvent() {
  emittedCount.value += 1;
  await eventBus.emitEvent("ui://demo-ping", {
    id: emittedCount.value,
    at: Date.now(),
  });
}

onMounted(async () => {
  await eventBus.listenEvent<{ id: number; at: number }>("ui://demo-ping", (payload) => {
    busMessages.value.unshift(
      `event #${payload.id} at ${new Date(payload.at).toLocaleTimeString()}`,
    );
    busMessages.value = busMessages.value.slice(0, 5);
  });
});
</script>

<template>
  <main :class="ui.root()">
    <AppHeader>
      <template #title>
        <div class="min-w-0 space-y-0.5">
          <h1 :class="ui.title()">{{ t("uiKitTitle") }}</h1>
          <p
            :class="[
              ui.subtitle(),
              'overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]',
            ]"
          >
            {{ t("uiKitSubtitle") }}
          </p>
        </div>
      </template>
      <template #actions>
        <BaseButton size="sm" variant="outline" @click="toggleLocale">
          <BaseIcon name="translate" size="sm" aria-label="language" />
          {{ locale.toUpperCase() }}
        </BaseButton>
        <BaseButton size="sm" variant="outline" @click="toggleTheme()">
          <BaseIcon :name="theme === 'dark' ? 'weather-night' : 'white-balance-sunny'" size="sm" />
          {{ theme === "dark" ? "Dark" : "Light" }}
        </BaseButton>
      </template>
    </AppHeader>

    <TwoPaneLayout>
      <template #nav>
        <BasePlatformMenu
          v-model="activeTab"
          :items="menuItems"
          :show-desktop-toggle="false"
        />
      </template>

      <section v-if="activeTab === 'forms'" :class="ui.grid()">
        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Form Core</h2>
          <BaseField
            :label="t('nameLabel')"
            helper="with size/variant support"
            :error="formErrors.name"
          >
            <BaseInput v-model="name" :placeholder="t('namePlaceholder')" />
          </BaseField>
          <BaseField
            :label="t('descriptionLabel')"
            helper="textarea component"
            :error="formErrors.description"
          >
            <BaseTextarea v-model="description" :placeholder="t('descriptionPlaceholder')" />
          </BaseField>
          <BaseCheckbox v-model="agree" label="Accept terms" />
          <BaseSwitch v-model="enabled" label="Enabled" />
          <div class="space-y-2">
            <p :class="ui.label()">Radio</p>
            <BaseRadio v-model="gender" value="male" label="Male" />
            <BaseRadio v-model="gender" value="female" label="Female" />
          </div>
          <div :class="ui.row()">
            <BaseButton @click="validateForm">{{ t("save") }}</BaseButton>
            <BaseButton variant="outline">{{ t("cancel") }}</BaseButton>
            <BaseButton variant="ghost">Ghost</BaseButton>
            <BaseButton variant="danger">{{ t("delete") }}</BaseButton>
          </div>
          <div class="space-y-2">
            <p :class="ui.label()">Size scale</p>
            <div :class="ui.row()">
              <BaseButton v-for="size in sizeScale" :key="size" :size="size" variant="outline">
                {{ size }}
              </BaseButton>
            </div>
          </div>
        </article>

        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Select + Date</h2>
          <BaseField label="Role">
            <BaseSelect
              v-model="role"
              :options="[
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
                { label: 'Viewer', value: 'viewer' },
              ]"
            />
          </BaseField>
          <BaseField label="Pick date">
            <BaseDatePicker v-model="pickedDate" />
          </BaseField>
          <p :class="ui.label()">
            role: <span :class="ui.code()">{{ role }}</span
            >, date: <span :class="ui.code()">{{ pickedDate || "-" }}</span>
          </p>
        </article>
      </section>

      <section v-else-if="activeTab === 'overlay'" :class="ui.grid()">
        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Modal + Dropdown</h2>
          <div :class="ui.row()">
            <BaseButton @click="modalOpen = true">{{ t("openModal") }}</BaseButton>
            <BaseDropdown
              :label="t('actions')"
              :items="[
                { label: 'Archive', value: 'archive' },
                { label: 'Duplicate', value: 'duplicate' },
                { label: 'Delete', value: 'delete' },
              ]"
              @select="selectedAction = $event"
            />
          </div>
          <p :class="ui.label()">
            selected action: <span :class="ui.code()">{{ selectedAction }}</span>
          </p>
          <BaseModal v-model="modalOpen" :title="t('modalTitle')">
            <p>{{ t("modalBody") }}</p>
            <template #footer>
              <BaseButton variant="outline" @click="modalOpen = false">{{
                t("cancel")
              }}</BaseButton>
              <BaseButton @click="modalOpen = false">{{ t("confirm") }}</BaseButton>
            </template>
          </BaseModal>
        </article>

        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Tooltip + Toast</h2>
          <div :class="ui.row()">
            <BaseTooltip text="Tooltip via teleport">
              <BaseButton variant="outline">Hover me</BaseButton>
            </BaseTooltip>
            <BaseButton @click="pushToast('Info toast')">Info Toast</BaseButton>
            <BaseButton @click="pushToast('Error toast', 'error')" variant="danger">
              Error Toast
            </BaseButton>
          </div>
        </article>
      </section>

      <section v-else :class="ui.grid()">
        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Combobox</h2>
          <BaseCombobox
            v-model="city"
            :options="[
              { label: 'Almaty', value: 'almaty' },
              { label: 'Astana', value: 'astana' },
              { label: 'Bishkek', value: 'bishkek' },
              { label: 'Tashkent', value: 'tashkent' },
            ]"
            :placeholder="t('searchCity')"
          />
          <p :class="ui.label()">
            city: <span :class="ui.code()">{{ city ?? "-" }}</span>
          </p>
        </article>
        <article :class="ui.card()">
          <h2 :class="ui.sectionTitle()">Tauri Events</h2>
          <div
            class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40"
          >
            <p :class="ui.label()">Drag files into this app window.</p>
            <p :class="ui.label()">
              state: <span :class="ui.code()">{{ dragDrop.lastEventType ?? "idle" }}</span>
            </p>
            <p v-if="dragDropPosition" :class="ui.label()">
              pos:
              <span :class="ui.code()">{{ dragDropPosition.x }}, {{ dragDropPosition.y }}</span>
            </p>
            <p :class="ui.label()">
              dropped: <span :class="ui.code()">{{ dragDropDroppedCount }}</span>
            </p>
          </div>
          <div :class="ui.row()">
            <BaseButton size="sm" variant="outline" @click="emitDemoEvent"
              >Emit ui://demo-ping</BaseButton
            >
          </div>
          <div class="space-y-1">
            <p :class="ui.label()">Bus messages:</p>
            <p v-if="!busMessages.length" :class="ui.subtitle()">No messages yet</p>
            <p v-for="message in busMessages" :key="message" :class="ui.code()">{{ message }}</p>
          </div>
        </article>
        <BaseContextMenuTrigger
          :items="[
            { id: 'edit', label: 'Edit', icon: 'pencil-outline' },
            { id: 'duplicate', label: 'Duplicate', icon: 'content-copy' },
            { id: 'delete', label: 'Delete', danger: true, icon: 'delete-outline' },
          ]"
          @select="pushToast(`ctx: ${$event}`)"
        >
          <article :class="ui.card()">
            <h2 :class="ui.sectionTitle()">BaseTable + Context menu</h2>
            <BaseTable
              :columns="tableColumns"
              :rows="tableRows"
              @sort-change="pushToast(`sort: ${$event.key} ${$event.direction ?? 'none'}`)"
              @row-click="pushToast(`row: ${$event.name}`)"
            >
              <template #cell-price="{ value }"> ${{ value }} </template>
            </BaseTable>
            <p :class="ui.subtitle()">Right click in this card to open context menu.</p>
          </article>
        </BaseContextMenuTrigger>
      </section>
    </TwoPaneLayout>

    <BaseToast :items="toastItems" @dismiss="dismissToast" />
  </main>
</template>
