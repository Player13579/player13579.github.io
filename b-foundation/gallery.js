(() => {
  const search = document.querySelector("#entry-search");
  const category = document.querySelector("#category-filter");
  const entries = Array.from(document.querySelectorAll(".entry-card[data-category]"));
  const tocEntries = Array.from(document.querySelectorAll("[data-toc-entry]"));
  const count = document.querySelector("[data-result-count]");
  const empty = document.querySelector("[data-empty-results]");
  if (!search || !category || !entries.length || !count || !empty) return;

  const update = () => {
    const query = search.value.trim().toLocaleLowerCase("ja");
    const selected = category.value;
    let visible = 0;
    for (const entry of entries) {
      const matchesText = !query || entry.textContent.toLocaleLowerCase("ja").includes(query);
      const matchesCategory = selected === "all" || entry.dataset.category === selected;
      const show = matchesText && matchesCategory;
      entry.hidden = !show;
      const tocEntry = tocEntries.find((item) => item.dataset.tocEntry === entry.id);
      if (tocEntry) tocEntry.hidden = !show;
      if (show) visible += 1;
    }
    count.textContent = `${visible}件 / 全${entries.length}件`;
    empty.hidden = visible !== 0;
  };

  search.addEventListener("input", update);
  category.addEventListener("change", update);
  update();
})();
