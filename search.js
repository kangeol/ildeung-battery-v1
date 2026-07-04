(function () {
  let db = null;
  const CALL_NUMBER = "1644-9141";
  const brandSelect = document.querySelector("#brandSelect");
  const modelSelect = document.querySelector("#modelSelect");
  const yearSelect = document.querySelector("#yearSelect");
  const fuelSelect = document.querySelector("#fuelSelect");
  const form = document.querySelector("#batterySearchForm");
  const status = document.querySelector("#searchStatus");
  const emptyState = document.querySelector("#emptyState");
  const resultList = document.querySelector("#resultList");
  const resultSummary = document.querySelector("#resultSummary");
  const resetButton = document.querySelector("#resetSearchButton");
  const progressItems = Array.from(document.querySelectorAll("[data-progress-step]"));

  const EMPTY_ICON = `
    <span class="empty-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M7 17h14l-2.5-6h-8L7 17Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M6 17h16a3 3 0 0 1 3 3v4H4v-4a3 3 0 0 1 2-3Z" fill="currentColor"/>
        <circle cx="9" cy="24" r="2.3" fill="#fff"/>
        <circle cx="20" cy="24" r="2.3" fill="#fff"/>
        <path d="M24 7h5M26.5 4.5v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    </span>
  `;

  const HTML_ESCAPE = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE[char]);
  }

  function option(value, label = value) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    return item;
  }

  function resetSelect(select, placeholder, disabled = true) {
    select.innerHTML = "";
    select.append(option("", placeholder));
    select.disabled = disabled;
  }

  function sortKr(a, b) {
    return String(a).localeCompare(String(b), "ko");
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function findBrand(brandId) {
    return db.brands.find((brand) => brand.id === brandId);
  }

  function findModel(modelId) {
    return db.vehicleModels.find((model) => model.id === modelId);
  }

  function activeBrands() {
    return db.brands.filter(IldeungDB.isActive).sort((a, b) => sortKr(a.nameKr, b.nameKr));
  }

  function activeModelsByBrand(brandId) {
    return db.vehicleModels
      .filter((model) => IldeungDB.isActive(model) && model.brandId === brandId)
      .sort((a, b) => sortKr(a.nameKr + a.generation, b.nameKr + b.generation));
  }

  function activeVariantsByModel(modelId) {
    return db.vehicleVariants.filter((variant) => IldeungDB.isActive(variant) && variant.modelId === modelId);
  }

  function selectedVariants() {
    if (!modelSelect.value || !yearSelect.value || !fuelSelect.value) return [];

    return db.vehicleVariants.filter((variant) => (
      IldeungDB.isActive(variant) &&
      variant.modelId === modelSelect.value &&
      String(variant.year) === yearSelect.value &&
      variant.fuelType === fuelSelect.value
    ));
  }

  function modelLabel(model) {
    return [model.nameKr, model.generation].filter(Boolean).join(" ");
  }

  function modelOptionLabel(model) {
    const label = modelLabel(model);
    const years = [model.startYear, model.endYear].filter(Boolean).join("-");
    return years ? `${label} (${years})` : label;
  }

  function variantSpec(variant) {
    return [variant.engine, variant.trim].filter(Boolean).join(" ");
  }

  function fuelLabel(fuel, variants) {
    const specs = [...new Set(variants.map(variantSpec).filter(Boolean))];
    if (specs.length === 1) return `${fuel} · ${specs[0]}`;
    if (specs.length > 1) return `${fuel} · ${specs.length}개 사양`;
    return fuel;
  }

  function setEmptyState(title, message, actionHtml = "") {
    emptyState.hidden = false;
    emptyState.innerHTML = `
      ${EMPTY_ICON}
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      ${actionHtml}
    `;
  }

  function clearResults(title = "차량 정보를 선택해 주세요.", message = "선택한 차량에 맞는 배터리와 교체가격이 이곳에 표시됩니다.") {
    resultList.innerHTML = "";
    resultSummary.hidden = true;
    resultSummary.innerHTML = "";
    setEmptyState(title, message);
  }

  function updateProgress() {
    const values = {
      brand: Boolean(brandSelect.value),
      model: Boolean(modelSelect.value),
      year: Boolean(yearSelect.value),
      fuel: Boolean(fuelSelect.value)
    };
    const order = ["brand", "model", "year", "fuel"];
    const current = order.find((key) => !values[key]) || "fuel";

    progressItems.forEach((item) => {
      const key = item.dataset.progressStep;
      item.classList.toggle("is-complete", values[key]);
      item.classList.toggle("is-current", key === current && !values.fuel);
      if (key === current && !values.fuel) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function renderSummary(variants, resultCount) {
    const brand = findBrand(brandSelect.value);
    const model = findModel(modelSelect.value);
    const vehicle = variants.length === 1
      ? variants[0].displayName
      : [brand?.nameKr, model ? modelLabel(model) : "", yearSelect.value && `${yearSelect.value}년식`, fuelSelect.value].filter(Boolean).join(" ");
    const detail = variants.length === 1
      ? [variants[0].bodyType, variants[0].engine, variants[0].transmission].filter(Boolean).join(" · ")
      : `${variants.length}개 사양 기준`;

    resultSummary.innerHTML = `
      <div>
        <span>선택 차량</span>
        <strong>${escapeHtml(vehicle || "선택 차량")}</strong>
        <small>${escapeHtml(detail || "상세 정보 확인 중")}</small>
      </div>
      <div>
        <span>검색 결과</span>
        <strong>${resultCount}개</strong>
        <small>활성 매칭 기준</small>
      </div>
    `;
    resultSummary.hidden = false;
  }

  function populateBrands() {
    resetSelect(brandSelect, "제조사 선택", false);
    activeBrands().forEach((brand) => {
      brandSelect.append(option(brand.id, brand.nameKr));
    });
    updateProgress();
    setStatus("제조사를 선택해 주세요.");
  }

  function populateModels() {
    const models = brandSelect.value ? activeModelsByBrand(brandSelect.value) : [];
    resetSelect(
      modelSelect,
      brandSelect.value ? (models.length ? "차종 선택" : "선택 가능한 차종 없음") : "제조사를 먼저 선택",
      !brandSelect.value || !models.length
    );
    resetSelect(yearSelect, "차종을 먼저 선택");
    resetSelect(fuelSelect, "연식을 먼저 선택");
    clearResults();
    updateProgress();

    if (!brandSelect.value) {
      setStatus("제조사를 선택해 주세요.");
      return;
    }

    models.forEach((model) => {
      modelSelect.append(option(model.id, modelOptionLabel(model)));
    });
    setStatus(models.length ? "차종을 선택해 주세요." : "등록된 차종이 없습니다. 전화상담으로 확인해 주세요.");
  }

  function populateYears() {
    const variants = modelSelect.value ? activeVariantsByModel(modelSelect.value) : [];
    const years = [...new Set(variants.map((variant) => variant.year))].sort((a, b) => b - a);

    resetSelect(yearSelect, years.length ? "연식 선택" : "선택 가능한 연식 없음", !years.length);
    resetSelect(fuelSelect, "연식을 먼저 선택");
    clearResults();
    updateProgress();

    if (!modelSelect.value) {
      setStatus("차종을 선택해 주세요.");
      return;
    }

    years.forEach((year) => {
      yearSelect.append(option(String(year), year + "년식"));
    });
    setStatus(years.length ? "연식을 선택해 주세요." : "선택 가능한 연식이 없습니다. 전화상담으로 확인해 주세요.");
  }

  function populateFuels() {
    const fuelGroups = activeVariantsByModel(modelSelect.value)
      .filter((variant) => String(variant.year) === yearSelect.value)
      .reduce((groups, variant) => {
        const list = groups.get(variant.fuelType) || [];
        list.push(variant);
        groups.set(variant.fuelType, list);
        return groups;
      }, new Map());
    const fuels = [...fuelGroups.keys()].sort(sortKr);

    resetSelect(fuelSelect, fuels.length ? "연료 선택" : "선택 가능한 연료 없음", !fuels.length);
    clearResults();
    updateProgress();

    if (!yearSelect.value) {
      setStatus("연식을 선택해 주세요.");
      return;
    }

    fuels.forEach((fuel) => fuelSelect.append(option(fuel, fuelLabel(fuel, fuelGroups.get(fuel)))));
    setStatus(fuels.length ? "연료를 선택하면 추천 결과가 표시됩니다." : "선택 가능한 연료가 없습니다. 전화상담으로 확인해 주세요.");
  }

  function renderResults(variants, options = {}) {
    resultList.innerHTML = "";

    if (!variants.length) {
      resultSummary.hidden = true;
      setEmptyState("선택 정보를 다시 확인해 주세요.", "선택한 조건에 맞는 차량 상세 정보를 찾지 못했습니다.");
      setStatus("선택 조건에 맞는 차량 정보를 찾지 못했습니다.");
      return;
    }

    const matches = variants
      .flatMap((variant) => db.vehiclePartMatches
        .filter((match) => (
          IldeungDB.isActive(match) &&
          match.vehicleVariantId === variant.id &&
          match.category === "battery"
        ))
        .map((match) => ({
          variant,
          match,
          part: db.parts.find((part) => part.id === match.partId && IldeungDB.isActive(part))
        })))
      .filter((item) => item.part)
      .sort((a, b) => (
        Number(a.match.priority || 999) - Number(b.match.priority || 999) ||
        Number(a.match.price || 0) - Number(b.match.price || 0) ||
        sortKr(a.part.brand + a.part.name, b.part.brand + b.part.name)
      ));

    renderSummary(variants, matches.length);

    if (!matches.length) {
      setEmptyState(
        "상담이 필요한 차량입니다.",
        "전화상담으로 맞는 배터리를 바로 확인해 주세요.",
        `<a class="btn primary full" href="tel:${CALL_NUMBER}">전화상담 ${CALL_NUMBER}</a>`
      );
      setStatus("전화상담으로 확인이 필요한 차량입니다.");
      return;
    }

    emptyState.hidden = true;
    resultList.innerHTML = matches.map(({ variant, match, part }, index) => {
      const partName = [part.brand, part.name].filter(Boolean).join(" ");
      const capacity = part.capacityAh ? `${part.capacityAh}Ah` : "-";
      const memo = match.memo ? `<p class="result-memo">${escapeHtml(match.memo)}</p>` : "";
      const badge = index === 0 ? "우선 추천" : "대안 추천";

      return `
      <article class="result-card">
        <div class="result-top">
          <span class="vehicle-kicker">${badge}</span>
          <h3>${escapeHtml(partName)}</h3>
          <p class="result-vehicle">${escapeHtml(variant.displayName)}</p>
        </div>
        <div class="price-box">
          <span class="price-label">교체가격</span>
          <span class="price">${escapeHtml(IldeungDB.formatPrice(match.price))}</span>
          <small>출장 교체 기준 예상가</small>
        </div>
        ${memo}
        <dl class="spec-grid">
          <div class="spec-box">
            <dt class="spec-label">브랜드</dt>
            <dd class="spec-value">${escapeHtml(part.brand || "-")}</dd>
          </div>
          <div class="spec-box">
            <dt class="spec-label">규격</dt>
            <dd class="spec-value">${escapeHtml(part.spec || "-")}</dd>
          </div>
          <div class="spec-box">
            <dt class="spec-label">타입</dt>
            <dd class="spec-value">${escapeHtml(part.type || "-")}</dd>
          </div>
          <div class="spec-box">
            <dt class="spec-label">용량</dt>
            <dd class="spec-value">${escapeHtml(capacity)}</dd>
          </div>
        </dl>
        <ul class="benefit-list" aria-label="서비스 포함 사항">
          <li>정품 배터리</li>
          <li>출장 교체</li>
          <li>기본 점검</li>
        </ul>
        <div class="price-row">
          <a class="btn primary full" href="tel:${CALL_NUMBER}">전화상담 ${CALL_NUMBER}</a>
        </div>
      </article>
      `;
    }).join("");

    setStatus(matches.length + "개의 배터리 결과를 찾았습니다.");

    if (options.scroll) {
      document.querySelector(".result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  brandSelect.addEventListener("change", populateModels);
  modelSelect.addEventListener("change", populateYears);
  yearSelect.addEventListener("change", populateFuels);
  fuelSelect.addEventListener("change", () => {
    clearResults("결과를 확인할 준비가 됐습니다.", "선택한 차량 조건으로 추천 배터리를 찾습니다.");
    updateProgress();
    if (fuelSelect.value) renderResults(selectedVariants());
  });
  resetButton.addEventListener("click", () => {
    brandSelect.value = "";
    populateModels();
    setStatus("제조사를 선택해 주세요.");
    brandSelect.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!brandSelect.value) {
      setStatus("제조사를 선택해 주세요.");
      brandSelect.focus();
      return;
    }
    if (!modelSelect.value) {
      setStatus("차종을 선택해 주세요.");
      modelSelect.focus();
      return;
    }
    if (!yearSelect.value) {
      setStatus("연식을 선택해 주세요.");
      yearSelect.focus();
      return;
    }
    if (!fuelSelect.value) {
      setStatus("연료를 선택해 주세요.");
      fuelSelect.focus();
      return;
    }

    renderResults(selectedVariants(), { scroll: true });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const result = await IldeungDB.loadDb();
      db = result.data;
      populateBrands();
      clearResults();
    } catch (error) {
      console.error(error);
      setStatus("차량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setEmptyState("차량 정보를 불러오지 못했습니다.", "잠시 후 다시 시도하거나 전화상담으로 확인해 주세요.");
    }
  });
})();
