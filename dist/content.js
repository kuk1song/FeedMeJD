if (typeof window.feedMeJdInjected === "undefined") {
  window.feedMeJdInjected = true;
  console.log("FeedMeJD Content Script Injected & Running!");
  class PetUIManager {
    petContainer;
    petImage;
    tooltip;
    jdElement = null;
    observer;
    timeoutId;
    currentJobId = null;
    isAnalyzing = false;
    currentState = "idle";
    // Track current state to avoid redundant updates
    constructor() {
      this.createUI();
      this.setupObserver();
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.runLogic());
      } else {
        setTimeout(() => this.runLogic(), 100);
      }
    }
    /**
     * Creates the pet's UI elements and injects them into the page.
     * Compact circular design with gem badge for completed jobs.
     */
    createUI() {
      this.petContainer = document.createElement("div");
      this.petContainer.id = "feedmejd-pet-container";
      this.petImage = document.createElement("img");
      this.petImage.id = "feedmejd-pet-img";
      this.petImage.src = chrome.runtime.getURL("images/pet-idle.png");
      this.petImage.title = "Hello! I am FeedMeJD!";
      this.tooltip = document.createElement("div");
      this.tooltip.className = "feedmejd-tooltip";
      this.tooltip.textContent = "Feed Me JD!";
      this.petContainer.appendChild(this.tooltip);
      this.petContainer.appendChild(this.petImage);
      document.body.appendChild(this.petContainer);
      this.petContainer.addEventListener("click", this.handlePetClick.bind(this));
      console.log("FeedMeJD: Pet UI injected (compact design).");
    }
    /**
     * The main logic that runs on page load and on subsequent navigations.
     */
    runLogic() {
      this.currentJobId = this.extractJobId();
      this.updateStateBasedOnJD();
    }
    /**
     * Extracts the unique job ID from the current page URL.
     * @returns The job ID, or null if not found.
     */
    extractJobId() {
      const url = window.location.href;
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
    setupObserver() {
      this.observer = new MutationObserver((mutations) => {
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout(() => {
          this.runLogic();
        }, 800);
      });
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    /**
     * Sets the visual state of the pet.
     * Only updates if the state actually changes to avoid redundant DOM operations.
     */
    setState(state) {
      if (this.currentState === state) {
        return;
      }
      console.log(`FeedMeJD: State change: ${this.currentState} → ${state}`);
      this.currentState = state;
      const stateDetails = {
        idle: { img: "pet-idle.png", title: "Hello! I am FeedMeJD!" },
        hungry: { img: "pet-hungry.png", title: "I am hungry for this JD!" },
        eating: { img: "pet-eating.png", title: "Om nom nom... digesting!" },
        done: { img: "pet-done.png", title: "I've produced a Skill Gem!" }
      };
      this.petImage.src = chrome.runtime.getURL(`images/${stateDetails[state].img}`);
      this.petImage.title = stateDetails[state].title;
      if (state === "eating") {
        this.petImage.classList.add("is-eating");
        console.log("FeedMeJD: Added 'is-eating' class. Animation should be visible now!");
      } else {
        this.petImage.classList.remove("is-eating");
      }
    }
    /**
     * Checks for a JD and sets the initial pet state.
     * Also checks if this job has already been analyzed.
     * Completed jobs are clickable to view dashboard (no persistent badge).
     */
    async updateStateBasedOnJD() {
      if (this.isAnalyzing) {
        console.log("FeedMeJD: Skipping state update - analysis in progress");
        return;
      }
      try {
        this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
        this.petContainer.classList.remove("disabled", "analyzing", "completed");
        if (this.jdElement && this.currentJobId) {
          const isAnalyzed = await this.isJobAnalyzed(this.currentJobId);
          if (isAnalyzed) {
            this.setState("done");
            this.petImage.title = "Click to view analysis in dashboard";
            this.tooltip.textContent = "View Dashboard";
            this.petContainer.classList.add("completed");
          } else {
            this.setState("hungry");
            this.petImage.title = "Click me to analyze this job!";
            this.tooltip.textContent = "Feed Me JD!";
          }
        } else if (this.jdElement && !this.currentJobId) {
          this.setState("hungry");
          this.petImage.title = "Click me to analyze this job!";
          this.tooltip.textContent = "Feed Me JD!";
        } else {
          this.setState("idle");
          this.petImage.title = "Navigate to a job posting!";
          this.tooltip.textContent = "Find a job first!";
          this.petContainer.classList.add("disabled");
        }
      } catch (error) {
        console.error("FeedMeJD: Error in updateStateBasedOnJD:", error);
        this.setState("idle");
        this.petContainer.classList.add("disabled");
      }
    }
    /**
         * Shows a celebration gem badge animation, then removes it.
         */
    showCelebrationGem() {
      const badge = document.createElement("div");
      badge.className = "feedmejd-gem-badge";
      badge.innerHTML = "💎";
      this.petContainer.appendChild(badge);
      setTimeout(() => {
        badge.remove();
      }, 1100);
    }
    /**
     * Checks if a job has already been analyzed.
     * @param jobId The job's unique ID.
     * @returns True if the job has been analyzed, false otherwise.
     */
    async isJobAnalyzed(jobId) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(["analyzedJobs"], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("FeedMeJD: Could not check job analysis status:", chrome.runtime.lastError.message);
              resolve(false);
              return;
            }
            const analyzedJobs = result.analyzedJobs || [];
            resolve(analyzedJobs.includes(jobId));
          });
        } catch (error) {
          console.warn("FeedMeJD: Exception in isJobAnalyzed:", error);
          resolve(false);
        }
      });
    }
    /**
     * Handles the click event on the pet container.
     * - If completed: Opens dashboard
     * - If hungry: Starts analysis
     * - If disabled/analyzing: Does nothing
     */
    handlePetClick() {
      if (this.petContainer.classList.contains("disabled") || this.petContainer.classList.contains("analyzing")) {
        return;
      }
      if (this.petContainer.classList.contains("completed")) {
        console.log("FeedMeJD: Opening dashboard for completed job");
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
        return;
      }
      this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
      if (!this.jdElement) {
        console.warn("FeedMeJD: Cat clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }
      console.log("FeedMeJD: Cat head clicked! Starting analysis...");
      const jobIdSnapshot = this.currentJobId;
      this.isAnalyzing = true;
      this.setState("eating");
      this.petImage.title = "Analyzing... This may take a while if the AI model needs to download!";
      this.petContainer.classList.add("analyzing");
      const jdText = this.jdElement.innerText;
      console.log(`FeedMeJD: Extracted JD text (${jdText.length} characters) for job ${jobIdSnapshot || "unknown"}. Sending to background...`);
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
        this.petContainer.classList.remove("analyzing");
        if (chrome.runtime.lastError) {
          console.error("FeedMeJD: Message sending failed.", chrome.runtime.lastError.message);
          const errorMessage = chrome.runtime.lastError.message || "";
          if (errorMessage.includes("AI_UNAVAILABLE")) {
            this.petImage.title = "Sorry! My AI brain isn't supported on this device.";
          } else if (errorMessage.includes("AI_DOWNLOADING") || errorMessage.includes("AI_DOWNLOAD_REQUIRED")) {
            this.petImage.title = "My AI brain is downloading... Please try again in a few moments!";
            this.setState("idle");
          } else {
            this.petImage.title = "Oops! Something went wrong.";
          }
          this.setState("idle");
          this.isAnalyzing = false;
          return;
        }
        if (response && response.success) {
          console.log("FeedMeJD: Analysis successful for job", jobIdSnapshot || "unknown");
          if (this.currentJobId === jobIdSnapshot) {
            this.runSuccessAnimation(jobIdSnapshot);
          } else {
            console.warn(`FeedMeJD: User navigated away. Analysis was for job ${jobIdSnapshot}, but now viewing ${this.currentJobId}. Saving silently without UI update.`);
            if (jobIdSnapshot) {
              this.markJobAsAnalyzed(jobIdSnapshot);
            }
            this.isAnalyzing = false;
            this.runLogic();
          }
        } else {
          console.error("FeedMeJD: Analysis failed.", response?.error);
          this.petImage.title = "Sorry! The analysis failed. Please try again.";
          this.setState("idle");
          this.isAnalyzing = false;
        }
      });
    }
    /**
     * Runs the sequence of animations after a successful analysis.
     * Shows celebration gem → switches to done state.
     * @param analyzedJobId The ID of the job that was actually analyzed (snapshot from when analysis started)
     */
    runSuccessAnimation(analyzedJobId) {
      console.log("FeedMeJD: Starting success animation for job", analyzedJobId || "unknown");
      if (analyzedJobId) {
        this.markJobAsAnalyzed(analyzedJobId);
      }
      this.showCelebrationGem();
      setTimeout(() => {
        if (this.currentJobId === analyzedJobId) {
          console.log("FeedMeJD: Switching to 'done' state...");
          this.setState("done");
          this.petImage.title = "Click to view analysis in dashboard";
          this.tooltip.textContent = "View Dashboard";
          this.petContainer.classList.add("completed");
        } else {
          console.log(`FeedMeJD: User navigated away during animation. Skipping UI update.`);
          this.runLogic();
        }
        this.isAnalyzing = false;
      }, 300);
    }
    /**
     * Marks a job as analyzed by saving its ID to storage.
     * @param jobId The job's unique ID.
     */
    markJobAsAnalyzed(jobId) {
      chrome.storage.local.get(["analyzedJobs"], (result) => {
        const analyzedJobs = result.analyzedJobs || [];
        if (!analyzedJobs.includes(jobId)) {
          analyzedJobs.push(jobId);
          chrome.storage.local.set({ analyzedJobs }, () => {
            console.log(`FeedMeJD: Job ${jobId} marked as analyzed.`);
          });
        }
      });
    }
    cleanup() {
      console.log("FeedMeJD: Cleaning up and unloading Pet UI...");
      this.observer.disconnect();
      this.petContainer.remove();
      window.feedMeJdInjected = void 0;
    }
  }
  const manager = new PetUIManager();
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UNLOAD_PET_UI") {
      manager.cleanup();
      sendResponse({ success: true });
    }
  });
}
