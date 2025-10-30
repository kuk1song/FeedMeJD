# Dashboard "Three-View" & Visual Upgrade Plan

This document outlines the phased plan to evolve the Skill Crystal dashboard into a comprehensive three-view system with a unified, premium aesthetic. The strategy prioritizes rapid functional prototyping followed by a holistic visual polishing phase.

---

### **Overall Goal**

Deliver a skill dashboard with three distinct visualization modes, each catering to different user insights, while ensuring all views share a refined, high-quality design language consistent with the product's philosophy.

-   **View 1: Prism (Ranked List)** - *Existing, to be polished.*
-   **View 2: Constellation (Static Bubbles)** - *Existing, to be polished.*
-   **View 3: Galaxy (Dynamic Network)** - *To be newly implemented.*

---

### **Phase 1: Rapid Prototyping & Functional Integration**

**Objective**: Quickly build the functional backbone for the three-view system and implement a baseline version of the new "Galaxy" view. This "function-first" approach mitigates technical risks early.

#### **Tasks**

1.  **Architectural Setup**:
    -   **HTML**: In `dashboard.html`, expand the view-switcher to include three controls for `Prism`, `Constellation`, and `Galaxy`.
    -   **HTML**: Add a dedicated container `div` for the Galaxy view (e.g., `#skill-galaxy-container`).
    -   **TypeScript**: In `dashboard.ts`, update the `currentView` state to be a union of the three view types (`'prism' | 'constellation' | 'galaxy'`).
    -   **TypeScript**: Refactor `setupViewSwitcher()` and `renderCurrentView()` to manage the logic for three views, ensuring correct container visibility on switching.

2.  **Implement Basic "Galaxy" View**:
    -   **File Structure**: Create a new, dedicated module for the galaxy logic at `src/views/skillGalaxyView.ts`.
    -   **Core Logic**: Implement a `renderSkillGalaxy(container, data)` function based on the [D3 Force-Directed Graph (Canvas)](https://observablehq.com/@d3/force-directed-graph-canvas) example.
        -   Use `<canvas>` for high-performance rendering.
        -   Set up a `d3.forceSimulation` with basic forces (`forceLink`, `forceManyBody`, `forceCenter`) to achieve a stable network layout.
        -   Render skills as text nodes using `context.fillText()`.
        -   Map skill `count` to `context.font` size to visually represent importance.
        -   Use clear, temporary colors for nodes and links. Visuals are not the priority in this phase.
    -   **Basic Interaction**: Implement `d3.drag()` for node dragging and a simple hover-highlight effect using `mousemove` events and a `d3.quadtree()` for efficient node finding.

3.  **Integration & Verification**:
    -   Import `renderSkillGalaxy` into `dashboard.ts` and call it from the `galaxy` case within `renderCurrentView()`.
    -   Ensure all three views receive data and render correctly when toggled.

#### **Acceptance Criteria**

-   A fully functional dashboard with three switchable views is operational.
-   The "Galaxy" view, while visually basic, correctly displays the dynamic skill network, reflects skill weight through font size, and supports both dragging and hover interactions.

---

### **Phase 2: Unified Aesthetics & Visual Polishing**

**Objective**: Apply a consistent, high-quality design language across all three (now fully functional) views.

#### **Tasks**

1.  **Define a Unified Design System**:
    -   **Color Palette**: Establish a refined, premium color system with distinct, elegant gradients for "Hard Skills" and "Soft Skills" (e.g., deep blue -> lilac for hard; pale gold -> soft peach for soft).
    -   **Typography & Spacing**: Define consistent fonts, font weights, spacings, and border-radii to be used across the entire dashboard.

2.  **Polish `Prism` & `Constellation` Views**:
    -   **Apply Colors**: Replace the old placeholder colors with the new gradient system.
    -   **Add Texture/Depth**: Enhance UI elements with subtle details like 1px inner highlights, soft glows on important items, or refined border styles to give a "crystal" or "premium glass" feel.
    -   **Refine Layout**: Adjust spacings, padding, and alignment in both views to feel more breathable and deliberate.

3.  **Polish `Galaxy` View**:
    -   **Apply Colors**: Update the Canvas rendering logic to use the new color palette for text nodes and links.
    -   **Enhance Readability**: Fine-tune font rendering on Canvas (e.g., using `context.strokeStyle` for a subtle outline or shadow) to ensure text is crisp and legible against the background.
    -   **Refine Interactions**: Polish the hover-highlight effect with smooth color transitions and more aesthetically pleasing visual feedback.

#### **Acceptance Criteria**

-   All three views are visually cohesive and share the same premium design language.
-   The entire dashboard feels polished, intuitive, and ready for release.
-   The final product delivers a high-quality, insightful, and delightful user experience.
