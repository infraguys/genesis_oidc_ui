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

const STORAGE_KEY = 'genesis_oidc_ui.authTokens';
const USER_STORAGE_KEY = 'genesis_oidc_ui.currentUser';

const listeners = new Set<TokenListener>();

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function readPersistedTokens(): AuthTokens {
  if (!isBrowser) {
    return { token: null, refreshToken: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.removeItem(STORAGE_KEY);
    return { token: null, refreshToken: null };
  }
}

let inMemoryTokens: AuthTokens = readPersistedTokens();

function persist(tokens: AuthTokens): void {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearPersisted(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

function notify(): void {
  const snapshot = { ...inMemoryTokens };
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('tokenStorage listener error', error);
    }
  });
}

export const tokenStorage = {
  getTokens(): AuthTokens {
    return { ...inMemoryTokens };
  },

  getToken(): string | null {
    return inMemoryTokens.token;
  },

  getRefreshToken(): string | null {
    return inMemoryTokens.refreshToken;
  },

  /**
   * Updates tokens in memory only (they will be lost after a page reload).
   */
  setTokens(partial: Partial<AuthTokens>): AuthTokens {
    inMemoryTokens = {
      token: partial.token ?? inMemoryTokens.token,
      refreshToken: partial.refreshToken ?? inMemoryTokens.refreshToken,
    };
    notify();
    return { ...inMemoryTokens };
  },

  /**
   * Updates tokens in memory and in localStorage (survives page reloads).
   */
  setPersistentTokens(partial: Partial<AuthTokens>): AuthTokens {
    const updated = this.setTokens(partial);
    persist(updated);
    return updated;
  },

  /**
   * Clears tokens from memory and from localStorage.
   */
  clearAll(): void {
    inMemoryTokens = { token: null, refreshToken: null };
    clearPersisted();
    notify();
  },

  getCurrentUser(): string | null {
    if (!isBrowser) return null;
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return raw;
  },

  setCurrentUser(username: string | null): void {
    if (!isBrowser) return;
    if (!username) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(USER_STORAGE_KEY, username);
    }
  },

  /**
   * Subscribes to token changes. Returns an unsubscribe function.
   */
  subscribe(listener: TokenListener): () => void {
    listeners.add(listener);
    listener({ ...inMemoryTokens });

    return () => {
      listeners.delete(listener);
    };
  },
};
