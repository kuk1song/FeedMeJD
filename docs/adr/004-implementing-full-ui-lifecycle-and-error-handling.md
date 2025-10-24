# ADR 004: Implementing Full UI Lifecycle Management and Graceful Degradation

## Status

Accepted

## Context

After implementing programmatic injection (ADR-003), two new challenges emerged:

1.  **Persistent UI**: The injected content script and its UI would remain on the page even after the user navigated *away* from a relevant `/jobs/` URL to another page within the LinkedIn SPA. This created a cluttered and confusing user experience.
2.  **Experimental API Failures**: The core functionality relies on the experimental `chrome.ai` API. Early testing revealed runtime errors, such as `Cannot read properties of undefined (reading 'getAvailability')`, indicating that the API might not be available or ready when called. The extension needed a way to handle these failures gracefully instead of crashing.

## Decision

We implemented a comprehensive lifecycle and error-handling system to make the extension robust and user-aware.

1.  **Implemented a UI Unload Protocol**:
    - The `background.ts` `onUpdated` listener was enhanced. It now contains an `else` condition that triggers when a user navigates to a LinkedIn URL that is *not* a `/jobs/` page.
    - In this case, it sends a specific `{ type: "UNLOAD_PET_UI" }` message to the content script in that tab.
    - A `cleanup()` method was added to the `PetUIManager` class in `content.ts`. This method removes the pet's UI from the DOM and disconnects its `MutationObserver` to free up resources.
    - A message listener was added to `content.ts` that calls the `cleanup()` method upon receiving the `UNLOAD_PET_UI` message.

2.  **Added an Injection Guard**: To prevent multiple instances of the content script from running if the background script fired inject commands too rapidly, a global flag (`window.feedMeJdInjected`) was implemented in `content.ts`. The entire script is wrapped in a check for this flag, ensuring it only executes once per page context.

3.  **Implemented Graceful Degradation for AI**:
    - A defensive, runtime check `if (typeof chrome.ai === 'undefined')` was added to the top of the `handleAIAnalysis` function in `background.ts`. If the API object doesn't exist, it immediately throws a specific `AI_UNAVAILABLE` error.
    - The `(chrome.ai as any).getAvailability()` call was added to proactively check the model's status (`available`, `downloading`, etc.) and throw distinct, identifiable errors for each state.
    - The error-handling logic in `content.ts` was enhanced to catch these specific errors and display corresponding, user-friendly messages in the pet's UI (e.g., "Sorry! My AI brain isn't supported on this device.").

## Consequences

**Positive:**
- **Polished User Experience**: The UI now appears and disappears at precisely the right moments, behaving like a native feature of the website.
- **Robustness and Stability**: The extension no longer crashes due to unavailable experimental APIs. It gracefully informs the user about the situation.
- **Performance**: The `cleanup()` method ensures that the extension does not cause memory leaks or performance degradation by leaving active listeners on pages where it's no longer needed.
- **Professional Architecture**: The combination of programmatic injection and a full lifecycle management system represents a professional, production-ready architecture.

**Negative:**
- **Increased Communication Overhead**: The architecture now relies on messaging between the background and content scripts for state management, which adds a layer of complexity to the logic.
