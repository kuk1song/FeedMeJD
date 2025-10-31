// Dashboard logic - Upgraded with interactive views and delete functionality

import { renderSkillGalaxy } from './views/skillGalaxyView';
import { renderWordCloud, WordCloudData } from './views/wordCloudView';
import {
  Gem,
  SkillData,
  SkillGalaxyData,
  SkillLink,
  SkillNode,
} from './types/dashboard';

const GALAXY_VIEW_ENABLED = true;

type SkillView = 'constellation' | 'prism' | 'galaxy' | 'wordcloud';

// Current view state
let currentView: SkillView = 'constellation';
let skillData: SkillData = { hard: new Map(), soft: new Map() };
let skillGalaxy: SkillGalaxyData = { nodes: [], links: [] };
let allGems: [string, Gem][] = [];
let currentSearch = '';
let currentSort: 'newest' | 'oldest' | 'title' = 'newest';
let isSelectMode = false;
let selectedGemIds = new Set<string>();
let currentFiltered: [string, Gem][] = [];
let renderedCount = 0;
const pageSize = 24;
let io: IntersectionObserver | null = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAndDisplayGems();
  setupViewSwitcher();
  setupGemsToolbar();
  setupSelectToggle();
});

/**
 * Sets up the view switcher buttons.
 */
function setupViewSwitcher(): void {
  const constellationBtn = document.getElementById('constellation-view-btn');
  const prismBtn = document.getElementById('prism-view-btn');
  const galaxyBtn = document.getElementById('galaxy-view-btn');
  const wordcloudBtn = document.getElementById('wordcloud-view-btn');

  if (!constellationBtn || !prismBtn || !galaxyBtn || !wordcloudBtn) return;

  constellationBtn.classList.add('active');

  const updateActiveClasses = (view: SkillView) => {
    constellationBtn.classList.toggle('active', view === 'constellation');
    prismBtn.classList.toggle('active', view === 'prism');
    galaxyBtn.classList.toggle('active', view === 'galaxy');
    wordcloudBtn.classList.toggle('active', view === 'wordcloud');

    // If Galaxy is disabled, give visual hint but keep button accessible.
    if (!GALAXY_VIEW_ENABLED) {
      galaxyBtn.classList.toggle('disabled', true);
      galaxyBtn.setAttribute('title', 'Galaxy view is under construction');
    } else {
      galaxyBtn.classList.remove('disabled');
      galaxyBtn.setAttribute('title', 'View skills as a dynamic network');
    }
  };

  const handleSwitch = (view: SkillView) => {
    if (currentView === view) return;
    currentView = view;
    updateActiveClasses(view);
    renderCurrentView();
  };

  constellationBtn.addEventListener('click', () => handleSwitch('constellation'));
  prismBtn.addEventListener('click', () => handleSwitch('prism'));
  galaxyBtn.addEventListener('click', () => handleSwitch('galaxy'));
  wordcloudBtn.addEventListener('click', () => handleSwitch('wordcloud'));

  updateActiveClasses(currentView);
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
  const viewSwitcher = document.querySelector('.view-switcher') as HTMLElement | null;
  const selectToggle = document.getElementById('toggle-select') as HTMLButtonElement | null;

    if (gemEntries.length === 0) {
      // Reset aggregated data and UI to empty state
      skillData = { hard: new Map(), soft: new Map() };
      if (gemsGrid) gemsGrid.innerHTML = '';
      if (gemsSectionTitle) gemsSectionTitle.style.display = 'none';
      if (gemsToolbar) gemsToolbar.style.display = 'none';
      if (viewSwitcher) viewSwitcher.style.display = 'none';
      if (selectToggle) selectToggle.style.display = 'none';
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
    if (viewSwitcher) viewSwitcher.style.display = '';
    if (selectToggle) selectToggle.style.display = '';

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

/** Selection toggle setup */
function setupSelectToggle(): void {
  const btn = document.getElementById('toggle-select') as HTMLButtonElement | null;
  if (!btn) return;
  btn.addEventListener('click', () => {
    isSelectMode = !isSelectMode;
    selectedGemIds.clear();
    btn.textContent = isSelectMode ? 'Cancel' : 'Select';
    updateBulkBar();
    // Re-render current page so checkboxes appear/disappear
    renderPage(true);
  });
}

/** Filter + sort + render current gem list */
function renderGemsList(): void {
  const entries = [...allGems];
  // Filter
  const filtered = entries.filter(([_, gem]) => {
    if (!currentSearch) return true;
    const q = currentSearch;
    const title = gem.meta?.title?.toLowerCase() || '';
    const company = gem.meta?.company?.toLowerCase() || '';
    const skills = [...(gem.skills.hard || []), ...(gem.skills.soft || [])].join(' ').toLowerCase();
    const summary = (gem.summary || '').toLowerCase();
    return title.includes(q) || company.includes(q) || skills.includes(q) || summary.includes(q);
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

  currentFiltered = filtered;
  renderPage(true);
}

/** Render grid with lazy loading */
function renderPage(reset: boolean): void {
  const grid = document.getElementById('gems-grid')!;
  const sentinel = document.getElementById('gems-sentinel')!;
  if (reset) {
    renderedCount = 0;
    grid.innerHTML = '';
    if (io) { io.disconnect(); io = null; }
  }
  appendNextPage();

  if (!io) {
    io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          appendNextPage();
        }
      });
    }, { rootMargin: '600px 0px' });
    io.observe(sentinel);
  }
}

