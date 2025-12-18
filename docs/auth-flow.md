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
  - `UserInfoPanel` — a panel that displays the authenticated user profile and lets the user confirm providing their data to the OIDC client.
- **Services**
  - `authClient` — a module responsible for calling backend token endpoints and processing responses.
  - `tokenStorage` — a module that stores tokens in memory and in `localStorage` and notifies listeners when tokens change.
 - **React context**
   - `IamClientUuidContext` — a context that provides the current IAM client UUID derived from the loaded IdP configuration.
 - **Hooks**
   - `useIdp(idpUuid)` — a hook that loads the IdP configuration and manages its loading and error state.
   - `useAuth(idpConfig)` — a hook that manages token subscription and user profile loading.
   - `useAuthorizationRequest(authUuid)` — a hook that loads requested scopes and confirms authorization requests.

## IdP configuration loading

- When the single-page application is opened, it can read an IdP (Identity Provider) identifier from the browser URL query string.
- The UI expects the `idp_uuid` parameter in the form `?idp_uuid=<uuid>`.
- If `idp_uuid` is present and non-empty, the frontend calls the backend endpoint:

  - `GET /genesis/v1/iam/idp/{idp_uuid}`.

- The `idpClient` service provides:
   - `getIdpUuidFromUrl()` — extracting `idp_uuid` from `window.location.search`.
   - `fetchIdpByUuid(idpUuid)` — calling the IdP endpoint and mapping the response to the `IdpConfig` structure.
 - The root `App` component reads `idp_uuid` once during initialization and passes it to `useIdp(idpUuid)`, which manages the IdP loading lifecycle (loading, error, retry).

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

The IAM client UUID is made available to the component tree via React Context. Services that require the IAM client UUID (such as token requests and token persistence) receive it explicitly when they are created, instead of reading it from a module-level singleton.

When `idp_uuid` is missing or empty, or when the IdP configuration cannot be loaded or does not contain a valid `iam_client` value, the application treats this as a configuration error and renders the authentication error panel instead of the login form.

## Authentication panel behavior with IdP configuration

When an `idp_uuid` query parameter is present in the browser URL and a corresponding IdP configuration is successfully loaded, the right-hand authentication panel is fully driven by the IdP data.

- Until the IdP configuration request is completed, the authentication panel does **not** render either the login form or the user information panel.
- If the request succeeds and there are no tokens for the current IAM client:
  - The panel header uses the IdP `name` field as the service name.
    - The title becomes: `Welcome to <name>`.
    - Example: for `name = "ServiceName"` the title is rendered as `Welcome to ServiceName`.
  - The panel subtitle is taken from the IdP `description` field.
    - Example:
      `Sign in to access ServiceName application via the OIDC (OpenID Connect) authentication protocol.`
  - Below the header, the `LoginPanel` component renders the `LoginForm` that lets the user enter credentials.
- If the request succeeds and valid tokens are already available for the current IAM client (for example, after restoring them from `localStorage`), the authentication panel can immediately render the `UserInfoPanel` instead of the login form, as described in the sections below.

If `idp_uuid` is missing or empty, or the IdP configuration cannot be loaded or validated, the application does **not** render the login form or the user information panel. Instead, it shows the `AuthErrorPanel` component explaining that the identity provider configuration is not available and that the login page cannot be used.

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

In the current version of the application, the main screen focuses on the login and user confirmation flow. After a successful login, the application loads the user profile and shows it in the `UserInfoPanel`, but it still does **not** navigate to protected screens — tokens and profile data are only stored and can be reused later by other parts of the application.

## User authentication flow

