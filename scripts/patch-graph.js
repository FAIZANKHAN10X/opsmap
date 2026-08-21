const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'graphify-out', 'graph.html');

if (!fs.existsSync(targetPath)) {
  console.error(`Error: Could not find ${targetPath}`);
  console.error('Make sure you run "graphify" first to generate the graph.');
  process.exit(1);
}

let content = fs.readFileSync(targetPath, 'utf8');
let patched = false;

// 1. Replace heavy forceAtlas2Based physics with lightweight barnesHut for smooth 60fps
//    - barnesHut is O(n log n) vs forceAtlas2Based O(n²)
//    - avoidOverlap 0.8 is extremely expensive at 1699 nodes — set to 0
//    - lower springConstant/damping for stable, non-jittery layout
const physicsRegex = /physics:\s*\{\s*enabled:\s*true,\s*solver:\s*'forceAtlas2Based',\s*forceAtlas2Based:\s*\{[^}]+\},\s*stabilization:\s*(?:false|\{[^}]+\})\s*,?\s*\}/s;
if (physicsRegex.test(content)) {
  content = content.replace(
    physicsRegex,
    `physics: {
    enabled: true,
    solver: 'barnesHut',
    barnesHut: {
      gravitationalConstant: -8000,
      centralGravity: 0.3,
      springLength: 95,
      springConstant: 0.04,
      damping: 0.09,
      avoidOverlap: 0,
    },
    stabilization: false,
  }`
  );
  patched = true;
} else {
  // Fallback: just ensure stabilization false
  const before = content;
  content = content.replace(
    /stabilization:\s*\{\s*iterations:\s*\d+,\s*fit:\s*true\s*\}/g,
    'stabilization: false'
  );
  if (content !== before) patched = true;
}

// 2. Change event listener to wait for natural stabilization (works with stabilization:false)
if (content.includes("network.once('stabilizationIterationsDone'")) {
  content = content.replace(
    /network\.once\('stabilizationIterationsDone'/g,
    "network.once('stabilized'"
  );
  patched = true;
}

// 3. Disable curved edges for massive performance boost (continuous → straight)
if (content.includes("smooth: { type: 'continuous'")) {
  content = content.replace(
    /edges:\s*\{\s*smooth:\s*\{[^}]+\},\s*selectionWidth:\s*3\s*\}/g,
    'edges: { smooth: false, selectionWidth: 3 }'
  );
  patched = true;
}

// 4. Ensure hideEdgesOnDrag stays true and add hideNodesOnDrag false explicitly
if (!content.includes('hideEdgesOnDrag: true')) {
  content = content.replace(
    /interaction:\s*\{/,
    'interaction: {\n    hideEdgesOnDrag: true,\n    hideNodesOnDrag: false,'
  );
  patched = true;
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ Successfully patched graphify-out/graph.html for smooth performance.');
