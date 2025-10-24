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

// --- Background "Air Traffic Controller" ---
// This is the core of our new programmatic injection logic.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We are only interested in URL changes, which happen when 'status' is 'complete'.
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if the new URL is a LinkedIn jobs page.
    if (tab.url.includes("linkedin.com/jobs")) {
      console.log(`FeedMeJD: Detected navigation to a jobs page: ${tab.url}`);
      // Inject the content script and its CSS.
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["assets/content.css"]
      });
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      });
    }
  }
});

/**
 * Performs AI analysis and saves the result.
 * @param {string} text The job description text.
 * @returns {Promise<AnalysisResult>} The analysis result.
 */
async function handleAIAnalysis(text: string): Promise<AnalysisResult> {
  // Defensive check: Ensure the chrome.ai API exists before using it.
  if (typeof chrome.ai === 'undefined') {
    console.error("FeedMeJD: chrome.ai API is not available in this browser environment.");
    throw new Error("AI_UNAVAILABLE");
  }

  // Step 1: Proactively check the availability of the AI model.
  // This is the core of our "Graceful Degradation" strategy.
  const availability = await (chrome.ai as any).getAvailability();
  
  switch (availability) {
    case 'available':
      // All good, continue to the analysis.
      console.log("FeedMeJD: AI model is available.");
      break;
    case 'downloading':
      // The model is downloading, inform the user.
      console.log("FeedMeJD: AI model is downloading.");
      throw new Error("AI_DOWNLOADING");
    case 'downloadable':
      // The model needs to be downloaded, which might require user interaction.
      console.log("FeedMeJD: AI model is downloadable.");
      throw new Error("AI_DOWNLOAD_REQUIRED");
    case 'unavailable':
    default:
      // The device does not meet the requirements.
      console.error("FeedMeJD: AI model is unavailable on this device.");
      throw new Error("AI_UNAVAILABLE");
  }

  console.log("FeedMeJD: Initializing AI text session...");
  const session = await chrome.ai.createTextSession();

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
  
  // Clean the response to ensure it's a valid JSON
  // The model sometimes wraps the JSON in ```json ... ```
  const cleanedResponse = aiResponse
    .replace(/^```json\s*/, '')
    .replace(/```$/, '')
    .trim();
  
  console.log("FeedMeJD: AI response received and cleaned:", cleanedResponse);

  const result: AnalysisResult = JSON.parse(cleanedResponse);

  const gemId = `gem_${Date.now()}`;
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: AI analysis result saved as ${gemId}.`);

  // Destroy the session to free up resources
  await session.destroy();
  console.log("FeedMeJD: AI session destroyed.");

  return result;
}
