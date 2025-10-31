import * as d3 from 'd3';
import cloud from 'd3-cloud';

export interface WordCloudData {
  text: string;
  size: number;
}

export interface WordCloudRenderOptions {
  width?: number;
  height?: number;
}

/**
 * Renders a word cloud visualization using d3-cloud
 */
export function renderWordCloud(
  container: HTMLElement,
  words: WordCloudData[],
  options: WordCloudRenderOptions = {}
): void {
  // Clear previous content
  container.innerHTML = '';

  const width = options.width ?? Math.max(container.clientWidth || 0, 800);
  const height = options.height ?? Math.max(container.clientHeight || 0, 600);

  if (words.length === 0) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;gap:12px;color:#475569;height:${height}px;">
        <div style="font-size:40px;">☁️</div>
        <div style="font-size:18px;font-weight:600;">No skills to visualize</div>
        <p style="font-size:14px;line-height:1.6;color:#64748b;max-width:360px;text-align:center;">
          Feed your pet more job descriptions to see a word cloud of your skills.
        </p>
      </div>
    `;
    return;
  }

  // Create SVG
  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('font-family', "'Inter', 'SF Pro Display', 'Segoe UI', sans-serif");

  const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

  // Color scale - using a variety of colors like the demo
  const colors = d3.scaleOrdinal(d3.schemeCategory10);

  // Create word cloud layout
  const layout = cloud()
    .size([width, height])
    .words(words.map((d) => ({ text: d.text, size: d.size })))
    .padding(5)
    .rotate(() => (~~(Math.random() * 6) - 3) * 30) // Random rotation: -90, -60, -30, 0, 30, 60, 90
    .font('Impact')
    .fontSize((d: any) => d.size)
    .on('end', draw);

  layout.start();

  function draw(words: any[]) {
    g.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', (d: any) => `${d.size}px`)
      .style('font-family', 'Impact')
      .style('fill', (_d: any, i: number) => colors(i.toString()))
      .attr('text-anchor', 'middle')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .text((d: any) => d.text);
  }
}

