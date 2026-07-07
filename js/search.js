(function () {
  const MANUFACTURERS_URL = "data/manufacturers.json";

  const manufacturerSelect = document.querySelector("#manufacturerSelect");
  const vehicleSelect = document.querySelector("#vehicleSelect");
  const detailSelect = document.querySelector("#detailSelect");
  const resultPanel = document.querySelector("#resultPanel");
  const resultBody = document.querySelector("#resultBody");
  const statusMessage = document.querySelector("#statusMessage");

  let manufacturers = [];
  let vehicles = [];

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

  function unique(values) {
    return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), "ko"));
  }

  function setMessage(message) {
    statusMessage.textContent = message;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} 파일을 불러오지 못했습니다.`);
    return response.json();
  }

  function yearLabel(year) {
    const text = String(year || "").trim();
    if (!text) return "";
    return /^\d{4}$/.test(text) ? `${text}년식` : text;
  }

  function detailLabel(item) {
    return [item.detailModel, yearLabel(item.year) ? `(${yearLabel(item.year)})` : "", item.fuel]
      .filter(Boolean)
      .join(" ");
  }

  function detailModelLine(item) {
    return [item.detailModel, yearLabel(item.year) ? `(${yearLabel(item.year)})` : ""]
      .filter(Boolean)
      .join(" ");
  }

  function clearResult() {
    resultPanel.hidden = true;
    resultBody.innerHTML = "";
  }

  function selectedItem() {
    if (detailSelect.value === "") return null;
    return vehicles[Number(detailSelect.value)] || null;
  }

  function renderResult() {
    const item = selectedItem();

    if (!item) {
      clearResult();
      setMessage("선택값에 맞는 차량 정보를 찾지 못했습니다.");
      return;
    }

    const hasUpgradeBattery = Boolean(String(item.upgradeBattery || "").trim());
    const upgradeCard = hasUpgradeBattery ? `
        <section class="battery-card upgrade" aria-label="업그레이드 추천 배터리">
          <span>업그레이드 추천 배터리</span>
          <strong>${escapeHtml(item.upgradeBattery)}</strong>
        </section>
    ` : "";
    const waitingStatus = item.status === "대기";
    const statusClass = waitingStatus ? "is-waiting" : "is-complete";

    resultBody.innerHTML = `
      <article class="result-card">
        <section class="selected-vehicle" aria-label="선택한 차량">
          <div class="vehicle-summary">
            <span>선택한 차량</span>
            <strong>${escapeHtml(item.manufacturer)}</strong>
            <strong>${escapeHtml(item.vehicle)}</strong>
            <p>${escapeHtml(detailModelLine(item))}</p>
            <p>${escapeHtml(item.fuel)}</p>
          </div>
        </section>

        <section class="battery-card" aria-label="기본 추천 배터리">
          <span>기본 추천 배터리</span>
          <strong>${escapeHtml(item.defaultBattery || "확인중")}</strong>
        </section>

        ${upgradeCard}

        <section class="status-row" aria-label="검수상태">
          <span>검수상태</span>
          <strong class="status-badge ${statusClass}">${escapeHtml(item.status || "대기")}</strong>
        </section>

        <section class="notice" aria-label="안내문">
          <p>※ 위 추천 배터리는 일등밧데리 검수 DB 기준입니다.</p>
          <p>※ 차량 상태에 따라 배터리 규격이 달라질 수 있으므로 전문기사 상담을 권장합니다.</p>
        </section>
      </article>
    `;

    resultPanel.hidden = false;
    setMessage("선택한 차량의 추천 배터리를 확인했습니다.");
  }

  function populateManufacturers() {
    resetSelect(manufacturerSelect, "제조사 선택", false);
    manufacturers.forEach((manufacturer) => {
      manufacturerSelect.append(option(manufacturer.id, manufacturer.name));
    });
    setMessage("제조사를 선택해 주세요.");
  }

  async function loadManufacturerVehicles() {
    const manufacturer = manufacturers.find((item) => item.id === manufacturerSelect.value);
    vehicles = [];

    resetSelect(vehicleSelect, "차량명 선택", true);
    resetSelect(detailSelect, "차량명을 먼저 선택", true);
    clearResult();

    if (!manufacturer) {
      setMessage("제조사를 선택해 주세요.");
      return [];
    }

    vehicles = await fetchJson(`data/${manufacturer.file}`);
    return vehicles;
  }

  async function populateVehicles() {
    let items = [];

    try {
      items = await loadManufacturerVehicles();
    } catch (error) {
      console.error(error);
      setMessage("선택한 제조사 DB를 불러오지 못했습니다.");
      return;
    }

    resetSelect(vehicleSelect, "차량명 선택", !items.length);
    resetSelect(detailSelect, "차량명을 먼저 선택", true);
    clearResult();

    unique(items.map((item) => item.vehicle).filter(Boolean)).forEach((vehicle) => {
      vehicleSelect.append(option(vehicle));
    });

    setMessage(items.length ? "차량명을 선택해 주세요." : "제조사를 선택해 주세요.");
  }

  function populateDetails() {
    const items = vehicles
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (
        item.vehicle === vehicleSelect.value
      ))
      .sort((a, b) => detailLabel(a.item).localeCompare(detailLabel(b.item), "ko"));

    resetSelect(detailSelect, "세부모델 선택", !items.length);
    clearResult();

    items.forEach(({ item, index }) => {
      detailSelect.append(option(String(index), detailLabel(item)));
    });

    setMessage(items.length ? "세부모델을 선택해 주세요." : "차량명을 선택해 주세요.");
  }

  manufacturerSelect.addEventListener("change", populateVehicles);
  vehicleSelect.addEventListener("change", populateDetails);
  detailSelect.addEventListener("change", () => {
    if (detailSelect.value) {
      renderResult();
      return;
    }
    clearResult();
    setMessage("세부모델을 선택해 주세요.");
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      manufacturers = await fetchJson(MANUFACTURERS_URL);
      populateManufacturers();
    } catch (error) {
      console.error(error);
      setMessage("제조사 DB를 불러오지 못했습니다.");
    }
  });
})();
