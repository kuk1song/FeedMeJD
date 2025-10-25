# ADR 008: Implementing Elegant Edge-Peeking UI Design

## Status

Accepted

## Context

The initial UI design for the AI pet was a fixed bottom-right icon, which was functional but lacked elegance and could conflict with other browser extensions. The user requested a more refined, less intrusive design, specifically:
- A smaller, complete, and exquisite circular cat head.
- A position that is less likely to conflict with other floating elements.
- A clear visual indication of its state (e.g., "Feed Me JD!" on hover).
- A smooth transition and animation.
- A recurring bug where the pet's state would flicker or show overlapping images during state transitions, particularly when loading a page with an already-analyzed job.
- The eating animation was not as dynamic as a previous "size-changing" version.

## Decision

We implemented a compact, circular, edge-peeking UI design with enhanced state management and visual feedback to address these issues.

1.  **Compact Circular Design**:
    - The pet container was changed to `56px` width/height with `border-radius: 50%` for a perfect circle.
    - The cat image inside was set to `48px` to fit elegantly within the container.
    - `right: 8px` was chosen to place it closer to the screen edge, making it less intrusive.
    - `top: 33%` was selected as a "safe zone" to avoid common conflict areas (bottom-right, top-right).

2.  **Enhanced Visual States and Interactions**:
    - **Default**: `opacity: 0.7` for a subtle presence.
    - **Hover**: `opacity: 1` and `transform: scale(1.125)` for a slight enlargement, with a smooth transition. A gradient tooltip "Feed Me JD!" appears.
    - **"Done" State (Analyzed Job)**:
        - The pet remains clickable.
        - A small, animated "gem badge" (`💎`) appears briefly (pop-out, hold, fade-out animation) after analysis, then disappears. This provides a clear, non-persistent visual confirmation.
        - The tooltip changes to "View Dashboard".
        - Clicking the pet in this state sends a message to the background script to open/switch to the dashboard.
    - **"Analyzing" State**:
        - The container gets an `analyzing` class with a `box-shadow` pulse animation.
        - The pet image gets an `is-eating` class with a `transform: scale` and `opacity` pulse animation (restored from an earlier version to provide a more "eating" feel).
        - During analysis, the container's hover effect (`scale`) is temporarily disabled to prevent conflicts with the image's `transform` animation.
    - **"Disabled" State (No JD found)**: `opacity: 0.4` and `cursor: not-allowed`.

3.  **Refined State Management**:
    - **Image Preloading**: To fix the flickering/overlapping image bug, the `setState` function was refactored. It now uses a JavaScript `Image` object to preload the next state's image in the background. The `petImage.src` is only updated in the `onload` callback of the preloader, ensuring the new image is fully loaded before being displayed.
    - **Robust Error Handling**: To handle the frequent "Extension context invalidated" errors during development reloads, `try...catch` blocks were added around `chrome.storage.local.get` and a `chrome.runtime.lastError` check was added to the `chrome.runtime.sendMessage` callback. This prevents console spam and makes the content script more resilient.
    - **State Change Prevention**: Introduced `private currentState` in `PetUIManager` to prevent redundant `setState` calls, which was causing `is-eating` class to be repeatedly removed.
    - **Analysis Lock**: Added `private isAnalyzing` flag to prevent `MutationObserver` from resetting the UI state during an active analysis.

## Consequences

**Positive:**
- **Significantly Improved UX**: The plugin is now elegant, non-intrusive, and provides clear, delightful feedback. The image flickering bug is resolved.
- **Reduced Conflicts**: The new position and compact size minimize interference with other page elements.
- **Intuitive Interaction**: Users get immediate visual confirmation and a clear path to the dashboard for analyzed jobs.
- **Robust State Handling**: The preloading and error handling make the UI transitions seamless and the script more stable, especially during development.
- **Performance**: CSS animations are GPU-accelerated, and redundant JS operations are minimized.

**Negative:**
- **Increased CSS Complexity**: More intricate CSS for animations and state transitions.
- **Slightly More Complex JS**: The image preloading logic adds a few more lines of code to the `setState` function, but the reliability gain is a worthwhile trade-off.
- **Debugging Challenges**: Identifying CSS `transform` conflicts and `MutationObserver` interaction required careful debugging.

