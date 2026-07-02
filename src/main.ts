import { createApp } from "vue";
import { createPinia } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import App from "./App.vue";
import "./styles.css";
import { createTauriPiniaPersistPlugin } from "./plugins/piniaTauriStore";
import { i18n, initI18nLocale } from "./i18n";
import { initTheme } from "./composables/useTheme";

const app = createApp(App);
const pinia = createPinia();
initTheme();

pinia.use(
  createTauriPiniaPersistPlugin({
    storePath: "pinia-store.json",
    keyPrefix: "pinia",
  }),
);

app.use(pinia);
app.use(i18n);

async function bootstrap() {
  await initI18nLocale();
  app.mount("#app");
  try {
    await invoke("app_ready");
  } catch {
    // No-op in web/test environment without Tauri backend.
  }
}

void bootstrap();
