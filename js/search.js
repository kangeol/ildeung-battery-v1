(function () {
  const MANUFACTURERS_URL = "data/manufacturers.json";
  const MANUFACTURER_LOGOS = {
    hyundai: "assets/logos/hyundai.png",
    kia: "assets/logos/kia.png",
    chevrolet: "assets/logos/chevrolet.png",
    renault: "assets/logos/renault.png",
    kgm: "assets/logos/kgm.png"
  };
  const MANUFACTURER_LOGO_NAMES = {
    "현대": "hyundai",
    "기아": "kia",
    "쉐보레": "chevrolet",
    "르노": "renault",
    "KG모빌리티": "kgm",
    "KG": "kgm",
    "쌍용": "kgm"
  };
  const DOMESTIC_MANUFACTURER_ORDER = ["hyundai", "kia", "renault", "chevrolet", "kgm"];
  const IMPORT_PRIORITY_ORDER = ["bmw", "benz", "audi", "mini", "volkswagen"];
  const MANUFACTURER_GROUP_ALIASES = {
    hyundai: ["hyundai", "현대"],
    kia: ["kia", "기아"],
    renault: ["renault", "르노"],
    chevrolet: ["chevrolet", "쉐보레", "chevy"],
    kgm: ["kg", "kgm", "kg모빌리티", "kgmobility", "ssangyong", "쌍용"],
    bmw: ["bmw"],
    benz: ["benz", "mercedes", "mercedesbenz", "메르세데스벤츠", "벤츠"],
    audi: ["audi", "아우디"],
    mini: ["mini", "미니"],
    volkswagen: ["volkswagen", "vw", "폭스바겐"]
  };
  const MANUFACTURER_GROUP_LOOKUP = Object.fromEntries(
    Object.entries(MANUFACTURER_GROUP_ALIASES).flatMap(([group, aliases]) => (
      aliases.map((alias) => [normalizeManufacturerKey(alias), group])
    ))
  );

  const manufacturerSelect = document.querySelector("#manufacturerSelect");
  const manufacturerLogo = document.querySelector("#manufacturerLogo");
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

  function normalizeManufacturerKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-()]/g, "");
  }

  function manufacturerGroup(manufacturer) {
    const keys = [
      manufacturer?.id,
      manufacturer?.name,
      manufacturer?.manufacturer
    ].map(normalizeManufacturerKey);

    return keys.map((key) => MANUFACTURER_GROUP_LOOKUP[key]).find(Boolean) || keys[0] || "";
  }

  function sortByOrder(items, order) {
    return items.sort((a, b) => {
      const groupA = manufacturerGroup(a);
      const groupB = manufacturerGroup(b);
      const orderA = order.indexOf(groupA);
      const orderB = order.indexOf(groupB);
      const fixedA = orderA >= 0;
      const fixedB = orderB >= 0;

      if (fixedA && fixedB && orderA !== orderB) return orderA - orderB;
      if (fixedA !== fixedB) return fixedA ? -1 : 1;
      return String(a.name).localeCompare(String(b.name), "ko");
    });
  }

  function sortedManufacturers(items) {
    const domesticGroups = new Set(DOMESTIC_MANUFACTURER_ORDER);
    const domestic = [];
    const imports = [];

    items.forEach((manufacturer) => {
      if (domesticGroups.has(manufacturerGroup(manufacturer))) {
        domestic.push(manufacturer);
        return;
      }
      imports.push(manufacturer);
    });

    return {
      domestic: sortByOrder(domestic, DOMESTIC_MANUFACTURER_ORDER),
      imports: sortByOrder(imports, IMPORT_PRIORITY_ORDER)
    };
  }

  function separatorOption() {
    const item = option("", "────────────");
    item.disabled = true;
    return item;
  }

  function manufacturerLogoSrc(manufacturer) {
    const id = String(manufacturer?.id || "").trim();
    const name = String(manufacturer?.name || manufacturer?.manufacturer || "").trim();

    if (MANUFACTURER_LOGOS[id]) return MANUFACTURER_LOGOS[id];
    if (MANUFACTURER_LOGO_NAMES[name]) return MANUFACTURER_LOGOS[MANUFACTURER_LOGO_NAMES[name]];
    return "";
  }

  function selectedManufacturer() {
    return manufacturers.find((item) => item.id === manufacturerSelect.value) || null;
  }

  function updateManufacturerLogo() {
    const manufacturer = selectedManufacturer();
    const logoSrc = manufacturerLogoSrc(manufacturer);

    if (!manufacturerLogo) return;

    manufacturerSelect.classList.remove("has-logo");
    manufacturerLogo.hidden = true;
    manufacturerLogo.alt = logoSrc && manufacturer ? `${manufacturer.name} 로고` : "";
    manufacturerLogo.onload = null;
    manufacturerLogo.onerror = null;

    if (!logoSrc) {
      manufacturerLogo.removeAttribute("src");
      return;
    }

    manufacturerLogo.onload = () => {
      manufacturerLogo.hidden = false;
      manufacturerSelect.classList.add("has-logo");
    };

    manufacturerLogo.onerror = () => {
      manufacturerLogo.hidden = true;
      manufacturerSelect.classList.remove("has-logo");
      manufacturerLogo.removeAttribute("src");
    };

    manufacturerLogo.src = logoSrc;
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
    const logoSrc = manufacturerLogoSrc({
      id: manufacturerSelect.value,
      manufacturer: item.manufacturer
    });
    const resultLogo = logoSrc ? `
          <div class="vehicle-logo-panel">
            <img class="vehicle-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(item.manufacturer)} 로고" hidden>
          </div>
    ` : "";
    const upgradeCard = hasUpgradeBattery ? `
        <section class="battery-card upgrade" aria-label="업그레이드 추천 배터리">
          <span>업그레이드 추천 배터리</span>
          <strong>${escapeHtml(item.upgradeBattery)}</strong>
        </section>
    ` : "";

    resultBody.innerHTML = `
      <article class="result-card">
        <section class="selected-vehicle ${resultLogo ? "has-logo" : "no-logo"}" aria-label="선택한 차량">
          ${resultLogo}
          <div class="vehicle-summary">
            <span>선택한 차량</span>
            <strong>${escapeHtml(item.manufacturer)}</strong>
            <strong>${escapeHtml(item.vehicle)}</strong>
            <p class="vehicle-detail-model">${escapeHtml(detailModelLine(item))}</p>
            <p>${escapeHtml(item.fuel)}</p>
          </div>
        </section>

        <section class="battery-card" aria-label="기본 추천 배터리">
          <span>기본 추천 배터리</span>
          <strong>${escapeHtml(item.defaultBattery || "확인중")}</strong>
        </section>

        ${upgradeCard}

        <a class="contact-card" href="tel:16449141" aria-label="출장배터리교체 문의 전화">
          <span>출장배터리교체 문의</span>
          <strong>1644-9141</strong>
        </a>

        <section class="notice" aria-label="안내문">
          <p>※ 위 추천 배터리는 일등밧데리 검수 DB 기준입니다.</p>
          <p>※ 차량 상태에 따라 배터리 규격이 달라질 수 있으므로 전문기사 상담을 권장합니다.</p>
        </section>
      </article>
    `;

    const renderedLogo = resultBody.querySelector(".vehicle-logo");
    if (renderedLogo) {
      const selectedVehicleCard = renderedLogo.closest(".selected-vehicle");
      const logoPanel = renderedLogo.closest(".vehicle-logo-panel");
      const hideLogo = () => {
        logoPanel?.remove();
        selectedVehicleCard?.classList.remove("has-logo");
        selectedVehicleCard?.classList.add("no-logo");
      };
      const showLogo = () => {
        renderedLogo.hidden = false;
      };

      renderedLogo.addEventListener("load", showLogo);
      renderedLogo.addEventListener("error", hideLogo);

      if (renderedLogo.complete) {
        if (renderedLogo.naturalWidth > 0) {
          showLogo();
        } else {
          hideLogo();
        }
      }
    }

    resultPanel.hidden = false;
    setMessage("선택한 차량의 추천 배터리를 확인했습니다.");
  }

  function populateManufacturers() {
    const sorted = sortedManufacturers(manufacturers);

    resetSelect(manufacturerSelect, "제조사 선택", false);
    sorted.domestic.forEach((manufacturer) => {
      manufacturerSelect.append(option(manufacturer.id, manufacturer.name));
    });
    if (sorted.domestic.length && sorted.imports.length) {
      manufacturerSelect.append(separatorOption());
    }
    sorted.imports.forEach((manufacturer) => {
      manufacturerSelect.append(option(manufacturer.id, manufacturer.name));
    });
    updateManufacturerLogo();
    setMessage("제조사를 선택해 주세요.");
  }

  async function loadManufacturerVehicles() {
    const manufacturer = selectedManufacturer();
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
      ));

    resetSelect(detailSelect, "세부모델 선택", !items.length);
    clearResult();

    items.forEach(({ item, index }) => {
      detailSelect.append(option(String(index), detailLabel(item)));
    });

    setMessage(items.length ? "세부모델을 선택해 주세요." : "차량명을 선택해 주세요.");
  }

  if (manufacturerLogo) {
    manufacturerLogo.addEventListener("error", () => {
      manufacturerLogo.hidden = true;
      manufacturerSelect.classList.remove("has-logo");
    });
  }

  manufacturerSelect.addEventListener("change", () => {
    updateManufacturerLogo();
    populateVehicles();
  });
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
