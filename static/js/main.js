// main.js - 主控入口模块
import { loadGraph } from './graph.js';
import { fetchStructuredInfo, resetInfoCard, clearAIScript, copyResult } from './info.js';
import { highlightPlantInTree, resetTaxonomyTree, loadTaxonomy } from './taxonomy.js';
import { setupAutocomplete } from './autocomplete.js';
import { historyStack, allNodes, allLinks, g } from './utils.js';
import { generate } from './info.js';
import {
  setCurrentGenerateRequestId,
  setCurrentScriptRequestId
} from './info.js';

window.generate = generate;

document.getElementById("generate-btn").addEventListener("click", generate);
document.getElementById("copy-btn").addEventListener("click", copyResult);

// 页面加载后初始化分类树
document.addEventListener("DOMContentLoaded", loadTaxonomy);

// 搜索按钮点击事件
document.getElementById("search-btn").addEventListener("click", () => {
  const plant = document.getElementById("search").value.trim();
  if (!plant) return alert("请输入植物名称");
  loadGraph();
  fetchStructuredInfo(plant);
  highlightPlantInTree(plant);
});

// 清除按钮点击事件
document.getElementById("clear-btn").addEventListener("click", () => {
  setCurrentGenerateRequestId(null);
  setCurrentScriptRequestId(null);

  document.getElementById("search").value = "";
  allNodes.clear();
  allLinks.clear();
  g.selectAll("*").remove();
  resetTaxonomyTree();
  resetInfoCard();
  clearAIScript();
  document.getElementById("suggestions").style.display = "none";
});

// 返回按钮点击事件
document.getElementById("back-btn").addEventListener("click", () => {
  if (historyStack.length > 1) {
    historyStack.pop();
    const prev = historyStack[historyStack.length - 1];
    allNodes.clear();
    allLinks.clear();
    prev.nodes.forEach(([key, value]) => allNodes.set(key, value));
    prev.links.forEach(l => allLinks.add(l));
    loadGraph();
  } else {
    alert("已经回到初始状态，无法继续返回。");
  }
});

// 搜索框输入监听 + 自动补全逻辑
setupAutocomplete();

// 页面其他区域点击时关闭建议列表
document.addEventListener("click", (e) => {
  const searchInput = document.getElementById("search");
  const suggestionBox = document.getElementById("suggestions");
  if (e.target !== searchInput && !suggestionBox.contains(e.target)) {
    suggestionBox.style.display = "none";
  }
});