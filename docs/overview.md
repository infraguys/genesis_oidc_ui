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

# Project overview

## Purpose

This repository contains a minimal single-page application built with React, TypeScript, and Vite. It can be used as a base template for further user interface development.

## Stack

- React
- TypeScript
- Vite
- npm as the package manager

## Requirements

- Node.js version 18.x or higher
- npm version 9.x or higher

## Project structure

- `package.json` — project metadata and npm scripts.
- `vite.config.ts` — Vite configuration.
- `tsconfig.json` — shared TypeScript configuration.
- `index.html` — HTML template for the application.
- `src/`
  - `main.tsx` — application entry point, mounting React to the DOM.
  - `App.tsx` — root React component.
- `public/` — static assets (if needed).

## Scripts

- `npm install` — install dependencies.
- `npm run dev` — start the development server.
- `npm run build` — build the production bundle.
- `npm run preview` — preview the built application.
- `npm run lint` — run ESLint checks.
 
## Development server proxy

During local development, the Vite dev server is configured to proxy backend requests.

- All HTTP requests starting with the `/genesis` path prefix are forwarded to `http://127.0.0.1:11010`.
- The `/genesis` prefix is stripped before the request is sent to the backend.
  - Example: `/genesis/api/health` -> `http://127.0.0.1:11010/api/health`.
- This proxy configuration is applied only when running the dev server via `npm run dev`.

In addition to forwarding the request, the proxy also attaches a set of headers that describe how the frontend is accessed externally:

- `X-Forwarded-Host` — the host used by the client to access the UI (for example, `auth.genesis-core.local`).
- `X-Forwarded-Port` — the port used by the client to access the UI (for example, `5173`).
- `X-Forwarded-Proto` — the protocol used by the client (`http` in typical local development scenarios).
- `X-Forwarded-Prefix` — the UI base path prefix (`/genesis`).

The backend can use these headers to reconstruct the external base URL of the UI. For example:

`{X-Forwarded-Proto}://{X-Forwarded-Host}:{X-Forwarded-Port}{X-Forwarded-Prefix}`

The proxy is configured in the `vite.config.ts` file.

## Linting

ESLint is used to enforce code quality for TypeScript and React.

Key parts of the configuration:

- ESLint
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

### Running linting

To run linting, execute:

```bash
npm run lint
```

## Authentication flow

The application includes a minimal implementation of an authentication flow based on a login form and token handling.

Key elements of the flow:

- displaying the login form on the main screen;
- sending the username and password to the backend token endpoint;
- storing the received tokens in memory and, if needed, in `localStorage`.

A detailed description of the architecture, token handling algorithm, and manual testing scenarios is available in the `auth-flow.md` document in the `docs/` directory.

## License and copyright

- TypeScript and TSX source files (`.ts`, `.tsx`) are licensed under the Apache 2.0 License.
- Each source file includes a copyright
  notice for Genesis Corporation for 2025.
