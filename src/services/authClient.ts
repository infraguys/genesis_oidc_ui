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

import { GENESIS_BASE_URL } from './genesisBaseUrl';
import { type AuthTokens, type TokenStorage } from './tokenStorage';

function getClientHeaders(): Record<string, string> {
  const clientId = import.meta.env.GENESIS_CLIENT_ID;
  const clientSecret = import.meta.env.GENESIS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Genesis client credentials are not configured');
  }

  return {
    'X-Client-Id': clientId,
    'X-Client-Secret': clientSecret,
  };
}

function getTokenEndpoint(iamClientUuid: string): string {
  if (!GENESIS_BASE_URL) {
    throw new Error('Base URL is not available for token endpoint');
  }

  return `${GENESIS_BASE_URL}/genesis/v1/iam/clients/${encodeURIComponent(
    iamClientUuid,
  )}/actions/get_token/invoke`;
}

function getMeEndpoint(iamClientUuid: string): string | null {
  if (!GENESIS_BASE_URL) {
    return null;
  }

  return `${GENESIS_BASE_URL}/genesis/v1/iam/clients/${encodeURIComponent(
    iamClientUuid,
  )}/actions/me`;
}

export type PasswordLoginParams = {
  username: string;
  password: string;
  /**
   * If true, tokens will be stored in localStorage in addition to memory.
   * If false, tokens will only live in memory.
   */
  rememberMe?: boolean;
  scope?: string;
};

export type RefreshOptions = {
  rememberMe?: boolean;
};

export type RawTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_at?: number;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  [key: string]: unknown;
};

export function createAuthClient({
  iamClientUuid,
  tokenStorage,
}: {
  iamClientUuid: string;
  tokenStorage: TokenStorage;
}): AuthClient {
  return new AuthClientImpl({ iamClientUuid, tokenStorage });
}

export type LoginResult = {
  tokens: AuthTokens;
  raw: RawTokenResponse | null;
  meta: TokenMeta;
};

export type TokenMeta = {
  tokenType: string | null;
  expiresAt: number | null;
  expiresIn: number | null;
  refreshExpiresIn: number | null;
  idToken: string | null;
  scope: string | null;
};

export type CurrentUserProfile = {
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  description: string | null;
};

export type AuthClient = {
  loginWithPassword: (params: PasswordLoginParams) => Promise<LoginResult>;
  refreshAccessToken: (options?: RefreshOptions) => Promise<LoginResult>;
  fetchCurrentUserProfile: () => Promise<CurrentUserProfile | null>;
  stop: () => void;
};

function computeRefreshDelaySeconds(meta: TokenMeta): number | null {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds =
    meta.expiresAt ?? (meta.expiresIn != null ? nowSeconds + meta.expiresIn : null);

  if (!expiresAtSeconds) {
    return null;
  }

  const REFRESH_SKEW_SECONDS = 60;
  const MIN_DELAY_SECONDS = 5;

  let delaySeconds = expiresAtSeconds - nowSeconds - REFRESH_SKEW_SECONDS;
  if (delaySeconds < MIN_DELAY_SECONDS) {
    delaySeconds = MIN_DELAY_SECONDS;
  }

  return delaySeconds;
}

class AuthClientImpl implements AuthClient {
  private readonly iamClientUuid: string;

  private readonly tokenStorage: TokenStorage;

  private refreshTimer: number | null = null;

  constructor({ iamClientUuid, tokenStorage }: { iamClientUuid: string; tokenStorage: TokenStorage }) {
    const trimmed = iamClientUuid.trim();
    if (!trimmed) {
      throw new Error('IAM client UUID is not configured');
    }

    this.iamClientUuid = trimmed;
    this.tokenStorage = tokenStorage;
  }

  stop(): void {
    this.clearRefreshTimer();
  }

  async loginWithPassword({
    username,
    password,
    rememberMe = true,
    scope = '',
  }: PasswordLoginParams): Promise<LoginResult> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);
    body.set('scope', scope);
    const result = await this.requestTokens(body, rememberMe);
    this.scheduleAutoRefresh(result.meta, rememberMe);
    return result;
  }

  async refreshAccessToken({ rememberMe = true }: RefreshOptions = {}): Promise<LoginResult> {
    const { refreshToken } = this.tokenStorage.getTokens();

    if (!refreshToken) {
      throw new Error('Cannot refresh access token: no refresh_token available');
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    try {
      const result = await this.requestTokens(body, rememberMe);
      this.scheduleAutoRefresh(result.meta, rememberMe);
      return result;
    } catch (error) {
      this.tokenStorage.clearAll();
      throw error;
    }
  }

  private async requestTokens(body: URLSearchParams, rememberMe: boolean): Promise<LoginResult> {
    const endpoint = getTokenEndpoint(this.iamClientUuid);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...getClientHeaders(),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Token endpoint responded with ${response.status} ${response.statusText}: ${text || 'no body'}`,
      );
    }

    let data: RawTokenResponse | null = null;

    try {
      data = (await response.json()) as RawTokenResponse;
    } catch {
      data = null;
    }

    const tokens: AuthTokens = {
      token: data?.access_token ?? null,
      refreshToken: data?.refresh_token ?? null,
    };

    if (!tokens.token) {
      throw new Error('Token endpoint did not return access_token');
    }

    const meta: TokenMeta = {
      tokenType: data?.token_type ?? null,
      expiresAt: data?.expires_at ?? null,
      expiresIn: data?.expires_in ?? null,
      refreshExpiresIn: data?.refresh_expires_in ?? null,
      idToken: data?.id_token ?? null,
      scope: data?.scope ?? null,
    };

    if (rememberMe) {
      this.tokenStorage.setPersistentTokens(tokens);
    } else {
      this.tokenStorage.setTokens(tokens);
    }

    return { tokens, raw: data, meta };
  }

  private clearRefreshTimer(): void {
    if (typeof window === 'undefined') return;
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleAutoRefresh(meta: TokenMeta, rememberMe: boolean): void {
    if (typeof window === 'undefined') return;

    const delaySeconds = computeRefreshDelaySeconds(meta);
    if (delaySeconds == null) {
      return;
    }

    this.clearRefreshTimer();

    this.refreshTimer = window.setTimeout(() => {
      this.refreshAccessToken({ rememberMe }).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Auto token refresh failed', error);
      });
    }, delaySeconds * 1000);
  }

  async fetchCurrentUserProfile(): Promise<CurrentUserProfile | null> {
    const token = this.tokenStorage.getToken();
    const meEndpoint = getMeEndpoint(this.iamClientUuid);

    if (!token || !meEndpoint) {
      return null;
    }

    const response = await fetch(meEndpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch current user profile', response.status, response.statusText);
      return null;
    }

    let data: MeResponse;
    try {
      data = (await response.json()) as MeResponse;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse current user profile response', error);
      return null;
    }

    const user = data.user;
    if (!user) {
      return null;
    }

    return {
      uuid: user.uuid ?? '',
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      username: user.username ?? null,
      email: user.email ?? null,
      description: user.description ?? null,
    };
  }
}

type MeResponse = {
  user?: {
    uuid?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
    description?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
