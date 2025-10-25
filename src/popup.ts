// Simple and elegant popup logic
document.addEventListener('DOMContentLoaded', () => {
  const gemCountElement = document.getElementById('gem-count')!;
  const openDashboardBtn = document.getElementById('open-dashboard')!;

  // Load and display gem count
  loadGemCount();

  // Open dashboard in new tab
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

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

