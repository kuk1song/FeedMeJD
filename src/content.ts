import './content.css';

if (typeof window.feedMeJdInjected === 'undefined') {
  window.feedMeJdInjected = true;

  console.log("FeedMeJD Content Script Injected & Running!");

  /**
   * Manages all UI and interactions for the pet on the page.
   */
  class PetUIManager {
    private petContainer!: HTMLDivElement;
    private petImage!: HTMLImageElement;
    private feedButton!: HTMLButtonElement;
    private jdElement: HTMLElement | null = null;
    private observer: MutationObserver;

    constructor() {
      this.createUI();
      this.setupObserver();
      this.runLogic(); // Initial run
    }

    /**
     * Creates the pet's UI elements and injects them into the page.
     */
    private createUI(): void {
      this.petContainer = document.createElement('div');
      this.petContainer.id = 'feedmejd-pet-container';

      this.petImage = document.createElement('img');
      this.petImage.id = 'feedmejd-pet-img';
      this.petImage.title = 'Hello! I am FeedMeJD!';

      this.feedButton = document.createElement('button');
      this.feedButton.id = 'feedmejd-feed-button';
      this.feedButton.innerText = 'Feed Me JD!';

      this.petContainer.appendChild(this.petImage);
      this.petContainer.appendChild(this.feedButton);
      document.body.appendChild(this.petContainer);

      this.feedButton.addEventListener('click', this.handleFeedClick.bind(this));
      
      console.log("FeedMeJD: Pet UI injected.");
    }

    /**
     * The main logic that runs on page load and on subsequent navigations.
     */
    private runLogic(): void {
       this.updateStateBasedOnJD();
    }

    /**
     * Sets up a MutationObserver to watch for SPA navigations.
     */
    private setupObserver(): void {
     this.observer = new MutationObserver((mutations) => {
       // A simple debounce to avoid firing too often on complex DOM changes.
       let timeoutId: number;
       clearTimeout(timeoutId);
       timeoutId = window.setTimeout(() => {
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
    private setState(state: 'idle' | 'hungry' | 'eating' | 'done' | 'feel-good'): void {
      const stateDetails = {
        idle: { img: 'pet-idle.png', title: 'Hello! I am FeedMeJD!' },
        hungry: { img: 'pet-hungry.png', title: 'I am hungry for this JD!' },
        eating: { img: 'pet-eating.png', title: 'Om nom nom... digesting!' },
        done: { img: 'pet-done.png', title: 'I\'ve produced a Skill Gem!' },
        'feel-good': { img: 'pet-feel-good.png', title: 'That was yummy!' },
      };

      this.petImage.src = chrome.runtime.getURL(`images/${stateDetails[state].img}`);
      this.petImage.title = stateDetails[state].title;
    }
    
    /**
     * Checks for a JD and sets the initial pet state.
     */
    private updateStateBasedOnJD(): void {
      // The pet should always be visible on jobs pages.
      // We just determine if it should be "hungry" or "idle".
      this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
      if (this.jdElement) {
        this.setState('hungry');
        this.feedButton.style.display = 'block';
        this.feedButton.disabled = false;
        this.feedButton.title = 'Feed me this JD!';
      } else {
        this.setState('idle');
        // Don't hide the button, just disable it and provide a helpful tip.
        this.feedButton.style.display = 'block';
        this.feedButton.disabled = true;
        this.feedButton.title = 'Navigate to a specific job posting to feed me!';
      }
    }

    /**
     * Handles the click event on the feed button.
     */
    private handleFeedClick(): void {
      // Re-query the element right before the click
      this.jdElement = document.querySelector('.jobs-description__content .jobs-box__html-content, .jobs-description-content__text');
      if (!this.jdElement) {
        console.warn("FeedMeJD: Feed button clicked, but no JD description found on the page.");
        this.petImage.title = "I can't find a job description on this page!";
        return;
      }

      console.log("FeedMeJD: Feed button clicked!");
      this.setState('eating');
      this.feedButton.style.display = 'none';

      const jdText = this.jdElement.innerText;
      
      chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("FeedMeJD: Message sending failed.", chrome.runtime.lastError.message);
          // Handle specific AI errors based on our new background logic
          const errorMessage = chrome.runtime.lastError.message || ""; // Fallback to empty string
          if (errorMessage.includes("AI_UNAVAILABLE")) {
            this.petImage.title = "Sorry! My AI brain isn't supported on this device.";
          } else if (errorMessage.includes("AI_DOWNLOADING") || errorMessage.includes("AI_DOWNLOAD_REQUIRED")) {
            this.petImage.title = "My AI brain is downloading... Please try again in a few moments!";
            this.setState('idle'); // A state indicating waiting might be better
          } else {
            this.petImage.title = "Oops! Something went wrong.";
          }
          this.setState('idle'); // Revert to idle on error
          this.feedButton.style.display = 'block'; // Show button again
          return;
        }
        
        if (response && response.success) {
          console.log("FeedMeJD: Analysis successful.", response.data);
          this.runSuccessAnimation();
        } else {
          console.error("FeedMeJD: Analysis failed.", response?.error);
          this.petImage.title = "Sorry! The analysis failed. Please try again.";
          this.setState('idle'); // Revert to idle on error
          this.feedButton.style.display = 'block'; // Show button again
        }
      });
    }

    /**
     * Runs the sequence of animations after a successful analysis.
     */
    private runSuccessAnimation(): void {
      // 1. Show "Done" state and the gem
      this.setState('done');
      // TODO: Create and show the gem element visually
      
      // 2. After a delay, switch to "Feel Good"
      setTimeout(() => {
        this.setState('feel-good');
      }, 1500);

      // 3. After another delay, return to the appropriate state
      setTimeout(() => {
        this.updateStateBasedOnJD();
      }, 3500);
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
