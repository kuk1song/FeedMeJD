# ADR 005: Handling Experimental API Inconsistencies and Environment Discrepancies

## Status

Accepted

## Context

After successfully setting up the project with TypeScript and Vite, we encountered a critical blocker: the core `chrome.ai` API was consistently `undefined`, preventing any interaction with the Gemini Nano model. This led to a multi-stage investigation into an experimental, poorly documented, and evolving API surface.

The key challenges were:
1.  **API Unavailability**: Initial calls to `chrome.ai` and `window.ai` failed, despite correct hardware, OS, and Chrome version.
2.  **API Naming Confusion**: Official documentation, GitHub explainers, and real-world browser implementations used different naming conventions (`chrome.ai`, `window.ai.languageModel`, `LanguageModel`).
3.  **Contextual Discrepancy**: The API behaved differently in different JavaScript contexts. `LanguageModel.availability()` returned `'downloadable'` in the main window's developer console but returned `'no'` or `'downloading'` inside the extension's Service Worker.
4.  **Silent Failures**: The model download process was not providing clear feedback, and API calls would hang or fail without descriptive errors.

## Decision

We implemented a robust, multi-layered solution to systematically address these issues.

1.  **Created a Compatibility Layer**: A `getLanguageModelFactory()` function was written in `background.ts`. This function acts as a smart detector, sequentially checking for all known API naming conventions (`LanguageModel`, `self.LanguageModel`, `self.ai.languageModel`, etc.) and returning the first one that exists. This makes the extension resilient to future API renames.

2.  **Handled API Return Value Variations**: The `handleAIAnalysis` function was updated to accept multiple valid strings for the model's availability status (e.g., treating both `'readily'` and `'available'` as success, and both `'after-download'` and `'downloadable'` as requiring a download). This handles inconsistencies between different Chrome versions.

3.  **Focused Debugging on the Correct Context**: We identified that the core logic runs in a **Service Worker**, not the page's main window. We shifted all debugging efforts to the Service Worker's dedicated developer console (`chrome://extensions` -> "Service worker"), which provided the true logs and error messages.

4.  **Enhanced Logging and Feedback**: We added detailed logging to every step of the API interaction in `background.ts` (checking availability, creating session, monitoring download progress). We also added a user-facing "Analyzing..." hint in `content.ts` so the UI provides feedback during long operations like the initial model download.

## Consequences

**Positive:**
- **Success!**: The extension is now fully functional. It can reliably detect the API, trigger the model download, and perform AI analysis.
- **Robustness**: The codebase is now resilient to the inconsistencies of an experimental API and less likely to break with minor Chrome updates.
- **Deeper Understanding**: We have gained a comprehensive understanding of how to debug Chrome extensions, especially the critical difference between the Service Worker and content script contexts.
- **Clear Documentation**: This ADR serves as a permanent record of a complex debugging process, which is invaluable for future maintenance or onboarding.

**Negative:**
- **Increased Complexity**: The compatibility layer adds a small amount of complexity to the code, but this is a necessary trade-off for stability.
- **Development Time**: Significant time was invested in debugging. However, this investment built a solid foundation and prevented future, more complicated issues.
