console.log("FeedMeJD Background Script Loaded!");

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is for analyzing a JD
  if (request.type === "ANALYZE_JD") {
    console.log("FeedMeJD: Received JD to analyze from content script.");
    
    // Asynchronously process the AI analysis
    handleAIAnalysis(request.text)
      .then(analysisResult => {
        // On success, send back the result
        sendResponse({ success: true, data: analysisResult });
      })
      .catch(error => {
        // On failure, send back an error message
        console.error("FeedMeJD: Error during AI analysis.", error);
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to indicate that the response will be sent asynchronously
    return true; 
  }
});

// --- Helper Functions ---

/**
 * Performs the AI analysis using Chrome's built-in AI.
 * @param {string} text - The job description text to analyze.
 * @returns {Promise<object>} - A promise that resolves with the analysis results.
 */
async function handleAIAnalysis(text) {
  // For now, we are using placeholder data.
  // In the next step, we will replace this with actual calls to the AI API.
  console.log("FeedMeJD: [Placeholder] Simulating AI analysis...");

  // Simulate a network/processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const placeholderResult = {
    summary: "This is a placeholder summary of the job description.",
    skills: {
      hard: ["JavaScript", "React", "CSS", "API Integration"],
      soft: ["Teamwork", "Communication", "Problem Solving"]
    }
  };
  
  // TODO: Save this result to chrome.storage.local
  
  console.log("FeedMeJD: [Placeholder] Analysis complete.");
  return placeholderResult;
}