function appendNextPage(): void {
  const grid = document.getElementById('gems-grid')!;
  const next = currentFiltered.slice(renderedCount, renderedCount + pageSize);
  if (next.length === 0) return;
  next.forEach(([gemId, gemData]) => {
    const card = createGemCard(gemId, gemData);
    grid.appendChild(card);
  });
  renderedCount += next.length;
}

function gemTimestamp(gemId: string, gem: Gem): number {
  if (gem.meta?.timestamp) return gem.meta.timestamp;
  const m = gemId.match(/gem_(\d+)/);
  return m ? Number(m[1]) : 0;
}

function normalizeSkillName(skill: string): string {
  return skill.trim().toLowerCase();
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
      const normalized = normalizeSkillName(skill);
      if (!normalized) return;
      hard.set(normalized, (hard.get(normalized) || 0) + 1);
    });
    
    // Count soft skills
    gemData.skills.soft.forEach(skill => {
      const normalized = normalizeSkillName(skill);
      if (!normalized) return;
      soft.set(normalized, (soft.get(normalized) || 0) + 1);
    });
  });
  
  skillGalaxy = buildSkillGalaxyData(gemEntries, hard, soft);
  return { hard, soft };
}

function buildSkillGalaxyData(
  gemEntries: [string, Gem][],
  hardMap: Map<string, number>,
  softMap: Map<string, number>
): SkillGalaxyData {
  const nodes: SkillNode[] = [];
  const typeBySkill = new Map<string, SkillNode['type']>();

  hardMap.forEach((count, skill) => {
    nodes.push({ id: skill, type: 'hard', count });
    typeBySkill.set(skill, 'hard');
  });

  softMap.forEach((count, skill) => {
    nodes.push({ id: skill, type: 'soft', count });
    typeBySkill.set(skill, 'soft');
  });

  const linkCounts = new Map<string, number>();

  gemEntries.forEach(([_, gemData]) => {
    const normalizedHard = gemData.skills.hard.map(normalizeSkillName).filter(Boolean);
    const normalizedSoft = gemData.skills.soft.map(normalizeSkillName).filter(Boolean);
    const combined = Array.from(new Set([...normalizedHard, ...normalizedSoft]));

    for (let i = 0; i < combined.length; i++) {
      for (let j = i + 1; j < combined.length; j++) {
        const a = combined[i];
        const b = combined[j];
        if (!a || !b) continue;
        const key = a < b ? `${a}||${b}` : `${b}||${a}`;
        linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
      }
    }
  });

  const links: SkillLink[] = [];
  linkCounts.forEach((count, key) => {
    if (count <= 0) return;
    const [source, target] = key.split('||');
    if (!typeBySkill.has(source) || !typeBySkill.has(target)) {
      return;
    }
    links.push({ source, target, strength: count });
  });

  return { nodes, links };
}

/**
 * Renders the skill crystal based on the current view.
 */
function renderCurrentView(): void {
  if (currentView === 'constellation') {
    renderConstellationView();
  } else if (currentView === 'prism') {
    renderPrismView();
  } else if (currentView === 'wordcloud') {
    renderWordCloudView();
  } else {
    if (GALAXY_VIEW_ENABLED) {
      renderGalaxyView();
    } else {
      renderGalaxyPlaceholder();
    }
  }
}

