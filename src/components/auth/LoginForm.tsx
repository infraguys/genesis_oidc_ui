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
import type { FormEvent } from 'react';

import type { AuthClient } from '../../services/authClient';
import type { TokenStorage } from '../../services/tokenStorage';
import { PrimaryButton } from '../ui/PrimaryButton/PrimaryButton';
import { TextInput } from '../ui/TextInput/TextInput';

interface LoginFormProps {
  authClient: AuthClient;
  tokenStorage: TokenStorage;
}

export function LoginForm({ authClient, tokenStorage }: LoginFormProps): JSX.Element {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!login || !password || isSubmitting) {
      return;
    }

    setError(null);

    if (!rememberMe) {
      tokenStorage.clearAll();
    }

    setIsSubmitting(true);
    try {
      await authClient.loginWithPassword({
        username: login,
        password,
        rememberMe,
        scope: 'project:default',
      });

      tokenStorage.setCurrentUser(rememberMe ? login : null);
    } catch (error) {
      setError('Invalid username or password. Please try again.');
      // eslint-disable-next-line no-console
      console.error('Login failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <TextInput
        label="Login"
        placeholder="Enter your login"
        value={login}
        onChange={setLogin}
        autoComplete="username"
        icon={<span className="icon icon--user" />}
      />
      <TextInput
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={setPassword}
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        icon={
          <button
            type="button"
            className={`password-toggle ${
              showPassword ? 'password-toggle--visible' : 'password-toggle--hidden'
            }`}
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <span className="password-toggle__icon" aria-hidden="true" />
          </button>
        }
      />
      <div className="login-form__remember-row">
        <label className="login-form__remember">
          <input
            type="checkbox"
            className="login-form__remember-checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span className="login-form__remember-label">Remember me on this computer</span>
        </label>
      </div>
      {error && <div className="login-form__error">{error}</div>}
      <PrimaryButton type="submit" fullWidth>
        {isSubmitting ? 'LOGGING IN…' : 'LOGIN'}
      </PrimaryButton>
    </form>
  );
}
