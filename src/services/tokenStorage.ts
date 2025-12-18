/*
 * Copyright 2025 Genesis Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type AuthTokens = {
  token: string | null;
  refreshToken: string | null;
};

export type TokenListener = (tokens: AuthTokens) => void;

export type TokenStorage = {
  getTokens: () => AuthTokens;
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (partial: Partial<AuthTokens>) => AuthTokens;
  setPersistentTokens: (partial: Partial<AuthTokens>) => AuthTokens;
  clearAll: () => void;
  getCurrentUser: () => string | null;
  setCurrentUser: (username: string | null) => void;
  subscribe: (listener: TokenListener) => () => void;
  initializeFromStorage: () => void;
};

export function createTokenStorage(iamClientUuid: string): TokenStorage {
  const STORAGE_KEY_PREFIX = 'genesis_oidc_ui.';
  const TOKENS_KEY_SUFFIX = '.authTokens';
  const USER_KEY_SUFFIX = '.currentUser';

  const listeners = new Set<TokenListener>();

  const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  const getStorageKey = (suffix: string): string => {
    return `${STORAGE_KEY_PREFIX}${iamClientUuid}${suffix}`;
  };

  const getTokensStorageKey = (): string => {
    return getStorageKey(TOKENS_KEY_SUFFIX);
  };

  const getUserStorageKey = (): string => {
    return getStorageKey(USER_KEY_SUFFIX);
  };

  const readPersistedTokens = (): AuthTokens => {
    if (!isBrowser) {
      return { token: null, refreshToken: null };
    }

    const storageKey = getTokensStorageKey();
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { token: null, refreshToken: null };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthTokens>;
      return {
        token: typeof parsed.token === 'string' ? parsed.token : null,
        refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      };
    } catch {
      window.localStorage.removeItem(storageKey);
      return { token: null, refreshToken: null };
    }
  };

  let inMemoryTokens: AuthTokens = { token: null, refreshToken: null };

  const persist = (tokens: AuthTokens): void => {
    if (!isBrowser) return;
    const storageKey = getTokensStorageKey();
    window.localStorage.setItem(storageKey, JSON.stringify(tokens));
  };

  const clearPersisted = (): void => {
    if (!isBrowser) return;
    window.localStorage.removeItem(getTokensStorageKey());
    window.localStorage.removeItem(getUserStorageKey());
  };

  const notify = (): void => {
    const snapshot = { ...inMemoryTokens };
    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('tokenStorage listener error', error);
      }
    });
  };

  const initializeFromStorage = (): void => {
    if (!isBrowser) {
      return;
    }

    inMemoryTokens = readPersistedTokens();
    notify();
  };

  return {
    getTokens(): AuthTokens {
      return { ...inMemoryTokens };
    },

    getToken(): string | null {
      return inMemoryTokens.token;
    },

    getRefreshToken(): string | null {
      return inMemoryTokens.refreshToken;
    },

    setTokens(partial: Partial<AuthTokens>): AuthTokens {
      inMemoryTokens = {
        token: partial.token ?? inMemoryTokens.token,
        refreshToken: partial.refreshToken ?? inMemoryTokens.refreshToken,
      };
      notify();
      return { ...inMemoryTokens };
    },

    setPersistentTokens(partial: Partial<AuthTokens>): AuthTokens {
      const updated = this.setTokens(partial);
      persist(updated);
      return updated;
    },

    clearAll(): void {
      inMemoryTokens = { token: null, refreshToken: null };
      clearPersisted();
      notify();
    },

    getCurrentUser(): string | null {
      if (!isBrowser) return null;
      const raw = window.localStorage.getItem(getUserStorageKey());
      if (!raw) return null;
      return raw;
    },

    setCurrentUser(username: string | null): void {
      if (!isBrowser) return;
      const userKey = getUserStorageKey();

      if (!username) {
        window.localStorage.removeItem(userKey);
      } else {
        window.localStorage.setItem(userKey, username);
      }
    },

    subscribe(listener: TokenListener): () => void {
      listeners.add(listener);
      listener({ ...inMemoryTokens });

      return () => {
        listeners.delete(listener);
      };
    },

    initializeFromStorage,
  };
}
