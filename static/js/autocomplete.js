// autocomplete.js

// 自动补全初始化函数
export function setupAutocomplete() {
  const searchInput = document.getElementById("search");
  const suggestionBox = document.getElementById("suggestions");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (!query) {
      suggestionBox.style.display = "none";
      return;
    }
    fetch(`/autocomplete?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        suggestionBox.innerHTML = "";
        if (data.length === 0) {
          suggestionBox.style.display = "none";
          return;
        }
        data.forEach(item => {
          const div = document.createElement("div");
          div.textContent = item;
          div.className = "suggestion-item";
          div.onclick = () => {
            searchInput.value = item;
            suggestionBox.style.display = "none";
          };
          suggestionBox.appendChild(div);
        });
        suggestionBox.style.display = "block";
      });
  });

  document.addEventListener("click", (e) => {
    if (e.target !== searchInput && !suggestionBox.contains(e.target)) {
      suggestionBox.style.display = "none";
    }
  });
}