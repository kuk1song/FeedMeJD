# Performance Optimization Backlog

This note tracks deferred performance items for the LinkedIn experience. It complements the main project plan. Update this list as items move forward.

## Quick Wins – Ready to Ship (Low Risk)

- Content: Pre-click recheck to prevent duplicate analysis
  - On `handlePetClick()`, if `currentJobId` is in in-memory `analyzedJobsCache`, skip analysis and open Dashboard.
  - Outcome: Removes accidental duplicate gems and wasted prompts.

- Content: `runLogic()` early return
  - Keep `lastJobId` (optionally with `hasJD`) signature; if unchanged, do nothing on observer ticks.
  - Outcome: Fewer unnecessary DOM reads/state flips; smoother scrolling.

- Content: Preload pet state images
  - Preload `pet-idle.png`, `pet-hungry.png`, `pet-eating.png`, `pet-done.png` on injection.
  - Outcome: Snappier state transitions; zero layout jank.

- Dashboard: Search debounce + batch DOM insert
  - Debounce search input (≈200ms) and render lists via `DocumentFragment` to minimize reflow.
  - Outcome: Smoother typing and rendering with many gems/skills.

## Phase 2 – Pending State Hardening

- **Problem**: When the LinkedIn SPA swaps jobs, the pet briefly shows `hungry` before metadata finishes loading. Users can click during this window and trigger a duplicate analysis.
- **Status**: Initial attempt (adding `pending` UI disable) was reverted due to incomplete coverage; current code is clean and safe to revisit later.
- **Next Steps**:
  - Reintroduce a dedicated `pending` state that locks the UI until both `jobId` and `isJobAnalyzed` resolve.
  - Audit `updateStateBasedOnJD()` to keep `disabled` until the pending check completes.
  - Regression test: rapid-switch between analyzed and unanalyzed jobs should never trigger a second analysis.

## Phase 3 – Background Throughput Improvements *(deferred)*

- **Goal**: Reduce JD digestion latency without改变 outputs。
- **Current Status**: 第一版（JD 清洗 + 会话复用）在体验上收益不明显，已回滚，等待更精确的测量与策略调整。
- **Revisit Checklist**:
  - 为 prompt 执行加上 `console.time` 等耗时指标，收集真实 latency。
  - 观察 Service Worker 生命周期，确认 session 复用是否因为 SW 回收而失效；必要时延长 idle timeout 或引入 keep-alive。
  - 决定是否保留文本清洗（收益 vs 成本），或仅压缩空白、不截断长度。
  - 评估是否需要在内容脚本侧串联/队列化请求，提升复用命中率。
- **候选方案库（调研自业内实践）**:
  - 缓存已分析 JD（基于内容 hash）直接返回历史结果。
  - 过滤 JD 中的福利/法律声明等低价值段落，仅发送核心职责与要求。
  - 队列化或合并短时间内的多次分析请求，保证只对最新 JD 推理。
  - 根据设备性能自适应 prompt 长度以及 session 超时设置。
- **重启条件**: 当有时间投入基准测试与日志分析，确认可以衡量收益时再恢复实施。

## Phase 4 – Storage and Error Hardening

- Guard against duplicate gems by deduplicating on `(jobId, digestHash)` before persisting.
- Wrap storage writes in `try/catch` to avoid partial saves leaving inconsistent state.
- Add structured logging (dev-only) for session lifecycle and observer hits to support future profiling.

## Deferred / Out of Scope

- Fake “constant duration” eating animation (rejected: breaks state alignment).
- Pre-downloading Gemini Nano (revisit only if Chrome stabilizes API lifecycle guarantees).
- 重塑架构或引入繁重缓存索引：当前需求不需要，风险高于收益。
- 提前响应再异步保存：容易造成“UI done 但没保存成功”的一致性问题，暂不考虑。

## Research Backlog

- 缓存策略：JD 内容 hash + 结果复用。
- 差分分析：针对同一 JD 的轻微修改只处理差异段。
- Streaming/Partial 输出：待 `chrome.ai` 提供流式接口后评估。
- 端云协同：本地初步分析 + 云端高精度校正（需隐私方案时再立项）。

