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

# Style Guide

This document describes the visual style conventions used in the `genesis-oidc-ui` project.

## Typography

### Primary font

- **Font family:** `Montserrat`
- **Weights used:** `300`, `400`, `500`, `600`, `700`
- **Fallback stack:**
  - `system-ui`
  - `-apple-system`
  - `BlinkMacSystemFont`
  - `'Segoe UI'`
  - `sans-serif`

All UI text in the application is expected to use this font stack by default.

### Font loading

Global font loading and base typography configuration are defined in:

- `src/styles/typography.css`

This stylesheet is responsible for:

- Importing the `Montserrat` font from Google Fonts.
- Defining the default `font-family` on the `:root` element.
- Configuring base text rendering and smoothing settings.

The `typography.css` file is imported from the main application entry point:

- `src/main.tsx`

This ensures that typography styles are applied consistently across the entire application.

### Global typography settings

The base typography rules applied at the global level include:

- A default `font-family` set on the `:root` element to ensure consistent text rendering across the app.
- A default `font-weight` suitable for body text.
- Reasonable `line-height` for readability.
- Text rendering and font smoothing options to improve appearance on different platforms and displays.

Component-level styles (for example, buttons, inputs, or headers) may override font size, weight, letter spacing, or text transformation, but they should not override the base font family unless there is a strong design reason to do so.

### Changing typography

When updating typography in the project:

1. **Change global settings**  
   - Update `src/styles/typography.css` if you need to:
     - Add or remove font weights.
     - Adjust the base `font-family` or fallback stack.
     - Tune text rendering or smoothing settings.

2. **Check component-level overrides**  
   - Review components that set:
     - `font-size`
     - `font-weight`
     - `letter-spacing`
     - `text-transform`
   - Ensure that overrides are consistent with the new typography guidelines.

3. **Keep this document in sync**  
   - If you change the primary font family, weights, or the way fonts are loaded:
     - Update this document to reflect the new typography setup.
