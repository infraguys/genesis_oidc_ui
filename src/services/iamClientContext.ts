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

let currentIamClientUuid: string | null = null;

function normalizeIamClientUuid(uuid: string | null): string | null {
  if (!uuid) {
    return null;
  }

  const trimmed = uuid.trim();
  if (!trimmed) {
    return null;
  }

  const withoutTrailingSlash = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  const segments = withoutTrailingSlash.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  return segments[segments.length - 1];
}

export function setIamClientUuid(uuid: string | null): void {
  currentIamClientUuid = normalizeIamClientUuid(uuid);
}

export function getIamClientUuid(): string | null {
  return currentIamClientUuid;
}
