<!--
Copyright 2025 Genesis Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Authentication flow

## Purpose

This document describes how the `genesis_oidc_ui` application implements:

- the user login form;
- interaction with the authentication server to obtain tokens;
- storage and automatic refresh of access tokens.

## Authentication architecture

- **User interface components**
  - `LoginForm` — a form for entering username and password.
  - `LoginPanel` — a panel that hosts `LoginForm` and supporting text.
- **Services**
  - `authClient` — a module responsible for calling backend token endpoints and processing responses.
  - `tokenStorage` — a module that stores tokens in memory and in `localStorage` and notifies listeners when tokens change.

## IdP configuration loading

- When the single-page application is opened, it can read an IdP (Identity Provider) identifier from the browser URL query string.
- The UI expects the `idp_uuid` parameter in the form `?idp_uuid=<uuid>`.
- If `idp_uuid` is present and non-empty, the frontend calls the backend endpoint:

  - `GET /genesis/v1/iam/idp/{idp_uuid}`.

- The `IdpClient` service is responsible for:
  - extracting `idp_uuid` from `window.location.search`;
  - calling the IdP endpoint;
  - mapping the response to the `IdpConfig` structure.

### IdpConfig structure

The IdP configuration object includes at least:

- `uuid: string`
- `name: string`
- `description: string`
- `created_at: string`
- `updated_at: string`
- `status: string`
- `project_id: string`
- `iam_client: string`
- `client_id: string`
- `scope: string`
- `callback_uri: string`

The `iam_client` field contains the IAM client UUID that the UI uses when calling token-related backend endpoints and when building namespaced storage keys for tokens and the current user. The login form is only available when a valid `iam_client` value is present in the IdP configuration.

When `idp_uuid` is missing or empty, or when the IdP configuration cannot be loaded or does not contain a valid `iam_client` value, the application treats this as a configuration error and renders the authentication error panel instead of the login form.

## Login panel behavior with IdP configuration

When an `idp_uuid` query parameter is present in the browser URL and a corresponding IdP configuration is successfully loaded, the right-hand login panel is fully driven by the IdP data.

- The login form is **not** rendered until the IdP configuration request is completed.
- If the request succeeds:
  - The panel header uses the IdP `name` field as the service name.
    - The title becomes: `Welcome to <name>`.
    - Example: for `name = "ServiceName"` the title is rendered as `Welcome to ServiceName`.
  - The panel subtitle is taken from the IdP `description` field.
    - Example:
      `Sign in to access ServiceName application via the OIDC (OpenID Connect) authentication protocol.`

If `idp_uuid` is missing or empty, or the IdP configuration cannot be loaded or validated, the application does **not** render the login form. Instead, it shows the `AuthErrorPanel` component explaining that the identity provider configuration is not available and that the login page cannot be used.

## IdP loading, success, and error states

When `idp_uuid` is present and an IdP configuration request is initiated, the right-hand side of the layout can be in one of three states.

### Loading state

- While the IdP configuration is being loaded, the application renders a loading view in the right-hand panel instead of the login form.
- The loading view contains:
  - A short title (for example, `Loading identity provider configuration…`).
  - A spinner or progress indicator.
- The login form is **not** visible during this state.

### Success state

- When the IdP configuration is successfully fetched:
  - The loading view is replaced by the login panel.
  - The login panel header uses the IdP `name` and `description` fields as described above.
  - The `LoginForm` component is rendered below the header and behaves the same way as in the generic (non-IdP) scenario.

### Error state

If the IdP configuration request fails (for example, due to network issues or a non-2xx HTTP status):

- The login form is **not** rendered.
- Instead, the right-hand panel displays a reusable error component specialized for authentication-related problems.

The error component:

- Shows a user-friendly error message, for example:
  `Unable to load identity provider configuration. Please try again later.`
- Can display additional technical details (such as the HTTP status or backend error message) in a smaller font to help with diagnostics.
- Includes a `Retry` action that triggers another attempt to load the IdP configuration.
- Can be reused for other authentication errors in the future (for example, login failures or token issues), not only for IdP loading failures.

In the current version of the application, the main screen focuses on the login flow. After a successful login, additional logic (navigation, displaying protected screens, etc.) is **intentionally not executed** — tokens are only stored for later use.

## User authentication flow

1. The user opens the single-page `genesis_oidc_ui` application.
2. The root application component renders the `LoginPanel` component, which contains the `LoginForm`.
3. The user enters a username and password and chooses whether to enable the `Remember me on this computer` checkbox (it is unchecked by default).
4. When the form is submitted:
   - a basic check is performed to ensure that username and password are not empty;
   - the `loginWithPassword` function from the `authClient` module is called with parameters:
     - `username` — the user's login;
     - `password` — the user's password;
     - `rememberMe` — a boolean flag that corresponds to the state of the `Remember me on this computer` checkbox (when `true`, tokens are saved in `localStorage`; when `false`, tokens are stored only in memory);
     - `scope` — the access scope string (for example, `project:default`).
5. The `loginWithPassword` function calls the backend token endpoint and receives a token response.
6. On a successful response, the `authClient` module passes tokens to `tokenStorage`, which:
   - updates tokens in memory;
   - when `rememberMe = true`, saves them to `localStorage` in addition to memory;
   - when `rememberMe = false`, keeps them only in memory so that they are cleared after a page reload;
   - stores the `currentUser` value in `localStorage` only when `rememberMe = true`, and clears it when `rememberMe = false`.
7. At this stage no additional logic is executed (no screen switch, no page navigation, etc.). Tokens are only stored and can be used later by other parts of the application.

## Visual design of the login page

