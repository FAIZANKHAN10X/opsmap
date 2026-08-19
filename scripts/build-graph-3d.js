const fs = require('fs');
const path = require('path');

const GRAPH_DIR = path.join(__dirname, '..', 'graphify-out');
const GRAPH_JSON = path.join(GRAPH_DIR, 'graph.json');
const GRAPH_HTML = path.join(GRAPH_DIR, 'graph.html');
const OUT_HTML = path.join(GRAPH_DIR, 'graph-3d.html');

const PALETTE = ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7', '#9C755F', '#BAB0AC'];

function escJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function extractLegend(html) {
  const m = html.match(/const LEGEND = (\[[^\]]*\]);/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function fallbackLegend(graphData) {
  const counts = {};
  const names = {};
  graphData.nodes.forEach((n) => {
    counts[n.community] = (counts[n.community] || 0) + 1;
    names[n.community] = n.community_name;
  });
  return Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((cid) => ({
      cid,
      color: PALETTE[cid % PALETTE.length],
      label: names[cid] || 'community ' + cid,
      count: counts[cid],
    }));
}

function buildHtml(data) {
  const viewer = String.raw`(function(){
  var DATA = { nodes: __NODES__, links: __LINKS__, legend: __LEGEND__, commit: __COMMIT__ };

  function esc(s){
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function webglOk(){
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  function fatal(msg){
    var fb = document.createElement('div');
    fb.id = 'webgl-fallback';
    fb.innerHTML = '<p><b>3D graph unavailable</b></p><p>' + msg + '</p><p>Open the <a href="graph.html">2D interactive graph</a> instead.</p>';
    document.body.appendChild(fb);
  }
  if (!webglOk()){ fatal('WebGL is not enabled in this browser.'); return; }
  if (!window.ForceGraph3D){ fatal('The 3D engine failed to load (network blocked?).'); return; }

  var degree = {};
  DATA.links.forEach(function(l){ degree[l.source] = (degree[l.source] || 0) + 1; degree[l.target] = (degree[l.target] || 0) + 1; });
  var nodeById = {};
  DATA.nodes.forEach(function(n){ n.degree = degree[n.id] || 0; nodeById[n.id] = n; });

  var legendByCid = {};
  DATA.legend.forEach(function(l){ legendByCid[l.cid] = l; });

  var commCount = DATA.legend.length;
  var phi = Math.PI * (3 - Math.sqrt(5));
  var centers = {};
  var slot = {};
  DATA.legend.forEach(function(c, i){
    var y = 1 - (i / Math.max(1, commCount - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = phi * i;
    var R = 150;
    centers[c.cid] = { x: Math.cos(th) * r * R, y: y * R, z: Math.sin(th) * r * R };
    slot[c.cid] = 0;
  });
  function fibSphere(i, n, radius){
    if (n === 1) return { x: 0, y: 0, z: 0 };
    var y = 1 - (i / (n - 1)) * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = phi * i;
    return { x: Math.cos(th) * r * radius, y: y * radius, z: Math.sin(th) * r * radius };
  }
  DATA.nodes.forEach(function(n){
    var cid = legendByCid[n.community] ? n.community : 0;
    var count = legendByCid[cid].count || 1;
    var p = fibSphere(slot[cid], count, 14 + Math.sqrt(count) * 2.2);
    slot[cid] = slot[cid] + 1;
    n.tx = centers[cid].x + p.x;
    n.ty = centers[cid].y + p.y;
    n.tz = centers[cid].z + p.z;
  });

  function colorOf(n){
    var c = legendByCid[n.community];
    return c ? c.color : __PALETTE__[n.community % __PALETTE__.length];
  }
  function nodeRadius(n){ return 1.3 + Math.log2(n.degree + 1) * 0.38; }

  function centroidForce(targets, strength){
    var nodes;
    function force(alpha){
      for (var i = 0; i < nodes.length; i++){
        var n = nodes[i];
        var t = targets[n.id];
        if (!t) continue;
        var k = strength * alpha;
        n.vx += (t.x - n.x) * k;
        n.vy += (t.y - n.y) * k;
        n.vz += (t.z - n.z) * k;
      }
    }
    force.initialize = function(ns){ nodes = ns; };
    return force;
  }

  var checked = {};
  DATA.legend.forEach(function(c){ checked[c.cid] = true; });
  function isChecked(cid){ return checked[cid] !== false; }
  function linkVisible(l){
    var s = nodeById[l.source], t = nodeById[l.target];
    if (!s || !t) return false;
    return isChecked(s.community) && isChecked(t.community);
  }

  var matMap = {};
  var Graph = ForceGraph3D()(document.getElementById('graph'))
    .graphData({ nodes: DATA.nodes, links: DATA.links })
    .backgroundColor('#0f0f1a')
    .showNavInfo(false)
    .enableNodeDrag(false)
    .nodeOpacity(1)
    .nodeResolution(10)
    .linkOpacity(0.35)
    .linkWidth(function(l){ return 0.5 + Math.min(1.5, (l.weight || 1) * 0.1); })
    .linkLabel(function(l){ return esc(l.relation || 'connected') + ' · weight ' + (l.weight || 1); })
    .nodeLabel(function(n){
      var c = legendByCid[n.community];
      return '<b>' + esc(n.label) + '</b><br>' + esc(n.source_file || '') + '<br>degree ' + n.degree + ' · ' + esc(c ? c.label : '?');
    })
    .nodeThreeObject(function(n){
      var m = new THREE.MeshBasicMaterial({ color: colorOf(n), transparent: true, opacity: isChecked(n.community) ? 1 : 0.06 });
      matMap[n.id] = m;
      return new THREE.Mesh(new THREE.SphereGeometry(nodeRadius(n), 12, 12), m);
    })
    .linkVisibility(linkVisible)
    .onNodeClick(showNode)
    .onNodeHover(onNodeHover)
    .onBackgroundClick(clearSelection)
    .cooldownTicks(280)
    .warmupTicks(0)
    .onEngineStop(engineStopped);

  var targets = {};
  DATA.nodes.forEach(function(n){ targets[n.id] = { x: n.tx, y: n.ty, z: n.tz }; });
  Graph.d3Force('centroid', centroidForce(targets, 0.12));

  var hoverNode = null;
  var hlSet = {};
  function onNodeHover(n){
    hoverNode = n;
    hlSet = {};
    if (n){
      hlSet[n.id] = true;
      DATA.links.forEach(function(l){
        if (l.source === n.id) hlSet[l.target] = true;
        if (l.target === n.id) hlSet[l.source] = true;
      });
    }
    paint();
  }
  function paint(){
    DATA.nodes.forEach(function(n){
      var m = matMap[n.id];
      if (!m) return;
      var base = isChecked(n.community) ? 1 : 0.06;
      if (hoverNode && !hlSet[n.id]) m.opacity = base * 0.16;
      else m.opacity = base;
    });
  }
  function applyFilter(){
    Graph.refresh();
    paint();
  }

  function neighborsOf(n){
    var out = [];
    DATA.links.forEach(function(l){
      if (l.source === n.id){
        var t = nodeById[l.target];
        if (t) out.push({ n: t, rel: l.relation || 'connected' });
      } else if (l.target === n.id){
        var s = nodeById[l.source];
        if (s) out.push({ n: s, rel: l.relation || 'connected' });
      }
    });
    return out;
  }
  function showNode(n){
    var c = legendByCid[n.community];
    var html = '';
    html += '<div class="field"><b>Label:</b> ' + esc(n.label) + '</div>';
    html += '<div class="field"><b>File:</b> ' + esc(n.source_file || '—') + '</div>';
    html += '<div class="field"><b>Type:</b> ' + esc(n.file_type || '—') + '</div>';
    html += '<div class="field"><b>Community:</b> ' + esc(c ? c.label : '?') + ' (' + n.community + ')</div>';
    html += '<div class="field"><b>Degree:</b> ' + n.degree + '</div>';
    document.getElementById('info-content').innerHTML = html;
    var nbs = neighborsOf(n).sort(function(a, b){ return b.n.degree - a.n.degree; });
    var nh = '';
    nbs.slice(0, 40).forEach(function(e){
      nh += '<div class="neighbor-link" data-id="' + e.n.id + '"><span class="rel">' + esc(e.rel) + '</span> — ' + esc(e.n.label) + '</div>';
    });
    if (!nbs.length) nh = '<span class="empty">No connections</span>';
    document.getElementById('neighbors-list').innerHTML = nh;
    Array.prototype.forEach.call(document.querySelectorAll('.neighbor-link'), function(el){
      el.onclick = function(){ var t = nodeById[el.getAttribute('data-id')]; if (t) flyTo(t); };
    });
    flyTo(n);
  }
  function clearSelection(){
    document.getElementById('info-content').innerHTML = '<span class="empty">Click a node to inspect it</span>';
    document.getElementById('neighbors-list').innerHTML = '<span class="empty">—</span>';
  }
  function flyTo(n){
    var r = nodeRadius(n) * 7;
    Graph.cameraPosition({ x: n.x + r, y: n.y + r, z: n.z + r }, n, 800);
  }

  var searchInput = document.getElementById('search');
  var searchResults = document.getElementById('search-results');
  searchInput.addEventListener('input', function(){
    var q = searchInput.value.trim().toLowerCase();
    if (!q){ searchResults.style.display = 'none'; searchResults.innerHTML = ''; return; }
    var hits = [];
    DATA.nodes.forEach(function(n){
      if (hits.length >= 12) return;
      var hay = ((n.label || '') + ' ' + (n.source_file || '')).toLowerCase();
      if (hay.indexOf(q) >= 0) hits.push(n);
    });
    if (!hits.length){
      searchResults.style.display = 'block';
      searchResults.innerHTML = '<div class="search-item muted">No matches</div>';
      return;
    }
    var h = '';
    hits.forEach(function(n){
      h += '<div class="search-item" data-id="' + n.id + '">' + esc(n.label) + ' <span class="muted">· ' + esc(n.file_type || '') + '</span></div>';
    });
    searchResults.innerHTML = h;
    searchResults.style.display = 'block';
    Array.prototype.forEach.call(document.querySelectorAll('#search-results .search-item'), function(el){
      el.onclick = function(){
        var t = nodeById[el.getAttribute('data-id')];
        if (t){
          searchInput.value = '';
          searchResults.style.display = 'none';
          searchResults.innerHTML = '';
          showNode(t);
        }
      };
    });
  });

  var legendEl = document.getElementById('legend');
  DATA.legend.slice().sort(function(a, b){ return b.count - a.count; }).forEach(function(c){
    var row = document.createElement('div');
    row.className = 'legend-item';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'legend-cb';
    cb.checked = true;
    cb.addEventListener('change', function(){ checked[c.cid] = cb.checked; syncSelectAll(); applyFilter(); });
    var dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = c.color;
    var lbl = document.createElement('span');
    lbl.className = 'legend-label';
    lbl.textContent = c.label;
    var cnt = document.createElement('span');
    cnt.className = 'legend-count';
    cnt.textContent = c.count;
    row.appendChild(cb); row.appendChild(dot); row.appendChild(lbl); row.appendChild(cnt);
    legendEl.appendChild(row);
  });
  var selectAll = document.getElementById('select-all-cb');
  selectAll.addEventListener('change', function(){
    var on = selectAll.checked;
    DATA.legend.forEach(function(c){ checked[c.cid] = on; });
    Array.prototype.forEach.call(document.querySelectorAll('.legend-cb'), function(cb){ cb.checked = on; });
    syncSelectAll();
    applyFilter();
  });
  function syncSelectAll(){
    var on = DATA.legend.filter(function(c){ return checked[c.cid]; }).length;
    selectAll.checked = on === DATA.legend.length;
    selectAll.indeterminate = on > 0 && on < DATA.legend.length;
  }

  var rotCb = document.getElementById('rotate-cb');
  rotCb.addEventListener('change', function(){
    if (Graph.controls()){
      Graph.controls().autoRotate = rotCb.checked;
      Graph.controls().autoRotateSpeed = 1.2;
    }
  });
  document.getElementById('reset-btn').addEventListener('click', function(){ Graph.zoomToFit(700, 60); });
  var reheatBtn = document.getElementById('reheat-btn');
  reheatBtn.addEventListener('click', function(){
    Graph.cooldownTicks(300).d3ReheatSimulation();
    reheatBtn.textContent = 'Settling…';
  });
  var firstStop = true;
  function engineStopped(){
    reheatBtn.textContent = 'Reheat physics';
    if (firstStop){ firstStop = false; Graph.zoomToFit(900, 60); }
  }
  engineStopped();

  document.getElementById('stats').innerHTML =
    DATA.nodes.length + ' nodes &middot; ' + DATA.links.length + ' edges &middot; ' +
    DATA.legend.length + ' communities' + (DATA.commit ? ' &middot; ' + DATA.commit : '');
})();`;

  const html = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>graphify - 3D graph</title>
<script src="https://unpkg.com/3d-force-graph@1.80.0/dist/3d-force-graph.min.js"
        integrity="sha384-Y7bC2PBKu8ujxtvo5+Z61OeGdSVRzFsYWBK4i5dnL/U6aFDTodk61qOUkTfInaxS"
        crossorigin="anonymous"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: #0f0f1a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; height: 100vh; overflow: hidden; }
  #graph { flex: 1; }
  #sidebar { width: 280px; background: #1a1a2e; border-left: 1px solid #2a2a4e; display: flex; flex-direction: column; overflow: hidden; }
  #search-wrap { padding: 12px; border-bottom: 1px solid #2a2a4e; }
  #search { width: 100%; background: #0f0f1a; border: 1px solid #3a3a5e; color: #e0e0e0; padding: 7px 10px; border-radius: 6px; font-size: 13px; outline: none; }
  #search:focus { border-color: #4E79A7; }
  #search-results { max-height: 140px; overflow-y: auto; padding: 4px 12px; border-bottom: 1px solid #2a2a4e; display: none; }
  .search-item { padding: 4px 6px; cursor: pointer; border-radius: 4px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .search-item:hover { background: #2a2a4e; }
  .muted { color: #666; }
  #info-panel { padding: 14px; border-bottom: 1px solid #2a2a4e; max-height: 320px; overflow-y: auto; }
  #info-panel h3 { font-size: 13px; color: #aaa; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  #info-content { font-size: 13px; color: #ccc; line-height: 1.6; }
  #info-content .field { margin-bottom: 5px; }
  #info-content .field b { color: #e0e0e0; }
  #info-content .empty { color: #555; font-style: italic; }
  .neighbor-link { display: block; padding: 2px 6px; margin: 2px 0; border-radius: 3px; cursor: pointer; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 3px solid #333; }
  .neighbor-link:hover { background: #2a2a4e; }
  .neighbor-link .rel { color: #666; }
  #neighbors-list { max-height: 160px; overflow-y: auto; margin-top: 4px; }
  #view-controls { padding: 12px; border-bottom: 1px solid #2a2a4e; }
  #view-controls h3 { font-size: 13px; color: #aaa; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  #view-controls label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: #aaa; user-select: none; margin-bottom: 8px; }
  #view-controls label:hover { color: #e0e0e0; }
  .ctl-btn { display: inline-block; background: #2a2a4e; color: #e0e0e0; border: 1px solid #3a3a5e; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; margin: 2px 4px 2px 0; }
  .ctl-btn:hover { background: #3a3a5e; }
  #legend-wrap { flex: 1; overflow-y: auto; padding: 12px; }
  #legend-wrap h3 { font-size: 13px; color: #aaa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; border-radius: 4px; font-size: 12px; }
  .legend-item:hover { background: #2a2a4e; padding-left: 4px; }
  .legend-item.dimmed { opacity: 0.35; }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .legend-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .legend-count { color: #666; font-size: 11px; }
  #stats { padding: 10px 14px; border-top: 1px solid #2a2a4e; font-size: 11px; color: #555; }
  #legend-controls { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 4px 0; }
  #legend-controls label { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: #aaa; user-select: none; }
  #legend-controls label:hover { color: #e0e0e0; }
  .legend-cb, #select-all-cb { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1.5px solid #3a3a5e; border-radius: 3px; background: #0f0f1a; cursor: pointer; position: relative; flex-shrink: 0; }
  .legend-cb:checked, #select-all-cb:checked { background: #4E79A7; border-color: #4E79A7; }
  .legend-cb:checked::after, #select-all-cb:checked::after { content: ''; position: absolute; left: 3.5px; top: 1px; width: 4px; height: 7px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  #select-all-cb:indeterminate { background: #4E79A7; border-color: #4E79A7; }
  #select-all-cb:indeterminate::after { content: ''; position: absolute; left: 2px; top: 5px; width: 8px; height: 2px; background: #fff; border: none; transform: none; }
  #rotate-cb { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1.5px solid #3a3a5e; border-radius: 3px; background: #0f0f1a; cursor: pointer; position: relative; flex-shrink: 0; }
  #rotate-cb:checked { background: #4E79A7; border-color: #4E79A7; }
  #rotate-cb:checked::after { content: ''; position: absolute; left: 3.5px; top: 1px; width: 4px; height: 7px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  #webgl-fallback { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f0f1a; z-index: 50; gap: 10px; text-align: center; padding: 20px; }
  #webgl-fallback a { color: #4E79A7; }
  .graph-tooltip { color: #e0e0e0; background: rgba(15, 15, 26, 0.95); border: 1px solid #3a3a5e; border-radius: 6px; padding: 6px 10px; font-size: 12px; }
</style>
</head>
<body>
<div id="graph"></div>
<div id="sidebar">
  <div id="search-wrap">
    <input id="search" type="text" placeholder="Search nodes..." autocomplete="off">
    <div id="search-results"></div>
  </div>
  <div id="info-panel">
    <h3>Node Info</h3>
    <div id="info-content"><span class="empty">Click a node to inspect it</span></div>
    <h3 style="margin-top:10px">Connections</h3>
    <div id="neighbors-list"><span class="empty">—</span></div>
  </div>
  <div id="view-controls">
    <h3>View</h3>
    <label><input type="checkbox" id="rotate-cb">Auto-rotate</label>
    <button class="ctl-btn" id="reset-btn">Reset view</button>
    <button class="ctl-btn" id="reheat-btn">Reheat physics</button>
  </div>
  <div id="legend-wrap">
    <h3>Communities</h3>
    <div id="legend-controls">
      <label><input type="checkbox" id="select-all-cb" checked>Select All</label>
    </div>
    <div id="legend"></div>
  </div>
  <div id="stats">…</div>
</div>
<script>
__VIEWER__
</script>
</body>
</html>`;

  const viewerFinal = viewer
    .replace(/__NODES__/g, escJson(data.nodes))
    .replace(/__LINKS__/g, escJson(data.links))
    .replace(/__LEGEND__/g, escJson(data.legend))
    .replace(/__COMMIT__/g, escJson(data.commit))
    .replace(/__PALETTE__/g, escJson(PALETTE));

  return html.replace('__VIEWER__', viewerFinal);
}

function build() {
  if (!fs.existsSync(GRAPH_JSON) || !fs.existsSync(GRAPH_HTML)) {
    console.error('Error: graphify-out/graph.json or graph.html not found.');
    console.error('Make sure you run "graphify" first to generate the graph.');
    return;
  }
  const graphData = JSON.parse(fs.readFileSync(GRAPH_JSON, 'utf8'));
  const graphHtml = fs.readFileSync(GRAPH_HTML, 'utf8');
  const legend = extractLegend(graphHtml) || fallbackLegend(graphData);

  const nodes = graphData.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    file_type: n.file_type,
    source_file: n.source_file,
    community: n.community,
    community_name: n.community_name,
  }));
  const links = graphData.links.map((l) => ({
    source: l.source,
    target: l.target,
    relation: l.relation,
    weight: l.weight || 1,
  }));
  const commit = String(graphData.built_at_commit || '').slice(0, 7);

  const out = buildHtml({ nodes, links, legend, commit });
  fs.writeFileSync(OUT_HTML, out, 'utf8');
  console.log('✅ Wrote ' + OUT_HTML + ' (' + nodes.length + ' nodes · ' + links.length + ' edges · ' + legend.length + ' communities)');
}

module.exports = { build, buildHtml, extractLegend };

if (require.main === module) {
  build();
}