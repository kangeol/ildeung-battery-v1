(function () {
  let db = null;
  let dbSource = "json";

  const status = document.querySelector("#adminStatus");
  const summary = document.querySelector("#adminSummary");
  const datasetSelect = document.querySelector("#datasetSelect");
  const dataPreview = document.querySelector("#dataPreview");

  const DATA_LABELS = {
    brands: "브랜드",
    vehicleModels: "차량 모델",
    vehicleVariants: "차량 상세",
    parts: "부품",
    vehiclePartMatches: "매칭"
  };

  const EXPORT_NAMES = IldeungDB.EXPORT_NAMES;

  function $(selector) {
    return document.querySelector(selector);
  }

  function value(selector) {
    return $(selector).value.trim();
  }

  function numberValue(selector) {
    const number = Number(value(selector));
    return Number.isFinite(number) ? number : 0;
  }

  function checked(selector) {
    return $(selector).checked;
  }

  function option(value, label = value) {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    return item;
  }

  function splitAliases(text) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function saveAndRender(message) {
    IldeungDB.saveDb(db);
    renderAll();
    setStatus(message + " localStorage에 저장했습니다.");
  }

  function renderSummary() {
    const counts = IldeungDB.getSummary(db);
    summary.innerHTML = [
      ["데이터 소스", dbSource === "localStorage" ? "localStorage" : "JSON"],
      ["브랜드", counts.brands],
      ["차량 모델", counts.vehicleModels],
      ["차량 상세", counts.vehicleVariants],
      ["부품", counts.parts],
      ["매칭", counts.vehiclePartMatches]
    ].map(([label, count]) => `
      <article class="summary-pill">
        <span>${label}</span>
        <strong>${count}</strong>
      </article>
    `).join("");
  }

  function renderDataPreview() {
    const key = datasetSelect.value;
    dataPreview.textContent = JSON.stringify(db[key], null, 2);
  }

  function renderSelects() {
    const brandSelect = $("#vehicleBrandId");
    brandSelect.innerHTML = "";
    db.brands.forEach((brand) => brandSelect.append(option(brand.id, brand.nameKr + " (" + brand.id + ")")));

    const variantSelect = $("#matchVehicleVariantId");
    variantSelect.innerHTML = "";
    db.vehicleVariants.forEach((variant) => {
      variantSelect.append(option(variant.id, variant.displayName + " (" + variant.id + ")"));
    });

    const partSelect = $("#matchPartId");
    partSelect.innerHTML = "";
    db.parts.forEach((part) => {
      partSelect.append(option(part.id, part.brand + " " + part.name + " (" + part.id + ")"));
    });

    $("#matchId").value = nextMatchId();
    renderActiveItems();
  }

  function nextMatchId() {
    const max = db.vehiclePartMatches.reduce((current, match) => {
      const number = Number(String(match.id).replace("match_", ""));
      return Number.isFinite(number) ? Math.max(current, number) : current;
    }, 0);
    return "match_" + String(max + 1).padStart(3, "0");
  }

  function renderMatchEditor() {
    const body = $("#matchEditBody");
    body.innerHTML = db.vehiclePartMatches.map((match) => {
      const vehicle = IldeungDB.getVehicleLabel(db, match.vehicleVariantId);
      const part = IldeungDB.getPartLabel(db, match.partId);
      return `
        <tr data-match-id="${match.id}">
          <td>${vehicle}<br><span class="spec-label">${match.vehicleVariantId}</span></td>
          <td>${part}<br><span class="spec-label">${match.partId}</span></td>
          <td><input class="edit-price" type="number" min="0" step="1000" value="${Number(match.price || 0)}"></td>
          <td><input class="edit-priority" type="number" min="1" value="${Number(match.priority || 1)}"></td>
          <td>
            <select class="edit-active">
              <option value="true"${match.isActive !== false ? " selected" : ""}>활성</option>
              <option value="false"${match.isActive === false ? " selected" : ""}>숨김</option>
            </select>
          </td>
          <td><button class="btn secondary save-match" type="button">저장</button></td>
        </tr>
      `;
    }).join("");
  }

  function renderActiveItems() {
    const key = $("#activeDataset").value;
    const select = $("#activeItem");
    select.innerHTML = "";
    db[key].forEach((item) => {
      const label = item.displayName || item.nameKr || item.name || item.id;
      select.append(option(item.id, label + " (" + item.id + ")"));
    });
  }

  function renderAll() {
    renderSummary();
    renderDataPreview();
    renderSelects();
    renderMatchEditor();
  }

  $("#vehicleForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const model = {
      id: value("#vehicleModelId"),
      brandId: value("#vehicleBrandId"),
      nameKr: value("#vehicleNameKr"),
      nameEn: value("#vehicleNameEn"),
      generation: value("#vehicleGeneration"),
      aliases: splitAliases(value("#vehicleAliases")),
      startYear: numberValue("#vehicleStartYear"),
      endYear: numberValue("#vehicleEndYear"),
      isActive: checked("#vehicleIsActive")
    };

    const variant = {
      id: value("#vehicleVariantId"),
      modelId: model.id,
      year: numberValue("#vehicleYear"),
      fuelType: value("#vehicleFuelType"),
      engine: value("#vehicleEngine"),
      trim: value("#vehicleTrim"),
      displayName: value("#vehicleDisplayName"),
      bodyType: value("#vehicleBodyType"),
      transmission: value("#vehicleTransmission"),
      isActive: checked("#vehicleIsActive")
    };

    IldeungDB.upsertById(db.vehicleModels, model);
    IldeungDB.upsertById(db.vehicleVariants, variant);
    event.target.reset();
    $("#vehicleIsActive").checked = true;
    saveAndRender("차량 정보를 저장했습니다.");
  });

  $("#partForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const part = {
      id: value("#partId"),
      category: value("#partCategory"),
      brand: value("#partBrand"),
      manufacturer: value("#partManufacturer"),
      name: value("#partName"),
      spec: value("#partSpec"),
      type: value("#partType"),
      capacityAh: numberValue("#partCapacityAh"),
      isActive: checked("#partIsActive")
    };

    IldeungDB.upsertById(db.parts, part);
    event.target.reset();
    $("#partCategory").value = "battery";
    $("#partIsActive").checked = true;
    saveAndRender("부품 정보를 저장했습니다.");
  });

  $("#matchForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const match = {
      id: value("#matchId"),
      vehicleVariantId: value("#matchVehicleVariantId"),
      partId: value("#matchPartId"),
      category: value("#matchCategory"),
      price: numberValue("#matchPrice"),
      priority: numberValue("#matchPriority"),
      memo: value("#matchMemo"),
      isActive: checked("#matchIsActive")
    };

    IldeungDB.upsertById(db.vehiclePartMatches, match);
    event.target.reset();
    $("#matchCategory").value = "battery";
    $("#matchPriority").value = "1";
    $("#matchIsActive").checked = true;
    saveAndRender("매칭 정보를 저장했습니다.");
  });

  $("#matchEditBody").addEventListener("click", (event) => {
    const button = event.target.closest(".save-match");
    if (!button) return;

    const row = button.closest("tr");
    const match = db.vehiclePartMatches.find((item) => item.id === row.dataset.matchId);
    if (!match) return;

    match.price = Number(row.querySelector(".edit-price").value || 0);
    match.priority = Number(row.querySelector(".edit-priority").value || 1);
    match.isActive = row.querySelector(".edit-active").value === "true";
    saveAndRender("매칭 수정사항을 저장했습니다.");
  });

  $("#activeDataset").addEventListener("change", renderActiveItems);

  $("#activeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const key = $("#activeDataset").value;
    const id = $("#activeItem").value;
    const item = db[key].find((entry) => entry.id === id);
    if (!item) return;

    item.isActive = $("#activeValue").value === "true";
    saveAndRender("활성 상태를 수정했습니다.");
  });

  datasetSelect.addEventListener("change", renderDataPreview);

  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.export;
      IldeungDB.downloadJson(EXPORT_NAMES[key], db[key]);
      setStatus(EXPORT_NAMES[key] + " 파일을 내보냈습니다.");
    });
  });

  $("#exportAll").addEventListener("click", () => {
    IldeungDB.downloadJson("ildeung_battery_db_all.json", db);
    setStatus("전체 JSON 묶음을 내보냈습니다.");
  });

  $("#resetLocal").addEventListener("click", async () => {
    if (!confirm("브라우저에 저장된 관리자 수정 데이터를 지우고 기본 JSON을 다시 불러올까요?")) return;
    IldeungDB.clearLocalDb();
    const result = await IldeungDB.loadDb();
    db = result.data;
    dbSource = result.source;
    renderAll();
    setStatus("localStorage를 초기화했습니다.");
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const result = await IldeungDB.loadDb();
      db = result.data;
      dbSource = result.source;
      renderAll();
      setStatus(dbSource === "localStorage" ? "localStorage DB를 불러왔습니다." : "기본 JSON DB를 불러왔습니다.");
    } catch (error) {
      console.error(error);
      setStatus("DB를 불러오지 못했습니다. GitHub Pages 환경에서 다시 확인해 주세요.");
    }
  });
})();
