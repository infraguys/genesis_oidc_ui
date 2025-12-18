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

import { useCallback, useEffect, useState } from 'react';

import {
  confirmAuthorizationRequest,
  fetchAuthorizationRequestByUuid,
} from '../services/authorizationRequestApi';
import { formatErrorDetails } from '../services/errorDetails';

export type UseAuthorizationRequestResult = {
  requestedScopes: string[] | null;
  authorizationErrorMessage: string | null;
  authorizationErrorDetails: string | null;
  isConfirmingAuthorization: boolean;
  confirmAuthorization: () => Promise<void>;
  resetAuthorizationConfirmationState: () => void;
};

export function useAuthorizationRequest(
  authUuid: string | null,
): UseAuthorizationRequestResult {
  const [requestedScopes, setRequestedScopes] = useState<string[] | null>(null);
  const [authorizationErrorMessage, setAuthorizationErrorMessage] = useState<string | null>(null);
  const [authorizationErrorDetails, setAuthorizationErrorDetails] = useState<string | null>(null);
  const [isConfirmingAuthorization, setIsConfirmingAuthorization] = useState<boolean>(false);

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

  const resetAuthorizationConfirmationState = useCallback((): void => {
    setAuthorizationErrorMessage(null);
    setAuthorizationErrorDetails(null);
    setIsConfirmingAuthorization(false);
  }, []);

  const confirmAuthorization = useCallback(async (): Promise<void> => {
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

      setAuthorizationErrorMessage('Unable to complete authorization request. Please try again later.');
      setAuthorizationErrorDetails(formatErrorDetails(error));
    } finally {
      setIsConfirmingAuthorization(false);
    }
  }, [authUuid, isConfirmingAuthorization]);

  return {
    requestedScopes,
    authorizationErrorMessage,
    authorizationErrorDetails,
    isConfirmingAuthorization,
    confirmAuthorization,
    resetAuthorizationConfirmationState,
  };
}
