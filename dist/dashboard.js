document.addEventListener("DOMContentLoaded", () => {
  loadAndDisplayGems();
});
function loadAndDisplayGems() {
  chrome.storage.local.get(null, (items) => {
    const gemEntries = Object.entries(items).filter(([key]) => key.startsWith("gem_"));
    if (gemEntries.length === 0) {
      return;
    }
    displayGemCards(gemEntries);
    generateSkillCrystal(gemEntries);
  });
}
function displayGemCards(gemEntries) {
  const gemsGrid = document.getElementById("gems-grid");
  gemsGrid.innerHTML = "";
  gemEntries.forEach(([gemId, gemData]) => {
    const card = createGemCard(gemId, gemData);
    gemsGrid.appendChild(card);
  });
}
function createGemCard(gemId, gem) {
  const card = document.createElement("div");
  card.className = "gem-card";
  card.innerHTML = `
    <div class="gem-header">
      <img src="images/gem.png" alt="Gem" class="gem-icon">
      <span class="gem-title">${gemId}</span>
    </div>
    <div class="gem-summary">${gem.summary}</div>
    <div class="skills-section">
      <div class="skill-category">
        <h4>Hard Skills</h4>
        <div class="skill-tags">
          ${gem.skills.hard.slice(0, 8).map(
    (skill) => `<span class="skill-tag">${skill}</span>`
  ).join("")}
          ${gem.skills.hard.length > 8 ? `<span class="skill-tag">+${gem.skills.hard.length - 8} more</span>` : ""}
        </div>
      </div>
      <div class="skill-category">
        <h4>Soft Skills</h4>
        <div class="skill-tags">
          ${gem.skills.soft.map(
    (skill) => `<span class="skill-tag">${skill}</span>`
  ).join("")}
        </div>
      </div>
    </div>
  `;
  return card;
}
function generateSkillCrystal(gemEntries) {
  const skillCrystalContainer = document.getElementById("skill-crystal");
  const skillFrequency = {};
  gemEntries.forEach(([_, gemData]) => {
    gemData.skills.hard.forEach((skill) => {
      const normalizedSkill = skill.toLowerCase();
      skillFrequency[normalizedSkill] = (skillFrequency[normalizedSkill] || 0) + 1;
    });
    gemData.skills.soft.forEach((skill) => {
      const normalizedSkill = skill.toLowerCase();
      skillFrequency[normalizedSkill] = (skillFrequency[normalizedSkill] || 0) + 1;
    });
  });
  const sortedSkills = Object.entries(skillFrequency).sort((a, b) => b[1] - a[1]).slice(0, 30);
  skillCrystalContainer.innerHTML = "";
  const cloudContainer = document.createElement("div");
  cloudContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
  `;
  sortedSkills.forEach(([skill, count]) => {
    const skillElement = document.createElement("span");
    const fontSize = Math.min(14 + count * 3, 32);
    const opacity = Math.min(0.5 + count * 0.15, 1);
    skillElement.textContent = skill;
    skillElement.style.cssText = `
      font-size: ${fontSize}px;
      font-weight: 600;
      color: #667eea;
      opacity: ${opacity};
      padding: 8px 16px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 20px;
      transition: all 0.2s ease;
      cursor: default;
    `;
    skillElement.addEventListener("mouseenter", () => {
      skillElement.style.transform = "scale(1.1)";
      skillElement.style.background = "rgba(102, 126, 234, 0.2)";
    });
    skillElement.addEventListener("mouseleave", () => {
      skillElement.style.transform = "scale(1)";
      skillElement.style.background = "rgba(102, 126, 234, 0.1)";
    });
    cloudContainer.appendChild(skillElement);
  });
  skillCrystalContainer.appendChild(cloudContainer);
}
