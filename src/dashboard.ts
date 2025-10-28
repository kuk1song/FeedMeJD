// Dashboard logic - Upgraded with interactive views and delete functionality

interface Gem {
  summary: string;
  skills: {
    hard: string[];
    soft: string[];
  };
  meta?: {
    jobId?: string | null;
    title?: string;
    company?: string;
    url?: string;
    timestamp?: number;
  };
}

interface SkillData {
  hard: Map<string, number>;
  soft: Map<string, number>;
}

// Current view state
let currentView: 'constellation' | 'prism' = 'constellation';
let skillData: SkillData = { hard: new Map(), soft: new Map() };
let allGems: [string, Gem][] = [];
let currentSearch = '';
let currentSort: 'newest' | 'oldest' | 'title' = 'newest';

document.addEventListener('DOMContentLoaded', () => {
  loadAndDisplayGems();
  setupViewSwitcher();
  setupGemsToolbar();
});

/**
 * Sets up the view switcher buttons.
 */
function setupViewSwitcher(): void {
  const constellationBtn = document.getElementById('constellation-view-btn')!;
  const prismBtn = document.getElementById('prism-view-btn')!;

  constellationBtn.addEventListener('click', () => {
    if (currentView !== 'constellation') {
      currentView = 'constellation';
      constellationBtn.classList.add('active');
      prismBtn.classList.remove('active');
      renderCurrentView();
    }
  });

  prismBtn.addEventListener('click', () => {
    if (currentView !== 'prism') {
      currentView = 'prism';
      prismBtn.classList.add('active');
      constellationBtn.classList.remove('active');
      renderCurrentView();
    }
  });
}

/**
 * Loads all gems from storage and displays them.
 */
