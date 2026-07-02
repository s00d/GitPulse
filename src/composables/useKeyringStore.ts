import { ref } from "vue";
import {
  KeyringSession,
  deletePasswords,
  getPasswords,
  joinKeyPrefix,
  passwordExists,
  setPasswords,
  type PasswordEntryDto,
} from "tauri-plugin-keyring-store-api";

export interface KeyringErrorShape {
  message: string;
}

export interface UseKeyringStoreOptions {
  sessionPath?: string;
  sessionPassword?: string;
}

export function useKeyringStore(options: UseKeyringStoreOptions = {}) {
  const isLoading = ref(false);
  const error = ref<KeyringErrorShape | null>(null);
  const isSessionReady = ref(false);

  const sessionPath = options.sessionPath ?? "/app/keyring";
  const sessionPassword = options.sessionPassword ?? "";

  let sessionPromise: Promise<KeyringSession> | null = null;

  async function run<T>(action: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;
    try {
      return await action();
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function toAccount(prefix: string, name: string) {
    return joinKeyPrefix(prefix, name);
  }

  async function getSession() {
    if (!sessionPromise) {
      sessionPromise = run(async () => {
        const session = await KeyringSession.load(sessionPath, sessionPassword);
        isSessionReady.value = true;
        return session;
      });
    }
    return sessionPromise;
  }

  async function unloadSession() {
    if (!sessionPromise) {
      return;
    }
    const session = await sessionPromise;
    await run(async () => {
      await session.unload();
      isSessionReady.value = false;
    });
    sessionPromise = null;
  }

  function setSecret(account: string, secret: string) {
    return run(() => setPasswords([{ account, secret }]));
  }

  function setSecrets(entries: PasswordEntryDto[]) {
    return run(() => setPasswords(entries));
  }

  async function getSecret(account: string) {
    const values = await run(() => getPasswords([account]));
    return values[0] ?? null;
  }

  function getSecrets(accounts: string[]) {
    return run(() => getPasswords(accounts));
  }

  function removeSecret(account: string) {
    return run(() => deletePasswords([account]));
  }

  function removeSecrets(accounts: string[]) {
    return run(() => deletePasswords(accounts));
  }

  function exists(account: string) {
    return run(() => passwordExists(account));
  }

  return {
    isLoading,
    error,
    isSessionReady,
    toAccount,
    getSession,
    unloadSession,
    setSecret,
    setSecrets,
    getSecret,
    getSecrets,
    removeSecret,
    removeSecrets,
    exists,
  };
}
