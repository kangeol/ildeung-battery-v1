(function () {
  let db = null;
  const brandSelect = document.querySelector("#brandSelect");
  const modelSelect = document.querySelector("#modelSelect");
  const yearSelect = document.querySelector("#yearSelect");
  const fuelSelect = document.querySelector("#fuelSelect");
  const form = document.querySelector("#batterySearchForm");
  const status = document.querySelector("#searchStatus");
  const emptyState = document.querySelector("#emptyState");
  const resultList = document.querySelector("#resultList");

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

  function selectedVariant() {
    return db.vehicleVariants.find((variant) => (
      IldeungDB.isActive(variant) &&
      variant.modelId === modelSelect.value &&
      String(variant.year) === yearSelect.value &&
      variant.fuelType === fuelSelect.value
    ));
  }

  function populateBrands() {
    resetSelect(brandSelect, "제조사 선택", false);
    activeBrands().forEach((brand) => {
      brandSelect.append(option(brand.id, brand.nameKr));
    });
    status.textContent = "제조사를 선택해 주세요.";
  }

  function populateModels() {
    resetSelect(modelSelect, brandSelect.value ? "차종 선택" : "제조사를 먼저 선택", !brandSelect.value);
    resetSelect(yearSelect, "차종을 먼저 선택");
    resetSelect(fuelSelect, "연식을 먼저 선택");
    resultList.innerHTML = "";
    emptyState.hidden = false;

    if (!brandSelect.value) return;

    activeModelsByBrand(brandSelect.value).forEach((model) => {
      const label = [model.nameKr, model.generation].filter(Boolean).join(" ");
      modelSelect.append(option(model.id, label));
    });
    status.textContent = "차종을 선택해 주세요.";
  }

  function populateYears() {
    const variants = activeVariantsByModel(modelSelect.value);
    const years = [...new Set(variants.map((variant) => variant.year))].sort((a, b) => b - a);

    resetSelect(yearSelect, years.length ? "연식 선택" : "선택 가능한 연식 없음", !years.length);
    resetSelect(fuelSelect, "연식을 먼저 선택");
    resultList.innerHTML = "";
    emptyState.hidden = false;

    years.forEach((year) => {
      yearSelect.append(option(String(year), year + "년식"));
    });
    status.textContent = years.length ? "연식을 선택해 주세요." : "선택 가능한 연식이 없습니다.";
  }

  function populateFuels() {
    const fuels = [...new Set(
      activeVariantsByModel(modelSelect.value)
        .filter((variant) => String(variant.year) === yearSelect.value)
        .map((variant) => variant.fuelType)
    )].sort(sortKr);

    resetSelect(fuelSelect, fuels.length ? "연료 선택" : "선택 가능한 연료 없음", !fuels.length);
    resultList.innerHTML = "";
    emptyState.hidden = false;

    fuels.forEach((fuel) => fuelSelect.append(option(fuel)));
    status.textContent = fuels.length ? "연료를 선택하고 결과를 확인해 주세요." : "선택 가능한 연료가 없습니다.";
  }

  function renderResults(variant) {
    const matches = db.vehiclePartMatches
      .filter((match) => (
        IldeungDB.isActive(match) &&
        match.vehicleVariantId === variant.id &&
        match.category === "battery"
      ))
      .map((match) => ({
        match,
        part: db.parts.find((part) => part.id === match.partId && IldeungDB.isActive(part))
      }))
      .filter((item) => item.part)
      .sort((a, b) => Number(a.match.priority || 999) - Number(b.match.priority || 999));

    resultList.innerHTML = "";

    if (!matches.length) {
      emptyState.hidden = false;
      emptyState.innerHTML = `
        <strong>상담이 필요한 차량입니다.</strong>
        <p>전화상담으로 맞는 배터리를 바로 확인해 주세요.</p>
        <a class="btn primary full" href="tel:1644-9141">전화상담 1644-9141</a>
      `;
      status.textContent = "전화상담으로 확인이 필요한 차량입니다.";
      return;
    }

    emptyState.hidden = true;
    const vehicleName = variant.displayName;
    resultList.innerHTML = matches.map(({ match, part }) => `
      <article class="result-card">
        <div class="result-top">
          <span class="vehicle-kicker">선택한 차량</span>
          <h3>${vehicleName}</h3>
        </div>
        <div class="battery-name">
          <span class="spec-label">추천 배터리</span>
          <strong>${part.brand} ${part.name}</strong>
        </div>
        <div class="spec-grid">
          <div class="spec-box">
            <span class="spec-label">브랜드</span>
            <span class="spec-value">${part.brand}</span>
          </div>
          <div class="spec-box">
            <span class="spec-label">규격</span>
            <span class="spec-value">${part.spec || "-"}</span>
          </div>
          <div class="spec-box">
            <span class="spec-label">타입</span>
            <span class="spec-value">${part.type || "-"}</span>
          </div>
        </div>
        <div class="price-box">
          <span class="price-label">교체가격</span>
          <span class="price">${IldeungDB.formatPrice(match.price)}</span>
        </div>
        <div class="price-row">
          <a class="btn primary full" href="tel:1644-9141">전화상담 1644-9141</a>
        </div>
      </article>
    `).join("");

    status.textContent = matches.length + "개의 배터리 결과를 찾았습니다.";
  }

  brandSelect.addEventListener("change", populateModels);
  modelSelect.addEventListener("change", populateYears);
  yearSelect.addEventListener("change", populateFuels);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const variant = selectedVariant();
    if (!brandSelect.value) {
      status.textContent = "제조사를 선택해 주세요.";
      brandSelect.focus();
      return;
    }
    if (!modelSelect.value) {
      status.textContent = "차종을 선택해 주세요.";
      modelSelect.focus();
      return;
    }
    if (!yearSelect.value) {
      status.textContent = "연식을 선택해 주세요.";
      yearSelect.focus();
      return;
    }
    if (!fuelSelect.value || !variant) {
      status.textContent = "연료를 선택해 주세요.";
      fuelSelect.focus();
      return;
    }

    renderResults(variant);
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const result = await IldeungDB.loadDb();
      db = result.data;
      populateBrands();
    } catch (error) {
      console.error(error);
      status.textContent = "차량 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }
  });
})();