function loadAndDisplayGems(): void {
  chrome.storage.local.get(null, (items) => {
    // Filter out gem data
    const gemEntries = Object.entries(items).filter(([key]) => key.startsWith('gem_')) as [string, Gem][];
    
    const gemsGrid = document.getElementById('gems-grid');
    const skillCrystalContainer = document.getElementById('skill-crystal');
    const gemsSectionTitle = document.querySelector('.gems-section h2') as HTMLElement | null;
    const gemsToolbar = document.getElementById('gems-toolbar');

    if (gemEntries.length === 0) {
      // Reset aggregated data and UI to empty state
      skillData = { hard: new Map(), soft: new Map() };
      if (gemsGrid) gemsGrid.innerHTML = '';
      if (gemsSectionTitle) gemsSectionTitle.style.display = 'none';
      if (gemsToolbar) gemsToolbar.style.display = 'none';
      if (skillCrystalContainer) {
        skillCrystalContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">💎</div>
            <p>No gems collected yet</p>
            <p>Feed your pet some job descriptions to start!</p>
          </div>
        `;
      }
      return;
    }

    // Persist all gems and render filtered/sorted list
    allGems = gemEntries;
    renderGemsList();
    
    // Ensure JD Gems title is visible when we have data
    if (gemsSectionTitle) gemsSectionTitle.style.display = '';
    if (gemsToolbar) gemsToolbar.style.display = '';

    // Aggregate skills
    skillData = aggregateSkills(gemEntries);
    
    // Render the current view
    renderCurrentView();
  });
}

/**
 * Sets up search/sort toolbar listeners.
 */
function setupGemsToolbar(): void {
  const search = document.getElementById('gem-search') as HTMLInputElement | null;
  const sort = document.getElementById('gem-sort') as HTMLSelectElement | null;
  if (search) {
    search.addEventListener('input', () => {
      currentSearch = search.value.trim().toLowerCase();
      renderGemsList();
    });
  }
  if (sort) {
    sort.addEventListener('change', () => {
      currentSort = (sort.value || 'newest') as 'newest' | 'oldest' | 'title';
      renderGemsList();
    });
  }
}

/** Filter + sort + render current gem list */
function renderGemsList(): void {
  const entries = [...allGems];
  // Filter
  const filtered = entries.filter(([_, gem]) => {
    if (!currentSearch) return true;
    const title = gem.meta?.title?.toLowerCase() || '';
    const company = gem.meta?.company?.toLowerCase() || '';
    const skills = [...(gem.skills.hard || []), ...(gem.skills.soft || [])].join(' ').toLowerCase();
    return title.includes(currentSearch) || company.includes(currentSearch) || skills.includes(currentSearch);
  });

  // Sort
  filtered.sort((a, b) => {
    const tsA = gemTimestamp(a[0], a[1]);
    const tsB = gemTimestamp(b[0], b[1]);
    if (currentSort === 'newest') return tsB - tsA;
    if (currentSort === 'oldest') return tsA - tsB;
    const ta = (a[1].meta?.title || a[0]).toLowerCase();
    const tb = (b[1].meta?.title || b[0]).toLowerCase();
    return ta.localeCompare(tb);
  });

  displayGemCards(filtered);
}

function gemTimestamp(gemId: string, gem: Gem): number {
  if (gem.meta?.timestamp) return gem.meta.timestamp;
  const m = gemId.match(/gem_(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Aggregates all skills from gems, keeping hard and soft separate.
 */
function aggregateSkills(gemEntries: [string, any][]): SkillData {
  const hard = new Map<string, number>();
  const soft = new Map<string, number>();
  
  gemEntries.forEach(([_, gemData]: [string, Gem]) => {
    // Count hard skills
    gemData.skills.hard.forEach(skill => {
      const normalized = skill.toLowerCase().trim();
      hard.set(normalized, (hard.get(normalized) || 0) + 1);
    });
    
    // Count soft skills
    gemData.skills.soft.forEach(skill => {
      const normalized = skill.toLowerCase().trim();
      soft.set(normalized, (soft.get(normalized) || 0) + 1);
    });
  });
  
  return { hard, soft };
}

/**
 * Renders the skill crystal based on the current view.
 */
function renderCurrentView(): void {
  if (currentView === 'constellation') {
    renderConstellationView();
  } else {
    renderPrismView();
  }
}

/**
 * Renders the Constellation View - a beautiful, visual skill cloud.
 */
function renderConstellationView(): void {
  const container = document.getElementById('skill-crystal')!;
  container.innerHTML = '';
  
  const cloudContainer = document.createElement('div');
  cloudContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
    width: 100%;
  `;
  
  // Combine all skills and sort by frequency
  const allSkills: [string, number, 'hard' | 'soft'][] = [];
  skillData.hard.forEach((count, skill) => allSkills.push([skill, count, 'hard']));
  skillData.soft.forEach((count, skill) => allSkills.push([skill, count, 'soft']));
  allSkills.sort((a, b) => b[1] - a[1]);
  
  // Take top 30 for a clean visual
  const topSkills = allSkills.slice(0, 30);
  
  topSkills.forEach(([skill, count, type]) => {
    const skillElement = document.createElement('span');
    
    // Size based on frequency (min: 14px, max: 32px)
    const fontSize = Math.min(14 + count * 3, 32);
    
    // Color based on type
    const baseColor = type === 'hard' ? '#667eea' : '#ffa500';
    const bgColor = type === 'hard' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(255, 165, 0, 0.1)';
    
    skillElement.textContent = skill;
    skillElement.title = `${skill}: Found in ${count} job${count > 1 ? 's' : ''} (${type === 'hard' ? 'Hard Skill' : 'Soft Skill'})`;
    skillElement.style.cssText = `
      font-size: ${fontSize}px;
      font-weight: 600;
      color: ${baseColor};
      padding: 8px 16px;
      background: ${bgColor};
      border-radius: 20px;
      transition: all 0.2s ease;
      cursor: default;
      user-select: none;
    `;
    
    // Hover effect with count tooltip
    skillElement.addEventListener('mouseenter', () => {
      skillElement.style.transform = 'scale(1.1)';
      skillElement.style.boxShadow = `0 4px 12px ${type === 'hard' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255, 165, 0, 0.3)'}`;
    });
    
    skillElement.addEventListener('mouseleave', () => {
      skillElement.style.transform = 'scale(1)';
      skillElement.style.boxShadow = 'none';
    });
    
    cloudContainer.appendChild(skillElement);
  });
  
  container.appendChild(cloudContainer);
}

/**
 * Renders the Prism View - ranked lists of hard and soft skills.
 */
function renderPrismView(): void {
  const container = document.getElementById('skill-crystal')!;
  container.innerHTML = '';
  
  const prismContainer = document.createElement('div');
  prismContainer.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    width: 100%;
    padding: 20px;
  `;
  
  // Create Hard Skills section
  const hardSection = createPrismSection(
    'Hard Skills',
    Array.from(skillData.hard.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15),
    '#667eea'
  );
  
  // Create Soft Skills section
  const softSection = createPrismSection(
    'Soft Skills',
    Array.from(skillData.soft.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15),
    '#ffa500'
  );
  
  prismContainer.appendChild(hardSection);
  prismContainer.appendChild(softSection);
  container.appendChild(prismContainer);
}

/**
 * Creates a prism section (either hard or soft skills).
 */
function createPrismSection(title: string, skills: [string, number][], color: string): HTMLElement {
  const section = document.createElement('div');
  
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    color: ${color};
    font-size: 20px;
    margin-bottom: 16px;
    text-align: left;
  `;
  
  const skillList = document.createElement('div');
  skillList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  
  // Find max count for scaling
  const maxCount = skills.length > 0 ? skills[0][1] : 1;
  
  skills.forEach(([skill, count], index) => {
    const skillItem = document.createElement('div');
    const percentage = (count / maxCount) * 100;
    
    skillItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    `;
    
    // Rank badge
    const rank = document.createElement('span');
    rank.textContent = `${index + 1}`;
    rank.style.cssText = `
      width: 24px;
      height: 24px;
      background: ${color};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    `;
    
    // Skill bar container
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      flex: 1;
      position: relative;
      height: 32px;
      background: rgba(0,0,0,0.05);
      border-radius: 16px;
      overflow: hidden;
    `;
    
    // Skill bar
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: ${percentage}%;
      background: linear-gradient(90deg, ${color}, ${color}dd);
      border-radius: 16px;
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      padding: 0 12px;
    `;
    
    // Skill name
    const skillName = document.createElement('span');
    skillName.textContent = skill;
    skillName.style.cssText = `
      color: white;
      font-size: 13px;
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    
    // Count badge
    const countBadge = document.createElement('span');
    countBadge.textContent = count.toString();
    countBadge.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: white;
      color: ${color};
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    bar.appendChild(skillName);
    barContainer.appendChild(bar);
    barContainer.appendChild(countBadge);
    
    skillItem.appendChild(rank);
    skillItem.appendChild(barContainer);
    
    // Hover effect
    skillItem.addEventListener('mouseenter', () => {
      skillItem.style.background = 'rgba(0,0,0,0.02)';
      skillItem.style.transform = 'translateX(4px)';
    });
    
    skillItem.addEventListener('mouseleave', () => {
      skillItem.style.background = 'transparent';
      skillItem.style.transform = 'translateX(0)';
    });
    
    skillList.appendChild(skillItem);
  });
  
  section.appendChild(titleEl);
  section.appendChild(skillList);
  
  return section;
}

/**
 * Creates a container of skill tags with a "+n more" toggle.
 */
function createSkillTags(skills: string[], limit: number = 8): HTMLElement {
  const container = document.createElement('div');
  container.className = 'skill-tags';

  // Render tags, hide those beyond the limit initially
  skills.forEach((skill, index) => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = skill;
    if (index >= limit) {
      tag.style.display = 'none';
      // Mark as hidden so we can query reliably later
      (tag as HTMLElement).dataset.hidden = 'true';
    }
    container.appendChild(tag);
  });

  // Add "+n more" toggle if needed
  if (skills.length > limit) {
    const remaining = skills.length - limit;
    const moreBtn = document.createElement('span');
    moreBtn.className = 'skill-tag more-toggle';
    moreBtn.textContent = `+${remaining} more`;
    moreBtn.style.cursor = 'pointer';
    (moreBtn as HTMLElement).dataset.expanded = 'false';

    moreBtn.addEventListener('click', () => {
      const expanded = (moreBtn as HTMLElement).dataset.expanded === 'true';
      const hiddenTags = Array.from(container.querySelectorAll('.skill-tag[data-hidden="true"]')) as HTMLElement[];

      if (expanded) {
        hiddenTags.forEach(tag => { tag.style.display = 'none'; });
        moreBtn.textContent = `+${remaining} more`;
        (moreBtn as HTMLElement).dataset.expanded = 'false';
      } else {
        hiddenTags.forEach(tag => { tag.style.display = 'inline-flex'; });
        moreBtn.textContent = 'Show less';
        (moreBtn as HTMLElement).dataset.expanded = 'true';
      }
    });

    container.appendChild(moreBtn);
  }

  return container;
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
 * Creates a single gem card element with delete functionality.
 */
function createGemCard(gemId: string, gem: Gem): HTMLElement {
  const card = document.createElement('div');
  card.className = 'gem-card';
  card.dataset.gemId = gemId;
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-gem-btn';
  deleteBtn.innerHTML = '×';
  deleteBtn.title = 'Delete this gem';
  deleteBtn.addEventListener('click', () => deleteGem(gemId, card));
  
  // Card content
  const cardContent = document.createElement('div');
  const safeTitle = gem.meta?.title || gemId.replace('gem_', 'Gem #');
  const company = gem.meta?.company || '';
  const url = gem.meta?.url || '';
  const titleHtml = url ? `<a href="${url}" target="_blank" rel="noopener" class="gem-link">${safeTitle}</a>` : `<span class="gem-title">${safeTitle}</span>`;
  const companyHtml = company ? `<div class="gem-company">${company}</div>` : '';
  cardContent.innerHTML = `
    <div class="gem-header">
      <img src="images/gem.png" alt="Gem" class="gem-icon">
      <div class="gem-head-text">
        ${titleHtml}
        ${companyHtml}
      </div>
    </div>
    <div class="gem-summary">${gem.summary}</div>
    <div class="skills-section">
      <div class="skill-category">
        <h4>Hard Skills</h4>
        <div class="skill-tags" data-skill-hard></div>
      </div>
      <div class="skill-category">
        <h4>Soft Skills</h4>
        <div class="skill-tags" data-skill-soft></div>
      </div>
    </div>
  `;

  // Insert dynamic skill tags with "+n more" toggle
  const hardMount = cardContent.querySelector('[data-skill-hard]')!;
  const softMount = cardContent.querySelector('[data-skill-soft]')!;
  hardMount.replaceWith(createSkillTags(gem.skills.hard, 8));
  softMount.replaceWith(createSkillTags(gem.skills.soft, 8));
  
  card.appendChild(deleteBtn);
  card.appendChild(cardContent);
  
  return card;
}

/**
 * Deletes a gem from storage and updates the UI.
 */
async function deleteGem(gemId: string, cardElement: HTMLElement): Promise<void> {
  // Confirm before deleting with custom modal
  const confirmed = await showConfirmModal('Delete this gem?', 'This action cannot be undone.');
  if (!confirmed) return;

  // Add deleting animation
  cardElement.classList.add('is-deleting');

  // Wait for animation to complete, then remove from storage
  setTimeout(() => {
    // First fetch gem to get its jobId metadata
    chrome.storage.local.get([gemId, 'analyzedJobs'], (items) => {
      const gem: any = items[gemId];
      const analyzedJobs: string[] = items['analyzedJobs'] || [];
      const jobId: string | undefined | null = gem?.meta?.jobId;

      // Remove the gem itself
      chrome.storage.local.remove(gemId, () => {
        console.log(`FeedMeJD: Deleted gem ${gemId}`);

        // If jobId exists, also remove from analyzedJobs to sync LinkedIn pet state
        if (jobId) {
          const updated = analyzedJobs.filter(id => id !== jobId);
          chrome.storage.local.set({ analyzedJobs: updated }, () => {
            console.log(`FeedMeJD: Removed job ${jobId} from analyzedJobs after gem deletion.`);
            // Reload dashboard to reflect changes
            loadAndDisplayGems();
          });
        } else {
          // No job mapping (legacy gem). Just reload UI.
          loadAndDisplayGems();
        }
      });
    });
  }, 300);
}

/**
 * Elegant confirm modal aligned with dashboard aesthetics.
 */
function showConfirmModal(title: string, message: string): Promise<boolean> {
  const overlay = document.getElementById('confirm-overlay') as HTMLDivElement | null;
  if (!overlay) {
    // Fallback to native confirm if modal markup missing
    return Promise.resolve(window.confirm(`${title}\n${message}`));
  }

  const titleEl = overlay.querySelector('.modal-title') as HTMLElement | null;
  const msgEl = overlay.querySelector('.modal-message') as HTMLElement | null;
  const okBtn = document.getElementById('confirm-ok') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('confirm-cancel') as HTMLButtonElement | null;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise<boolean>((resolve) => {
    const cleanup = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      if (okBtn) okBtn.removeEventListener('click', onOk);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKey);
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onOverlayClick = (e: Event) => { if (e.target === overlay) { onCancel(); } };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { onCancel(); } };

    if (okBtn) okBtn.addEventListener('click', onOk);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKey);

    // Focus primary action for quick keyboard interaction
    if (okBtn) setTimeout(() => okBtn.focus(), 0);
  });
}
