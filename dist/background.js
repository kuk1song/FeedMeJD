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
  if (typeof chrome.ai === "undefined") {
    console.error("FeedMeJD: chrome.ai API is not available in this browser environment.");
    throw new Error("AI_UNAVAILABLE");
  }
  const availability = await chrome.ai.getAvailability();
  switch (availability) {
    case "available":
      console.log("FeedMeJD: AI model is available.");
      break;
    case "downloading":
      console.log("FeedMeJD: AI model is downloading.");
      throw new Error("AI_DOWNLOADING");
    case "downloadable":
      console.log("FeedMeJD: AI model is downloadable.");
      throw new Error("AI_DOWNLOAD_REQUIRED");
    case "unavailable":
    default:
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
