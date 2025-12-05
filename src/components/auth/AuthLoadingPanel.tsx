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

export function AuthLoadingPanel(): JSX.Element {
  return (
    <div className="login-panel login-panel--loading">
      <div className="login-panel__header">
        <h2 className="login-panel__title">Loading identity provider configuration...</h2>
        <p className="login-panel__subtitle">
          Please wait while we fetch settings for your identity provider.
        </p>
      </div>
      <div className="login-panel__loading" aria-hidden="true">
        <div className="login-panel__spinner" />
      </div>
    </div>
  );
}
