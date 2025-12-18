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

import { LoginForm } from './LoginForm';
import type { AuthClient } from '../../services/authClient';

interface LoginPanelProps {
  authClient: AuthClient;
  title?: string;
  subtitle?: string;
}

export function LoginPanel({ authClient, title, subtitle }: LoginPanelProps): JSX.Element {
  const panelTitle = title ?? 'Welcome';
  const panelSubtitle =
    subtitle ??
    'Sign in to access this application via the OIDC (OpenID Connect) authentication protocol.';

  return (
    <div className="login-panel">
      <div className="login-panel__header">
        <h2 className="login-panel__title">{panelTitle}</h2>
        <p className="login-panel__subtitle">{panelSubtitle}</p>
      </div>
      <LoginForm authClient={authClient} />
    </div>
  );
}
