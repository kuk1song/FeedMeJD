console.log("FeedMeJD Content Script Loaded!");

// --- Main Function ---
function main() {
  console.log("FeedMeJD: Main function started.");
  
  // Create the main container for our pet UI
  const petContainer = document.createElement('div');
  petContainer.id = 'feedmejd-pet-container';

  // Create the image element for the pet
  const petImage = document.createElement('img');
  petImage.id = 'feedmejd-pet-img';
  // Use chrome.runtime.getURL to correctly resolve the extension's file path
  petImage.src = chrome.runtime.getURL('images/pet-idle.png'); // Default state
  petImage.title = 'Hello! I am your JobPet!';

  // Create the "Feed Me" button
  const feedButton = document.createElement('button');
  feedButton.id = 'feedmejd-feed-button';
  feedButton.innerText = 'Feed Me JD!';

  // Append elements to the container, and the container to the body
  petContainer.appendChild(petImage);
  petContainer.appendChild(feedButton);
  document.body.appendChild(petContainer);

  console.log("FeedMeJD: Pet UI injected into page.");
  
  // Now, let's check if we are on a valid JD page
  checkForJD();
}

// --- Helper Functions ---

/**
 * Checks if a job description is present on the page.
 * If so, it changes the pet's state to "hungry".
 */
function checkForJD() {
  // This selector is specific to LinkedIn's job description area.
  const jdSelector = '.jobs-description__content';
  const jdElement = document.querySelector(jdSelector);

  if (jdElement) {
    console.log("FeedMeJD: Job Description found!");
    // JD is found, let's make our pet hungry!
    const petImage = document.getElementById('feedmejd-pet-img');
    const feedButton = document.getElementById('feedmejd-feed-button');

    if (petImage && feedButton) {
      // Note: We'll use .png for now. When you have GIFs, you can change this.
      petImage.src = chrome.runtime.getURL('images/pet-hungry.png');
      petImage.title = 'I am hungry for this JD!';
      feedButton.style.display = 'block';

      // --- NEW: Add click listener to the feed button ---
      feedButton.addEventListener('click', () => handleFeed(jdElement, petImage, feedButton));
    }
  } else {
    console.log("FeedMeJD: No Job Description found on this page.");
  }
}

/**
 * Handles the entire "feeding" process when the button is clicked.
 * @param {HTMLElement} jdElement - The element containing the job description text.
 * @param {HTMLImageElement} petImage - The pet's image element.
 * @param {HTMLButtonElement} feedButton - The feed button element.
 */
function handleFeed(jdElement, petImage, feedButton) {
  console.log("FeedMeJD: Feed button clicked!");

  // --- 1. Visual Feedback: Start Eating/Digesting ---
  feedButton.style.display = 'none'; // Hide button during processing
  petImage.src = chrome.runtime.getURL('images/pet-eating.png');
  petImage.title = 'Om nom nom... digesting this JD!';

  // --- 2. Extract JD Text ---
  const jdText = jdElement.innerText;
  
  // --- 3. Send to Background for AI Processing ---
  chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
    if (response && response.success) {
      console.log("FeedMeJD: Background script finished analysis.", response.data);
      
      // --- 4. Visual Feedback: Done & Feel Good ---
      // Done State (show gem)
      petImage.src = chrome.runtime.getURL('images/pet-done.png');
      petImage.title = 'I\'ve produced a Skill Gem for you!';
      // TODO: Actually create and show the gem element

      // Feel Good State (after a short delay)
      setTimeout(() => {
        petImage.src = chrome.runtime.getURL('images/pet-feel-good.png');
        petImage.title = 'That was yummy!';
      }, 1500); // Show "done" state for 1.5s

      // Return to Idle State (after another delay)
      setTimeout(() => {
        petImage.src = chrome.runtime.getURL('images/pet-idle.png');
        petImage.title = 'Hello! I am your JobPet!';
      }, 3500); // Show "feel good" for 2s (1.5s + 2s = 3.5s total)

    } else {
      console.error("FeedMeJD: Analysis failed or an error occurred.");
      // TODO: Handle error case, maybe return to idle
    }
  });
}


// --- Script Entry Point ---
main();
