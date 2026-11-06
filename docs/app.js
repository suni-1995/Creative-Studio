/* Creative-Studio PC: stage 1 shell only. No Android code dependencies. */
(() => {
  "use strict";
  const STORAGE_KEY = "creative-studio-pc-v1";
  // Browser storage is initialized separately from the Android app.
  // Actual project data schema and archive compatibility will be built in later stages.
  const defaultState = () => ({ schemaVersion: 1, folders: [], projects: [] });
  let state;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? JSON.parse(raw) : defaultState();
    if (!state || state.schemaVersion !== 1 || !Array.isArray(state.projects) || !Array.isArray(state.folders)) {
      state = defaultState();
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    state = defaultState();
    console.warn("브라우저 로컬 저장소를 사용할 수 없습니다.", error);
  }
  const buttons = document.querySelectorAll("[data-view]");
  const panels = document.querySelectorAll("[data-panel]");
  function openView(view) {
    if (view !== "projects" && view !== "more") return;
    buttons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== view; });
  }
  buttons.forEach((button) => button.addEventListener("click", () => openView(button.dataset.view)));
  let toastTimer;
  function notify(text) {
    const toast = document.getElementById("message");
    toast.textContent = text;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3600);
  }
  document.getElementById("importBackup").addEventListener("click", () => notify("백업 가져오기 기능은 6차에서 구현됩니다."));
  document.getElementById("exportBackup").addEventListener("click", () => notify("백업 내보내기 기능은 6차에서 구현됩니다."));
  openView("projects");
})();