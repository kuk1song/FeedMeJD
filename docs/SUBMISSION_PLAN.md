# FeedMeJD: Hackathon Submission Plan

This document outlines a step-by-step plan to ensure a successful and high-quality submission for the hackathon.

---

## Step 1: Code & Repository Preparation

This is the foundation for judges to test the project. A clean, well-documented repository is crucial.

### 1.1 Final Code Review
- [ ] **Cleanup**: Remove all unused code, commented-out logic, and experimental features that are not stable.
- [ ] **Feature Flag**: Ensure the `Galaxy` view has a clear feature flag. Document this in the `README`. It's better to ship it as a disabled-by-default "preview" if it's not fully polished.
- [ ] **Final Build**: Run `npm run build` one last time to ensure the `dist` directory is up-to-date and the build process is error-free.

### 1.2 Create the Perfect `README.md`
The `README` is the judge's first entry point. It must be clear, professional, and comprehensive.

- [ ] **Project Title**: FeedMeJD
- [ ] **Elevator Pitch**: An on-device AI Chrome Extension that visually analyzes LinkedIn job descriptions to help users find the right job faster.
- [ ] **The Problem**: Job seekers face information overload when reading lengthy job descriptions. It's time-consuming to identify key skills and track trends across multiple applications.
- [ ] **Our Solution**: FeedMeJD acts as a personal AI assistant on LinkedIn. It uses Gemini Nano to "digest" job descriptions in one click, transforming them into beautiful and insightful visualizations. This allows users to instantly assess job-fit and understand the skill landscape.
- [ ] **APIs Used**: State clearly: "We exclusively use the **Chrome Extension Prompt API** (`chrome.ai.createGenericSession`) to leverage the built-in Gemini Nano model for all on-device text analysis and skill extraction."
- [ ] **Features List**:
    - ✨ **One-Click Analysis**: Instantly analyze any LinkedIn job description.
    - 🎨 **Interactive Dashboard**: View aggregated skill data across all analyzed jobs.
    - 🔮 **Four Unique Visualizations**: Word Cloud, Constellation, Prism, and the experimental Galaxy view.
    - 🔒 **Privacy-First**: All analysis happens on-device; user data never leaves the computer.
- [ ] **How to Test (For Judges)**: Provide clear, step-by-step instructions.
    1.  Prerequisites (Chrome Version 127+).
    2.  Installation commands (`git clone`, `npm install`, `npm run build`).
    3.  Instructions for loading an unpacked extension in `chrome://extensions`.
    4.  Clear usage steps (Navigate to LinkedIn, click the icon, open the dashboard).

### 1.3 Add an Open Source License
- [ ] Create a `LICENSE` file in the project root.
- [ ] Use a simple and permissive license like the **MIT License**.

### 1.4 Push to GitHub
- [ ] Ensure the GitHub repository is set to **Public**.
- [ ] Push all final code, the updated `README.md`, and the `LICENSE` file to the `main` branch.

---

## Step 2: Write Text Description

Draft the text that will be submitted on the contest form. This can be adapted directly from the `README.md`.

- [ ] **Application Name**: FeedMeJD
- [ ] **Features and Functionality**: A concise summary of the features list from the README.
- [ ] **APIs Used**: Clearly state the use of the "Chrome Extension Prompt API" and Gemini Nano.
- [ ] **Problem You Are Looking to Solve**: A summary of "The Problem" section from the README.

---

## Step 3: Create Demonstration Video

With a clear script from Step 2, the video will be focused and effective.

- [ ] **Duration**: Strictly **under 3 minutes** (aim for 2:30).
- [ ] **Language**: Narration and/or on-screen text must be in **English**.
- [ ] **Content Structure**:
    1.  **Intro (15s)**: **Show the problem.** Display a long, complex LinkedIn job description. Text overlay: "Tired of reading endless job descriptions?"
    2.  **Core Functionality (60s)**:
        - Show the FeedMeJD pet icon appearing on the page.
        - Click it, show the "analyzing" state, then the "done" state.
        - Click again to open the dashboard, showing the collected gems.
    3.  **Dashboard Showcase (75s)**:
        - Briefly show the "Gems" list.
        - Quickly cycle through the four visualization views, explaining the value of each one. Use text overlays like "Instantly see your top skills..." or "Discover how skills relate to each other..."
        - Hover over a skill in the Constellation view to show the custom tooltip.
    4.  **Outro (15s)**: **Summarize the value.** "FeedMeJD helps you understand job requirements instantly, powered by on-device AI. Find your dream job faster."
- [ ] **Production**:
    - Use a screen recording tool (e.g., QuickTime, OBS, Loom).
    - Ensure the recording is high-resolution and smooth.
    - Add simple background music.
    - Upload the final video to YouTube or Vimeo and set visibility to **Public**.

---

## Step 4: Final Submission

Compile all materials and complete the submission form.

- [ ] **Checklist of Assets**:
    - [ ] Public GitHub Repository URL.
    - [ ] Public YouTube/Vimeo Video URL.
    - [ ] The text description drafted in Step 2.
- [ ] **Submission Form**:
    - Double-check that all links are correct and publicly accessible.
    - Copy-paste the prepared text description into the form fields.
- [ ] **(Optional) Feedback Form**:
    - To be eligible for the "Most Valuable Feedback Prize," complete the feedback form.
    - Share your honest experience with the `chrome.ai` API: what was easy, what was challenging, and what improvements you'd like to see.

---
