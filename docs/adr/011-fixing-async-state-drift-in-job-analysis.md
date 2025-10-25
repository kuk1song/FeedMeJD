# ADR 011: Fixing Async State Drift in Job Analysis

## Status

Accepted

## Context

During real-world usage testing, a critical bug was discovered in the job analysis workflow:

### The Problem

**Reproduction Steps:**
1. User is viewing Job A and clicks "Feed Me JD!" to start analysis
2. While the AI is processing (in `eating` state), user navigates to Job B
3. AI analysis completes and returns results
4. ❌ **Bug**: Job B incorrectly shows the `done` state, even though the analysis was for Job A
5. The dashboard correctly shows Job A was analyzed, but the UI state is bound to Job B

**User Impact:**
- Confusing user experience: the "done" indicator appears on the wrong job
- Misleading visual feedback suggests Job B was analyzed when it wasn't
- Users might skip analyzing Job B thinking it was already processed

### Root Cause: Async State Drift

This is a classic **"async state drift"** or **"stale closure"** problem common in JavaScript async operations:

```typescript
// BEFORE (Buggy code):
private handlePetClick(): void {
  // ... start analysis ...
  
  chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
    if (response && response.success) {
      this.runSuccessAnimation(); // ❌ Uses this.currentJobId (which may have changed!)
    }
  });
}

private runSuccessAnimation(): void {
  if (this.currentJobId) {
    this.markJobAsAnalyzed(this.currentJobId); // ❌ Saves the CURRENT job, not the ANALYZED job
  }
}
```

**The Timeline of the Bug:**
```
t=0s:  User on Job A, clicks "Feed", currentJobId = "A"
t=1s:  AI starts processing Job A
t=2s:  User navigates to Job B, currentJobId = "B" (but AI still processing A)
t=5s:  AI completes analysis of Job A
t=5s:  Callback fires, but this.currentJobId = "B" now!
t=5s:  markJobAsAnalyzed("B") ❌ Wrong! Should be "A"
t=5s:  UI shows "done" on Job B ❌ Wrong!
```

## Decision

We implemented a **Job ID Snapshot Pattern** to ensure the analyzed job's identity is preserved throughout the entire async operation lifecycle.

### Implementation

1. **Capture Job ID at Analysis Start**:
```typescript
private handlePetClick(): void {
  // ✅ Capture the job ID at the moment of clicking (snapshot)
  const jobIdSnapshot = this.currentJobId;
  
  chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
    if (response && response.success) {
      // ✅ Check if user is still on the same job
      if (this.currentJobId === jobIdSnapshot) {
        // User is still on the analyzed job - show animation
        this.runSuccessAnimation(jobIdSnapshot);
      } else {
        // User navigated away - save silently without UI update
        console.warn(`User navigated away. Saving job ${jobIdSnapshot} silently.`);
        if (jobIdSnapshot) {
          this.markJobAsAnalyzed(jobIdSnapshot);
        }
        this.isAnalyzing = false;
        this.runLogic(); // Update UI for the CURRENT job
      }
    }
  });
}
```

2. **Pass Snapshot to Animation**:
```typescript
private runSuccessAnimation(analyzedJobId: string | null): void {
  // ✅ Use the ANALYZED job ID, not the current job ID
  if (analyzedJobId) {
    this.markJobAsAnalyzed(analyzedJobId);
  }
  
  // ✅ Double-check before updating UI
  setTimeout(() => {
    if (this.currentJobId === analyzedJobId) {
      // Still on the same job - safe to show "done" state
      this.setState('done');
      this.petContainer.classList.add('completed');
    } else {
      // User navigated during animation - update UI for current job
      this.runLogic();
    }
    this.isAnalyzing = false;
  }, 300);
}
```

### Key Design Principles

1. **Snapshot on Capture**: Capture `currentJobId` immediately when analysis starts
2. **Validate on Update**: Before any UI update, verify the snapshot still matches `currentJobId`
3. **Silent Success**: If user navigated away, still save the analysis result, but don't update UI
4. **Re-sync on Mismatch**: If mismatch detected, call `runLogic()` to correctly update UI for the current job

## Consequences

**Positive:**
- ✅ **Correct State Binding**: The "done" indicator now always appears on the job that was actually analyzed
- ✅ **Data Integrity**: All analyzed jobs are correctly saved to storage, regardless of user navigation
- ✅ **Improved UX**: Users now see accurate feedback and won't be confused by misplaced state indicators
- ✅ **Graceful Navigation**: Users can freely navigate during analysis without breaking the UI
- ✅ **No Lost Work**: Even if users navigate away, the analysis result is preserved

**Negative:**
- **Slightly More Complex**: The code now requires passing `jobIdSnapshot` through the callback chain, adding a parameter to `runSuccessAnimation()`
- **Double-Check Logic**: The animation function now has a conditional branch, but this is necessary complexity for correctness

## Testing Scenarios

This fix addresses the following user workflows:

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Analyze Job A, stay on Job A | ✅ Works | ✅ Works |
| Analyze Job A, navigate to Job B during processing | ❌ Job B shows "done" | ✅ Job A saved silently, Job B shows correct state |
| Analyze Job A, navigate to Job B, navigate back to Job A before completion | ❌ Job B shows "done" | ✅ Job A shows "done" (if still there at completion time) |
| Analyze Job A, quickly navigate through B, C, D before completion | ❌ Job D shows "done" | ✅ Only Job A is saved, Job D shows correct state |

## Related ADRs

- **ADR-006**: Implementing Stateful Memory - This established the `analyzedJobs` storage mechanism
- **ADR-010**: Resolving Race Conditions - This fixed DOM timing issues; now we fix async callback timing issues

## Lessons Learned

**JavaScript Async Gotcha**: In long-running async operations (especially with user interactions), always capture relevant state at the start of the operation. Never rely on instance properties (`this.xxx`) in callbacks, as they may have been modified by subsequent user actions.

**Pattern for Future**: Any time we add new async operations that depend on page state (like URL or selected item), we should:
1. Capture the state as a const at the start
2. Validate the state still matches before applying side effects
3. Gracefully handle mismatches

