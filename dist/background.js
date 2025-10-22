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
async function handleAIAnalysis(text) {
  console.log("FeedMeJD: [Placeholder] Starting simulated AI analysis...");
  await new Promise((resolve) => setTimeout(resolve, 2e3));
  const result = {
    summary: "This is a placeholder summary.",
    skills: {
      hard: ["TypeScript", "Vite", "Chrome Extensions"],
      soft: ["Problem Solving", "Attention to Detail"]
    }
  };
  const gemId = `gem_${Date.now()}`;
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: Analysis result saved as ${gemId}.`);
  return result;
}