The login page is a full-screen view with a gradient background and a two-column layout.

- On the left there is the `AuthHero` block with an animated logo and a dynamic tagline.
- On the right there is the `LoginPanel`, which either:
  - shows a loading or error state when IdP configuration is being loaded or failed to load, or
  - displays the login form with a header and subtitle (either generic or driven by the IdP configuration).

The `AuthLayout` component is responsible for the page layout:

- it sets the background for the full browser window height;
- it vertically and horizontally centers `AuthHero` and `LoginPanel`;
- it adapts the layout for mobile devices (columns collapse into rows).

The `AuthHero` component contains:

- a circular animated logo in the center of the page;
- a product title;
- the `DynamicTagline` component, which displays one phrase from a predefined set and periodically changes it with a small random delay.

This visual layer does not change the authentication flow itself: after a successful login the application still only sends a request to the token endpoint and stores tokens in the storage, without navigating to other screens.

## Interaction with the backend

### Token endpoints

The `authClient` module builds token endpoint URLs based on the current browser window base URL (`window.location`). Using this base and the IAM client UUID from the loaded IdP configuration (`IdpConfig.iam_client`), it defines:

- the endpoint for obtaining a token with username and password (`grant_type=password`);
- the endpoint for refreshing a token using a refresh token (`grant_type=refresh_token`).

Each request includes:

- `client_id` and `client_secret` — client identifier and secret;
- `grant_type` — the token grant type (`password` or `refresh_token`);
- additional parameters such as `scope`.

### Response handling

The token endpoint response contains at least:

- `access_token` — the access token;
- `refresh_token` — the refresh token (if supported by the server);
- token lifetime fields (`expires_in`, `expires_at`, `refresh_expires_in`, etc.);
- additional fields that depend on the backend implementation.

The `authClient` module normalizes the response into:

- a token object (`AuthTokens`) that contains `token` and `refreshToken`;
- a token metadata object (`TokenMeta`) that includes the token type, expiration time, and scope.

If the `access_token` field is missing in the response, the request is considered unsuccessful and an error is thrown.

## Token storage

The `tokenStorage` module is responsible for consistent storage and distribution of tokens.

### Token format

Tokens are represented by the `AuthTokens` type:

- `token: string | null` — the current access token;
- `refreshToken: string | null` — the current refresh token.

### In-memory and localStorage storage

- After each successful login or token refresh, `tokenStorage`:
  - updates token values in memory;
  - when `setPersistentTokens` is used, additionally serializes them to `localStorage` under a key that is namespaced by the current IAM client UUID.
- For each IAM client UUID `<client_uuid>` the following keys are used:
  - `genesis_oidc_ui.<client_uuid>.authTokens` — a JSON object with `token` and `refreshToken` fields;
  - `genesis_oidc_ui.<client_uuid>.currentUser` — the last successfully authenticated username for that client.

This allows the application to:

- quickly access tokens from memory within the current session;
- restore tokens when the page is reloaded, if they were saved with `rememberMe = true`;
- keep tokens for different IAM clients strictly isolated so that tokens issued for one client are never reused for another client.

### Current user

In addition to tokens, `tokenStorage` can store the current user identifier in `localStorage` (for example, username or display name) so that the UI can use it without an extra request.

## Automatic token refresh

To keep the access token up to date, a refresh token and the `refreshAccessToken` function from the `authClient` module are used.

### Auto-refresh algorithm

1. After successfully obtaining a token, the `authClient` module calculates the access token expiration time from the metadata (`expires_at` or `expires_in`).
2. Taking into account a small safety margin (skew), it computes the delay before the next refresh request.
3. A browser timer (`setTimeout`) is set up; when the delay elapses it calls `refreshAccessToken`.
4. `refreshAccessToken` reads the current `refreshToken` from `tokenStorage` and requests a new access token from the backend.
5. On a successful response, the new token set is again stored in `tokenStorage`, and the cycle repeats.
6. If the refresh fails (for example, the refresh token is invalid), `tokenStorage.clearAll()` clears all tokens, and the application ends up in an unauthenticated state.

## Manual testing of the authentication flow

To test the basic login and token storage behavior with and without persistence:

1. Install dependencies and start the dev server:
   - `npm install`
   - `npm run dev`
2. Open the application in the browser (typically `http://localhost:5173` or the port configured by Vite).
3. Make sure the login page is displayed (`LoginPanel` with `LoginForm` inside `AuthLayout`/`AuthHero`).

### Scenario A: login with "Remember me on this computer" enabled

4. Enter a test username and password accepted by the authentication server.
5. Enable the `Remember me on this computer` checkbox.
6. Submit the form and check:
   - that the token endpoint request completed successfully (HTTP status 200);
   - that a token object appeared in `localStorage` (the key and value format depend on the `tokenStorage` implementation);
   - that a `currentUser` value is stored in `localStorage` for the current IAM client UUID;
   - that after reloading the page tokens are restored from `localStorage`.

### Scenario B: login without "Remember me on this computer"

7. Reload the page to clear any in-memory tokens.
8. Enter a test username and password again.
9. Make sure the `Remember me on this computer` checkbox is **not** enabled.
10. Submit the form and check:
    - that the token endpoint request completed successfully (HTTP status 200);
    - that no token object is written to `localStorage` for the current IAM client UUID;
    - that no `currentUser` value remains in `localStorage` (or that it has been cleared by the new login);
    - that after reloading the page the user is no longer authenticated because tokens were stored only in memory.

At the current stage, after a successful login the application **does not** switch to another screen and does not perform any navigation. Further steps (showing a protected UI, sign-out flow, etc.) can be added later on top of the authentication flow described here.

