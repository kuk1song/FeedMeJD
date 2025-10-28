let currentView = "constellation";
let skillData = { hard: /* @__PURE__ */ new Map(), soft: /* @__PURE__ */ new Map() };
document.addEventListener("DOMContentLoaded", () => {
  loadAndDisplayGems();
  setupViewSwitcher();
});
function setupViewSwitcher() {
  const constellationBtn = document.getElementById("constellation-view-btn");
  const prismBtn = document.getElementById("prism-view-btn");
  constellationBtn.addEventListener("click", () => {
    if (currentView !== "constellation") {
      currentView = "constellation";
      constellationBtn.classList.add("active");
      prismBtn.classList.remove("active");
      renderCurrentView();
    }
  });
  prismBtn.addEventListener("click", () => {
    if (currentView !== "prism") {
      currentView = "prism";
      prismBtn.classList.add("active");
      constellationBtn.classList.remove("active");
      renderCurrentView();
    }
  });
}
function loadAndDisplayGems() {
  chrome.storage.local.get(null, (items) => {
    const gemEntries = Object.entries(items).filter(([key]) => key.startsWith("gem_"));
    const gemsGrid = document.getElementById("gems-grid");
    const skillCrystalContainer = document.getElementById("skill-crystal");
    if (gemEntries.length === 0) {
      skillData = { hard: /* @__PURE__ */ new Map(), soft: /* @__PURE__ */ new Map() };
      if (gemsGrid) gemsGrid.innerHTML = "";
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
    displayGemCards(gemEntries);
    skillData = aggregateSkills(gemEntries);
    renderCurrentView();
  });
}
function aggregateSkills(gemEntries) {
  const hard = /* @__PURE__ */ new Map();
  const soft = /* @__PURE__ */ new Map();
  gemEntries.forEach(([_, gemData]) => {
    gemData.skills.hard.forEach((skill) => {
      const normalized = skill.toLowerCase().trim();
      hard.set(normalized, (hard.get(normalized) || 0) + 1);
    });
    gemData.skills.soft.forEach((skill) => {
      const normalized = skill.toLowerCase().trim();
      soft.set(normalized, (soft.get(normalized) || 0) + 1);
    });
  });
  return { hard, soft };
}
function renderCurrentView() {
  if (currentView === "constellation") {
    renderConstellationView();
  } else {
    renderPrismView();
  }
}
function renderConstellationView() {
  const container = document.getElementById("skill-crystal");
  container.innerHTML = "";
  const cloudContainer = document.createElement("div");
  cloudContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 20px;
    width: 100%;
  `;
  const allSkills = [];
  skillData.hard.forEach((count, skill) => allSkills.push([skill, count, "hard"]));
  skillData.soft.forEach((count, skill) => allSkills.push([skill, count, "soft"]));
  allSkills.sort((a, b) => b[1] - a[1]);
  const topSkills = allSkills.slice(0, 30);
  topSkills.forEach(([skill, count, type]) => {
    const skillElement = document.createElement("span");
    const fontSize = Math.min(14 + count * 3, 32);
    const baseColor = type === "hard" ? "#667eea" : "#ffa500";
    const bgColor = type === "hard" ? "rgba(102, 126, 234, 0.1)" : "rgba(255, 165, 0, 0.1)";
    skillElement.textContent = skill;
    skillElement.title = `${skill}: Found in ${count} job${count > 1 ? "s" : ""} (${type === "hard" ? "Hard Skill" : "Soft Skill"})`;
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
    skillElement.addEventListener("mouseenter", () => {
      skillElement.style.transform = "scale(1.1)";
      skillElement.style.boxShadow = `0 4px 12px ${type === "hard" ? "rgba(102, 126, 234, 0.3)" : "rgba(255, 165, 0, 0.3)"}`;
    });
    skillElement.addEventListener("mouseleave", () => {
      skillElement.style.transform = "scale(1)";
      skillElement.style.boxShadow = "none";
    });
    cloudContainer.appendChild(skillElement);
  });
  container.appendChild(cloudContainer);
}
function renderPrismView() {
  const container = document.getElementById("skill-crystal");
  container.innerHTML = "";
  const prismContainer = document.createElement("div");
  prismContainer.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    width: 100%;
    padding: 20px;
  `;
  const hardSection = createPrismSection(
    "Hard Skills",
    Array.from(skillData.hard.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15),
    "#667eea"
  );
  const softSection = createPrismSection(
    "Soft Skills",
    Array.from(skillData.soft.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15),
    "#ffa500"
  );
  prismContainer.appendChild(hardSection);
  prismContainer.appendChild(softSection);
  container.appendChild(prismContainer);
}
function createPrismSection(title, skills, color) {
  const section = document.createElement("div");
  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    color: ${color};
    font-size: 20px;
    margin-bottom: 16px;
    text-align: left;
  `;
  const skillList = document.createElement("div");
  skillList.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  const maxCount = skills.length > 0 ? skills[0][1] : 1;
  skills.forEach(([skill, count], index) => {
    const skillItem = document.createElement("div");
    const percentage = count / maxCount * 100;
    skillItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
    `;
    const rank = document.createElement("span");
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
    const barContainer = document.createElement("div");
    barContainer.style.cssText = `
      flex: 1;
      position: relative;
      height: 32px;
      background: rgba(0,0,0,0.05);
      border-radius: 16px;
      overflow: hidden;
    `;
    const bar = document.createElement("div");
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
    const skillName = document.createElement("span");
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
    const countBadge = document.createElement("span");
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
    skillItem.addEventListener("mouseenter", () => {
      skillItem.style.background = "rgba(0,0,0,0.02)";
      skillItem.style.transform = "translateX(4px)";
    });
    skillItem.addEventListener("mouseleave", () => {
      skillItem.style.background = "transparent";
      skillItem.style.transform = "translateX(0)";
    });
    skillList.appendChild(skillItem);
  });
  section.appendChild(titleEl);
  section.appendChild(skillList);
  return section;
}
function createSkillTags(skills, limit = 8) {
  const container = document.createElement("div");
  container.className = "skill-tags";
  skills.forEach((skill, index) => {
    const tag = document.createElement("span");
    tag.className = "skill-tag";
    tag.textContent = skill;
    if (index >= limit) {
      tag.style.display = "none";
      tag.dataset.hidden = "true";
    }
    container.appendChild(tag);
  });
  if (skills.length > limit) {
    const remaining = skills.length - limit;
    const moreBtn = document.createElement("span");
    moreBtn.className = "skill-tag more-toggle";
    moreBtn.textContent = `+${remaining} more`;
    moreBtn.style.cursor = "pointer";
    moreBtn.dataset.expanded = "false";
    moreBtn.addEventListener("click", () => {
      const expanded = moreBtn.dataset.expanded === "true";
      const hiddenTags = Array.from(container.querySelectorAll('.skill-tag[data-hidden="true"]'));
      if (expanded) {
        hiddenTags.forEach((tag) => {
          tag.style.display = "none";
        });
        moreBtn.textContent = `+${remaining} more`;
        moreBtn.dataset.expanded = "false";
      } else {
        hiddenTags.forEach((tag) => {
          tag.style.display = "inline-flex";
        });
        moreBtn.textContent = "Show less";
        moreBtn.dataset.expanded = "true";
      }
    });
    container.appendChild(moreBtn);
  }
  return container;
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
  card.dataset.gemId = gemId;
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-gem-btn";
  deleteBtn.innerHTML = "×";
  deleteBtn.title = "Delete this gem";
  deleteBtn.addEventListener("click", () => deleteGem(gemId, card));
  const cardContent = document.createElement("div");
  cardContent.innerHTML = `
    <div class="gem-header">
      <img src="images/gem.png" alt="Gem" class="gem-icon">
      <span class="gem-title">${gemId}</span>
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
  const hardMount = cardContent.querySelector("[data-skill-hard]");
  const softMount = cardContent.querySelector("[data-skill-soft]");
  hardMount.replaceWith(createSkillTags(gem.skills.hard, 8));
  softMount.replaceWith(createSkillTags(gem.skills.soft, 8));
  card.appendChild(deleteBtn);
  card.appendChild(cardContent);
  return card;
}
async function deleteGem(gemId, cardElement) {
  const confirmed = await showConfirmModal("Delete this gem?", "This action cannot be undone.");
  if (!confirmed) return;
  cardElement.classList.add("is-deleting");
  setTimeout(() => {
    chrome.storage.local.get([gemId, "analyzedJobs"], (items) => {
      const gem = items[gemId];
      const analyzedJobs = items["analyzedJobs"] || [];
      const jobId = gem?.meta?.jobId;
      chrome.storage.local.remove(gemId, () => {
        console.log(`FeedMeJD: Deleted gem ${gemId}`);
        if (jobId) {
          const updated = analyzedJobs.filter((id) => id !== jobId);
          chrome.storage.local.set({ analyzedJobs: updated }, () => {
            console.log(`FeedMeJD: Removed job ${jobId} from analyzedJobs after gem deletion.`);
            loadAndDisplayGems();
          });
        } else {
          loadAndDisplayGems();
        }
      });
    });
  }, 300);
}
function showConfirmModal(title, message) {
  const overlay = document.getElementById("confirm-overlay");
  if (!overlay) {
    return Promise.resolve(window.confirm(`${title}
${message}`));
  }
  const titleEl = overlay.querySelector(".modal-title");
  const msgEl = overlay.querySelector(".modal-message");
  const okBtn = document.getElementById("confirm-ok");
  const cancelBtn = document.getElementById("confirm-cancel");
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => {
    const cleanup = () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      if (okBtn) okBtn.removeEventListener("click", onOk);
      if (cancelBtn) cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKey);
    };
    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onOverlayClick = (e) => {
      if (e.target === overlay) {
        onCancel();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    if (okBtn) okBtn.addEventListener("click", onOk);
    if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKey);
    if (okBtn) setTimeout(() => okBtn.focus(), 0);
  });
}
