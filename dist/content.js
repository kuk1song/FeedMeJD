console.log("FeedMeJD Content Script Loaded!");
function main() {
  console.log("FeedMeJD: Main function started.");
  const petContainer = document.createElement("div");
  petContainer.id = "feedmejd-pet-container";
  const petImage = document.createElement("img");
  petImage.id = "feedmejd-pet-img";
  petImage.src = chrome.runtime.getURL("images/pet-idle.png");
  petImage.title = "Hello! I am your JobPet!";
  const feedButton = document.createElement("button");
  feedButton.id = "feedmejd-feed-button";
  feedButton.innerText = "Feed Me JD!";
  petContainer.appendChild(petImage);
  petContainer.appendChild(feedButton);
  document.body.appendChild(petContainer);
  console.log("FeedMeJD: Pet UI injected into page.");
  checkForJD();
}
function checkForJD() {
  const jdSelector = ".jobs-description__content";
  const jdElement = document.querySelector(jdSelector);
  if (jdElement) {
    console.log("FeedMeJD: Job Description found!");
    const petImage = document.getElementById("feedmejd-pet-img");
    const feedButton = document.getElementById("feedmejd-feed-button");
    if (petImage && feedButton) {
      petImage.src = chrome.runtime.getURL("images/pet-hungry.png");
      petImage.title = "I am hungry for this JD!";
      feedButton.style.display = "block";
      feedButton.addEventListener("click", () => handleFeed(jdElement, petImage, feedButton));
    }
  } else {
    console.log("FeedMeJD: No Job Description found on this page.");
  }
}
function handleFeed(jdElement, petImage, feedButton) {
  console.log("FeedMeJD: Feed button clicked!");
  feedButton.style.display = "none";
  petImage.src = chrome.runtime.getURL("images/pet-eating.png");
  petImage.title = "Om nom nom... digesting this JD!";
  const jdText = jdElement.innerText;
  chrome.runtime.sendMessage({ type: "ANALYZE_JD", text: jdText }, (response) => {
    if (response && response.success) {
      console.log("FeedMeJD: Background script finished analysis.", response.data);
      petImage.src = chrome.runtime.getURL("images/pet-done.png");
      petImage.title = "I've produced a Skill Gem for you!";
      setTimeout(() => {
        petImage.src = chrome.runtime.getURL("images/pet-feel-good.png");
        petImage.title = "That was yummy!";
      }, 1500);
      setTimeout(() => {
        petImage.src = chrome.runtime.getURL("images/pet-idle.png");
        petImage.title = "Hello! I am your JobPet!";
      }, 3500);
    } else {
      console.error("FeedMeJD: Analysis failed or an error occurred.");
    }
  });
}
main();
