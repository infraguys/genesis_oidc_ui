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

## License and copyright

- TypeScript and TSX source files (`.ts`, `.tsx`) are licensed under the Apache 2.0 License.
- Each source file includes a copyright
  notice for Genesis Corporation for 2025.

