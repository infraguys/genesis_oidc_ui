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

const GENESIS_BASE_URL =
  typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

const IDP_ENDPOINT_BASE = GENESIS_BASE_URL ? `${GENESIS_BASE_URL}/genesis/v1/iam/idp` : '';

export type IdpConfig = {
  uuid: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: string;
  project_id: string;
  iam_client: string;
  client_id: string;
  scope: string;
  callback_uri: string;
};

export function getIdpUuidFromUrl(currentLocation?: Location): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const search = currentLocation?.search ?? window.location.search;
  if (!search) {
    return null;
  }

  const params = new URLSearchParams(search);
  const raw = params.get('idp_uuid');

  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

export async function fetchIdpByUuid(idpUuid: string): Promise<IdpConfig> {
  if (!IDP_ENDPOINT_BASE) {
    throw new Error('Cannot call IdP endpoint: base URL is not available');
  }

  const url = `${IDP_ENDPOINT_BASE}/${encodeURIComponent(idpUuid)}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `IdP endpoint responded with ${response.status} ${response.statusText}: ${text || 'no body'}`,
    );
  }

  const data = (await response.json()) as IdpConfig;
  return data;
}

export async function loadIdpFromCurrentUrl(): Promise<IdpConfig | null> {
  const idpUuid = getIdpUuidFromUrl();
  if (!idpUuid) {
    return null;
  }

  try {
    const config = await fetchIdpByUuid(idpUuid);
    return config;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load IdP configuration', error);
    return null;
  }
}
