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
    .padding(2) // Tighter padding for more compact layout
    .rotate(() => {
      // More horizontal bias: 0°, ±15°, ±30°, ±45° (avoid 90°)
      const angles = [-45, -30, -15, 0, 0, 0, 15, 30, 45];
      return angles[~~(Math.random() * angles.length)];
    })
    .font('Impact')
    .fontSize((d: any) => d.size)
    .spiral('archimedean') // Explicitly use archimedean spiral for tighter packing
    .on('end', draw);

  layout.start();

  function draw(words: any[]) {
    const texts = g
      .selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', (d: any) => `${d.size}px`)
      .style('font-family', 'Impact')
      .style('fill', (_d: any, i: number) => colors(i.toString()))
      .attr('text-anchor', 'middle')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .style('opacity', 0) // Start invisible for animation
      .text((d: any) => d.text);

    // Animate words appearing one by one
    texts
      .transition()
      .duration(600)
      .delay((_d: any, i: number) => i * 30) // Stagger animation
      .style('opacity', 1)
      .ease(d3.easeQuadOut);
  }
}

