# GitHub OAuth (Device Flow)

`client_id` — **публичный** идентификатор OAuth App. Его можно хранить в репозитории в собранном приложении.  
**Секрет (client secret) для Device Flow не нужен.**

## Быстрый старт

### 1. Создайте OAuth App на GitHub

1. Откройте [GitHub Developer settings → OAuth Apps](https://github.com/settings/developers).
2. **New OAuth App** (или **Register a new application**).
3. Заполните:
   - **Application name:** `GitPulse` (или любое)
   - **Homepage URL:** `https://github.com` (для локального приложения подойдёт любой URL)
   - **Authorization callback URL:** `http://localhost` (для Device Flow не используется, но поле обязательно)
4. Сохраните приложение.
5. В настройках приложения включите **Enable Device Flow** (Device authorization flow).
6. Скопируйте **Client ID** (вид `Ov23li…` или `Iv1.…`).

### 2. Положите Client ID в конфиг

Из корня репозитория:

```bash
cp src-tauri/config/oauth.example.json src-tauri/config/oauth.json
```

Откройте `src-tauri/config/oauth.json` и замените `YOUR_CLIENT_ID_HERE` на ваш Client ID:

```json
{
  "github_client_id": "Ov23liXXXXXXXXXXXX"
}
```

Файл `oauth.json` в `.gitignore` — в git он не попадёт.

Или одной командой:

```bash
pnpm setup:oauth
# затем отредактируйте src-tauri/config/oauth.json
```

### 3. Запустите приложение

```bash
pnpm tauri dev
```

Пересборка **не нужна** при смене `oauth.json` — достаточно перезапустить `tauri dev`.

## Если Device Flow не настроен

Приложение **не падает**. Остаются другие способы входа:

| Способ | Когда |
|--------|--------|
| **Import from GitHub CLI** | Установлен `gh` и выполнен `gh auth login` |
| **Personal access token** | Настройки → вставить `ghp_…` / `github_pat_…` |

## Приоритет загрузки `client_id`

1. Переменная окружения **`GITPULSE_GITHUB_CLIENT_ID`** (удобно для CI)
2. Файл **`src-tauri/config/oauth.json`** (основной способ для разработки)
3. Файл в bundle **`config/oauth.json`** (production-сборка)

## Production-сборка

Перед `pnpm tauri build` убедитесь, что `src-tauri/config/oauth.json` существует и заполнен — он копируется в bundle как resource.

Для CI можно не коммитить файл, а создать его в pipeline:

```bash
echo '{"github_client_id":"'"$GITPULSE_GITHUB_CLIENT_ID"'"}' > src-tauri/config/oauth.json
pnpm tauri build
```

## Scope

Device Flow запрашивает scope **`repo`** — как `gh auth login --scopes repo`.  
Без него не будут доступны private issues/PR.

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| «OAuth client_id is not configured» | Создайте `oauth.json` из example |
| «Device code request failed» | Проверьте Client ID и что **Device Flow включён** в OAuth App |
| «missing repo scope» | Перевыпустите токен / войдите заново с scope `repo` |
