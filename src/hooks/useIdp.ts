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

import { formatErrorDetails } from '../services/errorDetails';
import { fetchIdpByUuid, type IdpConfig } from '../services/idpClient';

export type UseIdpResult = {
  idpConfig: IdpConfig | null;
  idpLoading: boolean;
  idpErrorMessage: string | null;
  idpErrorDetails: string | null;
  reloadIdpConfig: () => void;
};

export function useIdp(idpUuid: string | null): UseIdpResult {
  const [idpConfig, setIdpConfig] = useState<IdpConfig | null>(null);
  const [idpLoading, setIdpLoading] = useState<boolean>(Boolean(idpUuid));
  const [idpErrorMessage, setIdpErrorMessage] = useState<string | null>(null);
  const [idpErrorDetails, setIdpErrorDetails] = useState<string | null>(null);

  const loadIdpConfig = useCallback(async (): Promise<void> => {
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
  }, [idpUuid]);

  useEffect(() => {
    if (!idpUuid) {
      setIdpConfig(null);
      setIdpLoading(false);
      setIdpErrorMessage(null);
      setIdpErrorDetails(null);
      return;
    }

    void loadIdpConfig();
  }, [idpUuid, loadIdpConfig]);

  return {
    idpConfig,
    idpLoading,
    idpErrorMessage,
    idpErrorDetails,
    reloadIdpConfig: loadIdpConfig,
  };
}
