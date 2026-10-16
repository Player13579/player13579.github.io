(() => {
  const buttons = Array.from(document.querySelectorAll("[data-mode-switch]"));
  const cards = Array.from(document.querySelectorAll(".gallery-item[data-essential]"));
  const count = document.querySelector("[data-view-count]");
  const emptyState = document.querySelector("[data-empty-state]");
  if (buttons.length === 0 || !count || !emptyState) return;

  const readMode = () => new URL(window.location.href).searchParams.get("view") === "all" ? "all" : "essential";

  function applyMode(mode) {
    const selectedButton = buttons.find((button) => button.dataset.modeSwitch === mode);
    const focused = document.activeElement;
    let focusWouldBeHidden = false;
    let visibleCount = 0;
    let headingCount = 0;

    for (const card of cards) {
      const fullReport = mode === "all" || card.dataset.essential === "true";
      const headingOnly = !fullReport && card.dataset.showHeading === "true";
      const visible = fullReport || headingOnly;
      card.hidden = !visible;
      const content = card.querySelector("[data-report-content]");
      if (content) content.hidden = !fullReport;
      if (fullReport) visibleCount += 1;
      if (headingOnly) headingCount += 1;
      if ((card.contains(focused) && !visible) || (content?.contains(focused) && !fullReport)) focusWouldBeHidden = true;
    }

    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.modeSwitch === mode));
    }
    emptyState.hidden = visibleCount !== 0;
    count.textContent = `${mode === "all" ? "すべての報告" : "制作に必要な内容"}を表示中。${visibleCount}件。`;
    if (headingCount) count.textContent += ` 見出しのみ${headingCount}件。`;
    const heading = document.getElementById("page-heading");
    if (heading) heading.textContent = mode === "all" ? "このチャットの改善報告。" : "制作に必要な変化だけを。";
    emptyState.textContent = mode === "all"
      ? "現在、掲載中の報告はありません。"
      : "現在、制作でぜひ知っておくべき掲載内容はありません。これまでの改善は「すべての報告」で読めます。";
    document.documentElement.dataset.view = mode;
    if (focusWouldBeHidden && selectedButton) selectedButton.focus();
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const mode = button.dataset.modeSwitch;
      if (mode !== "all" && mode !== "essential") return;
      if (mode === readMode()) return;
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode);
      window.history.pushState({ view: mode }, "", url);
      applyMode(mode);
    });
  }

  window.addEventListener("popstate", () => applyMode(readMode()));
  applyMode(readMode());
  for (const button of buttons) button.disabled = false;
})();
