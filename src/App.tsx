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
import { UserInfoPanel } from './components/auth/UserInfoPanel';
import { AuthLayout } from './components/layout/AuthLayout/AuthLayout';
import {
  fetchCurrentUserProfile,
  type CurrentUserProfile,
} from './services/authClient';
import { fetchIamClientByUuid } from './services/iamClientApi';
import {
  fetchAuthorizationRequestByUuid,
  getAuthUuidFromUrl,
  confirmAuthorizationRequest,
} from './services/authorizationRequestApi';
import { formatErrorDetails } from './services/errorDetails';
import { fetchIdpByUuid, getIdpUuidFromUrl, type IdpConfig } from './services/idpClient';
import {
  initializeTokensFromStorage,
  tokenStorage,
  type AuthTokens,
} from './services/tokenStorage';
import { setIamClientUuid } from './services/iamClientContext';

function getIamClientFromIdpConfig(config: IdpConfig | null): string {
  return typeof config?.iam_client === 'string' ? config.iam_client.trim() : '';
}

function App(): JSX.Element {
  const [idpUuid] = useState<string | null>(() => getIdpUuidFromUrl());
  const [authUuid] = useState<string | null>(() => getAuthUuidFromUrl());
  const [idpConfig, setIdpConfig] = useState<IdpConfig | null>(null);
  const [idpLoading, setIdpLoading] = useState<boolean>(Boolean(idpUuid));
  const [idpErrorMessage, setIdpErrorMessage] = useState<string | null>(null);
  const [idpErrorDetails, setIdpErrorDetails] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AuthTokens>({ token: null, refreshToken: null });
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [iamClientName, setIamClientName] = useState<string | null>(null);
  const [requestedScopes, setRequestedScopes] = useState<string[] | null>(null);
  const [authorizationErrorMessage, setAuthorizationErrorMessage] = useState<string | null>(null);
  const [authorizationErrorDetails, setAuthorizationErrorDetails] = useState<string | null>(null);
  const [isConfirmingAuthorization, setIsConfirmingAuthorization] = useState<boolean>(false);

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

      setIdpErrorDetails(formatErrorDetails(error));
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

  useEffect(() => {
    const iamClient = getIamClientFromIdpConfig(idpConfig);
    if (!iamClient) {
      setIamClientUuid(null);
      setIamClientName(null);
      return;
    }

    setIamClientUuid(iamClient);
    initializeTokensFromStorage();
  }, [idpConfig]);

  useEffect(() => {
    if (!authUuid) {
      setRequestedScopes(null);
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const info = await fetchAuthorizationRequestByUuid(authUuid);
        if (isCancelled) {
          return;
        }

        const scopeRaw = typeof info.scope === 'string' ? info.scope.trim() : '';
        const scopes = scopeRaw ? scopeRaw.split(/\s+/).filter(Boolean) : [];
        setRequestedScopes(scopes.length > 0 ? scopes : null);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error('Failed to load authorization request scopes', error);
        setRequestedScopes(null);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [authUuid]);

  useEffect(() => {
    const iamClient = getIamClientFromIdpConfig(idpConfig);
    if (!iamClient) {
      setIamClientName(null);
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const info = await fetchIamClientByUuid(iamClient);
        if (isCancelled) {
          return;
        }

        const name = typeof info.name === 'string' ? info.name.trim() : '';
        setIamClientName(name || iamClient);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error('Failed to load IAM client information', error);
        setIamClientName(iamClient);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [idpConfig]);

  useEffect(() => {
    if (!idpConfig) {
      setTokens({ token: null, refreshToken: null });
      setCurrentUserProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isCancelled = false;

    const unsubscribe = tokenStorage.subscribe((nextTokens) => {
      if (isCancelled) {
        return;
      }

      setTokens(nextTokens);

      const hasAnyToken = Boolean(nextTokens.token) || Boolean(nextTokens.refreshToken);

      if (!hasAnyToken) {
        setCurrentUserProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      void (async () => {
        try {
          const profile = await fetchCurrentUserProfile();

          if (isCancelled) {
            return;
          }

          if (!profile) {
            // eslint-disable-next-line no-console
            console.error(
              'Failed to resolve current user profile. Clearing tokens and returning to login form.',
            );
            tokenStorage.clearAll();
            setCurrentUserProfile(null);
            return;
          }

          setCurrentUserProfile(profile);
        } catch (error) {
          if (isCancelled) {
            return;
          }
          // eslint-disable-next-line no-console
          console.error(
            'Unexpected error while resolving current user profile. Clearing tokens and returning to login form.',
            error,
          );
          tokenStorage.clearAll();
          setCurrentUserProfile(null);
        } finally {
          if (!isCancelled) {
            setIsProfileLoading(false);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [idpConfig]);

  const handleRetryLoadIdp = (): void => {
    void loadIdpConfig();
  };

  const handleSignOut = (): void => {
    tokenStorage.clearAll();
    setCurrentUserProfile(null);
    setAuthorizationErrorMessage(null);
    setAuthorizationErrorDetails(null);
    setIsConfirmingAuthorization(false);
  };

  const hasIdpInUrl = Boolean(idpUuid);

  const handleProvideData = async (): Promise<void> => {
    if (!authUuid || isConfirmingAuthorization) {
      return;
    }

    setAuthorizationErrorMessage(null);
    setAuthorizationErrorDetails(null);
    setIsConfirmingAuthorization(true);

    try {
      const redirectUrl = await confirmAuthorizationRequest(authUuid);
      if (typeof window !== 'undefined' && redirectUrl) {
        window.location.assign(redirectUrl);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to confirm authorization request', error);

      setAuthorizationErrorMessage(
        'Unable to complete authorization request. Please try again later.',
      );

      setAuthorizationErrorDetails(formatErrorDetails(error));
    } finally {
      setIsConfirmingAuthorization(false);
    }
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
    const iamClient = getIamClientFromIdpConfig(idpConfig);

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
