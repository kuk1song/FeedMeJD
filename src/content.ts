import './content.css';

console.log("FeedMeJD Content Script Loaded!");

/**
 * Manages all UI and interactions for the pet on the page.
 */
class PetUIManager {
  private petContainer: HTMLDivElement;
  private petImage: HTMLImageElement;
  private feedButton: HTMLButtonElement;
  private jdElement: HTMLElement | null;

  constructor() {
    this.jdElement = document.querySelector('.jobs-description__content');
    this.createUI();
    this.updateStateBasedOnJD();
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
    if (this.jdElement) {
      this.setState('hungry');
      this.feedButton.style.display = 'block';
    } else {
      this.setState('idle');
      this.feedButton.style.display = 'none';
    }
  }

  /**
   * Handles the click event on the feed button.
   */
  private handleFeedClick(): void {
    if (!this.jdElement) return;

    console.log("FeedMeJD: Feed button clicked!");
    this.setState('eating');
    this.feedButton.style.display = 'none';

    const jdText = this.jdElement.innerText;
    
    chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("FeedMeJD: Message sending failed.", chrome.runtime.lastError);
        this.setState('idle'); // Revert to idle on error
        return;
      }
      
      if (response && response.success) {
        console.log("FeedMeJD: Analysis successful.", response.data);
        this.runSuccessAnimation();
      } else {
        console.error("FeedMeJD: Analysis failed.", response?.error);
        this.setState('idle'); // Revert to idle on error
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

    // 3. After another delay, return to "Hungry" (since we're still on the page)
    setTimeout(() => {
      this.updateStateBasedOnJD();
    }, 3500);
  }
}

// --- Script Entry Point ---
// Ensure the script runs only when the page is fully loaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PetUIManager());
} else {
    new PetUIManager();
}
