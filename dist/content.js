if (typeof window.feedMeJdInjected === "undefined") {
  window.feedMeJdInjected = true;
  console.log("FeedMeJD Content Script Injected & Running!");
  class PetUIManager {
    petContainer;
    petImage;
    feedButton;
    jdElement = null;
    observer;
    currentJobId = null;
    // Track the current job's unique ID
    constructor() {
      this.createUI();
      this.setupObserver();
      this.runLogic();
    }
    /**
     * Creates the pet's UI elements and injects them into the page.
     */
    createUI() {
      this.petContainer = document.createElement("div");
      this.petContainer.id = "feedmejd-pet-container";
      this.petImage = document.createElement("img");
      this.petImage.id = "feedmejd-pet-img";
      this.petImage.title = "Hello! I am FeedMeJD!";
      this.feedButton = document.createElement("button");
      this.feedButton.id = "feedmejd-feed-button";
      this.feedButton.innerText = "Feed Me JD!";
      this.petContainer.appendChild(this.petImage);
      this.petContainer.appendChild(this.feedButton);
      document.body.appendChild(this.petContainer);
      this.feedButton.addEventListener("click", this.handleFeedClick.bind(this));
      console.log("FeedMeJD: Pet UI injected.");
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
     */
    setupObserver() {
      this.observer = new MutationObserver((mutations) => {
        let timeoutId;
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          this.runLogic();
        }, 500);
      });
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    /**
     * Sets the visual state of the pet.
     * @param state The state to switch to ('idle', 'hungry', 'eating', 'done', 'feel-good').
     */
    setState(state) {
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
     */
    async updateStateBasedOnJD() {
      this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
      if (this.jdElement && this.currentJobId) {
        const isAnalyzed = await this.isJobAnalyzed(this.currentJobId);
        if (isAnalyzed) {
          this.setState("done");
          this.petImage.title = "I've already analyzed this job! Check the dashboard to see the results.";
          this.feedButton.style.display = "none";
        } else {
          this.setState("hungry");
          this.feedButton.style.display = "block";
          this.feedButton.disabled = false;
          this.feedButton.title = "Feed me this JD!";
        }
      } else if (this.jdElement && !this.currentJobId) {
        this.setState("hungry");
        this.feedButton.style.display = "block";
        this.feedButton.disabled = false;
        this.feedButton.title = "Feed me this JD!";
      } else {
        this.setState("idle");
        this.feedButton.style.display = "block";
        this.feedButton.disabled = true;
        this.feedButton.title = "Navigate to a specific job posting to feed me!";
      }
    }
    /**
     * Checks if a job has already been analyzed.
     * @param jobId The job's unique ID.
     * @returns True if the job has been analyzed, false otherwise.
     */
    async isJobAnalyzed(jobId) {
      return new Promise((resolve) => {
        chrome.storage.local.get(["analyzedJobs"], (result) => {
          const analyzedJobs = result.analyzedJobs || [];
          resolve(analyzedJobs.includes(jobId));
        });
      });
    }
    /**
     * Handles the click event on the feed button.
     */
    handleFeedClick() {
      this.jdElement = document.querySelector(".jobs-description__content .jobs-box__html-content, .jobs-description-content__text");
      if (!this.jdElement) {
        console.warn("FeedMeJD: Feed button clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }
      console.log("FeedMeJD: Feed button clicked!");
      this.setState("eating");
      this.feedButton.style.display = "none";
      this.petImage.title = "Analyzing... This may take a while if the AI model needs to download!";
      const jdText = this.jdElement.innerText;
      console.log(`FeedMeJD: Extracted JD text (${jdText.length} characters). Sending to background...`);
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
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
          this.feedButton.style.display = "block";
          return;
        }
        if (response && response.success) {
          console.log("FeedMeJD: Analysis successful.", response.data);
          this.runSuccessAnimation();
        } else {
          console.error("FeedMeJD: Analysis failed.", response?.error);
          this.petImage.title = "Sorry! The analysis failed. Please try again.";
          this.setState("idle");
          this.feedButton.style.display = "block";
        }
      });
    }
    /**
     * Runs the sequence of animations after a successful analysis.
     */
    runSuccessAnimation() {
      console.log("FeedMeJD: Starting success animation!");
      if (this.currentJobId) {
        this.markJobAsAnalyzed(this.currentJobId);
      }
      console.log("FeedMeJD: Switching to 'done' state...");
      this.setState("done");
      this.petImage.title = "Analysis complete! I've saved this JD as a skill gem.";
      this.feedButton.style.display = "none";
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
