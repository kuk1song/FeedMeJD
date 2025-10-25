import './content.css';

// Declare global window property for injection guard
declare global {
  interface Window {
    feedMeJdInjected?: boolean;
  }
}

if (typeof window.feedMeJdInjected === 'undefined') {
  window.feedMeJdInjected = true;

  console.log("FeedMeJD Content Script Injected & Running!");

  /**
   * Manages all UI and interactions for the pet on the page.
   */
  class PetUIManager {
    private petContainer!: HTMLDivElement;
    private petImage!: HTMLImageElement;
    private jdElement: HTMLElement | null = null;
    private observer!: MutationObserver;
    private timeoutId?: number;
    private currentJobId: string | null = null; // Track the current job's unique ID

    constructor() {
      this.createUI();
      this.setupObserver();
      this.runLogic(); // Initial run
    }

    /**
     * Creates the pet's UI elements and injects them into the page.
     * New elegant design: edge-peeking cat head with tooltip.
     */
    private createUI(): void {
      this.petContainer = document.createElement('div');
      this.petContainer.id = 'feedmejd-pet-container';

      // Cat head image
      this.petImage = document.createElement('img');
      this.petImage.id = 'feedmejd-pet-img';
      this.petImage.title = 'Click me to analyze this job!';

      // Tooltip (replaces the button)
      const tooltip = document.createElement('div');
      tooltip.className = 'feedmejd-tooltip';
      tooltip.textContent = 'Feed Me JD!';

      this.petContainer.appendChild(tooltip);
      this.petContainer.appendChild(this.petImage);
      document.body.appendChild(this.petContainer);

      // Click on the entire container (cat head) to trigger analysis
      this.petContainer.addEventListener('click', this.handleFeedClick.bind(this));
      
      console.log("FeedMeJD: Pet UI injected (edge-peeking design).");
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
     */
    private setupObserver(): void {
     this.observer = new MutationObserver((mutations) => {
       // A simple debounce to avoid firing too often on complex DOM changes.
       if (this.timeoutId) {
         clearTimeout(this.timeoutId);
       }
       this.timeoutId = window.setTimeout(() => {
         // We're looking for major changes, like the job description appearing or disappearing.
         // A simple re-run of the logic is often sufficient for SPAs.
         this.runLogic();
       }, 500);
     });

     this.observer.observe(document.body, {
       childList: true,
       subtree: true,
     });
   }

    /**
     * Sets the visual state of the pet.
     * @param state The state to switch to ('idle', 'hungry', 'eating', 'done', 'feel-good').
     */
    private setState(state: 'idle' | 'hungry' | 'eating' | 'done'): void {
      const stateDetails = {
        idle: { img: 'pet-idle.png', title: 'Hello! I am FeedMeJD!' },
        hungry: { img: 'pet-hungry.png', title: 'I am hungry for this JD!' },
        eating: { img: 'pet-eating.png', title: 'Om nom nom... digesting!' },
        done: { img: 'pet-done.png', title: 'I\'ve produced a Skill Gem!' },
      };

      this.petImage.src = chrome.runtime.getURL(`images/${stateDetails[state].img}`);
      this.petImage.title = stateDetails[state].title;
      
      // Add or remove the animation class based on the state
      if (state === 'eating') {
        this.petImage.classList.add('is-eating');
      } else {
        this.petImage.classList.remove('is-eating');
      }
    }
    
    /**
     * Checks for a JD and sets the initial pet state.
     * Also checks if this job has already been analyzed.
     * New design: No separate button, click on cat head directly.
     */
    private async updateStateBasedOnJD(): Promise<void> {
      this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
      
      if (this.jdElement && this.currentJobId) {
        // Check if this job has already been analyzed
        const isAnalyzed = await this.isJobAnalyzed(this.currentJobId);
        
        if (isAnalyzed) {
          // This job was already analyzed - show "done" state
          this.setState('done');
          this.petImage.title = "Already analyzed! Check dashboard.";
          this.petContainer.style.pointerEvents = 'none'; // Disable clicks
          this.petContainer.style.opacity = '0.6'; // Dim appearance
        } else {
          // This is a new job - show "hungry" state
          this.setState('hungry');
          this.petImage.title = 'Click me to analyze this job!';
          this.petContainer.style.pointerEvents = 'auto'; // Enable clicks
          this.petContainer.style.opacity = '1';
        }
      } else if (this.jdElement && !this.currentJobId) {
        // JD exists but we couldn't extract a job ID - still allow feeding
        this.setState('hungry');
        this.petImage.title = 'Click me to analyze this job!';
        this.petContainer.style.pointerEvents = 'auto';
        this.petContainer.style.opacity = '1';
      } else {
        // No JD found on this page
        this.setState('idle');
        this.petImage.title = 'Navigate to a job posting!';
        this.petContainer.style.pointerEvents = 'none';
        this.petContainer.style.opacity = '0.4';
      }
    }

    /**
     * Checks if a job has already been analyzed.
     * @param jobId The job's unique ID.
     * @returns True if the job has been analyzed, false otherwise.
     */
    private async isJobAnalyzed(jobId: string): Promise<boolean> {
      return new Promise((resolve) => {
        chrome.storage.local.get(['analyzedJobs'], (result) => {
          const analyzedJobs: string[] = result.analyzedJobs || [];
          resolve(analyzedJobs.includes(jobId));
        });
      });
    }

    /**
     * Handles the click event on the pet container (cat head).
     * New design: Direct click on cat head, no separate button.
     */
    private handleFeedClick(): void {
      // Re-query the element right before the click
      this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
      if (!this.jdElement) {
        console.warn("FeedMeJD: Cat clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }

      console.log("FeedMeJD: Cat head clicked! Starting analysis...");
      this.setState('eating');
      
      // Update pet's title to show it's working
      this.petImage.title = 'Analyzing... This may take a while if the AI model needs to download!';
      
      // Disable further clicks during analysis
      this.petContainer.style.pointerEvents = 'none';

      const jdText = this.jdElement.innerText;
      console.log(`FeedMeJD: Extracted JD text (${jdText.length} characters). Sending to background...`);
      
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("FeedMeJD: Message sending failed.", chrome.runtime.lastError.message);
          // Handle specific AI errors based on our new background logic
          const errorMessage = chrome.runtime.lastError.message || "";
          if (errorMessage.includes("AI_UNAVAILABLE")) {
            this.petImage.title = "Sorry! My AI brain isn't supported on this device.";
          } else if (errorMessage.includes("AI_DOWNLOADING") || errorMessage.includes("AI_DOWNLOAD_REQUIRED")) {
            this.petImage.title = "My AI brain is downloading... Please try again in a few moments!";
            this.setState('idle');
          } else {
            this.petImage.title = "Oops! Something went wrong.";
          }
          this.setState('idle'); // Revert to idle on error
          this.petContainer.style.pointerEvents = 'auto'; // Re-enable clicks
          return;
        }
        
        if (response && response.success) {
          console.log("FeedMeJD: Analysis successful.", response.data);
          this.runSuccessAnimation();
        } else {
          console.error("FeedMeJD: Analysis failed.", response?.error);
          this.petImage.title = "Sorry! The analysis failed. Please try again.";
          this.setState('idle'); // Revert to idle on error
          this.petContainer.style.pointerEvents = 'auto'; // Re-enable clicks
        }
      });
    }

    /**
     * Runs the sequence of animations after a successful analysis.
     */
    private runSuccessAnimation(): void {
      console.log("FeedMeJD: Starting success animation!");
      
      // 1. Save this job ID as analyzed
      if (this.currentJobId) {
        this.markJobAsAnalyzed(this.currentJobId);
      }
      
      // 2. Show "Done" state - this state will persist
      console.log("FeedMeJD: Switching to 'done' state...");
      this.setState('done');
      this.petImage.title = "Analysis complete! I've saved this JD as a skill gem.";
      
      // Disable clicks for analyzed jobs
      this.petContainer.style.pointerEvents = 'none';
      this.petContainer.style.opacity = '0.6';
      
      // TODO: Create and show the gem element visually with an animation
    }

    /**
     * Marks a job as analyzed by saving its ID to storage.
     * @param jobId The job's unique ID.
     */
    private markJobAsAnalyzed(jobId: string): void {
      chrome.storage.local.get(['analyzedJobs'], (result) => {
        const analyzedJobs: string[] = result.analyzedJobs || [];
        if (!analyzedJobs.includes(jobId)) {
          analyzedJobs.push(jobId);
          chrome.storage.local.set({ analyzedJobs }, () => {
            console.log(`FeedMeJD: Job ${jobId} marked as analyzed.`);
          });
        }
      });
    }

    public cleanup(): void {
      console.log("FeedMeJD: Cleaning up and unloading Pet UI...");
      this.observer.disconnect();
      this.petContainer.remove();
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
