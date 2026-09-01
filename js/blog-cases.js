(() => {
  const sections = document.querySelectorAll("[data-blog-case-section]");

  sections.forEach((section) => {
    const items = [...section.querySelectorAll("[data-blog-case-item]")];
    const pageButtons = [...section.querySelectorAll("[data-blog-case-page-button]")];
    const prev = section.querySelector("[data-blog-case-prev]");
    const next = section.querySelector("[data-blog-case-next]");
    const currentLabel = section.querySelector("[data-blog-case-current]");
    const totalPages = Number(section.dataset.blogCaseTotalPages || "1");
    let currentPage = 1;

    function render(page) {
      currentPage = Math.min(Math.max(page, 1), totalPages);
      items.forEach((item) => {
        item.hidden = Number(item.dataset.blogCasePage || "1") !== currentPage;
      });
      pageButtons.forEach((button) => {
        const isCurrent = Number(button.dataset.blogCasePageButton || "1") === currentPage;
        if (isCurrent) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });
      if (currentLabel) {
        currentLabel.textContent = String(currentPage);
      }
    }

    pageButtons.forEach((button) => {
      button.addEventListener("click", () => render(Number(button.dataset.blogCasePageButton || "1")));
    });
    prev?.addEventListener("click", () => render(currentPage - 1));
    next?.addEventListener("click", () => render(currentPage + 1));
    render(1);
  });
})();
