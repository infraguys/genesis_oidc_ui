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

import { useState } from 'react';

import { AuthErrorPanel } from './components/auth/AuthErrorPanel';
import { AuthHero } from './components/auth/AuthHero';
import { AuthLoadingPanel } from './components/auth/AuthLoadingPanel';
import { LoginPanel } from './components/auth/LoginPanel';
import { UserInfoPanel } from './components/auth/UserInfoPanel';
import { AuthLayout } from './components/layout/AuthLayout/AuthLayout';

import { useAuth } from './hooks/useAuth';
import { useAuthorizationRequest } from './hooks/useAuthorizationRequest';
import { useIdp } from './hooks/useIdp';
import { getAuthUuidFromUrl } from './services/authorizationRequestApi';
import { getIdpUuidFromUrl } from './services/idpClient';

function App(): JSX.Element {
  const [idpUuid] = useState<string | null>(() => getIdpUuidFromUrl());
  const [authUuid] = useState<string | null>(() => getAuthUuidFromUrl());

  const { idpConfig, idpLoading, idpErrorMessage, idpErrorDetails, reloadIdpConfig } = useIdp(idpUuid);

  const { iamClient, iamClientName, tokens, currentUserProfile, isProfileLoading, signOut } =
    useAuth(idpConfig);

  const {
    requestedScopes,
    authorizationErrorMessage,
    authorizationErrorDetails,
    isConfirmingAuthorization,
    confirmAuthorization,
    resetAuthorizationConfirmationState,
  } = useAuthorizationRequest(authUuid);

  const handleRetryLoadIdp = (): void => {
    void reloadIdpConfig();
  };

  const handleSignOut = (): void => {
    signOut();
    resetAuthorizationConfirmationState();
  };

  const hasIdpInUrl = Boolean(idpUuid);

  const handleProvideData = (): void => {
    void confirmAuthorization();
  };

  let panel: JSX.Element;

  if (!hasIdpInUrl) {
    panel = (
      <AuthErrorPanel
        title="Unable to load identity provider"
        message="The idp_uuid query parameter is missing. Login page cannot be used without an identity provider."
      />
    );
  } else if (idpLoading) {
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
  } else if (authorizationErrorMessage) {
    panel = (
      <AuthErrorPanel
        title="Unable to complete authorization"
        message={authorizationErrorMessage}
        details={authorizationErrorDetails ?? undefined}
      />
    );
  } else if (idpConfig) {
    if (!iamClient) {
      panel = (
        <AuthErrorPanel
          title="Unable to load identity provider"
          message="The identity provider configuration does not contain a valid IAM client identifier."
        />
      );
    } else {
      const hasAnyToken = Boolean(tokens.token) || Boolean(tokens.refreshToken);
      const isProvideDataDisabled =
        !authUuid || isConfirmingAuthorization || !currentUserProfile || isProfileLoading;
      const provideDataDisabledReason = !authUuid
        ? 'Authorization request identifier (auth_uuid) is missing in the current URL.'
        : undefined;

      if (hasAnyToken) {
        panel = (
          <UserInfoPanel
            title={`${idpConfig.name} is`}
            subtitle="requesting access to your information. Review the information below."
            profile={currentUserProfile}
            iamClientName={iamClientName ?? iamClient}
            requestedScopes={requestedScopes ?? undefined}
            isProfileLoading={isProfileLoading}
            onSignOut={handleSignOut}
            onProvideData={handleProvideData}
            isProvideDataDisabled={isProvideDataDisabled}
            provideDataDisabledReason={provideDataDisabledReason}
          />
        );
      } else {
        panel = (
          <LoginPanel title={`Welcome to ${idpConfig.name}`} subtitle={idpConfig.description} />
        );
      }
    }
  } else {
    panel = <AuthLoadingPanel />;
  }

  return <AuthLayout hero={<AuthHero />} panel={panel} />;
}

export default App;
