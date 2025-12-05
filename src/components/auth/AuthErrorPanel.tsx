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

import { PrimaryButton } from '../ui/PrimaryButton/PrimaryButton';

interface AuthErrorPanelProps {
  title: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function AuthErrorPanel({
  title,
  message,
  details,
  onRetry,
  retryLabel,
}: AuthErrorPanelProps): JSX.Element {
  return (
    <div className="login-panel login-panel--error">
      <div className="login-panel__header">
        <h2 className="login-panel__title">{title}</h2>
        <p className="login-panel__subtitle">{message}</p>
      </div>
      {details ? (
        <div className="login-panel__error-details" data-allow-context-menu="true">
          <pre>{details}</pre>
        </div>
      ) : null}
      {onRetry ? (
        <div className="login-panel__actions">
          <PrimaryButton type="button" fullWidth onClick={onRetry}>
            {retryLabel ?? 'Retry'}
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}
