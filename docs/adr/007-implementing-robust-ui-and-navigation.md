# ADR 007: Implementing Robust UI and Navigation

## Status

Accepted

## Context

With the core AI functionality working, the next priority was to build the user-facing dashboard and popup. The initial implementation led to two significant user experience problems:

1.  **Non-functional UI**: After creating the initial `popup.html`, `dashboard.html`, and their corresponding TypeScript files (`popup.ts`, `dashboard.ts`), the UI was completely unresponsive. The popup was blank, and the button to open the dashboard did nothing. The browser console was empty, indicating that the JavaScript files were not being loaded or executed at all.

2.  **Redundant Tab Creation**: Once the initial loading issue was fixed, a new usability flaw emerged. Every click on the "View My Pet House" button in the popup would open a brand new dashboard tab, even if one was already open. This cluttered the user's browser and demonstrated a lack of professional polish.

## Decision

We made two targeted decisions to fix these issues and establish a professional UI and navigation foundation.

1.  **Corrected Build Configuration for UI Scripts**: The root cause of the non-functional UI was an incomplete `vite.config.js`. The configuration correctly identified the HTML files as inputs but did not know how to automatically bundle and link their corresponding `.ts` scripts. We fixed this by explicitly adding `popup.ts` and `dashboard.ts` as named entry points in the `rollupOptions.input` configuration. This forced Vite to compile them into `popup.js` and `dashboard.js` and correctly link them in the final HTML output.

2.  **Implemented Intelligent Tab Management**: To solve the redundant tab problem, we replaced the simple `chrome.tabs.create()` call with a more sophisticated `openOrSwitchToDashboard()` function in `popup.ts`.
    *   The function first gets the full, unique URL of the extension's dashboard page using `chrome.runtime.getURL('dashboard.html')`.
    *   It then uses `chrome.tabs.query({})` to search through all the user's open tabs.
    *   It looks for a tab whose URL exactly matches the dashboard's URL.
    *   **If a match is found**, it uses `chrome.tabs.update()` to activate that tab and `chrome.windows.update()` to bring its parent window to the front.
    *   **If no match is found**, it falls back to creating a new tab with `chrome.tabs.create()`.

## Consequences

**Positive:**
- **Functional UI**: The popup and dashboard are now fully interactive and display the correct data.
- **Elegant User Experience**: The extension now behaves intelligently. It avoids creating duplicate tabs, respecting the user's workspace and providing a much smoother, more professional feel.
- **Robust Pathing**: Using `chrome.runtime.getURL()` ensures that the link to the dashboard will always work, regardless of the user's unique extension ID.
- **Improved Build Process**: Our Vite configuration is now more robust and correctly handles a multi-page extension architecture.

**Negative:**
- **Slightly Increased Complexity**: The tab management logic in `popup.ts` is slightly more complex than a single API call, but this is a standard and necessary pattern for creating a high-quality extension experience.
