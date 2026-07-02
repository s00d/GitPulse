# GitPulse

GitHub menu bar companion (Tauri + Vue): tray-меню, dashboard, issues/PR, stars, watching, notifications.

## Быстрый старт

```bash
pnpm install
pnpm setup:oauth   # создаёт src-tauri/config/oauth.json из шаблона
# вставьте Client ID в src-tauri/config/oauth.json (см. ниже)
pnpm tauri dev
```

## Вход в GitHub

Три способа (приложение не падает, если что-то не настроено):

| Способ | Нужно |
|--------|--------|
| **Device sign-in** | OAuth App + `oauth.json` |
| **Import from gh** | `gh auth login` |
| **Personal access token** | PAT в Настройках |

### Device sign-in: пошагово

**1. Создайте OAuth App**

1. [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Имя: `GitPulse`
3. Homepage URL: `https://github.com` (для локального приложения достаточно)
4. Callback URL: `http://localhost` (для Device Flow не используется, поле обязательно)
5. После создания откройте приложение → включите **Enable Device Flow**
6. Скопируйте **Client ID** (строка вида `Ov23li…`)

**2. Вставьте Client ID в конфиг**

```bash
pnpm setup:oauth
```

Откройте файл **`src-tauri/config/oauth.json`**:

```json
{
  "github_client_id": "Ov23liВАШ_CLIENT_ID"
}
```

Сохраните. Перезапустите `pnpm tauri dev` — **пересборка не нужна**.

Подробнее: [`src-tauri/config/README.md`](src-tauri/config/README.md)

**3. Войдите в приложении**

Экран входа → **Sign in with GitHub** → код на экране → откройте github.com/login/device → подтвердите.

### Альтернатива без OAuth App

- Установите [GitHub CLI](https://cli.github.com), выполните `gh auth login`, нажмите **Import from GitHub CLI**
- Или **Settings** → вставьте [Personal access token](https://github.com/settings/tokens/new?description=GitPulse&scopes=repo) с scope `repo`

### CI / переменная окружения (опционально)

Вместо файла можно передать Client ID при запуске:

```bash
export GITPULSE_GITHUB_CLIENT_ID=Ov23li...
pnpm tauri dev
```

Для production build в CI:

```bash
echo "{\"github_client_id\":\"$GITPULSE_GITHUB_CLIENT_ID\"}" > src-tauri/config/oauth.json
pnpm tauri build
```

## Splash screen (desktop)

`public/splashscreen.html` копируется в `dist/` при сборке Vite.

```bash
pnpm build && test -f dist/splashscreen.html
```

## IDE

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
