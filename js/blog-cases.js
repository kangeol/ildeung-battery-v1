(() => {
  const sections = document.querySelectorAll("[data-blog-case-section]");

  sections.forEach((section) => {
    const items = [...section.querySelectorAll("[data-blog-case-item]")];
    const pageButtons = [...section.querySelectorAll("[data-blog-case-page-button]")];
    const filterButtons = [...section.querySelectorAll("[data-blog-case-filter]")];
    const pagination = section.querySelector("[data-blog-case-pagination]");
    const prev = section.querySelector("[data-blog-case-prev]");
    const next = section.querySelector("[data-blog-case-next]");
    const currentLabel = section.querySelector("[data-blog-case-current]");
    const totalLabel = section.querySelector("[data-blog-case-total]");
    const pageSize = 5;
    let activeFilter = "all";
    let currentPage = 1;

    function getVisibleItems() {
      return items.filter((item) => {
        const filters = (item.dataset.blogCaseFilters || "all").split(/\s+/);
        return activeFilter === "all" || filters.includes(activeFilter);
      });
    }

    function render(page) {
      const visibleItems = getVisibleItems();
      const totalPages = Math.max(1, Math.ceil(visibleItems.length / pageSize));
      currentPage = Math.min(Math.max(page, 1), totalPages);
      items.forEach((item) => {
        item.hidden = true;
      });
      visibleItems.forEach((item, index) => {
        const itemPage = Math.floor(index / pageSize) + 1;
        item.hidden = itemPage !== currentPage;
      });
      pageButtons.forEach((button) => {
        const buttonPage = Number(button.dataset.blogCasePageButton || "1");
        const isCurrent = buttonPage === currentPage;
        button.hidden = buttonPage > totalPages;
        if (isCurrent) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });
      if (pagination) {
        pagination.hidden = totalPages <= 1;
      }
      if (currentLabel) {
        currentLabel.textContent = String(currentPage);
      }
      if (totalLabel) {
        totalLabel.textContent = String(totalPages);
      }
    }

    pageButtons.forEach((button) => {
      button.addEventListener("click", () => render(Number(button.dataset.blogCasePageButton || "1")));
    });
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.blogCaseFilter || "all";
        filterButtons.forEach((item) => {
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        render(1);
      });
    });
    prev?.addEventListener("click", () => render(currentPage - 1));
    next?.addEventListener("click", () => render(currentPage + 1));
    render(1);
  });
})();
