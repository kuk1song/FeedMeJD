# Skill Crystal Evolution: Skill Galaxy & Ranked List

This document outlines the phased plan to evolve the "Skill Crystal" feature into a more insightful, artistic, and valuable data visualization experience.

## Vision

The goal is to transform the current skill display into a dual-view system that balances deep insights with clarity:
1.  **Skill Galaxy**: A dynamic, physics-based force-directed graph that reveals the **correlations** between skills, providing an "Aha!" moment for users. Aesthetically, it will resemble a floating galaxy of pearls or stars.
2.  **Ranked List**: A refined and minimalist list view that clearly presents the frequency of each skill, serving users who need quick, ranked data.

---

## Phase 1: Data Foundation - Correlation Analysis & Data Structure

**Objective**: Compute the relationship strength between skills and build the data structure required for the galaxy visualization. This is the non-visual backend work.

### Tasks
1.  **Define Data Structures**:
    -   In `dashboard.ts`, define the following TypeScript interfaces:
        -   `SkillNode`: `{ id: string; type: 'hard' | 'soft'; count: number; }` (Nodes/pearls in the galaxy)
        -   `SkillLink`: `{ source: string; target: string; strength: number; }` (Links/gravity between nodes)
        -   `SkillGalaxyData`: `{ nodes: SkillNode[]; links: SkillLink[]; }` (The final data object for D3.js)

2.  **Calculate Skill Correlations**:
    -   Create a new function: `calculateSkillCorrelations(gems: PersistedGem[])`.
    -   **Logic**:
        1.  Iterate through all `gems` to build a co-occurrence matrix or an adjacency list.
        2.  For any two skills, A and B, count how many times they appear together within the **same** gem.
        3.  The `strength` of the link can be calculated using a metric like the Jaccard index or simply the raw co-occurrence count.

3.  **Integrate Data Generation**:
    -   Modify the existing `aggregateSkillData` function.
    -   While it calculates skill frequencies (`count`), it should also call `calculateSkillCorrelations` to build the links.
    -   The function will ultimately return a complete `SkillGalaxyData` object.

### Acceptance Criteria
-   `console.log` of the `SkillGalaxyData` object shows the correct structure.
-   The `nodes` array contains all unique skills with their correct frequencies.
-   The `links` array accurately reflects the co-occurrence relationships and strengths between skills.

---

## Phase 2: Core Implementation - Dynamic "Skill Galaxy" Visualization

**Objective**: Use D3.js to render the `SkillGalaxyData` into a basic, interactive force-directed graph.

### Tasks
1.  **Integrate D3.js**:
    -   Install the `d3` library via npm/yarn.
    -   Import it into `dashboard.ts`: `import * as d3 from 'd3';`

2.  **Set Up SVG Canvas**:
    -   In `dashboard.html`, within the `#skill-crystal` container, add an `<svg id="galaxy-svg"></svg>` element.

3.  **Implement D3 Force Simulation**:
    -   Create a new function: `renderGalaxy(data: SkillGalaxyData)`.
    -   **Logic**:
        1.  Initialize D3's force simulation (`d3.forceSimulation`).
        2.  Add forces: `forceLink` (to pull linked nodes together), `forceManyBody` (to prevent nodes from overlapping), and `forceCenter` (to keep the galaxy centered).
        3.  Bind the data to SVG `circle` (for nodes) and `line` (for links) elements.
        4.  Update the positions of these elements on every `tick` of the simulation.

4.  **Basic Interaction**:
    -   Enable drag-and-drop functionality for the skill nodes.
    -   On `mouseover`, make the node larger and display a simple tooltip with the skill name and frequency.

### Acceptance Criteria
-   A dynamic network of circles and lines is rendered on the page.
-   Nodes cluster based on their links and repel each other to avoid collision.
-   Nodes can be dragged with the mouse, and hovering provides basic feedback.

---

## Phase 3: Aesthetic Polish - "Pearl" & Interaction Design

**Objective**: Transform the basic graph into a visually stunning and polished "Skill Galaxy" that aligns with our product's aesthetic.

### Tasks
1.  **Node Beautification (CSS/SVG)**:
    -   Replace plain `circle` elements with more complex SVG structures or apply advanced styling.
    -   Use SVG `<radialGradient>` and `<filter>` to create a "pearl" or "crystal" effect with depth, gloss, and inner light.
    -   Apply distinct, soft color palettes for `hard` and `soft` skills.
    -   Node size should be proportional to `skill.count`.

2.  **Dynamic & Polished Animations**:
    -   Add a slow, subtle floating/breathing animation to the entire galaxy.
    -   Refine the `mouseover` effect:
        -   The hovered pearl glows brightly.
        -   Directly linked pearls are also highlighted (e.g., with a softer glow).
        -   All other pearls and links fade into the background.
    -   Animate the initial entrance of the galaxy (e.g., nodes fading in and spreading out).

3.  **Advanced Interaction**:
    -   Implement `click` functionality: when a skill pearl is clicked, the "Your JD Gems" list below should filter to show only the job cards containing that skill.

### Acceptance Criteria
-   The visualization is aesthetically pleasing, with high-quality "pearl" nodes and smooth animations.
-   Hover interactions are intuitive and clearly show skill relationships.
-   Clicking a node correctly filters the job list.

---

## Phase 4: Refined "Ranked List" & Final Integration

**Objective**: Overhaul the "Prism" view into an elegant "Ranked List" and seamlessly integrate both views.

### Tasks
1.  **Redesign Ranked List**:
    -   In the "Prism" view, replace the solid-color bars with a more minimalist design.
    -   **Ideas**:
        -   **Gradient Bars**: Use a subtle gradient from a brand color to transparent.
        -   **Dot & Line**: Represent each skill with a dot, followed by a thin line whose length corresponds to the frequency.
    -   Improve typography, spacing, and alignment to create a clean, breathable layout.

2.  **View Switching**:
    -   Ensure the "Constellation" / "Prism" toggle (which will be renamed to "Galaxy" / "List") is smooth and retains its state.
    -   Add a subtle transition animation when switching between the two views.

3.  **Empty & Loading States**:
    -   Design and implement elegant empty states for when no gems have been collected yet.
    -   Add a loading indicator (e.g., a softly pulsing pearl) that appears while skill data is being calculated.

### Acceptance Criteria
-   The "Ranked List" view is visually refined and easy to read.
-   Switching between "Galaxy" and "List" views is seamless.
-   Empty and loading states are handled gracefully and align with the new design.
-   The entire feature feels cohesive, polished, and provides significant value to the user.
