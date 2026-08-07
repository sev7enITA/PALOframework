(() => {
  const toggle = document.querySelector("[data-am-section-toggle]");
  const links = document.querySelector("[data-am-section-links]");
  if (!toggle || !links) return;
  const close = () => { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); };
  toggle.addEventListener("click", () => {
    const open = !links.classList.contains("is-open");
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { close(); toggle.focus(); } });
})();
