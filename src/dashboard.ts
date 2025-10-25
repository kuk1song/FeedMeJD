// Dashboard logic - Simple, elegant, and functional

interface Gem {
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
}

document.addEventListener('DOMContentLoaded', () => {
  loadAndDisplayGems();
});

/**
 * Loads all gems from storage and displays them.
 */
function loadAndDisplayGems(): void {
  chrome.storage.local.get(null, (items) => {
    // Filter out gem data
    const gemEntries = Object.entries(items).filter(([key]) => key.startsWith('gem_'));
    
    if (gemEntries.length === 0) {
      // No gems - empty state is already shown in HTML
      return;
    }

    // Display individual gem cards
    displayGemCards(gemEntries);
    
    // Generate and display the skill crystal (aggregated visualization)
    generateSkillCrystal(gemEntries);
  });
}

/**
 * Displays individual gem cards in the grid.
 */
function displayGemCards(gemEntries: [string, any][]): void {
  const gemsGrid = document.getElementById('gems-grid')!;
  gemsGrid.innerHTML = '';

  gemEntries.forEach(([gemId, gemData]: [string, Gem]) => {
    const card = createGemCard(gemId, gemData);
    gemsGrid.appendChild(card);
  });
}

/**
 * Creates a single gem card element.
 */
function createGemCard(gemId: string, gem: Gem): HTMLElement {
  const card = document.createElement('div');
  card.className = 'gem-card';
  
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
          ${gem.skills.hard.slice(0, 8).map(skill => 
            `<span class="skill-tag">${skill}</span>`
          ).join('')}
          ${gem.skills.hard.length > 8 ? `<span class="skill-tag">+${gem.skills.hard.length - 8} more</span>` : ''}
        </div>
      </div>
      <div class="skill-category">
        <h4>Soft Skills</h4>
        <div class="skill-tags">
          ${gem.skills.soft.map(skill => 
            `<span class="skill-tag">${skill}</span>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Generates the skill crystal - an aggregated view of all skills.
 * This is the core visual showcase of the dashboard.
 */
function generateSkillCrystal(gemEntries: [string, any][]): void {
  const skillCrystalContainer = document.getElementById('skill-crystal')!;
  
  // Aggregate all skills and count frequencies
  const skillFrequency: { [skill: string]: number } = {};
  
  gemEntries.forEach(([_, gemData]: [string, Gem]) => {
    // Count hard skills
    gemData.skills.hard.forEach(skill => {
      const normalizedSkill = skill.toLowerCase();
      skillFrequency[normalizedSkill] = (skillFrequency[normalizedSkill] || 0) + 1;
    });
    
    // Count soft skills
    gemData.skills.soft.forEach(skill => {
      const normalizedSkill = skill.toLowerCase();
      skillFrequency[normalizedSkill] = (skillFrequency[normalizedSkill] || 0) + 1;
    });
  });
  
  // Sort by frequency and get top skills
  const sortedSkills = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30); // Top 30 skills
  
  // Create a simple, elegant skill cloud
  skillCrystalContainer.innerHTML = '';
  
  const cloudContainer = document.createElement('div');
  cloudContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
  `;
  
  sortedSkills.forEach(([skill, count]) => {
    const skillElement = document.createElement('span');
    
    // Size based on frequency (min: 14px, max: 32px)
    const fontSize = Math.min(14 + count * 3, 32);
    
    // Opacity based on frequency
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
    
    // Hover effect
    skillElement.addEventListener('mouseenter', () => {
      skillElement.style.transform = 'scale(1.1)';
      skillElement.style.background = 'rgba(102, 126, 234, 0.2)';
    });
    
    skillElement.addEventListener('mouseleave', () => {
      skillElement.style.transform = 'scale(1)';
      skillElement.style.background = 'rgba(102, 126, 234, 0.1)';
    });
    
    cloudContainer.appendChild(skillElement);
  });
  
  skillCrystalContainer.appendChild(cloudContainer);
}

