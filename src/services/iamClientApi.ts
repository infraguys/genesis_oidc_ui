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

const IAM_CLIENT_ENDPOINT_BASE = GENESIS_BASE_URL
  ? `${GENESIS_BASE_URL}/genesis/v1/iam/clients`
  : '';

export type IamClientInfo = {
  uuid: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  client_id?: string;
  redirect_url?: string;
};

function normalizeIamClientIdentifier(raw: string): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  const segments = withoutTrailingSlash.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '';
  }

  return segments[segments.length - 1];
}

export async function fetchIamClientByUuid(uuid: string): Promise<IamClientInfo> {
  if (!IAM_CLIENT_ENDPOINT_BASE) {
    throw new Error('Cannot call IAM client endpoint: base URL is not available');
  }

  const normalized = normalizeIamClientIdentifier(uuid);
  if (!normalized) {
    throw new Error('IAM client UUID is not configured');
  }

  const url = `${IAM_CLIENT_ENDPOINT_BASE}/${encodeURIComponent(normalized)}`;

  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `IAM client endpoint responded with ${response.status} ${response.statusText}: ${text || 'no body'}`,
    );
  }

  const data = (await response.json()) as IamClientInfo;
  return data;
}
