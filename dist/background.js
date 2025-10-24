console.log("FeedMeJD Background Script Loaded!");
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "ANALYZE_JD") {
      console.log("FeedMeJD: Received JD to analyze.");
      handleAIAnalysis(request.text).then((result) => sendResponse({ success: true, data: result })).catch((error) => {
        console.error("FeedMeJD: Error in background analysis.", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  }
);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.includes("linkedin.com")) {
    if (tab.url.includes("linkedin.com/jobs")) {
      console.log(`FeedMeJD: Detected navigation to a jobs page: ${tab.url}`);
      chrome.scripting.insertCSS({
        target: { tabId },
        files: ["assets/content.css"]
      });
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    } else {
      console.log(`FeedMeJD: Navigated away from jobs page. Sending unload command.`);
      chrome.tabs.sendMessage(tabId, { type: "UNLOAD_PET_UI" }, (response) => {
        if (chrome.runtime.lastError) ;
      });
    }
  }
});
function getLanguageModelFactory() {
  if (typeof LanguageModel !== "undefined") {
    console.log("FeedMeJD: Using global LanguageModel API (Service Worker)");
    return LanguageModel;
  }
  if (typeof self.LanguageModel !== "undefined") {
    console.log("FeedMeJD: Using self.LanguageModel API");
    return self.LanguageModel;
  }
  if (typeof self.ai !== "undefined" && self.ai?.languageModel) {
    console.log("FeedMeJD: Using self.ai.languageModel API");
    return self.ai.languageModel;
  }
  if (typeof self !== "undefined" && typeof self.window !== "undefined") {
    const win = self.window;
    if (typeof win.ai !== "undefined" && win.ai?.languageModel) {
      console.log("FeedMeJD: Using window.ai.languageModel API");
      return win.ai.languageModel;
    }
  }
  return null;
}
async function handleAIAnalysis(text) {
  const languageModelAPI = getLanguageModelFactory();
  if (!languageModelAPI) {
    console.error("FeedMeJD: Built-in AI (LanguageModel) is not available in this browser environment.");
    console.error("Checked: self.ai, window.ai, LanguageModel, self.LanguageModel - all undefined");
    throw new Error("AI_UNAVAILABLE");
  }
  console.log("FeedMeJD: Checking AI model availability...");
  const availability = await languageModelAPI.availability();
  console.log(`FeedMeJD: AI availability status: ${availability}`);
  const availabilityLower = String(availability).toLowerCase();
  if (availabilityLower === "readily" || availabilityLower === "available") {
    console.log("FeedMeJD: AI model is readily available.");
  } else if (availabilityLower === "after-download" || availabilityLower === "downloadable" || availabilityLower === "downloading") {
    console.log(`FeedMeJD: AI model status: ${availability}. Attempting to trigger download...`);
    console.log("FeedMeJD: Proceeding to create session (this will trigger download if needed)...");
  } else if (availabilityLower === "no" || availabilityLower === "unavailable") {
    console.error("FeedMeJD: AI model is not supported on this device.");
    throw new Error("AI_UNAVAILABLE");
  } else {
    console.warn(`FeedMeJD: Unknown availability status: ${availability}. Attempting to proceed...`);
  }
  console.log("FeedMeJD: Creating AI language model session...");
  let downloadStarted = false;
  const session = await languageModelAPI.create({
    // Specify expected output language to ensure optimal quality and safety
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        if (!downloadStarted) {
          console.log("FeedMeJD: Model download started!");
          downloadStarted = true;
        }
        console.log(`FeedMeJD: Model download progress: ${(e.loaded * 100).toFixed(0)}%`);
      });
    }
  });
  console.log("FeedMeJD: Session created successfully!");
  console.log("FeedMeJD: Prompting AI model...");
  const prompt = `
    Analyze the following job description text.
    Extract the key skills and provide a brief summary.
    Return the result ONLY as a valid JSON object in the following format, with no other text or explanations before or after the JSON block.
    
    Format:
    {
      "summary": "<A 2-3 sentence summary of the role>",
      "skills": {
        "hard": ["<skill 1>", "<skill 2>", "..."],
        "soft": ["<skill 1>", "<skill 2>", "..."]
      }
    }

    Job Description:
    ---
    ${text}
    ---
  `;
  const aiResponse = await session.prompt(prompt);
  const cleanedResponse = aiResponse.replace(/^```json\s*/, "").replace(/```$/, "").trim();
  console.log("FeedMeJD: AI response received and cleaned:", cleanedResponse);
  const result = JSON.parse(cleanedResponse);
  const gemId = `gem_${Date.now()}`;
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: AI analysis result saved as ${gemId}.`);
  await session.destroy();
  console.log("FeedMeJD: AI session destroyed.");
  return result;
}
