// graph.js - 图谱渲染与交互功能
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { allNodes, allLinks, g, historyStack } from './utils.js';

export function loadGraph() {
  const plant = document.getElementById("search").value.trim();
  if (!plant) return;
  historyStack.length = 0; // 清空历史栈

  fetch(`/query?q=${encodeURIComponent(plant)}`)
    .then(res => res.json())
    .then(data => {
      allNodes.clear();
      allLinks.clear();
      data.nodes.forEach(n => allNodes.set(n.id, n));
      data.links.forEach(l => allLinks.add(JSON.stringify(l)));
      renderGraph();
    });
}

export function renderGraph() {
  historyStack.push({
    nodes: Array.from(allNodes.entries()),
    links: Array.from(allLinks)
  });

  const nodes = Array.from(allNodes.values());
  const links = Array.from(allLinks).map(l => JSON.parse(l));
  g.selectAll("*").remove();

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-800))
    .force("center", d3.forceCenter(window.innerWidth / 2, 250))
    .force("collide", d3.forceCollide().radius(30));

  const link = g.append("g").selectAll("line")
    .data(links).join("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1.2);

  const node = g.append("g").selectAll("circle")
    .data(nodes).join("circle")
    .attr("r", 8)
    .attr("fill", d => d.type === "治疗" ? "#2E8B57" : (d.color || '#ccc'))
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    )
    .on("click", (e, d) => expandNode(d.id));

  g.append("g").selectAll("text")
    .data(nodes).join("text")
    .text(d => d.id.split("#").pop())
    .attr("font-size", 10)
    .attr("dx", 10)
    .attr("dy", 3);

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);

    g.selectAll("text")
      .attr("x", d => d.x + 10)
      .attr("y", d => d.y);
  });
}

export function expandNode(entityId) {
  fetch(`/details?name=${encodeURIComponent(entityId)}`)
    .then(res => res.json())
    .then(data => {
      const info = data.node_info || {};
      data.properties.forEach(prop => {
        const objId = prop.object;
        if (!allNodes.has(objId)) {
          allNodes.set(objId, {
            id: objId,
            type: info[objId]?.type || null,
            color: info[objId]?.color || '#ccc'
          });
        }
        const link = { source: data.entity, target: objId, label: prop.predicate };
        allLinks.add(JSON.stringify(link));
      });
      renderGraph();
    });
}