1. The user opens the single-page `genesis_oidc_ui` application.
2. The root application component renders the authentication layout (`AuthLayout`) with the left-hand `AuthHero` block and the right-hand authentication panel.
3. If an IdP configuration is successfully loaded and there are no tokens for the current IAM client, the authentication panel renders the `LoginPanel` with the `LoginForm`.
4. The user enters a username and password and chooses whether to enable the `Remember me on this computer` checkbox (it is unchecked by default).
5. When the form is submitted:
   - a basic check is performed to ensure that username and password are not empty;
   - the `loginWithPassword` function from the `authClient` module is called with parameters:
     - `username` — the user's login;
     - `password` — the user's password;
     - `rememberMe` — a boolean flag that corresponds to the state of the `Remember me on this computer` checkbox (when `true`, tokens are saved in `localStorage`; when `false`, tokens are stored only in memory);
     - `scope` — the access scope string (for example, `project:default`).
6. The `loginWithPassword` function calls the backend token endpoint and receives a token response.
7. On a successful response, the `authClient` module passes tokens to `tokenStorage`, which:
   - updates tokens in memory;
   - when `rememberMe = true`, saves them to `localStorage` in addition to memory;
   - when `rememberMe = false`, keeps them only in memory so that they are cleared after a page reload;
   - stores the `currentUser` value in `localStorage` only when `rememberMe = true`, and clears it when `rememberMe = false`.
8. After tokens are stored, the application calls the `me` endpoint via the `authClient` module using the current access token to resolve the `CurrentUserProfile` for the authenticated user.
9. If the `me` request succeeds:
   - the right-hand authentication panel switches from the `LoginPanel` to the `UserInfoPanel`;
   - `UserInfoPanel` displays the user profile fields (such as full name, username, email, and UUID), IAM client information (for example, the current IAM client identifier) and token status badges;
   - the header uses the IdP `name` in a phrase such as `<name> is requesting access to`, and the subtitle asks the user to review the information below;
   - the primary `Provide data` action confirms the current authorization request (identified by the `auth_uuid` query parameter) by calling the backend endpoint described below and, on success, redirects the browser to the final redirect URL returned by the backend;
   - the secondary `Sign out` action clears tokens via `tokenStorage.clearAll()` and returns the UI to the unauthenticated login state.
10. If the `me` request fails for any reason (for example, expired or invalid tokens, network error, or server error):
    - the error is logged to the browser console using `console.error(...)`;
    - `tokenStorage.clearAll()` is called to remove all tokens and the stored current user;
    - the application ends up in an unauthenticated state and renders the `LoginPanel` again. The same logic is applied when tokens are restored from `localStorage` during app initialization.

## Visual design of the login page

The login page is a full-screen view with a gradient background and a two-column layout.

- On the left there is the `AuthHero` block with an animated logo and a dynamic tagline.
- On the right there is the authentication panel, which can render different components depending on the state:
  - a loading or error view when IdP configuration is being loaded or failed to load;
  - the `LoginPanel` with the login form and its header/subtitle when the user is not authenticated;
  - the `UserInfoPanel` with the authenticated user profile when valid tokens and a user profile are available.

The `AuthLayout` component is responsible for the page layout:

- it sets the background for the full browser window height;
- it vertically and horizontally centers `AuthHero` and the right-hand authentication panel;
- it adapts the layout for mobile devices (columns collapse into rows).

The `AuthHero` component contains:

- a circular animated logo in the center of the page;
- a product title;
- the `DynamicTagline` component, which displays one phrase from a predefined set and periodically changes it with a small random delay.

This visual layer does not change the backend interaction model: after a successful login the application still only communicates with the token and user-profile (`me`) endpoints and does not navigate to other screens. All further navigation and business logic are expected to be implemented by the integrating application.

## User information and confirmation panel (`UserInfoPanel`)

The `UserInfoPanel` component is rendered on the right-hand side of the layout when a user is already authenticated (for example, immediately after a successful login or after restoring tokens from `localStorage`). It reuses the same visual style as the login panel but presents the content as an ID-card-like user profile:

- A header that uses the IdP `name` in a phrase such as `<name> is requesting access to` and a short subtitle asking the user to review the information below.
- A compact "ID card" with:
  - user profile fields such as full name, description, username, email domain, and user UUID (`CurrentUserProfile`);
  - IAM client information such as the current IAM client name and identifier.
