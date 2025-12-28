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

import { API_CORE_PREFIX } from './apiPrefix';
import { GENESIS_BASE_URL } from './genesisBaseUrl';
import { getTrimmedQueryParam } from './queryParams';

const AUTHORIZATION_REQUEST_ENDPOINT_BASE = GENESIS_BASE_URL
  ? `${GENESIS_BASE_URL}${API_CORE_PREFIX}/v1/iam/authorization_requests`
  : '';

export type AuthorizationRequestInfo = {
  uuid: string;
  created_at: string;
  updated_at: string;
  scope: string | null;
  expiration_time_at?: string;
  [key: string]: unknown;
};

type AuthorizationConfirmationResponse = {
  redirect_url?: string | null;
  [key: string]: unknown;
};

function getAuthUuidForRequests(authUuid: string): string {
  const trimmed = typeof authUuid === 'string' ? authUuid.trim() : '';
  if (!trimmed) {
    throw new Error('Authorization request UUID is not configured');
  }

  return trimmed;
}

export function getAuthUuidFromUrl(currentLocation?: Location): string | null {
  return getTrimmedQueryParam('auth_uuid', currentLocation);
}

export async function fetchAuthorizationRequestByUuid(
  authUuid: string,
): Promise<AuthorizationRequestInfo> {
  if (!AUTHORIZATION_REQUEST_ENDPOINT_BASE) {
    throw new Error('Cannot call authorization request endpoint: base URL is not available');
  }

  const trimmed = getAuthUuidForRequests(authUuid);

  const url = `${AUTHORIZATION_REQUEST_ENDPOINT_BASE}/${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Authorization request endpoint responded with ${response.status} ${response.statusText}: ${
        text || 'no body'
      }`,
    );
  }

  const data = (await response.json()) as AuthorizationRequestInfo;
  return data;
}

export async function confirmAuthorizationRequest(authUuid: string, accessToken: string): Promise<string> {
  if (!AUTHORIZATION_REQUEST_ENDPOINT_BASE) {
    throw new Error('Cannot call authorization request endpoint: base URL is not available');
  }

  const trimmed = getAuthUuidForRequests(authUuid);

  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (!token) {
    throw new Error('Cannot confirm authorization request: access token is not available');
  }

  const url = `${AUTHORIZATION_REQUEST_ENDPOINT_BASE}/${encodeURIComponent(
    trimmed,
  )}/actions/confirm/invoke`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Authorization confirmation endpoint responded with ${response.status} ${response.statusText}: ${
        text || 'no body'
      }`,
    );
  }

  let data: AuthorizationConfirmationResponse;
  try {
    data = (await response.json()) as AuthorizationConfirmationResponse;
  } catch (error) {
    throw new Error(
      `Authorization confirmation endpoint did not return a valid JSON body: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const rawRedirectUrl = data.redirect_url;
  const redirectUrl = typeof rawRedirectUrl === 'string' ? rawRedirectUrl.trim() : '';

  if (!redirectUrl) {
    throw new Error(
      'Authorization confirmation endpoint did not provide redirect_url in the response',
    );
  }

  return redirectUrl;
}
