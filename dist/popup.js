document.addEventListener("DOMContentLoaded", () => {
  const gemCountElement = document.getElementById("gem-count");
  const openDashboardBtn = document.getElementById("open-dashboard");
  loadGemCount();
  openDashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });
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
