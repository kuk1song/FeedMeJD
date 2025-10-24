# ADR 003: Implementing Programmatic Injection for SPA Navigation

## Status

Accepted

## Context

The initial version of the extension relied on the `manifest.json` `content_scripts` field for declarative, static injection based on URL `matches` patterns. This approach failed in several real-world scenarios when tested on a complex Single Page Application (SPA) like LinkedIn:

1.  **UI Instability**: When navigating from a non-matching URL (e.g., `linkedin.com/feed/`) to a matching URL (`linkedin.com/jobs/`) within the same tab, the content script would not run because the page did not perform a full reload. The UI would only appear after a manual refresh.
2.  **Premature Injection Failure**: If the user's journey began on a domain *outside* the `matches` pattern (e.g., `google.com`), the content script was never injected into the tab at all. Subsequent SPA navigations within that tab to a matching URL were therefore ineffective.
3.  **Lack of Precision**: Broadening the `matches` pattern to `linkedin.com/*` caused the UI to be injected on irrelevant pages (like `/feed/` or `/messaging/`), creating a poor user experience.

A more robust, dynamic, and precise injection mechanism was required.

## Decision

We made a strategic architectural shift from **declarative injection** to **programmatic injection**, controlled entirely by the background script.

1.  **Shifted Responsibility to Background Script**: The `background.ts` script was elevated to an "Air Traffic Controller." It now uses the `chrome.tabs.onUpdated` API to actively monitor URL changes across all tabs.

2.  **Removed Declarative Injection**: The entire `content_scripts` section was removed from `manifest.json`.

3.  **Granted Necessary Permissions**: The `"tabs"` permission was added to the manifest, authorizing the background script to monitor tab updates. The `"scripting"` permission was already present, which authorized the use of the `executeScript` API.

4.  **Implemented Conditional Injection**: The background script's listener now contains precise logic:
    - **IF** a tab's URL updates to include `linkedin.com/jobs`, it uses `chrome.scripting.executeScript()` and `chrome.scripting.insertCSS()` to dynamically inject the content script and its stylesheet into that specific tab.
    - This ensures the UI *only* appears when and where it is needed.

## Consequences

**Positive:**
- **Reliable UI Appearance**: The extension now works flawlessly with SPA navigation. The UI appears reliably the moment a user navigates to a relevant `/jobs/` page, regardless of their starting point or navigation path, and without requiring a manual refresh.
- **Precision and Performance**: The UI is no longer injected into irrelevant pages, providing a cleaner user experience and avoiding unnecessary resource consumption.
- **Architectural Soundness**: This model is the gold standard for developing complex extensions for modern web applications. It is more robust, scalable, and maintainable.

**Negative:**
- **Increased Code Complexity**: The logic is now more complex than a simple manifest entry. It requires careful management of background script listeners and programmatic API calls. This is a necessary trade-off for the reliability gained.
