import * as d3 from 'd3';
import type { D3DragEvent } from 'd3';

import { SkillGalaxyData, SkillLink, SkillNode } from '../types/dashboard';

type PositionedNode = SkillNode &
  d3.SimulationNodeDatum & {
    fontSize?: number;
    radius?: number;
  };

type PositionedLink = d3.SimulationLinkDatum<PositionedNode> & {
  strength: number;
  sourceId: string;
  targetId: string;
};

export interface SkillGalaxyRenderOptions {
  width?: number;
  height?: number;
  devicePixelRatio?: number;
}

const HARD_COLOR = '#4c6ef5';
const SOFT_COLOR = '#f59f00';
const HOVER_RING = '#0ea5e9';
const LINK_COLOR = 'rgba(148, 163, 184, 0.55)';
const TEXT_COLOR = '#0f172a';

export function renderSkillGalaxy(
  container: HTMLElement,
  data: SkillGalaxyData,
  options: SkillGalaxyRenderOptions = {}
): void {
  const previousCleanup = (container as unknown as { __galaxyCleanup?: () => void }).__galaxyCleanup;
  if (typeof previousCleanup === 'function') {
    previousCleanup();
  }

  container.innerHTML = '';

  const nodes: PositionedNode[] = data.nodes.map((node: SkillNode) => ({ ...node }));
  const links: PositionedLink[] = data.links.map((link: SkillLink) => ({
    ...link,
    sourceId: link.source,
    targetId: link.target,
  }));

  const neighborMap = new Map<string, Set<string>>();
  links.forEach((link) => {
    const sourceId = link.sourceId;
    const targetId = link.targetId;
    if (!neighborMap.has(sourceId)) neighborMap.set(sourceId, new Set());
    if (!neighborMap.has(targetId)) neighborMap.set(targetId, new Set());
    neighborMap.get(sourceId)!.add(targetId);
    neighborMap.get(targetId)!.add(sourceId);
  });

  if (nodes.length === 0) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;gap:12px;color:#475569;">
        <div style="font-size:40px;">💤</div>
        <div style="font-size:18px;font-weight:600;">Galaxy view needs more gems</div>
        <p style="font-size:14px;line-height:1.6;color:#64748b;max-width:360px;">
          Feed your pet a few more job descriptions to unlock the dynamic skill network.
        </p>
      </div>
    `;
    return;
  }

  const fallbackWidth = Math.max(container.clientWidth || 0, 640);
  const fallbackHeight = Math.max(container.clientHeight || 0, 480);
  const width = options.width ?? fallbackWidth;
  const height = options.height ?? fallbackHeight;
  const pixelRatio = options.devicePixelRatio ?? window.devicePixelRatio ?? 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';
  canvas.style.margin = '0 auto';
  canvas.style.borderRadius = '18px';
  canvas.style.background = 'radial-gradient(circle at 25% 25%, rgba(148, 163, 184, 0.12), transparent 70%)';
  canvas.style.boxShadow = 'inset 0 1px 6px rgba(15, 23, 42, 0.08)';
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'default';

  const context = canvas.getContext('2d');
  if (!context) {
    container.textContent = 'Canvas rendering is not supported in this browser.';
    return;
  }

  const ctx = context;
  ctx.scale(pixelRatio, pixelRatio);
  container.appendChild(canvas);

  const maxCount = d3.max(nodes, (node: PositionedNode) => node.count) ?? 1;
  const minCount = d3.min(nodes, (node: PositionedNode) => node.count) ?? 1;

  const fontScale = d3
    .scaleSqrt()
    .domain([minCount, maxCount])
    .range([13, 28])
    .clamp(true);

  nodes.forEach((node: PositionedNode) => {
    const fontSize = fontScale(node.count);
    node.fontSize = fontSize;
    node.radius = fontSize * 0.65 + 10;
  });

  const linkForce = d3
    .forceLink<PositionedNode, PositionedLink>(links)
    .id((node: PositionedNode) => node.id)
    .distance((link: PositionedLink) => {
      const strength = Math.max(link.strength, 1);
      return 110 - Math.min(strength * 12, 60);
    })
    .strength((link: PositionedLink) => 0.05 + Math.min(link.strength, 8) * 0.05);

  const simulation = d3
    .forceSimulation(nodes)
    .force('link', linkForce)
    .force(
      'charge',
      d3
        .forceManyBody<PositionedNode>()
        .strength((node: PositionedNode) => -60 - (node.radius ?? 18) * 1.2)
    )
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collision',
      d3.forceCollide<PositionedNode>().radius((node: PositionedNode) => (node.radius ?? 18) + 6)
    )
    .alpha(0.9)
    .alphaMin(0.05)
    .on('tick', ticked);

  const selection = d3.select<HTMLCanvasElement, unknown>(canvas);

  let hovered: PositionedNode | null = null;
  let isDragging = false;

  let draggedNode: PositionedNode | null = null;

  selection.call(
    d3
      .drag<HTMLCanvasElement, unknown>()
      .on('start', (event: D3DragEvent<HTMLCanvasElement, unknown, unknown>) => {
        const [x, y] = d3.pointer(event, canvas);
        const target = findNodeAt(x, y);
        if (!target) return;
        draggedNode = target;
        isDragging = true;
        canvas.style.cursor = 'grabbing';
        if (!event.active) simulation.alphaTarget(0.25).restart();
        target.fx = target.x;
        target.fy = target.y;
      })
      .on('drag', (event: D3DragEvent<HTMLCanvasElement, unknown, unknown>) => {
        if (!draggedNode) return;
        const [x, y] = d3.pointer(event, canvas);
        draggedNode.fx = x;
        draggedNode.fy = y;
      })
      .on('end', (event: D3DragEvent<HTMLCanvasElement, unknown, unknown>) => {
        if (!draggedNode) return;
        draggedNode.fx = null;
        draggedNode.fy = null;
        draggedNode = null;
        isDragging = false;
        if (!event.active) simulation.alphaTarget(0);
        canvas.style.cursor = hovered ? 'pointer' : 'default';
      })
  );

  const handleMouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    const target = findNodeAt(x, y);
    if (hovered !== target) {
      hovered = target;
      canvas.style.cursor = hovered ? 'pointer' : isDragging ? 'grabbing' : 'default';
      canvas.title = hovered
        ? `${hovered.id} · seen in ${hovered.count} job${hovered.count > 1 ? 's' : ''}`
        : '';
      draw();
    }
  };

  const handleMouseLeave = () => {
    hovered = null;
    canvas.style.cursor = 'default';
    canvas.title = '';
    draw();
  };

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  draw();

  function ticked() {
    draw();
  }

  function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = LINK_COLOR;
    links.forEach((link: PositionedLink) => {
      const source = link.source as PositionedNode | undefined;
      const target = link.target as PositionedNode | undefined;
      if (!source || !target || source.x == null || target.x == null || source.y == null || target.y == null) {
        return;
      }
      const connectsHovered = hovered
        ? source === hovered || target === hovered || link.sourceId === hovered.id || link.targetId === hovered.id
        : false;
      ctx.globalAlpha = hovered ? (connectsHovered ? 0.85 : 0.12) : 0.45;
      ctx.strokeStyle = connectsHovered ? withAlpha(HOVER_RING, 0.9) : LINK_COLOR;
      ctx.lineWidth = connectsHovered ? 1.8 : 1 + Math.min(link.strength, 6) * 0.1;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });
    ctx.restore();

    nodes.forEach((node: PositionedNode) => {
      if (node.x == null || node.y == null) return;
      const radius = node.radius ?? 18;
      const isActive = hovered === node;
      const isNeighbor = hovered ? neighborMap.get(hovered.id)?.has(node.id) ?? false : false;

      const baseColor = node.type === 'hard' ? HARD_COLOR : SOFT_COLOR;
      const fillAlpha = hovered ? (isActive ? 0.35 : isNeighbor ? 0.22 : 0.08) : 0.18;
      ctx.beginPath();
      ctx.fillStyle = withAlpha(baseColor, fillAlpha);
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = HOVER_RING;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (isNeighbor) {
        ctx.strokeStyle = withAlpha(baseColor, 0.45);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const dimText = hovered && !isActive && !isNeighbor;
      ctx.fillStyle = dimText ? withAlpha(TEXT_COLOR, 0.55) : TEXT_COLOR;
      ctx.font = `600 ${node.fontSize ?? 16}px 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.id, node.x, node.y);
    });

    if (hovered && hovered.x != null && hovered.y != null) {
      const label = `${hovered.id} · ${hovered.count} mention${hovered.count > 1 ? 's' : ''}`;
      const padding = 8;
      ctx.font = `600 14px 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;
      const metrics = ctx.measureText(label);
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = 26;
      const baseX = Math.min(Math.max((hovered.x ?? 0) + 18, padding), width - boxWidth - padding);
      const baseY = Math.min(
        Math.max((hovered.y ?? 0) - (hovered.radius ?? 20) - boxHeight - 8, padding),
        height - boxHeight - padding
      );

      ctx.beginPath();
      drawRoundedRect(ctx, baseX, baseY, boxWidth, boxHeight, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, baseX + boxWidth / 2, baseY + boxHeight / 2 + 0.5);
    }
  }

  function findNodeAt(x: number, y: number): PositionedNode | null {
    let closest: PositionedNode | null = null;
    let minDistance = Infinity;
    nodes.forEach((node: PositionedNode) => {
      if (node.x == null || node.y == null) return;
      const radius = (node.radius ?? 18) + 6;
      const dx = x - node.x;
      const dy = y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius && distance < minDistance) {
        closest = node;
        minDistance = distance;
      }
    });
    return closest;
  }

  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const bigint = Number.parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const clamped = Math.min(Math.max(alpha, 0), 1);
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  const cleanup = () => {
    simulation.stop();
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    selection.on('.drag', null);
  };

  (container as unknown as { __galaxyCleanup?: () => void }).__galaxyCleanup = cleanup;
}

