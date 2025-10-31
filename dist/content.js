if (typeof window.feedMeJdInjected === "undefined") {
  window.feedMeJdInjected = true;
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
    analyzedJobsCache = /* @__PURE__ */ new Set();
    cacheInitialized = false;
    cachePromise = null;
    storageListener = null;
    constructor() {
      this.createUI();
      this.setupObserver();
      this.cachePromise = this.loadAnalyzedJobsCache().finally(() => {
        this.cachePromise = null;
      });
      this.storageListener = (changes, area) => {
        if (area === "local" && changes.analyzedJobs) {
          const newValue = changes.analyzedJobs.newValue;
          this.updateAnalyzedJobsCache(newValue);
          this.refresh();
        }
      };
      chrome.storage.onChanged.addListener(this.storageListener);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.runLogic());
      } else {
        setTimeout(() => this.runLogic(), 100);
      }
    }
    loadAnalyzedJobsCache() {
      return new Promise((resolve) => {
        chrome.storage.local.get(["analyzedJobs"], (result) => {
          if (chrome.runtime.lastError) {
            console.warn("FeedMeJD: Failed to load analyzedJobs cache:", chrome.runtime.lastError.message);
            this.updateAnalyzedJobsCache(void 0);
            resolve();
            return;
          }
          const analyzedJobs = Array.isArray(result.analyzedJobs) ? result.analyzedJobs : [];
          this.updateAnalyzedJobsCache(analyzedJobs);
          resolve();
        });
      });
    }
    updateAnalyzedJobsCache(entries) {
      this.analyzedJobsCache = new Set(entries || []);
      this.cacheInitialized = true;
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
        return;
      }
      try {
        this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
        this.petContainer.classList.remove("disabled", "analyzing", "completed");
        if (this.jdElement && this.currentJobId) {
          const isAnalyzed = await this.isJobAnalyzed(this.currentJobId);
          if (isAnalyzed) {
            this.setState("done");
            this.petImage.title = "Click to view analysis in gallery";
            this.tooltip.textContent = "View Gallery";
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
          this.petImage.title = "Click on a job posting to start!";
          this.tooltip.textContent = "Pick a job you like!";
          this.petContainer.classList.add("disabled");
        }
      } catch (error) {
        console.error("FeedMeJD: Error in updateStateBasedOnJD:", error);
        this.setState("idle");
        this.petImage.title = "Click on a job posting to start!";
        this.tooltip.textContent = "Pick a job you like!";
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
      if (!this.cacheInitialized && this.cachePromise) {
        try {
          await this.cachePromise;
        } catch (error) {
          console.warn("FeedMeJD: Failed to await analyzedJobs cache load:", error);
        }
      }
      return this.analyzedJobsCache.has(jobId);
    }
    /**
     * Public wrapper to re-run logic from external listeners.
     */
    refresh() {
      this.runLogic();
    }
    /**
     * Extract job metadata: best-effort title/company/url with current jobId.
     */
    extractJobMeta() {
      const url = window.location.href;
      const timestamp = Date.now();
      const jobId = this.currentJobId;
      let title;
      let company;
      const titleSelectors = [
        ".jobs-unified-top-card__job-title",
        ".job-details-jobs-unified-top-card__job-title",
        ".top-card-layout__title",
        "h1.jobs-unified-top-card__job-title",
        "h1.top-card-layout__title",
        'h1[data-test-id="job-details-title"]'
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const t = el.textContent.trim();
          if (t.length > 0 && t.length < 200) {
            title = t;
            break;
          }
        }
      }
      const companySelectors = [
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name",
        ".topcard__org-name-link",
        ".top-card-layout__entity-info a",
        "a[data-test-job-company-name-link]",
        'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
        '.top-card-layout__entity-info a[href*="/company/"]',
        '.jobs-unified-top-card__primary-description a[href*="/company/"]'
      ];
      for (const sel of companySelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent) {
          const c = el.textContent.trim();
          if (c.length > 0 && c.length < 200) {
            company = c;
            break;
          }
        }
      }
      return { jobId, title, company, url, timestamp };
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
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
        return;
      }
      this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
      if (!this.jdElement) {
        console.warn("FeedMeJD: Cat clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }
      const jobIdSnapshot = this.currentJobId;
      this.isAnalyzing = true;
      this.setState("eating");
      this.petImage.title = "Analyzing... This may take a while...";
      this.petContainer.classList.add("analyzing");
      const jdText = this.jdElement.innerText;
      const meta = this.extractJobMeta();
      meta.jobId = jobIdSnapshot;
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText, meta }, (response) => {
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
          if (this.currentJobId === jobIdSnapshot) {
            this.runSuccessAnimation(jobIdSnapshot);
          } else {
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
      if (analyzedJobId) {
        this.markJobAsAnalyzed(analyzedJobId);
      }
      this.showCelebrationGem();
      setTimeout(() => {
        if (this.currentJobId === analyzedJobId) {
          this.setState("done");
          this.petImage.title = "Click to view analysis in gallery";
          this.tooltip.textContent = "View Gallery";
          this.petContainer.classList.add("completed");
        } else {
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
      if (jobId) {
        this.analyzedJobsCache.add(jobId);
        this.cacheInitialized = true;
      }
      chrome.storage.local.get(["analyzedJobs"], (result) => {
        const analyzedJobs = Array.isArray(result.analyzedJobs) ? result.analyzedJobs : [];
        if (!analyzedJobs.includes(jobId)) {
          analyzedJobs.push(jobId);
          chrome.storage.local.set({ analyzedJobs }, () => {
          });
        }
      });
    }
    cleanup() {
      console.log("FeedMeJD: Cleaning up and unloading Pet UI...");
      this.observer.disconnect();
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = void 0;
      }
      this.petContainer.remove();
      if (this.storageListener) {
        chrome.storage.onChanged.removeListener(this.storageListener);
        this.storageListener = null;
      }
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
