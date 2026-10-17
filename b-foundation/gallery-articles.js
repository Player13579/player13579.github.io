(() => {
  const gallery = document.getElementById("gallery-list");
  if (!gallery) return;

  function openHashedReport() {
    const fragment = window.location.hash.slice(1);
    if (!fragment) return;
    let id;
    try {
      id = decodeURIComponent(fragment);
    } catch {
      return;
    }
    const article = document.getElementById(id);
    if (!article || article.id !== id || !article.classList.contains("gallery-item") || !gallery.contains(article)) return;
    const disclosure = article.querySelector("details[data-report-disclosure]");
    if (!disclosure) return;
    disclosure.open = true;
    requestAnimationFrame(() => article.scrollIntoView({ block: "start" }));
  }

  window.addEventListener("hashchange", openHashedReport);
  openHashedReport();
})();
