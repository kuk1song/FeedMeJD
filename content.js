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
      petImage.src = chrome.runtime.getURL('images/pet-hungry.png'); // Hungry state
      petImage.title = 'I am hungry for this JD!';
      feedButton.style.display = 'block'; // Show the feed button
    }
  } else {
    console.log("FeedMeJD: No Job Description found on this page.");
  }
}

// --- Script Entry Point ---
main();
