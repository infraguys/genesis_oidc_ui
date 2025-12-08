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

# Authorization request and "Provide data" flow

## Purpose

This document describes how the `genesis_oidc_ui` application handles authorization
requests that are identified by the `auth_uuid` query parameter and how the
**Provide data** button in the `UserInfoPanel` interacts with the backend to
confirm providing user data to the OIDC client and to perform the final
redirect.

It complements the more general authentication overview in `auth-flow.md`.

## Query parameters

The application can consume the following query parameters from the browser URL:

- `idp_uuid`: the identity provider identifier used to load the IdP configuration
  and resolve the IAM client UUID (see `auth-flow.md`).
- `auth_uuid`: the authorization request identifier used to:
  - load the list of requested permissions (scopes);
  - confirm that the user agrees to provide their data to the OIDC client;
  - perform the final redirect back to the integrating application.

The `auth_uuid` parameter is optional from a purely technical point of view, but
some parts of the UI behave differently depending on whether it is present.

## Reading `auth_uuid` from the URL

The `authorizationRequestApi` service exposes a helper function:

- `getAuthUuidFromUrl(currentLocation?: Location): string | null`

This function:

1. Reads the query string from `currentLocation.search` or
   `window.location.search`.
2. Uses `URLSearchParams` to extract the `auth_uuid` parameter.
3. Trims whitespace and returns one of the following values:
   - a non-empty string when the parameter is present and non-blank;
   - `null` when the parameter is missing or empty.

The root `App` component calls `getAuthUuidFromUrl()` once during initialization
and keeps the result in its local state. This value is then used for loading the
authorization request scopes and for confirming the request when the user
clicks **Provide data**.

## Loading requested permissions (scopes)

When a non-empty `auth_uuid` value is available, the application calls the
backend endpoint:

- `GET /genesis/v1/iam/authorization_requests/<auth_uuid>`

via the `fetchAuthorizationRequestByUuid(authUuid)` function from the
`authorizationRequestApi` service.

The response is mapped to the `AuthorizationRequestInfo` structure, which
contains at least the `scope` field. The `scope` string is split into
individual scopes and rendered as a list of small badges inside the
**Permissions requested** section of the `UserInfoPanel`.

If `auth_uuid` is missing or empty, the application does not attempt to load the
authorization request and renders the user profile without the scope
information.

## Provide data button behavior

The `UserInfoPanel` component renders an actions block at the bottom that
includes the primary **Provide data** button and the secondary **Sign out**
button.

The **Provide data** button is only meaningful when:

- a valid IdP configuration is loaded and an IAM client is resolved;
- the user is already authenticated and their profile is available;
- the page was opened with a valid `auth_uuid` parameter that points to an
  existing authorization request.

### Disabled state when `auth_uuid` is missing

If the user is authenticated but the `auth_uuid` query parameter is missing or
empty, the application keeps the **Provide data** button visible but disabled.

In this state:

- the button cannot be clicked;
- the UI can show a short explanation (for example, as a tooltip or helper
  text) indicating that the authorization request identifier is not available
  and that the user cannot complete the authorization.

This behavior makes it explicit that the UI is in a partially configured state:
there is an authenticated user, but there is no concrete authorization request
to confirm.

## Confirming an authorization request

When the user is authenticated and a non-empty `auth_uuid` value is available,
clicking the **Provide data** button triggers a confirmation request to the
backend.

The frontend calls the endpoint:

- `POST /genesis/v1/iam/authorization_requests/<auth_uuid>/actions/confirm/invoke`

with the following characteristics:

- The HTTP method is `POST`.
- The request includes the `Authorization` header with the current access token
  obtained from `tokenStorage`:

  - `Authorization: Bearer <access_token>`

- The request body is empty; all necessary information is implied by the
  current user identity and the `auth_uuid` path parameter.

If the access token is not available (for example, tokens were cleared or have
never been obtained), the UI does not send the confirmation request and instead
behaves as in the unauthenticated state.

## Redirect handling

On success, the `confirm/invoke` endpoint returns a JSON response that contains
the final redirect URL instead of issuing an HTTP redirect that the browser has
to follow automatically.

The response body has the following shape (additional fields may be present
depending on the backend implementation):

```json
{
  "redirect_url": "https://zulip.genesis-core.local/complete/oidc/?code=...&state=..."
}
```

The UI parses the JSON response, extracts the `redirect_url` field, and then
initiates browser navigation using standard mechanisms such as
`window.location.assign(redirectUrl)`.

The redirect URL is controlled by the backend and typically corresponds to the
OIDC client or relying party that initiated the authorization request.

## Error handling

Several error scenarios can occur during the confirmation step.

### Missing `auth_uuid`

If the `auth_uuid` query parameter is missing or empty:

- the application does not attempt to call the `confirm/invoke` endpoint;
- the **Provide data** button remains disabled and the user can only sign out;
- the main panel stays in the authenticated state (no global error panel is
  shown).

### Backend errors during confirmation

If the `confirm/invoke` endpoint returns a non-2xx HTTP status code or if the
`redirect_url` field is missing or empty in the JSON response, the application
considers the confirmation step failed.

In this case:

- a detailed error is logged to the browser console to help with diagnostics;
- the right-hand panel switches to the reusable `AuthErrorPanel` component with
  a user-friendly error message explaining that the authorization could not be
  completed;
- optional technical details (for example, HTTP status, backend message or
  parsing errors) can be displayed in a smaller font inside the error panel.

The user can typically close the window or return to the integrating
application and re-initiate the flow after the underlying problem has been
resolved.
