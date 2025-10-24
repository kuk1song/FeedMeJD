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
  console.log("FeedMeJD: Initializing AI text session...");
  
  // Use the built-in AI
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
