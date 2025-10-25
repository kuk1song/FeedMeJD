document.addEventListener("DOMContentLoaded", () => {
  const gemCountElement = document.getElementById("gem-count");
  const openDashboardBtn = document.getElementById("open-dashboard");
  loadGemCount();
  openDashboardBtn.addEventListener("click", () => {
    openOrSwitchToDashboard();
  });
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
  function loadGemCount() {
    chrome.storage.local.get(null, (items) => {
      const gemKeys = Object.keys(items).filter((key) => key.startsWith("gem_"));
      const count = gemKeys.length;
      animateCount(0, count, 800);
    });
  }
  function animateCount(start, end, duration) {
    const startTime = Date.now();
    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      gemCountElement.textContent = current.toString();
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    requestAnimationFrame(updateCount);
  }
});
