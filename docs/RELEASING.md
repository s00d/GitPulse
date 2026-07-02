# Releasing GitPulse

## Prerequisites

1. **GitHub OAuth Client ID** for device sign-in in production builds.
2. **Tauri updater signing keypair** (minisign).
3. **Apple Developer ID** certificate (macOS notarization).
4. Repository secrets configured (see below).

## Generate updater signing keys

```bash
CI=true pnpm tauri signer generate -w ~/.tauri/gitpulse.key --force --ci
```

- Public key (`~/.tauri/gitpulse.key.pub`) → already in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). Update if you regenerate keys.
- Private key → GitHub secret `TAURI_PRIVATE_KEY`:

```bash
cat ~/.tauri/gitpulse.key
```

If the key is password-protected, also set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in CI (exported automatically when `TAURI_SIGNING_PRIVATE_KEY` is set).

## GitHub repository secrets

| Secret | Description |
|--------|-------------|
| `TAURI_PRIVATE_KEY` | Full minisign private key (contents of `gitpulse.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Optional; only if the private key has a password |
| `APPLE_CERTIFICATE` | Developer ID Application `.p12` encoded as base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` file |
| `APPLE_ID` | Apple ID used for notarization — see [Apple notarization credentials](#apple-notarization-credentials) |
| `APPLE_PASSWORD` | App-specific password — see [Apple notarization credentials](#apple-notarization-credentials) |
| `APPLE_TEAM_ID` | Apple Developer Team ID — see [Apple notarization credentials](#apple-notarization-credentials) |
| `GITPULSE_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID (`Ov23li…`) bundled into the app |

`GITHUB_TOKEN` is provided automatically by GitHub Actions.

### Apple notarization credentials

These three secrets are used only for the **macOS** job. They tell Apple’s notary service who is submitting the app.

#### `APPLE_ID`

This is the **email address of your Apple ID** tied to the paid Apple Developer Program account.

Where to find it:

1. Open [https://developer.apple.com/account](https://developer.apple.com/account) and sign in.
2. The same email you use there is your `APPLE_ID`.
3. Example: `you@example.com`

Requirements:

- The account must be enrolled in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
- It must have permission to create **Developer ID Application** certificates (Account Holder or Admin).

#### `APPLE_PASSWORD`

This is **not** your normal Apple ID password. It is an **app-specific password** generated for automation (CI, `notarytool`, Tauri).

How to create it:

1. Sign in at [https://appleid.apple.com](https://appleid.apple.com).
2. Go to **Sign-In and Security** → **App-Specific Passwords**.
3. Click **Generate an app-specific password** (or the `+` button).
4. Label it something like `GitPulse GitHub Actions`.
5. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`).
6. Paste the full string into GitHub secret `APPLE_PASSWORD`.

Notes:

- You cannot view the password again after closing the dialog — generate a new one if you lose it.
- If you use two-factor authentication on your Apple ID (required for Developer accounts), app-specific passwords are mandatory for CI.
- Revoke old passwords on appleid.apple.com if you rotate credentials.

#### `APPLE_TEAM_ID`

A **10-character team identifier** (letters and digits), e.g. `AB12CD34EF`.

Where to find it:

**Option A — Apple Developer website**

1. Open [https://developer.apple.com/account](https://developer.apple.com/account).
2. Go to **Membership details** (or **Account** → **Membership**).
3. Copy **Team ID**.

**Option B — Xcode**

1. Open Xcode → **Settings** (or **Preferences**) → **Accounts**.
2. Select your Apple ID → your team.
3. Team ID is shown in the team details panel.

**Option C — Terminal (if certificates are installed locally)**

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

The identity string often ends with `(TEAMID)`, e.g.:

`Developer ID Application: Your Name (AB12CD34EF)` → `APPLE_TEAM_ID` = `AB12CD34EF`

Use the Team ID of the team that owns the **Developer ID Application** certificate imported as `APPLE_CERTIFICATE`.

### Encode Apple certificate

```bash
base64 -i Certificates.p12 | pbcopy
```

Paste into `APPLE_CERTIFICATE`.

## Create a release

1. Bump version in `package.json` and `src-tauri/tauri.conf.json` (or use a single source of truth).
2. Commit and push to `main`.
3. Open **Actions** → **Build and Release Tauri App** → **Run workflow**.
4. When the workflow finishes, review the **draft** GitHub Release.
5. Publish the release when artifacts look correct.

The workflow builds:

- macOS universal `.dmg` / `.app`
- Linux `.deb` / `.AppImage` (as configured by Tauri)
- Windows x64 and x86 installers

Updater metadata (`latest.json` + signatures) is attached when `includeUpdaterJson: true`.

## Updater endpoints

Configured in `src-tauri/tauri.conf.json`:

- `https://github.com/s00d/GitPulse/releases/latest/download/latest.json`
- `https://raw.githubusercontent.com/s00d/GitPulse/update/latest.json`

Optional: maintain an `update` branch with `latest.json` for the raw.githubusercontent URL (same pattern as SwitchShuttle).

## Local production build

```bash
pnpm setup:oauth   # or set GITPULSE_GITHUB_CLIENT_ID
pnpm tauri build
```

For signed macOS builds locally, import your Developer ID certificate into Keychain and set the same env vars as CI.
