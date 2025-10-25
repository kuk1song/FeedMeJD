// Simple and elegant popup logic
document.addEventListener('DOMContentLoaded', () => {
  const gemCountElement = document.getElementById('gem-count')!;
  const openDashboardBtn = document.getElementById('open-dashboard')!;

  // Load and display gem count
  loadGemCount();

  // Open dashboard in new tab (or switch to existing one)
  openDashboardBtn.addEventListener('click', () => {
    openOrSwitchToDashboard();
  });

  /**
   * Opens the dashboard in a new tab, or switches to it if already open.
   */
  function openOrSwitchToDashboard(): void {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    
    // Search for an existing dashboard tab
    chrome.tabs.query({}, (tabs) => {
      const existingDashboardTab = tabs.find(tab => tab.url === dashboardUrl);
      
      if (existingDashboardTab && existingDashboardTab.id) {
        // Dashboard is already open - switch to it
        chrome.tabs.update(existingDashboardTab.id, { active: true }, () => {
          // Also switch to the window containing this tab
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

  /**
   * Loads the total number of collected gems from storage.
   */
  function loadGemCount(): void {
    chrome.storage.local.get(null, (items) => {
      // Count all keys that start with "gem_"
      const gemKeys = Object.keys(items).filter(key => key.startsWith('gem_'));
      const count = gemKeys.length;
      
      // Animate the count
      animateCount(0, count, 800);
    });
  }

  /**
   * Animates the gem count from start to end.
   */
  function animateCount(start: number, end: number, duration: number): void {
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

