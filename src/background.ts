console.log("FeedMeJD Background Script Loaded!");

// Define a type for our analysis results for type safety
interface AnalysisResult {
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
}

// Extended gem shape stored in chrome.storage with optional metadata
interface PersistedGem extends AnalysisResult {
  meta?: {
    jobId?: string | null;
    title?: string;
    company?: string;
    url?: string;
    timestamp?: number;
  };
}

// --- Main Event Listener ---
chrome.runtime.onMessage.addListener(
  (request: { type: string, text?: string, meta?: any }, sender, sendResponse) => {
  if (request.type === "ANALYZE_JD") {
      // console.log("FeedMeJD: Received JD to analyze.");
      
      handleAIAnalysis(request.text!, request.meta)
        .then(result => sendResponse({ success: true, data: result }))
      .catch(error => {
          console.error("FeedMeJD: Error in background analysis.", error);
        sendResponse({ success: false, error: error.message });
        });
      
      return true; // Indicates asynchronous response
    } else if (request.type === "OPEN_DASHBOARD") {
      // console.log("FeedMeJD: Opening dashboard");
      openOrSwitchToDashboard();
      sendResponse({ success: true });
      return false;
    }
  }
);

/**
 * Opens the dashboard in a new tab, or switches to it if already open.
 */
function openOrSwitchToDashboard(): void {
  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  
  chrome.tabs.query({}, (tabs) => {
    const existingDashboardTab = tabs.find(tab => tab.url === dashboardUrl);
    
    if (existingDashboardTab && existingDashboardTab.id) {
      // Dashboard is already open - switch to it
      chrome.tabs.update(existingDashboardTab.id, { active: true }, () => {
        if (existingDashboardTab.windowId) {
          chrome.windows.update(existingDashboardTab.windowId, { focused: true });
        }
      });
    } else {
      // Dashboard is not open - create a new tab
      chrome.tabs.create({ url: dashboardUrl });
    }
  });
}

// Programmatic content script injection for LinkedIn jobs pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("linkedin.com")) {
    
    if (tab.url.includes("linkedin.com/jobs")) {
      console.log(`FeedMeJD: Detected navigation to a jobs page: ${tab.url}`);
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["assets/content.css"]
      });
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
      });
    } else {
      // console.log(`FeedMeJD: Navigated away from jobs page. Sending unload command.`);
      chrome.tabs.sendMessage(tabId, { type: "UNLOAD_PET_UI" }, (response) => {
        // Silently handle case where no content script exists
        if (chrome.runtime.lastError) {
          // Expected when content script was never injected
        }
      });
    }
  }
});

/**
 * Detects and returns the correct LanguageModel API factory from the environment.
 * Supports multiple API naming conventions for maximum compatibility.
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
  if (typeof (self as any).ai !== 'undefined' && (self as any).ai?.languageModel) {
    console.log("FeedMeJD: Using self.ai.languageModel API");
    return (self as any).ai.languageModel;
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

/**
 * Performs AI analysis and saves the result.
 */
async function handleAIAnalysis(text: string, meta?: any): Promise<PersistedGem> {
  const languageModelAPI = getLanguageModelFactory();
  
  if (!languageModelAPI) {
    console.error("FeedMeJD: Built-in AI (LanguageModel) is not available in this browser environment.");
    console.error("Checked: self.ai, window.ai, LanguageModel, self.LanguageModel - all undefined");
    throw new Error("AI_UNAVAILABLE");
  }

  // console.log("FeedMeJD: Checking AI model availability...");
  const availability = await languageModelAPI.availability();
  
  console.log(`FeedMeJD: AI availability status: ${availability}`);
  
  const availabilityLower = String(availability).toLowerCase();
  
  if (availabilityLower === 'readily' || availabilityLower === 'available') {
    // console.log("FeedMeJD: AI model is readily available.");
  } else if (availabilityLower === 'after-download' || availabilityLower === 'downloadable' || availabilityLower === 'downloading') {
    // console.log(`FeedMeJD: AI model status: ${availability}. Attempting to trigger download...`);
    // console.log("FeedMeJD: Proceeding to create session (this will trigger download if needed)...");
  } else if (availabilityLower === 'no' || availabilityLower === 'unavailable') {
    console.error("FeedMeJD: AI model is not supported on this device.");
    throw new Error("AI_UNAVAILABLE");
  } else {
    console.warn(`FeedMeJD: Unknown availability status: ${availability}. Attempting to proceed...`);
  }

  // console.log("FeedMeJD: Creating AI language model session...");
  
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

  // console.log("FeedMeJD: Session created successfully!");
  // console.log("FeedMeJD: Prompting AI model...");

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
  
  // The model sometimes wraps JSON in ```json ... ```
  const cleanedResponse = aiResponse
    .replace(/^```json\s*/, '')
    .replace(/```$/, '')
    .trim();
  
  console.log("FeedMeJD: AI response received and cleaned:", cleanedResponse);

  const parsed: AnalysisResult = JSON.parse(cleanedResponse);
  const result: PersistedGem = { ...parsed, meta };

  const gemId = `gem_${Date.now()}`;
  await chrome.storage.local.set({ [gemId]: result });
  console.log(`FeedMeJD: AI analysis result saved as ${gemId}.`);

  await session.destroy();
  // console.log("FeedMeJD: AI session destroyed.");

  return result;
}
