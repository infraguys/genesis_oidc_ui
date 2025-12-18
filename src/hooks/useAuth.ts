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

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createAuthClient, type AuthClient, type CurrentUserProfile } from '../services/authClient';
import { setIamClientUuid } from '../services/iamClientContext';
import { fetchIamClientByUuid } from '../services/iamClientApi';
import { type IdpConfig } from '../services/idpClient';
import { initializeTokensFromStorage, tokenStorage, type AuthTokens } from '../services/tokenStorage';

const EMPTY_TOKENS: AuthTokens = { token: null, refreshToken: null };

function getIamClientFromIdpConfig(config: IdpConfig | null): string {
  return typeof config?.iam_client === 'string' ? config.iam_client.trim() : '';
}

export type UseAuthResult = {
  authClient: AuthClient;
  iamClient: string;
  iamClientName: string | null;
  tokens: AuthTokens;
  currentUserProfile: CurrentUserProfile | null;
  isProfileLoading: boolean;
  signOut: () => void;
};

export function useAuth(idpConfig: IdpConfig | null): UseAuthResult {
  const authClient = useMemo(() => createAuthClient(), []);

  const [tokens, setTokens] = useState<AuthTokens>(EMPTY_TOKENS);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [iamClientName, setIamClientName] = useState<string | null>(null);

  const iamClient = getIamClientFromIdpConfig(idpConfig);

  useEffect(() => {
    if (!iamClient) {
      setIamClientUuid(null);
      setIamClientName(null);
      authClient.stop();
      return;
    }

    setIamClientUuid(iamClient);
    initializeTokensFromStorage();
  }, [authClient, idpConfig, iamClient]);

  useEffect(() => {
    return () => {
      authClient.stop();
    };
  }, [authClient]);

  useEffect(() => {
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
  }, [idpConfig, iamClient]);

  useEffect(() => {
    if (!idpConfig) {
      setTokens(EMPTY_TOKENS);
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
          const profile = await authClient.fetchCurrentUserProfile();

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
  }, [authClient, idpConfig]);

  const signOut = useCallback((): void => {
    authClient.stop();
    tokenStorage.clearAll();
    setCurrentUserProfile(null);
    setIsProfileLoading(false);
  }, [authClient]);

  return {
    authClient,
    iamClient,
    iamClientName,
    tokens,
    currentUserProfile,
    isProfileLoading,
    signOut,
  };
}
