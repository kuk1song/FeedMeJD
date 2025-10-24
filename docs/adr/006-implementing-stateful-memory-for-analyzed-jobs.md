# ADR 006: Implementing Stateful Memory for Analyzed Jobs

## Status

Accepted

## Context

The extension was successfully analyzing job descriptions, but it was stateless. After a job was analyzed and the pet's UI changed to a "done" state, navigating to a different job and then returning would incorrectly reset the pet's state back to "hungry". The extension had no memory of which jobs it had already processed, leading to a repetitive and unintelligent user experience. A mechanism was needed to persist the "analyzed" state for each unique job.

## Decision

We implemented a stateful memory system directly within the content script, leveraging `chrome.storage.local` for persistence.

1.  **Unique Job Identification**: We created a robust `extractJobId()` function. This function uses multiple regular expressions to parse the current `window.location.href` and extract a unique job identifier from various LinkedIn URL formats (e.g., `/jobs/view/ID` or `?currentJobId=ID`).

2.  **Persistent Memory**: We designated a specific key in `chrome.storage.local`, `analyzedJobs`, to store an array of job IDs that have been successfully processed.

3.  **State Check on Load**: The main logic function, `updateStateBasedOnJD()`, was made asynchronous. It now first extracts the `currentJobId` and then queries the `analyzedJobs` array in storage.
    *   **If the ID exists in the array**, the UI immediately transitions to the "done" state, hiding the "Feed Me" button and informing the user that the job has already been analyzed.
    *   **If the ID does not exist**, the UI proceeds to the standard "hungry" state.

4.  **Saving State on Success**: Upon a successful AI analysis, the `runSuccessAnimation()` function is now responsible for first adding the `currentJobId` to the `analyzedJobs` array in storage before updating the UI to the "done" state.

## Consequences

**Positive:**
- **Intelligent User Experience**: The extension now correctly remembers which jobs have been analyzed, providing a much smarter and more intuitive user flow.
- **Prevents Redundant Work**: Users are prevented from accidentally re-analyzing the same job description, saving time and API calls (if we were using a cloud API).
- **Robust and Scalable**: The solution is efficient and doesn't impact performance. Using URL-based IDs is a reliable method for this specific use case.

**Negative:**
- **Storage Management**: Over a very long period, the `analyzedJobs` array could grow large. However, for the scope of a hackathon and typical user behavior, this is a non-issue. A future production version might consider a more sophisticated storage solution or a cleanup mechanism.