- A collapsible **Permissions requested** section below the ID card that is collapsed by default and, when expanded, shows the OIDC scopes requested by the application as a set of small badges. These scopes are loaded from the `/genesis/v1/iam/authorization_requests/<auth_uuid>` endpoint, where `auth_uuid` is taken from the `auth_uuid` query parameter in the current page URL. The `scope` string from the backend response is split into individual scopes before rendering.
- An actions block with:
  - a primary **Provide data** button that confirms the current authorization request (identified by the `auth_uuid` query parameter) by calling the backend endpoint described below and, on success, redirects the browser to the final redirect URL returned by the backend;
  - a secondary **Sign out** button that clears tokens via `tokenStorage.clearAll()` and returns the UI to the unauthenticated login state.

The same rules that apply to the login panel layout (alignment, spacing, and responsiveness) also apply to the user information panel, so switching between `LoginPanel` and `UserInfoPanel` does not change the overall page layout.

## Authorization request and "Provide data" flow

### Purpose

This section describes how the `genesis_oidc_ui` application handles authorization requests that are identified by the `auth_uuid` query parameter and how the **Provide data** button in the `UserInfoPanel` interacts with the backend to confirm providing user data to the OIDC client and to perform the final redirect.

### Query parameters

The application can consume the following query parameters from the browser URL:

- `idp_uuid`: the identity provider identifier used to load the IdP configuration and resolve the IAM client UUID.
- `auth_uuid`: the authorization request identifier used to:
  - load the list of requested permissions (scopes);
  - confirm that the user agrees to provide their data to the OIDC client;
  - perform the final redirect back to the integrating application.

The `auth_uuid` parameter is optional from a purely technical point of view, but some parts of the UI behave differently depending on whether it is present.

### Reading `auth_uuid` from the URL

The `authorizationRequestApi` service exposes a helper function:

- `getAuthUuidFromUrl(currentLocation?: Location): string | null`

This function:

1. Reads the query string from `currentLocation.search` or `window.location.search`.
2. Uses `URLSearchParams` to extract the `auth_uuid` parameter.
3. Trims whitespace and returns one of the following values:
  - a non-empty string when the parameter is present and non-blank;
  - `null` when the parameter is missing or empty.

The root `App` component calls `getAuthUuidFromUrl()` once during initialization and passes the result to `useAuthorizationRequest(authUuid)`. This hook is responsible for loading the authorization request scopes and exposing a confirmation action that the UI triggers when the user clicks **Provide data**.

### Loading requested permissions (scopes)

When a non-empty `auth_uuid` value is available, the application calls the backend endpoint:

- `GET /genesis/v1/iam/authorization_requests/<auth_uuid>`

via the `fetchAuthorizationRequestByUuid(authUuid)` function from the `authorizationRequestApi` service.

In the React layer, this request is orchestrated by the `useAuthorizationRequest(authUuid)` hook.

The response is mapped to the `AuthorizationRequestInfo` structure, which contains at least the `scope` field. The `scope` string is split into individual scopes and rendered as a list of small badges inside the **Permissions requested** section of the `UserInfoPanel`.

If `auth_uuid` is missing or empty, the application does not attempt to load the authorization request and renders the user profile without the scope information.

### Provide data button behavior

The `UserInfoPanel` component renders an actions block at the bottom that includes the primary **Provide data** button and the secondary **Sign out** button.

The **Provide data** button is only meaningful when:

- a valid IdP configuration is loaded and an IAM client is resolved;
- the user is already authenticated and their profile is available;
- the page was opened with a valid `auth_uuid` parameter that points to an existing authorization request.

#### Disabled state when `auth_uuid` is missing

If the user is authenticated but the `auth_uuid` query parameter is missing or empty, the application keeps the **Provide data** button visible but disabled.

In this state:

- the button cannot be clicked;
- the UI can show a short explanation (for example, as a tooltip or helper text) indicating that the authorization request identifier is not available and that the user cannot complete the authorization.

