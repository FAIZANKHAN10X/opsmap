const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'graphify-out', 'graph.html');

if (!fs.existsSync(targetPath)) {
  console.error(`Error: Could not find ${targetPath}`);
  console.error('Make sure you run "graphify" first to generate the graph.');
  process.exit(1);
}

let content = fs.readFileSync(targetPath, 'utf8');

// 1. Disable synchronous stabilization
content = content.replace(
  /stabilization:\s*\{\s*iterations:\s*\d+,\s*fit:\s*true\s*\}/g,
  'stabilization: false'
);

// 2. Change event listener to wait for natural stabilization
content = content.replace(
  /network\.once\('stabilizationIterationsDone'/g,
  "network.once('stabilized'"
);

// 3. Disable curved edges for massive performance boost
content = content.replace(
  /edges:\s*\{\s*smooth:\s*\{[^}]+\},\s*selectionWidth:\s*3\s*\}/g,
  'edges: { smooth: false, selectionWidth: 3 }'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ Successfully patched graphify-out/graph.html for smooth performance.');

// 4. Rebuild the 3D viewer from the freshly patched graph
require('./build-graph-3d').build();
