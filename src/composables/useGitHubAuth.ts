import { useKeyringStore } from "@/composables/useKeyringStore";

const TOKEN_ACCOUNT = "github-token";
const TOKEN_PREFIX = "gitpulse";

let cachedToken: string | null | undefined;

export function useGitHubAuth() {
  const keyring = useKeyringStore();

  function tokenAccount() {
    return keyring.toAccount(TOKEN_PREFIX, TOKEN_ACCOUNT);
  }

  async function loadToken(): Promise<string | null> {
    if (cachedToken !== undefined) {
      return cachedToken;
    }
    try {
      cachedToken = await keyring.getSecret(tokenAccount());
      return cachedToken;
    } catch {
      cachedToken = null;
      return null;
    }
  }

  async function saveToken(token: string) {
    const trimmed = token.trim();
    await keyring.setSecret(tokenAccount(), trimmed);
    cachedToken = trimmed;
    return trimmed;
  }

  async function clearToken() {
    try {
      await keyring.removeSecret(tokenAccount());
    } catch {
      // ignore missing secret
    }
    cachedToken = null;
  }

  function getTokenSync(): string | null {
    return cachedToken ?? null;
  }

  function invalidateCache() {
    cachedToken = undefined;
  }

  return {
    loadToken,
    saveToken,
    clearToken,
    getTokenSync,
    invalidateCache,
    isLoading: keyring.isLoading,
    error: keyring.error,
  };
}