/**
 * Renders the Constellation View - a beautiful, visual skill cloud.
 */
function renderConstellationView(): void {
  const container = document.getElementById('skill-crystal')!;
  container.innerHTML = '';

  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(15, 23, 42, 0.9);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.12s ease;
    white-space: nowrap;
    z-index: 100;
    transform: translate(-50%, calc(-100% - 1px));
  `;
  container.appendChild(tooltip);

  const iconSpan = document.createElement('span');
  iconSpan.style.cssText = 'font-size: 16px; letter-spacing: 2px; filter: drop-shadow(0 4px 8px rgba(15, 23, 42, 0.25));';
  const countSpan = document.createElement('span');
  countSpan.style.cssText = 'font-size: 12px; opacity: 0.75; display: none; color: rgba(15, 23, 42, 0.7);';
  tooltip.append(iconSpan, countSpan);
  
  const cloudContainer = document.createElement('div');
  cloudContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
    width: 100%;
    position: relative;
  `;
  
  // Combine all skills and sort by frequency
  const allSkills: [string, number, 'hard' | 'soft'][] = [];
  skillData.hard.forEach((count, skill) => allSkills.push([skill, count, 'hard']));
  skillData.soft.forEach((count, skill) => allSkills.push([skill, count, 'soft']));
  allSkills.sort((a, b) => b[1] - a[1]);
  
  // Take top 30 for a clean visual
  const topSkills = allSkills.slice(0, 30);
  
  const MAX_TOOLTIP_ICONS = 6;

  topSkills.forEach(([skill, count, type]) => {
    const skillElement = document.createElement('span');

    const fontSize = Math.min(14 + count * 3, 32);
    const typeClass = type === 'hard' ? 'skill-pill-hard' : 'skill-pill-soft';

    skillElement.textContent = skill;
    skillElement.classList.add('skill-pill', typeClass);
    skillElement.style.cssText = `
      font-size: ${fontSize}px;
      font-weight: 600;
      padding: 8px 16px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      cursor: default;
      user-select: none;
    `;
    skillElement.style.setProperty('--pill-shine-delay', `${(Math.random() * 4).toFixed(2)}s`);

    const updateTooltipContent = () => {
      const iconCount = Math.min(count, MAX_TOOLTIP_ICONS);
      iconSpan.textContent = '💎'.repeat(iconCount);
      if (count > MAX_TOOLTIP_ICONS) {
        countSpan.textContent = `×${count}`;
        countSpan.style.display = 'inline';
      } else {
        countSpan.style.display = 'none';
      }
    };

    const positionTooltip = () => {
      const containerRect = container.getBoundingClientRect();
      const rect = skillElement.getBoundingClientRect();
      const { offsetWidth, offsetHeight } = tooltip;

      let centerX = rect.left + rect.width / 2 - containerRect.left;
      centerX = Math.max(offsetWidth / 2 + 8, Math.min(centerX, container.offsetWidth - offsetWidth / 2 - 8));

      let anchorY = rect.top - containerRect.top;
      anchorY = Math.max(offsetHeight + 12, Math.min(anchorY, container.offsetHeight - 8));

      tooltip.style.left = `${centerX}px`;
      tooltip.style.top = `${anchorY}px`;
    };

    // Hover effect with immediate tooltip (Galaxy style)
    skillElement.addEventListener('mouseenter', () => {
      skillElement.classList.add('skill-pill-hovered');
      updateTooltipContent();
      tooltip.style.opacity = '1';
      positionTooltip();
    });
    
    skillElement.addEventListener('mousemove', () => {
      positionTooltip();
    });

    skillElement.addEventListener('mouseleave', () => {
      skillElement.classList.remove('skill-pill-hovered');
      tooltip.style.opacity = '0';
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
  
  skills.forEach(([skill, count]) => {
    const skillItem = document.createElement('div');
    const percentage = (count / maxCount) * 100;
    
    skillItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
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
  if (isSelectMode) deleteBtn.style.display = 'none';
  
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
    <div class="gem-summary"></div>
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

  // Set summary text and optionally emphasize company name in summary (first occurrence only)
  const summaryEl = cardContent.querySelector('.gem-summary') as HTMLElement;
  const summaryText = gem.summary || '';
  if (company) {
    // Escape then highlight company name
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
    const escaped = esc(summaryText);
    const pattern = new RegExp(`\\b${company.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`);
    const html = escaped.replace(pattern, '<span class="company-emph">$&</span>');
    summaryEl.innerHTML = html;
  } else {
    summaryEl.textContent = summaryText;
  }

  // Insert dynamic skill tags with "+n more" toggle
  const hardMount = cardContent.querySelector('[data-skill-hard]')!;
  const softMount = cardContent.querySelector('[data-skill-soft]')!;
  hardMount.replaceWith(createSkillTags(gem.skills.hard, 8));
  softMount.replaceWith(createSkillTags(gem.skills.soft, 8));
  
  // Selection checkbox in select mode
  if (isSelectMode) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gem-select';
    checkbox.checked = selectedGemIds.has(gemId);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedGemIds.add(gemId); else selectedGemIds.delete(gemId);
      updateBulkBar();
    });
    card.appendChild(checkbox);
  }
  
  card.appendChild(deleteBtn);
  card.appendChild(cardContent);
  
  return card;
}

/** Bulk selection helpers */
function updateBulkBar(): void {
  let bar = document.getElementById('bulk-actions');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'bulk-actions';
    bar.innerHTML = `
      <span id="bulk-count">0 selected</span>
      <button id="bulk-delete" class="btn-bulk danger">Delete</button>
    `;
    document.body.appendChild(bar);
    const del = document.getElementById('bulk-delete') as HTMLButtonElement;
    del.addEventListener('click', deleteSelected);
  }
  const count = selectedGemIds.size;
  const countEl = document.getElementById('bulk-count');
  if (countEl) countEl.textContent = `${count} selected`;
  (bar as HTMLElement).style.display = count > 0 && isSelectMode ? 'flex' : 'none';
}

async function deleteSelected(): Promise<void> {
  const ids = Array.from(selectedGemIds);
  if (ids.length === 0) return;
  const ok = await showConfirmModal(`Delete ${ids.length} gems?`, 'This action cannot be undone.');
  if (!ok) return;

  chrome.storage.local.get([...ids, 'analyzedJobs'], (items) => {
    const analyzedJobs: string[] = items['analyzedJobs'] || [];
    const jobIdsToRemove = new Set<string>();
    ids.forEach(id => {
      const meta = (items[id] as any)?.meta;
      if (meta?.jobId) jobIdsToRemove.add(meta.jobId);
    });

    chrome.storage.local.remove(ids, () => {
      const updated = analyzedJobs.filter(id => !jobIdsToRemove.has(id));
      chrome.storage.local.set({ analyzedJobs: updated }, () => {
        selectedGemIds.clear();
        isSelectMode = false;
        const btn = document.getElementById('toggle-select');
        if (btn) btn.textContent = 'Select';
        updateBulkBar();
        loadAndDisplayGems();
      });
    });
  });
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

/**
 * Placeholder renderer while the Galaxy view is under construction.
 */
function renderGalaxyPlaceholder(): void {
  const container = document.getElementById('skill-crystal');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 20px;text-align:center;color:#475569;">
      <div style="font-size:42px;">🛠️</div>
      <div style="font-size:18px;font-weight:700;">Galaxy view is loading</div>
      <div style="font-size:14px;max-width:420px;line-height:1.6;color:#64748b;">
        The dynamic network visualization is under construction. Stay tuned for a live force-directed skill map soon.
      </div>
    </div>
  `;
}

/**
 * Renders the Galaxy view (will be replaced with the actual implementation).
 */
function renderGalaxyView(): void {
  const container = document.getElementById('skill-crystal');
  if (!container) return;

  renderSkillGalaxy(container, skillGalaxy, {
    height: 520,
  });
}

/**
 * Renders the Word Cloud view using d3-cloud.
 */
function renderWordCloudView(): void {
  const container = document.getElementById('skill-crystal');
  if (!container) return;

  // Combine all skills from hard and soft with their counts
  const wordData: WordCloudData[] = [];
  
  skillData.hard.forEach((count, skill) => {
    wordData.push({ text: skill, size: 10 + count * 10 });
  });
  
  skillData.soft.forEach((count, skill) => {
    wordData.push({ text: skill, size: 10 + count * 10 });
  });

  renderWordCloud(container, wordData, {
    height: 520,
  });
}
