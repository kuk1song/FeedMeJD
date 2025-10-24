# ADR 002: Resolving Build Process and Static Asset Loading Issues

## Status

Accepted

## Context

After migrating to a Vite-based build process (ADR-001), we encountered a series of critical errors when attempting to load the unpacked extension from the `dist` directory in Chrome. The browser reported that the `manifest.json` file was missing or unreadable, and subsequently, that icon files could not be loaded. This indicated a fundamental mismatch between our project structure and Vite's default build output.

## Decision

We implemented a series of targeted fixes to align our project structure with Vite's conventions for handling static assets in browser extensions.

1.  **Established a `public` Directory**: The root cause of the missing manifest was that Vite was not configured to copy it from `src` to `dist`. The standard solution was adopted: a `public` directory was created at the project root. All assets that do not require processing (e.g., `manifest.json`, `images/`, `icons/`) were moved into this directory. Vite automatically copies the entire contents of `public` into the `dist` root during the build process.

2.  **Generated Missing Icons**: The manifest referenced icon files (`icon16.png`, etc.) that did not exist in the project, causing a loading error. To resolve this quickly, the macOS `sips` command-line tool was used to generate the required icon sizes from an existing image (`gem.png`). These were placed in `public/icons/`.

3.  **Flattened Build Output for HTML Files**: The `default_popup` file was not found because Vite, preserving the source structure, placed it at `dist/src/popup.html` while the manifest expected it at `dist/popup.html`. The decision was made to treat HTML files as root-level entry points.
    - `popup.html` and `dashboard.html` were moved from `src/` to the project root.
    - `vite.config.js` was updated to point the `rollupOptions.input` directly to these root-level HTML files, resulting in a clean, flat structure in the `dist` directory.

## Consequences

**Positive:**
- **Correct Build Output**: The extension now loads correctly in Chrome without any manifest or asset-related errors.
- **Standard Project Structure**: Our project now follows a conventional and predictable structure for modern web/extension development, making it easier for others to understand.
- **Robust Asset Handling**: The use of the `public` directory provides a clear and reliable mechanism for managing all static assets.

**Negative:**
- **Initial Confusion**: The initial build errors caused a temporary halt in development while the root cause was investigated. This highlights the importance of understanding the specific configuration needs of the chosen build tool.
