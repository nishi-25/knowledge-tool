import mermaid from 'mermaid';

let initialized = false;
function ensureInit() {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: "'Zen Maru Gothic', 'Inter', sans-serif",
    });
    initialized = true;
  }
}

function constrainSvgWidth(container) {
  container.querySelectorAll('svg').forEach((svg) => {
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
    svg.removeAttribute('width');
  });
}

export async function renderMermaidIn(container) {
  if (!container) return;
  ensureInit();
  const nodes = Array.from(container.querySelectorAll('.mermaid')).filter((n) => !n.getAttribute('data-processed'));
  if (nodes.length === 0) return;
  try {
    await mermaid.run({ nodes });
    nodes.forEach(constrainSvgWidth);
  } catch (e) {
    nodes.forEach((n) => {
      n.setAttribute('data-processed', 'true');
      n.innerHTML = '<div style="color:var(--danger);font-size:0.8rem;">図の構文にエラーがあります</div>';
    });
  }
}

let previewCounter = 0;
export async function renderMermaidPreview(source) {
  ensureInit();
  previewCounter += 1;
  const { svg } = await mermaid.render(`kv-mermaid-preview-${previewCounter}`, source);
  return svg;
}

export function encodeMermaidSource(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

export function decodeMermaidSource(encoded) {
  return decodeURIComponent(escape(atob(encoded)));
}