This behavior makes it explicit that the UI is in a partially configured state: there is an authenticated user, but there is no concrete authorization request to confirm.

### Confirming an authorization request

When the user is authenticated and a non-empty `auth_uuid` value is available, clicking the **Provide data** button triggers a confirmation request to the backend.

The frontend calls the endpoint:

- `POST /genesis/v1/iam/authorization_requests/<auth_uuid>/actions/confirm/invoke`

with the following characteristics:

- The HTTP method is `POST`.
- The request includes the `Authorization` header with the current access token obtained from `tokenStorage`:

  - `Authorization: Bearer <access_token>`

- The request body is empty; all necessary information is implied by the current user identity and the `auth_uuid` path parameter.

If the access token is not available (for example, tokens were cleared or have never been obtained), the UI does not send the confirmation request and instead behaves as in the unauthenticated state.

### Redirect handling

On success, the `confirm/invoke` endpoint returns a JSON response that contains the final redirect URL instead of issuing an HTTP redirect that the browser has to follow automatically.

The response body has the following shape (additional fields may be present depending on the backend implementation):

```json
{
  "redirect_url": "https://zulip.genesis-core.local/complete/oidc/?code=...&state=..."
}
```

The UI parses the JSON response, extracts the `redirect_url` field, and then initiates browser navigation using standard mechanisms such as `window.location.assign(redirectUrl)`.

The redirect URL is controlled by the backend and typically corresponds to the OIDC client or relying party that initiated the authorization request.

### Error handling

Several error scenarios can occur during the confirmation step.

#### Missing `auth_uuid`

If the `auth_uuid` query parameter is missing or empty:

- the application does not attempt to call the `confirm/invoke` endpoint;
- the **Provide data** button remains disabled and the user can only sign out;
- the main panel stays in the authenticated state (no global error panel is shown).

#### Backend errors during confirmation

If the `confirm/invoke` endpoint returns a non-2xx HTTP status code or if the `redirect_url` field is missing or empty in the JSON response, the application considers the confirmation step failed.

In this case:

- a detailed error is logged to the browser console to help with diagnostics;
- the right-hand panel switches to the reusable `AuthErrorPanel` component with a user-friendly error message explaining that the authorization could not be completed;
- optional technical details (for example, HTTP status, backend message or parsing errors) can be displayed in a smaller font inside the error panel.

The user can typically close the window or return to the integrating application and re-initiate the flow after the underlying problem has been resolved.

## Interaction with the backend

### Token endpoints

The `authClient` module builds token endpoint URLs based on the current browser window base URL (`window.location`). Using this base and the IAM client UUID from the loaded IdP configuration (`IdpConfig.iam_client`), it defines:

- the endpoint for obtaining a token with username and password (`grant_type=password`);
- the endpoint for refreshing a token using a refresh token (`grant_type=refresh_token`).

Each request includes:

- `X-Client-Id` and `X-Client-Secret` headers — client identifier and secret;
- `grant_type` — the token grant type (`password` or `refresh_token`);
- additional parameters such as `scope`.

The header values are configured at build time via environment variables and injected into the frontend bundle by Vite:

- `GENESIS_CLIENT_ID`
- `GENESIS_CLIENT_SECRET`

When running locally, provide them to the Vite dev server environment (for example, by exporting them in your shell before `npm run dev`).

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

In the current implementation, `tokenStorage` is created for a specific IAM client UUID, which makes the storage namespace an explicit dependency and avoids relying on module-level shared state.

### Current user

In addition to tokens, `tokenStorage` can store the current user identifier in `localStorage` (for example, username or display name) so that the UI can use it without an extra request.

## Automatic token refresh

To keep the access token up to date, a refresh token and the `refreshAccessToken` function from the `authClient` module are used.

In the current implementation, automatic refresh scheduling is managed by an `AuthClient` instance (created and owned by the auth lifecycle hook). This means the refresh timer is instance-scoped and is cleaned up when the session is disposed (for example, on sign-out), rather than being stored as a module-level singleton.

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

