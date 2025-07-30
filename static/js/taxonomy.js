// taxonomy.js
import { loadGraph } from './graph.js';
import { fetchStructuredInfo } from './info.js';

export function loadTaxonomy() {
  fetch("/taxonomy")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("taxonomy-list");
      container.innerHTML = "";
      const grouped = groupTaxonomy(data);
      renderTree(grouped, container);
    });
}

export function groupTaxonomy(data) {
  const grouped = {};
  data.forEach(item => {
    const { 科, 属, 植物列表 } = item;
    if (!grouped[科]) grouped[科] = {};
    grouped[科][属] = 植物列表;
  });
  return grouped;
}

export function renderTree(data, container) {
  Object.keys(data).forEach(family => {
    const familyItem = createNode(family, "family");
    container.appendChild(familyItem);

    const genusContainer = document.createElement("div");
    genusContainer.className = "taxonomy-sublist hidden";
    familyItem.addEventListener("click", (e) => {
      e.stopPropagation();
      genusContainer.classList.toggle("hidden");
    });

    Object.keys(data[family]).forEach(genus => {
      const genusItem = createNode(genus, "genus");
      genusContainer.appendChild(genusItem);

      const plantContainer = document.createElement("div");
      plantContainer.className = "taxonomy-sublist hidden";
      genusItem.addEventListener("click", (e) => {
        e.stopPropagation();
        plantContainer.classList.toggle("hidden");
      });

      data[family][genus].forEach(plant => {
        const plantItem = createNode(plant, "plant");
        plantItem.addEventListener("click", (e) => {
          e.stopPropagation();
          queryPlantByName(plant);
          highlightSelectedPlantInTree(plantItem);
        });
        plantContainer.appendChild(plantItem);
      });

      genusContainer.appendChild(plantContainer);
    });

    container.appendChild(genusContainer);
  });
}

export function createNode(text, type) {
  const div = document.createElement("div");
  div.className = `taxonomy-item ${type}`;
  div.textContent = text;
  if (type === "plant") {
    div.setAttribute("data-name", text);
  }
  return div;
}

export function resetTaxonomyTree() {
  document.querySelectorAll(".taxonomy-item.selected").forEach(el => el.classList.remove("selected"));
  document.querySelectorAll(".taxonomy-sublist").forEach(el => el.classList.add("hidden"));
}

export function highlightPlantInTree(plantName) {
  document.querySelectorAll(".taxonomy-item.selected").forEach(el => el.classList.remove("selected"));
  document.querySelectorAll(".taxonomy-sublist").forEach(el => el.classList.add("hidden"));

  const target = document.querySelector(`.taxonomy-item.plant[data-name='${plantName}']`);
  if (!target) return;

  target.classList.add("selected");
  let parent = target.parentElement;
  while (parent && parent.id !== "taxonomy-list") {
    if (parent.classList.contains("taxonomy-sublist")) {
      parent.classList.remove("hidden");
    }
    parent = parent.parentElement;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function highlightSelectedPlantInTree(el) {
  document.querySelectorAll(".taxonomy-item.selected").forEach(n => n.classList.remove("selected"));
  el.classList.add("selected");
}

export function queryPlantByName(plant) {
  const searchInput = document.getElementById("search");
  searchInput.value = plant;
  loadGraph();
  fetchStructuredInfo(plant);
}