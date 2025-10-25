# ADR 009: Implementing Vertical Drag-and-Drop for UI Customization

## Status

Accepted

## Context

While the elegant "edge-peeking" UI (ADR-008) solved the problem of intrusiveness, its fixed vertical position (`top: 33%`) was a "one-size-fits-all" solution. This could still lead to conflicts with specific website layouts or other extensions that might occupy that same screen real estate. To give users full control over the UI placement and enhance the sense of a personal "pet," we needed to allow them to move it.

## Decision

We implemented a vertical-only drag-and-drop functionality with position memory, keeping the interaction simple and aligned with our minimalist principles.

1.  **Event Handling in `PetUIManager`**:
    *   Three new event listeners were added: `mousedown` on the pet container, and `mousemove` and `mouseup` on the global `document`.
    *   **`onMouseDown`**: When the user presses the primary mouse button on the pet, it initiates the drag state (`isDragging = true`), records the initial mouse Y-position (`startY`) and the pet's initial `top` offset, and adds a `.is-dragging` class for visual feedback.
    *   **`onMouseMove`**: If `isDragging` is true, this function calculates the vertical distance the mouse has moved (`deltaY`) and updates the `petContainer.style.top` in real-time. The movement is constrained within the vertical bounds of the viewport to prevent the user from losing the pet off-screen.
    *   **`onMouseUp`**: This terminates the drag state (`isDragging = false`) and removes the `.is-dragging` class. It includes a small threshold check (`deltaY > 5px`) to differentiate a true drag from a simple click, ensuring that clicking still triggers an analysis.

2.  **Persistent Memory with `chrome.storage.local`**:
    *   A `savePosition()` method was created. It's called in `onMouseUp` after a drag is completed and saves the final `offsetTop` value to `chrome.storage.local` under the key `petPositionY`.
    *   A `loadPosition()` method was created, which is called in the `PetUIManager`'s constructor. It retrieves the `petPositionY` from storage and applies it, ensuring the pet appears in its last known position whenever a new page is loaded.

3.  **Enhanced CSS for UX**:
    *   The default cursor for the pet container was changed from `pointer` to `grab`.
    *   A new class, `.is-dragging`, was created. When active, it changes the cursor to `grabbing`, disables CSS transitions for immediate responsiveness, and applies a subtle `box-shadow` and `scale` transform to make the element feel "lifted" off the page.

## Consequences

**Positive:**
- **Enhanced User Control**: Users can now move the pet to their preferred vertical position, resolving any potential UI conflicts and increasing their sense of ownership.
- **Improved UX**: The visual feedback (cursor change, shadow, scaling) makes the drag-and-drop interaction intuitive and satisfying.
- **Personalization**: The extension remembers the user's chosen position, making the experience feel more personal and tailored.
- **Low Performance Impact**: The implementation uses efficient event handling and direct style manipulation, having a negligible impact on page performance.

**Negative:**
- **Increased Code Complexity**: The addition of event listeners, state properties, and storage methods adds a moderate amount of complexity to the `content.ts` file. However, this is a standard and well-understood pattern for such a feature.
- **Vertical Only**: The decision to limit dragging to the vertical axis was a conscious choice to maintain simplicity. Full free-form dragging could be added in the future if deemed necessary.
