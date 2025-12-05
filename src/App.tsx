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

import { useEffect, useState } from 'react';

import { AuthErrorPanel } from './components/auth/AuthErrorPanel';
import { AuthHero } from './components/auth/AuthHero';
import { AuthLoadingPanel } from './components/auth/AuthLoadingPanel';
import { LoginPanel } from './components/auth/LoginPanel';
import { AuthLayout } from './components/layout/AuthLayout/AuthLayout';
import { fetchIdpByUuid, getIdpUuidFromUrl, type IdpConfig } from './services/idpClient';

function App(): JSX.Element {
  const [idpUuid] = useState<string | null>(() => getIdpUuidFromUrl());
  const [idpConfig, setIdpConfig] = useState<IdpConfig | null>(null);
  const [idpLoading, setIdpLoading] = useState<boolean>(Boolean(idpUuid));
  const [idpErrorMessage, setIdpErrorMessage] = useState<string | null>(null);
  const [idpErrorDetails, setIdpErrorDetails] = useState<string | null>(null);

  const loadIdpConfig = async (): Promise<void> => {
    if (!idpUuid) {
      return;
    }

    setIdpLoading(true);
    setIdpErrorMessage(null);
    setIdpErrorDetails(null);

    try {
      const config = await fetchIdpByUuid(idpUuid);
      setIdpConfig(config);
    } catch (error) {
      setIdpConfig(null);
      setIdpErrorMessage('Unable to load identity provider configuration. Please try again later.');

      let details: string;
      if (error instanceof Error) {
        details = error.message;
      } else if (typeof error === 'string') {
        details = error;
      } else {
        try {
          details = JSON.stringify(error);
        } catch {
          details = String(error);
        }
      }

      setIdpErrorDetails(details);
    } finally {
      setIdpLoading(false);
    }
  };

  useEffect(() => {
    if (!idpUuid) {
      return;
    }

    void loadIdpConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetryLoadIdp = (): void => {
    void loadIdpConfig();
  };

  const hasIdpInUrl = Boolean(idpUuid);

  let panel = <LoginPanel />;

  if (hasIdpInUrl) {
    if (idpLoading) {
      panel = <AuthLoadingPanel />;
    } else if (idpErrorMessage) {
      panel = (
        <AuthErrorPanel
          title="Unable to load identity provider"
          message={idpErrorMessage}
          details={idpErrorDetails ?? undefined}
          onRetry={handleRetryLoadIdp}
          retryLabel="Retry"
        />
      );
    } else if (idpConfig) {
      panel = <LoginPanel title={`Welcome to ${idpConfig.name}`} subtitle={idpConfig.description} />;
    } else {
      panel = <AuthLoadingPanel />;
    }
  }

  return <AuthLayout hero={<AuthHero />} panel={panel} />;
}

export default App;
