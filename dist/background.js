console.log("FeedMeJD Background Script Loaded!");
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_JD") {
    console.log("FeedMeJD: Received JD to analyze from content script.");
    handleAIAnalysis(request.text).then((analysisResult) => {
      sendResponse({ success: true, data: analysisResult });
    }).catch((error) => {
      console.error("FeedMeJD: Error during AI analysis.", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});
async function handleAIAnalysis(text) {
  console.log("FeedMeJD: [Placeholder] Simulating AI analysis...");
  await new Promise((resolve) => setTimeout(resolve, 2e3));
  const placeholderResult = {
    summary: "This is a placeholder summary of the job description.",
    skills: {
      hard: ["JavaScript", "React", "CSS", "API Integration"],
      soft: ["Teamwork", "Communication", "Problem Solving"]
    }
  };
  console.log("FeedMeJD: [Placeholder] Analysis complete.");
  return placeholderResult;
}
