import { createI18n } from "vue-i18n";
import { LazyStore } from "@tauri-apps/plugin-store";

type LocaleMessages = Record<string, unknown>;
type LocaleLoader = () => Promise<LocaleMessages>;

const STORAGE_KEY = "app-locale";
const STORE_PATH = "app-settings.json";
const DEFAULT_LOCALE = "ru";

const localeModules = import.meta.glob("./locales/*/**/*.ts", {
  import: "default",
}) as Record<string, LocaleLoader>;

const discoveredLocales = Array.from(
  new Set(
    Object.keys(localeModules)
      .map((path) => path.match(/\/locales\/([^/]+)\//)?.[1] ?? "")
      .filter(Boolean),
  ),
);

export type AppLocale = string;

const settingsStore = new LazyStore(STORE_PATH, {
  defaults: {},
  autoSave: 200,
});
let storeInitPromise: Promise<void> | null = null;

async function ensureStoreReady() {
  if (!storeInitPromise) {
    storeInitPromise = settingsStore.init();
  }
  await storeInitPromise;
}

async function readSavedLocale(): Promise<string | null> {
  try {
    await ensureStoreReady();
    return (await settingsStore.get<string>(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function persistLocale(locale: AppLocale) {
  try {
    await ensureStoreReady();
    await settingsStore.set(STORAGE_KEY, locale);
  } catch {
    // Ignore persistence issues outside Tauri context.
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: discoveredLocales[0] ?? DEFAULT_LOCALE,
  messages: {},
});

function deepMerge(target: LocaleMessages, source: LocaleMessages): LocaleMessages {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      target[key] = deepMerge(target[key] as LocaleMessages, value as LocaleMessages);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function resolveLocale(requested?: string | null): AppLocale {
  if (requested && discoveredLocales.includes(requested)) return requested;
  if (discoveredLocales.includes(DEFAULT_LOCALE)) return DEFAULT_LOCALE;
  return discoveredLocales[0] ?? DEFAULT_LOCALE;
}

async function loadLocaleMessages(locale: AppLocale): Promise<LocaleMessages> {
  const entries = Object.entries(localeModules).filter(([path]) =>
    path.includes(`/locales/${locale}/`),
  );
  if (!entries.length) return {};

  const chunks = await Promise.all(entries.map(([, loader]) => loader()));
  return chunks.reduce<LocaleMessages>((acc, chunk) => deepMerge(acc, chunk), {});
}

function purgeOtherLocales(activeLocale: AppLocale) {
  for (const locale of discoveredLocales) {
    if (locale !== activeLocale) i18n.global.setLocaleMessage(locale, {});
  }
}

export async function setAppLocale(nextLocale: AppLocale) {
  const locale = resolveLocale(nextLocale);
  const messages = await loadLocaleMessages(locale);
  i18n.global.setLocaleMessage(locale, messages);
  purgeOtherLocales(locale);
  i18n.global.locale.value = locale;
  await persistLocale(locale);
}

export async function initI18nLocale() {
  const saved = await readSavedLocale();
  const locale = resolveLocale(saved);
  await setAppLocale(locale);
}
