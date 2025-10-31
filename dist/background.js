console.log("FeedMeJD Background Script Loaded!");
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "ANALYZE_JD") {
      handleAIAnalysis(request.text, request.meta).then((result) => sendResponse({ success: true, data: result })).catch((error) => {
        console.error("FeedMeJD: Error in background analysis.", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else if (request.type === "OPEN_DASHBOARD") {
      openOrSwitchToDashboard();
      sendResponse({ success: true });
      return false;
    }
  }
);
function openOrSwitchToDashboard() {
  const dashboardUrl = chrome.runtime.getURL("dashboard.html");
  chrome.tabs.query({}, (tabs) => {
    const existingDashboardTab = tabs.find((tab) => tab.url === dashboardUrl);
    if (existingDashboardTab && existingDashboardTab.id) {
      chrome.tabs.update(existingDashboardTab.id, { active: true }, () => {
        if (existingDashboardTab.windowId) {
          chrome.windows.update(existingDashboardTab.windowId, { focused: true });
        }
      });
    } else {
      chrome.tabs.create({ url: dashboardUrl });
    }
  });
}
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
async function handleAIAnalysis(text, meta) {
  const languageModelAPI = getLanguageModelFactory();
  if (!languageModelAPI) {
    console.error("FeedMeJD: Built-in AI (LanguageModel) is not available in this browser environment.");
    console.error("Checked: self.ai, window.ai, LanguageModel, self.LanguageModel - all undefined");
    throw new Error("AI_UNAVAILABLE");
  }
  const availability = await languageModelAPI.availability();
  console.log(`FeedMeJD: AI availability status: ${availability}`);
  const availabilityLower = String(availability).toLowerCase();
  if (availabilityLower === "readily" || availabilityLower === "available") ;
  else if (availabilityLower === "after-download" || availabilityLower === "downloadable" || availabilityLower === "downloading") ;
  else if (availabilityLower === "no" || availabilityLower === "unavailable") {
    console.error("FeedMeJD: AI model is not supported on this device.");
    throw new Error("AI_UNAVAILABLE");
  } else {
    console.warn(`FeedMeJD: Unknown availability status: ${availability}. Attempting to proceed...`);
  }
  let downloadStarted = false;
  const session = await languageModelAPI.create({
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
  const prompt = `
    Analyze the following job description text.
    Extract the key skills and provide a brief summary.
    The summary must be 2-3 sentences. If the company name and/or role title are explicitly present in the text, mention them in the FIRST sentence (e.g., "At <Company>, the <Role> ...").
    If they are not determinable from the text, do not fabricate or guess.
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
  const parsed = JSON.parse(cleanedResponse);
  const result = { ...parsed, meta };
  const gemId = `gem_${Date.now()}`;
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: AI analysis result saved as ${gemId}.`);
  await session.destroy();
  return result;
}
