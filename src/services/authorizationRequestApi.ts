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
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";

const AUTHORIZATION_REQUEST_ENDPOINT_BASE = GENESIS_BASE_URL
  ? `${GENESIS_BASE_URL}/genesis/v1/iam/authorization_requests`
  : "";

export type AuthorizationRequestInfo = {
  uuid: string;
  created_at: string;
  updated_at: string;
  scope: string | null;
  expiration_time_at?: string;
  [key: string]: unknown;
};

export function getAuthUuidFromUrl(currentLocation?: Location): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const search = currentLocation?.search ?? window.location.search;
  if (!search) {
    return null;
  }

  const params = new URLSearchParams(search);
  const raw = params.get("auth_uuid");

  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function fetchAuthorizationRequestByUuid(
  authUuid: string,
): Promise<AuthorizationRequestInfo> {
  if (!AUTHORIZATION_REQUEST_ENDPOINT_BASE) {
    throw new Error("Cannot call authorization request endpoint: base URL is not available");
  }

  const trimmed = typeof authUuid === "string" ? authUuid.trim() : "";
  if (!trimmed) {
    throw new Error("Authorization request UUID is not configured");
  }

  const url = `${AUTHORIZATION_REQUEST_ENDPOINT_BASE}/${encodeURIComponent(trimmed)}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Authorization request endpoint responded with ${response.status} ${response.statusText}: ${
        text || "no body"
      }`,
    );
  }

  const data = (await response.json()) as AuthorizationRequestInfo;
  return data;
}
