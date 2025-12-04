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

In the current version of the application, the main screen renders only the login panel. After a successful login, additional logic (navigation, displaying protected screens, etc.) is **intentionally not executed** — tokens are only stored for later use.

## User authentication flow

1. The user opens the single-page `genesis_oidc_ui` application.
2. The root application component renders the `LoginPanel` component, which contains the `LoginForm`.
3. The user enters a username and password.
4. When the form is submitted:
   - a basic check is performed to ensure that username and password are not empty;
   - the `loginWithPassword` function from the `authClient` module is called with parameters:
     - `username` — the user's login;
     - `password` — the user's password;
     - `rememberMe = true` — enables saving tokens in `localStorage`;
     - `scope` — the access scope string (for example, `project:default`).
5. The `loginWithPassword` function calls the backend token endpoint and receives a token response.
6. On a successful response, the `authClient` module passes tokens to `tokenStorage`, which:
   - updates tokens in memory;
   - saves them to `localStorage` when `rememberMe = true`;
   - notifies all subscribers about the token change.
7. At this stage no additional logic is executed (no screen switch, no page navigation, etc.). Tokens are only stored and can be used later by other parts of the application.

## Visual design of the login page

The login page is a full-screen view with a gradient background and a two-column layout.

- On the left there is the `AuthHero` block with an animated logo and a dynamic tagline.
- On the right there is the `LoginPanel` with the login form.

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

The `authClient` module builds token endpoint URLs based on the current browser window base URL (`window.location`). Using this base, it defines:

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
  - when `setPersistentTokens` is used, additionally serializes them to `localStorage`.
- A single `localStorage` key is used, which stores a JSON object with `token` and `refreshToken` fields.

This allows the application to:

- quickly access tokens from memory within the current session;
- restore tokens when the page is reloaded, if they were saved with `rememberMe = true`.

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

To test the basic login and token persistence scenario:

1. Install dependencies and start the dev server:
   - `npm install`
   - `npm run dev`
2. Open the application in the browser (typically `http://localhost:5173` or the port configured by Vite).
3. Make sure the login page is displayed (`LoginPanel` with `LoginForm` inside `AuthLayout`/`AuthHero`).
4. Enter a test username and password accepted by the authentication server.
5. Submit the form and check:
   - that the token endpoint request completed successfully (HTTP status 200);
   - that a token object appeared in `localStorage` (the key and value format depend on the `tokenStorage` implementation);
   - that after reloading the page tokens are restored from `localStorage`.

At the current stage, after a successful login the application **does not** switch to another screen and does not perform any navigation. Further steps (showing a protected UI, sign-out flow, etc.) can be added later on top of the authentication flow described here.

