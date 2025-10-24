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
  // We are only interested in URL changes for LinkedIn tabs.
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("linkedin.com")) {
    
    // If it's a jobs page, inject the UI.
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
    // If it's another LinkedIn page, send a message to unload the UI.
    else {
      console.log(`FeedMeJD: Navigated away from jobs page. Sending unload command.`);
      chrome.tabs.sendMessage(tabId, { type: "UNLOAD_PET_UI" }, (response) => {
        // This callback is used to handle the case where the content script
        // was never injected, preventing an error message in the console.
        if (chrome.runtime.lastError) {
          /* console.log("FeedMeJD: No active content script to unload, which is expected."); */
        }
      });
    }
  }
});

/**
 * Performs AI analysis and saves the result.
 * @param {string} text The job description text.
 * @returns {Promise<AnalysisResult>} The analysis result.
 */
/**
 * Detects and returns the correct LanguageModel API factory from the environment.
 * Supports multiple API naming conventions for maximum compatibility.
 * IMPORTANT: In Service Worker context, use global LanguageModel or self.LanguageModel.
 */
function getLanguageModelFactory(): AILanguageModelFactory | null {
  // Service Worker environment: Try global LanguageModel first
  if (typeof LanguageModel !== 'undefined') {
    console.log("FeedMeJD: Using global LanguageModel API (Service Worker)");
    return LanguageModel;
  }
  
  // Try self.LanguageModel (Service Worker alternative)
  if (typeof (self as any).LanguageModel !== 'undefined') {
    console.log("FeedMeJD: Using self.LanguageModel API");
    return (self as any).LanguageModel;
  }
  
  // Try modern API (for non-Service Worker contexts)
  if (typeof self.ai !== 'undefined' && self.ai?.languageModel) {
    console.log("FeedMeJD: Using self.ai.languageModel API");
    return self.ai.languageModel;
  }
  
  // Try window.ai.languageModel (if window is available)
  if (typeof self !== 'undefined' && typeof (self as any).window !== 'undefined') {
    const win = (self as any).window;
    if (typeof win.ai !== 'undefined' && win.ai?.languageModel) {
      console.log("FeedMeJD: Using window.ai.languageModel API");
      return win.ai.languageModel;
    }
  }
  
  return null;
}

async function handleAIAnalysis(text: string): Promise<AnalysisResult> {
  // Step 1: Detect the correct API
  const languageModelAPI = getLanguageModelFactory();
  
  if (!languageModelAPI) {
    console.error("FeedMeJD: Built-in AI (LanguageModel) is not available in this browser environment.");
    console.error("Checked: self.ai, window.ai, LanguageModel, self.LanguageModel - all undefined");
    throw new Error("AI_UNAVAILABLE");
  }

  // Step 2: Check the availability of the AI model
  console.log("FeedMeJD: Checking AI model availability...");
  const availability = await languageModelAPI.availability();
  
  console.log(`FeedMeJD: AI availability status: ${availability}`);
  
  // Handle both old and new API return values for maximum compatibility
  const availabilityLower = String(availability).toLowerCase();
  
  if (availabilityLower === 'readily' || availabilityLower === 'available') {
    // Model is ready, continue to the analysis.
    console.log("FeedMeJD: AI model is readily available.");
  } else if (availabilityLower === 'after-download' || availabilityLower === 'downloadable' || availabilityLower === 'downloading') {
    // Model needs to be downloaded or is currently downloading.
    console.log(`FeedMeJD: AI model status: ${availability}. Attempting to trigger download...`);
    // Don't throw error - try to create session anyway, which will trigger download
    console.log("FeedMeJD: Proceeding to create session (this will trigger download if needed)...");
  } else if (availabilityLower === 'no' || availabilityLower === 'unavailable') {
    // The device does not meet the requirements.
    console.error("FeedMeJD: AI model is not supported on this device.");
    throw new Error("AI_UNAVAILABLE");
  } else {
    // Unknown status
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
