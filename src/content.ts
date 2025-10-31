import './content.css';

// Declare global window property for injection guard
declare global {
  interface Window {
    feedMeJdInjected?: boolean;
  }
}

if (typeof window.feedMeJdInjected === 'undefined') {
  window.feedMeJdInjected = true;

  // console.log("FeedMeJD Content Script Injected & Running!");

  /**
   * Manages all UI and interactions for the pet on the page.
   */
  class PetUIManager {
    private petContainer!: HTMLDivElement;
    private petImage!: HTMLImageElement;
    private tooltip!: HTMLDivElement;
    private jdElement: HTMLElement | null = null;
    private observer!: MutationObserver;
    private timeoutId?: number;
    private currentJobId: string | null = null;
    private isAnalyzing: boolean = false;
    private currentState: 'idle' | 'hungry' | 'eating' | 'done' = 'idle'; // Track current state to avoid redundant updates
    private analyzedJobsCache: Set<string> = new Set();
    private cacheInitialized: boolean = false;
    private cachePromise: Promise<void> | null = null;
    private storageListener: ((changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void) | null = null;

    constructor() {
      this.createUI();
      this.setupObserver();
      this.cachePromise = this.loadAnalyzedJobsCache().finally(() => {
        this.cachePromise = null;
      });

      this.storageListener = (changes, area) => {
        if (area === 'local' && changes.analyzedJobs) {
          const newValue = changes.analyzedJobs.newValue as string[] | undefined;
          this.updateAnalyzedJobsCache(newValue);
          this.refresh();
        }
      };
      chrome.storage.onChanged.addListener(this.storageListener);

      // Wait for DOM to be fully ready before running initial logic
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.runLogic());
      } else {
        // DOM is already loaded, run with a small delay to ensure stability
        setTimeout(() => this.runLogic(), 100);
      }
    }

    private loadAnalyzedJobsCache(): Promise<void> {
      return new Promise((resolve) => {
        chrome.storage.local.get(['analyzedJobs'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('FeedMeJD: Failed to load analyzedJobs cache:', chrome.runtime.lastError.message);
            this.updateAnalyzedJobsCache(undefined);
            resolve();
            return;
          }
          const analyzedJobs = Array.isArray(result.analyzedJobs) ? result.analyzedJobs : [];
          this.updateAnalyzedJobsCache(analyzedJobs);
          resolve();
        });
      });
    }

    private updateAnalyzedJobsCache(entries: string[] | undefined): void {
      this.analyzedJobsCache = new Set(entries || []);
      this.cacheInitialized = true;
    }

    /**
     * Creates the pet's UI elements and injects them into the page.
     * Compact circular design with gem badge for completed jobs.
     */
    private createUI(): void {
      this.petContainer = document.createElement('div');
      this.petContainer.id = 'feedmejd-pet-container';

      // Cat head image with initial idle state
      this.petImage = document.createElement('img');
      this.petImage.id = 'feedmejd-pet-img';
      this.petImage.src = chrome.runtime.getURL('images/pet-idle.png'); // Set initial image immediately
      this.petImage.title = 'Hello! I am FeedMeJD!';

      // Tooltip
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'feedmejd-tooltip';
      this.tooltip.textContent = 'Feed Me JD!';

      this.petContainer.appendChild(this.tooltip);
      this.petContainer.appendChild(this.petImage);
      document.body.appendChild(this.petContainer);

      this.petContainer.addEventListener('click', this.handlePetClick.bind(this));
      
      // console.log("FeedMeJD: Pet UI injected (compact design).");
    }

    /**
     * The main logic that runs on page load and on subsequent navigations.
     */
    private runLogic(): void {
      this.currentJobId = this.extractJobId();
      this.updateStateBasedOnJD();
    }

    /**
     * Extracts the unique job ID from the current page URL.
     * @returns The job ID, or null if not found.
     */
    private extractJobId(): string | null {
      const url = window.location.href;
      
      // Try to match patterns like:
      // /jobs/view/1234567890
      // ?currentJobId=4267263288
      const patterns = [
        /\/jobs\/view\/(\d+)/,
        /currentJobId=(\d+)/,
        /\/jobs\/(\d+)\//
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      return null;
    }

    /**
     * Sets up a MutationObserver to watch for SPA navigations.
     * Uses a more conservative debounce (800ms) to reduce performance impact.
     */
    private setupObserver(): void {
     this.observer = new MutationObserver((mutations) => {
       // More conservative debounce to reduce performance impact on complex pages
       if (this.timeoutId) {
         clearTimeout(this.timeoutId);
       }
       this.timeoutId = window.setTimeout(() => {
         // We're looking for major changes, like the job description appearing or disappearing.
         // A simple re-run of the logic is often sufficient for SPAs.
         this.runLogic();
       }, 800); // Increased from 500ms to 800ms for better stability
     });

     this.observer.observe(document.body, {
       childList: true,
       subtree: true,
     });
   }

    /**
     * Sets the visual state of the pet.
     * Only updates if the state actually changes to avoid redundant DOM operations.
     */
    private setState(state: 'idle' | 'hungry' | 'eating' | 'done'): void {
      if (this.currentState === state) {
        return;
      }
      
      // console.log(`FeedMeJD: State change: ${this.currentState} → ${state}`);
      this.currentState = state;
      
      const stateDetails = {
        idle: { img: 'pet-idle.png', title: 'Hello! I am FeedMeJD!' },
        hungry: { img: 'pet-hungry.png', title: 'I am hungry for this JD!' },
        eating: { img: 'pet-eating.png', title: 'Om nom nom... digesting!' },
        done: { img: 'pet-done.png', title: 'I\'ve produced a Skill Gem!' },
      };

      this.petImage.src = chrome.runtime.getURL(`images/${stateDetails[state].img}`);
      this.petImage.title = stateDetails[state].title;
      
      if (state === 'eating') {
        this.petImage.classList.add('is-eating');
        // console.log("FeedMeJD: Added 'is-eating' class. Animation should be visible now!");
      } else {
        this.petImage.classList.remove('is-eating');
      }
    }
    
    /**
     * Checks for a JD and sets the initial pet state.
     * Also checks if this job has already been analyzed.
     * Completed jobs are clickable to view dashboard (no persistent badge).
     */
    private async updateStateBasedOnJD(): Promise<void> {
      if (this.isAnalyzing) {
        // console.log("FeedMeJD: Skipping state update - analysis in progress");
        return;
      }
      
      try {
        this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
        
        // Remove all state classes first
        this.petContainer.classList.remove('disabled', 'analyzing', 'completed');
        
        if (this.jdElement && this.currentJobId) {
          // Check if this job has already been analyzed
          const isAnalyzed = await this.isJobAnalyzed(this.currentJobId);
          
          if (isAnalyzed) {
            // This job was already analyzed - show "done" state (done image has gem)
            this.setState('done');
            this.petImage.title = "Click to view analysis in gallery";
            this.tooltip.textContent = "View Gallery";
            this.petContainer.classList.add('completed');
            // No badge needed - the done image already has a gem
          } else {
            // This is a new job - show "hungry" state
            this.setState('hungry');
            this.petImage.title = 'Click me to analyze this job!';
            this.tooltip.textContent = "Feed Me JD!";
          }
        } else if (this.jdElement && !this.currentJobId) {
          // JD exists but we couldn't extract a job ID - still allow feeding
          this.setState('hungry');
          this.petImage.title = 'Click me to analyze this job!';
          this.tooltip.textContent = "Feed Me JD!";
  } else {
          // No JD found on this page
          this.setState('idle');
          this.petImage.title = 'Click on a job posting to start!';
          this.tooltip.textContent = "Pick a job you like!";
          this.petContainer.classList.add('disabled');
        }
      } catch (error) {
        console.error("FeedMeJD: Error in updateStateBasedOnJD:", error);
        // Fallback to idle state on error
        this.setState('idle');
        this.petImage.title = 'Click on a job posting to start!';
        this.tooltip.textContent = "Pick a job you like!";
        this.petContainer.classList.add('disabled');
  }
}

/**
     * Shows a celebration gem badge animation, then removes it.
     */
    private showCelebrationGem(): void {
      const badge = document.createElement('div');
      badge.className = 'feedmejd-gem-badge';
      badge.innerHTML = '💎'; // Gem emoji
      this.petContainer.appendChild(badge);
      
      // Remove after animation completes (0.5s pop + 0.3s hold + 0.3s fade = 1.1s)
      setTimeout(() => {
        badge.remove();
      }, 1100);
    }

    /**
     * Checks if a job has already been analyzed.
     * @param jobId The job's unique ID.
     * @returns True if the job has been analyzed, false otherwise.
     */
    private async isJobAnalyzed(jobId: string): Promise<boolean> {
      if (!this.cacheInitialized && this.cachePromise) {
        try {
          await this.cachePromise;
        } catch (error) {
          console.warn('FeedMeJD: Failed to await analyzedJobs cache load:', error);
        }
      }

      return this.analyzedJobsCache.has(jobId);
    }

    /**
     * Public wrapper to re-run logic from external listeners.
     */
    public refresh(): void {
      this.runLogic();
    }

    /**
     * Extract job metadata: best-effort title/company/url with current jobId.
     */
    private extractJobMeta(): { jobId: string | null; title?: string; company?: string; url: string; timestamp: number } {
      const url = window.location.href;
      const timestamp = Date.now();
      const jobId = this.currentJobId;

      let title: string | undefined;
      let company: string | undefined;

      const titleSelectors = [
        '.jobs-unified-top-card__job-title',
        '.job-details-jobs-unified-top-card__job-title',
        '.top-card-layout__title',
        'h1.jobs-unified-top-card__job-title',
        'h1.top-card-layout__title',
        'h1[data-test-id="job-details-title"]'
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const t = el.textContent.trim();
          if (t.length > 0 && t.length < 200) { title = t; break; }
        }
      }

      const companySelectors = [
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        '.topcard__org-name-link',
        '.top-card-layout__entity-info a',
        'a[data-test-job-company-name-link]',
        'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
        '.top-card-layout__entity-info a[href*="/company/"]',
        '.jobs-unified-top-card__primary-description a[href*="/company/"]'
      ];
      for (const sel of companySelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const c = el.textContent.trim();
          if (c.length > 0 && c.length < 200) { company = c; break; }
        }
      }

      // Note: Avoid heavier fallbacks (top-card deep search / JSON-LD parsing)
      // to keep extraction lightweight. If not found, we gracefully omit company.

      return { jobId, title, company, url, timestamp };
    }


    /**
     * Handles the click event on the pet container.
     * - If completed: Opens dashboard
     * - If hungry: Starts analysis
     * - If disabled/analyzing: Does nothing
     */
    private handlePetClick(): void {
      // Prevent clicks if disabled or analyzing
      if (this.petContainer.classList.contains('disabled') || 
          this.petContainer.classList.contains('analyzing')) {
        return;
      }
      
      if (this.petContainer.classList.contains('completed')) {
        // console.log("FeedMeJD: Opening dashboard for completed job");
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
        return;
      }
      
      this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
      if (!this.jdElement) {
        console.warn("FeedMeJD: Cat clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }

      // console.log("FeedMeJD: Cat head clicked! Starting analysis...");
      
      // ✅ CRITICAL: Capture the job ID at the moment of clicking
      // This snapshot will be used throughout the async operation
      const jobIdSnapshot = this.currentJobId;
      
      // Set analyzing flag to prevent MutationObserver from resetting state
      this.isAnalyzing = true;
      
      this.setState('eating');
      
      // Update pet's title and add analyzing state
      this.petImage.title = 'Analyzing... This may take a while...';
      this.petContainer.classList.add('analyzing');

      const jdText = this.jdElement.innerText;
      // console.log(`FeedMeJD: Extracted JD text (${jdText.length} characters) for job ${jobIdSnapshot || 'unknown'}. Sending to background...`);
      
      const meta = this.extractJobMeta();
      // Ensure we bind the snapshot job id
      meta.jobId = jobIdSnapshot;
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText, meta }, (response) => {
        // Remove analyzing state
        this.petContainer.classList.remove('analyzing');
        
        if (chrome.runtime.lastError) {
          console.error("FeedMeJD: Message sending failed.", chrome.runtime.lastError.message);
          // Handle specific AI errors
          const errorMessage = chrome.runtime.lastError.message || "";
          if (errorMessage.includes("AI_UNAVAILABLE")) {
            this.petImage.title = "Sorry! My AI brain isn't supported on this device.";
          } else if (errorMessage.includes("AI_DOWNLOADING") || errorMessage.includes("AI_DOWNLOAD_REQUIRED")) {
            this.petImage.title = "My AI brain is downloading... Please try again in a few moments!";
            this.setState('idle');
          } else {
            this.petImage.title = "Oops! Something went wrong.";
          }
          this.setState('idle');
          this.isAnalyzing = false; // Clear flag on error
          return;
        }
        
    if (response && response.success) {
          // console.log("FeedMeJD: Analysis successful for job", jobIdSnapshot || 'unknown');
          
          if (this.currentJobId === jobIdSnapshot) {
            this.runSuccessAnimation(jobIdSnapshot);
          } else {
            // console.warn(`FeedMeJD: User navigated away. Analysis was for job ${jobIdSnapshot}, but now viewing ${this.currentJobId}. Saving silently without UI update.`);
            if (jobIdSnapshot) {
              this.markJobAsAnalyzed(jobIdSnapshot);
            }
            this.isAnalyzing = false;
            this.runLogic();
          }
        } else {
          console.error("FeedMeJD: Analysis failed.", response?.error);
          this.petImage.title = "Sorry! The analysis failed. Please try again.";
          this.setState('idle');
          this.isAnalyzing = false; // Clear flag on failure
        }
      });
    }

    /**
     * Runs the sequence of animations after a successful analysis.
     * Shows celebration gem → switches to done state.
     * @param analyzedJobId The ID of the job that was actually analyzed (snapshot from when analysis started)
     */
    private runSuccessAnimation(analyzedJobId: string | null): void {
      // console.log("FeedMeJD: Starting success animation for job", analyzedJobId || 'unknown');
      
      if (analyzedJobId) {
        this.markJobAsAnalyzed(analyzedJobId);
      }
      
      this.showCelebrationGem();
      
      setTimeout(() => {
        if (this.currentJobId === analyzedJobId) {
          // console.log("FeedMeJD: Switching to 'done' state...");
          this.setState('done');
          this.petImage.title = "Click to view analysis in gallery";
          this.tooltip.textContent = "View Gallery";
          this.petContainer.classList.add('completed');
    } else {
          // console.log(`FeedMeJD: User navigated away during animation. Skipping UI update.`);
          this.runLogic();
        }
        this.isAnalyzing = false;
      }, 300);
    }

    /**
     * Marks a job as analyzed by saving its ID to storage.
     * @param jobId The job's unique ID.
     */
    private markJobAsAnalyzed(jobId: string): void {
      if (jobId) {
        this.analyzedJobsCache.add(jobId);
        this.cacheInitialized = true;
      }

      chrome.storage.local.get(['analyzedJobs'], (result) => {
        const analyzedJobs: string[] = Array.isArray(result.analyzedJobs) ? result.analyzedJobs : [];
        if (!analyzedJobs.includes(jobId)) {
          analyzedJobs.push(jobId);
          chrome.storage.local.set({ analyzedJobs }, () => {
            // console.log(`FeedMeJD: Job ${jobId} marked as analyzed.`);
          });
    }
  });
}

    public cleanup(): void {
      console.log("FeedMeJD: Cleaning up and unloading Pet UI...");
      this.observer.disconnect();
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = undefined;
      }
      this.petContainer.remove();
      if (this.storageListener) {
        chrome.storage.onChanged.removeListener(this.storageListener);
        this.storageListener = null;
      }
      // @ts-ignore
      window.feedMeJdInjected = undefined; // Allow re-injection later
    }
  }

// --- Script Entry Point ---
  // We only need one instance of the manager for the page's lifetime.
  const manager = new PetUIManager();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UNLOAD_PET_UI') {
      manager.cleanup();
      // Optional: send a response to the background script
      sendResponse({ success: true }); 
    }
  });

} // End of injection guard
