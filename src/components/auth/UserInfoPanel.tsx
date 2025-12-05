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
import type { CurrentUserProfile } from '../../services/authClient';
import { PrimaryButton } from '../ui/PrimaryButton/PrimaryButton';

interface UserInfoPanelProps {
  title: string;
  subtitle: string;
  profile: CurrentUserProfile | null;
  iamClientName: string;
  requestedScopes?: string[] | null;
  isProfileLoading: boolean;
  onSignOut: () => void;
}

function getDisplayName(profile: CurrentUserProfile | null): string {
  if (!profile) {
    return '';
  }

  const firstName = profile.first_name?.trim() ?? '';
  const lastName = profile.last_name?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  const username = profile.username?.trim() ?? '';
  const email = profile.email?.trim() ?? '';

  return username || email || 'User';
}

function getAvatarInitials(profile: CurrentUserProfile | null): string {
  if (!profile) {
    return 'U';
  }

  const firstName = profile.first_name?.trim() ?? '';
  const lastName = profile.last_name?.trim() ?? '';
  const username = profile.username?.trim() ?? '';
  const email = profile.email?.trim() ?? '';

  const nameSource = `${firstName} ${lastName}`.trim() || username || email;

  if (!nameSource) {
    return 'U';
  }

  const parts = nameSource.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const firstInitial = parts[0].charAt(0).toUpperCase();
  const secondInitial = parts[1].charAt(0).toUpperCase();

  return `${firstInitial}${secondInitial}`;
}

function getShortUserId(userId: string): string {
  if (!userId) {
    return '';
  }

  const parts = userId.split('-');
  if (parts.length < 2) {
    return userId;
  }

  return parts.slice(0, 2).join('-');
}

async function copyToClipboard(value: string, debugLabel: string): Promise<void> {
  if (!value) {
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to copy ${debugLabel} to clipboard`, error);
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Fallback copy for ${debugLabel} failed`, error);
  }
}

export function UserInfoPanel({
  title,
  subtitle,
  profile,
  iamClientName,
  requestedScopes,
  isProfileLoading,
  onSignOut,
}: UserInfoPanelProps): JSX.Element {
  const displayName = getDisplayName(profile);
  const avatarInitials = getAvatarInitials(profile);

  const username = profile?.username?.trim() || null;
  const email = profile?.email?.trim() || null;
  const profileDescription = profile?.description?.trim() || null;
  const emailDomain = email && email.includes('@') ? email.slice(email.indexOf('@')) : '';
  const userId = profile?.uuid?.trim() || '';
  const shortUserId = getShortUserId(userId);

  const [isScopesExpanded, setIsScopesExpanded] = useState<boolean>(false);

  const handleProvideDataClick = (): void => {
    // eslint-disable-next-line no-console
    console.log('Provide data clicked', {
      iamClientName,
      userId,
      username,
      email,
    });
  };

  const handleCopyUserId = (): void => {
    void copyToClipboard(userId, 'user ID');
  };

  const handleCopyIamClientName = (): void => {
    if (!iamClientName) {
      return;
    }
    void copyToClipboard(iamClientName, 'IAM client name');
  };

  const handleCopyUsername = (): void => {
    if (!username) {
      return;
    }
    void copyToClipboard(username, 'username');
  };

  const handleCopyEmail = (): void => {
    if (!email) {
      return;
    }
    void copyToClipboard(email, 'email');
  };

  const handleToggleScopes = (): void => {
    setIsScopesExpanded((previous) => !previous);
  };

  return (
    <div className="login-panel">
      <div className="login-panel__header">
        <h2 className="login-panel__title">{title}</h2>
        <p className="login-panel__subtitle">{subtitle}</p>
      </div>

      <div className="user-info-panel">
        <div className="user-info-card">
          <div className="user-info-card__header">
            <div className="user-info-card__avatar" aria-hidden="true">
              <span className="user-info-card__avatar-text">{avatarInitials}</span>
            </div>
            <div className="user-info-card__identity">
              <div className="user-info-card__name">{displayName}</div>
              {profileDescription ? (
                <div className="user-info-card__description">{profileDescription}</div>
              ) : null}
            </div>
          </div>

          {isProfileLoading ? (
            <div className="user-info-card__loading">
              <span className="user-info-card__loading-dot" />
              <span className="user-info-card__loading-text">Loading your profile...</span>
            </div>
          ) : (
            <div className="user-info-card__body">
              <div className="user-info-card__grid">
                <div className="user-info-card__field">
                  <div className="user-info-card__label">User ID</div>
                  <div
                    className="user-info-card__value user-info-card__value--inline"
                    data-allow-context-menu="true"
                  >
                    <span className="user-info-card__id-text">{shortUserId || 'Unknown'}</span>
                    {userId ? (
                      <button
                        type="button"
                        className="user-info-card__copy-button"
                        onClick={handleCopyUserId}
                        aria-label="Copy full user ID"
                      >
                        <span className="user-info-card__copy-icon" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="user-info-card__field">
                  <div className="user-info-card__label">IAM client</div>
                  <div
                    className="user-info-card__value user-info-card__value--inline"
                    data-allow-context-menu="true"
                  >
                    <span className="user-info-card__id-text">
                      {iamClientName || 'Unknown'}
                    </span>
                    {iamClientName ? (
                      <button
                        type="button"
                        className="user-info-card__copy-button"
                        onClick={handleCopyIamClientName}
                        aria-label="Copy IAM client name"
                      >
                        <span className="user-info-card__copy-icon" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="user-info-card__field">
                  <div className="user-info-card__label">Username</div>
                  <div className="user-info-card__value user-info-card__value--inline">
                    <span className="user-info-card__id-text">{username || 'Unknown'}</span>
                    {username ? (
                      <button
                        type="button"
                        className="user-info-card__copy-button"
                        onClick={handleCopyUsername}
                        aria-label="Copy username"
                      >
                        <span className="user-info-card__copy-icon" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="user-info-card__field">
                  <div className="user-info-card__label">Email domain</div>
                  <div className="user-info-card__value user-info-card__value--inline">
                    <span className="user-info-card__id-text">{emailDomain || 'Unknown'}</span>
                    {email ? (
                      <button
                        type="button"
                        className="user-info-card__copy-button"
                        onClick={handleCopyEmail}
                        aria-label="Copy email"
                      >
                        <span className="user-info-card__copy-icon" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {requestedScopes && requestedScopes.length > 0 ? (
                <div className="user-info-card__scopes">
                  <button
                    type="button"
                    className="user-info-card__scopes-toggle"
                    onClick={handleToggleScopes}
                    aria-expanded={isScopesExpanded}
                    aria-controls="user-info-card-scopes-content"
                  >
                    <span className="user-info-card__scopes-title">Permissions requested</span>
                    <span
                      className={
                        isScopesExpanded
                          ? 'user-info-card__scopes-icon user-info-card__scopes-icon--expanded'
                          : 'user-info-card__scopes-icon'
                      }
                      aria-hidden="true"
                    />
                  </button>
                  {isScopesExpanded ? (
                    <div
                      id="user-info-card-scopes-content"
                      className="user-info-card__scopes-content"
                    >
                      <div className="user-info-card__scopes-chips">
                        {requestedScopes.map((scope) => (
                          <span key={scope} className="user-info-card__scope-chip">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="user-info-panel__actions">
          <PrimaryButton type="button" fullWidth onClick={handleProvideDataClick}>
            Provide data
          </PrimaryButton>
          <button
            type="button"
            className="user-info-panel__secondary-button"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
