console.log("FeedMeJD Background Script Loaded!");

// Define a type for our analysis results for type safety
interface AnalysisResult {
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener(
  (request: { type: string, text: string }, sender, sendResponse) => {
    if (request.type === "ANALYZE_JD") {
      console.log("FeedMeJD: Received JD to analyze.");
      
      handleAIAnalysis(request.text)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => {
          console.error("FeedMeJD: Error in background analysis.", error);
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Indicates asynchronous response
    }
  }
);

/**
 * Performs AI analysis and saves the result.
 * @param {string} text The job description text.
 * @returns {Promise<AnalysisResult>} The analysis result.
 */
async function handleAIAnalysis(text: string): Promise<AnalysisResult> {
  // TODO: Replace with actual AI calls
  console.log("FeedMeJD: [Placeholder] Starting simulated AI analysis...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result: AnalysisResult = {
    summary: "This is a placeholder summary.",
    skills: {
      hard: ["TypeScript", "Vite", "Chrome Extensions"],
      soft: ["Problem Solving", "Attention to Detail"],
    },
  };
  
  // Create a unique ID for this "gem"
  const gemId = `gem_${Date.now()}`;
  
  // Save the result to chrome.storage.local
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: Analysis result saved as ${gemId}.`);

  return result;
}
