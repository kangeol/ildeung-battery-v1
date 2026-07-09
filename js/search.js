(function () {
  const MANUFACTURERS_URL = "data/manufacturers.json";
  const MANUFACTURER_LOGOS = {
    hyundai: "assets/logos/hyundai.png",
    kia: "assets/logos/kia.png",
    chevrolet: "assets/logos/chevrolet.png",
    renault: "assets/logos/renault.png",
    kgm: "assets/logos/kgm.png",
    genesis: "assets/logos/genesis.png",
    bmw: "assets/logos/bmw.png",
    benz: "assets/logos/benz.png",
    audi: "assets/logos/audi.png",
    mini: "assets/logos/mini.png",
    volkswagen: "assets/logos/volkswagen.png",
    landrover: "assets/logos/landrover.png",
    volvo: "assets/logos/volvo.png",
    jeep: "assets/logos/jeep.png",
    ford: "assets/logos/ford.png"
  };
  const PRICE_LINKS = {
    standard: {
      title: "일반·DIN 타입",
      action: "최저가 바로가기",
      url: "https://smartstore.naver.com/battery1/products/414050800",
      image: "assets/quick-links/standard-din.png",
      alt: "일반 DIN 타입 배터리"
    },
    agm: {
      title: "AGM 배터리",
      action: "최저가 바로가기",
      url: "https://smartstore.naver.com/battery1/products/575288571",
      image: "assets/quick-links/agm.png",
      alt: "AGM 배터리"
    }
  };
  const UNCLEAR_BATTERY_KEYWORDS = ["확인중", "현대순정", "규격 확인", "규격확인", "확인"];
  const MANUFACTURER_LOGO_NAMES = {
    "현대": "hyundai",
    "기아": "kia",
    "쉐보레": "chevrolet",
    "르노": "renault",
    "KG모빌리티": "kgm",
    "KG": "kgm",
    "쌍용": "kgm",
    "제네시스": "genesis"
  };
  const DOMESTIC_MANUFACTURER_ORDER = ["hyundai", "kia", "renault", "chevrolet", "kgm", "genesis"];
  const IMPORT_PRIORITY_ORDER = ["bmw", "benz", "audi", "mini", "volkswagen"];
  const MANUFACTURER_GROUP_ALIASES = {
    hyundai: ["hyundai", "현대"],
    kia: ["kia", "기아"],
    renault: ["renault", "르노"],
    chevrolet: ["chevrolet", "쉐보레", "chevy"],
    kgm: ["kg", "kgm", "kg모빌리티", "kgmobility", "ssangyong", "쌍용"],
    genesis: ["genesis", "제네시스"],
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
  const manufacturerDropdown = document.querySelector("#manufacturerDropdown");
  const manufacturerDropdownButton = document.querySelector("#manufacturerDropdownButton");
  const manufacturerDropdownPanel = document.querySelector("#manufacturerDropdownPanel");
  const manufacturerDropdownBackdrop = document.querySelector("#manufacturerDropdownBackdrop");
  const manufacturerDropdownClose = document.querySelector("#manufacturerDropdownClose");
  const manufacturerDropdownList = document.querySelector("#manufacturerDropdownList");
  const vehicleSelect = document.querySelector("#vehicleSelect");
  const vehicleDropdown = document.querySelector("#vehicleDropdown");
  const vehicleDropdownButton = document.querySelector("#vehicleDropdownButton");
  const vehicleDropdownPanel = document.querySelector("#vehicleDropdownPanel");
  const vehicleDropdownBackdrop = document.querySelector("#vehicleDropdownBackdrop");
  const vehicleDropdownClose = document.querySelector("#vehicleDropdownClose");
  const vehicleDropdownList = document.querySelector("#vehicleDropdownList");
  const detailSelect = document.querySelector("#detailSelect");
  const detailDropdown = document.querySelector("#detailDropdown");
  const detailDropdownButton = document.querySelector("#detailDropdownButton");
  const detailDropdownPanel = document.querySelector("#detailDropdownPanel");
  const detailDropdownBackdrop = document.querySelector("#detailDropdownBackdrop");
  const detailDropdownClose = document.querySelector("#detailDropdownClose");
  const detailDropdownList = document.querySelector("#detailDropdownList");
  const resultPanel = document.querySelector("#resultPanel");
  const resultBody = document.querySelector("#resultBody");
  const statusMessage = document.querySelector("#statusMessage");
  const preResultContact = document.querySelector("#preResultContact");

  let manufacturers = [];
  let vehicles = [];

  const customDropdowns = [
    {
      select: manufacturerSelect,
      root: manufacturerDropdown,
      button: manufacturerDropdownButton,
      panel: manufacturerDropdownPanel,
      backdrop: manufacturerDropdownBackdrop,
      closeButton: manufacturerDropdownClose,
      list: manufacturerDropdownList,
      enabledPlaceholder: "제조사 선택",
      disabledPlaceholder: "제조사 선택"
    },
    {
      select: vehicleSelect,
      root: vehicleDropdown,
      button: vehicleDropdownButton,
      panel: vehicleDropdownPanel,
      backdrop: vehicleDropdownBackdrop,
      closeButton: vehicleDropdownClose,
      list: vehicleDropdownList,
      enabledPlaceholder: "차량명 선택",
      disabledPlaceholder: "제조사를 먼저 선택해 주세요"
    }
  ].filter(({ select, root, button, panel, list }) => select && root && button && panel && list);

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
    syncCustomDropdown(select);
    if (select === detailSelect) syncDetailDropdown();
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
    manufacturerDropdownButton?.classList.remove("has-logo");
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
      manufacturerDropdownButton?.classList.add("has-logo");
    };

    manufacturerLogo.onerror = () => {
      manufacturerLogo.hidden = true;
      manufacturerSelect.classList.remove("has-logo");
      manufacturerDropdownButton?.classList.remove("has-logo");
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

  function customDropdownPlaceholder(config) {
    return config.select.disabled ? config.disabledPlaceholder : config.enabledPlaceholder;
  }

  function syncDropdownBodyLock() {
    const customOpen = customDropdowns.some(({ root }) => root.classList.contains("is-open"));
    const detailOpen = detailDropdown?.classList.contains("is-open");
    document.body.classList.toggle("dropdown-open", Boolean(customOpen || detailOpen));
  }

  function closeCustomDropdown(config) {
    config.root.classList.remove("is-open");
    config.button.setAttribute("aria-expanded", "false");
    config.panel.hidden = true;
    if (config.backdrop) config.backdrop.hidden = true;
    syncDropdownBodyLock();
  }

  function closeAllCustomDropdowns() {
    customDropdowns.forEach(closeCustomDropdown);
  }

  function updateCustomDropdownSelection(select) {
    const config = customDropdowns.find((item) => item.select === select);
    if (!config) return;

    const selectedOption = select.options[select.selectedIndex];
    const hasValue = Boolean(select.value);
    config.button.textContent = hasValue && selectedOption ? selectedOption.textContent : customDropdownPlaceholder(config);
    config.button.classList.toggle("is-placeholder", !hasValue);

    config.list.querySelectorAll(".custom-select-option").forEach((button) => {
      const isSelected = button.dataset.value === select.value;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function syncCustomDropdown(select) {
    const config = customDropdowns.find((item) => item.select === select);
    if (!config) return;

    closeCustomDropdown(config);
    config.button.disabled = select.disabled;
    config.list.innerHTML = "";

    Array.from(select.options).forEach((item, index) => {
      if (index === 0 && !item.value) return;

      if (item.disabled) {
        const separator = document.createElement("div");
        separator.className = "custom-select-separator";
        separator.textContent = item.textContent || "────────────";
        config.list.append(separator);
        return;
      }

      if (!item.value) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-select-option";
      button.dataset.value = item.value;
      button.textContent = item.textContent;
      button.title = item.textContent;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");

      button.addEventListener("click", () => {
        select.value = item.value;
        updateCustomDropdownSelection(select);
        closeCustomDropdown(config);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });

      config.list.append(button);
    });

    updateCustomDropdownSelection(select);
  }

  function toggleCustomDropdown(config) {
    if (config.button.disabled) return;
    const willOpen = !config.root.classList.contains("is-open");

    if (!willOpen) {
      closeCustomDropdown(config);
      return;
    }

    closeDetailDropdown();
    closeAllCustomDropdowns();
    config.root.classList.add("is-open");
    config.button.setAttribute("aria-expanded", "true");
    config.panel.hidden = false;
    if (config.backdrop) config.backdrop.hidden = false;
    syncDropdownBodyLock();
  }

  function detailDropdownPlaceholder() {
    if (!detailSelect || detailSelect.disabled) return "차량명을 먼저 선택해 주세요";
    return "세부모델 선택";
  }

  function closeDetailDropdown() {
    if (!detailDropdown || !detailDropdownButton || !detailDropdownPanel) return;
    detailDropdown.classList.remove("is-open");
    detailDropdownButton.setAttribute("aria-expanded", "false");
    detailDropdownPanel.hidden = true;
    if (detailDropdownBackdrop) detailDropdownBackdrop.hidden = true;
    syncDropdownBodyLock();
  }

  function toggleDetailDropdown() {
    if (!detailDropdown || !detailDropdownButton || !detailDropdownPanel || detailDropdownButton.disabled) return;
    const willOpen = !detailDropdown.classList.contains("is-open");

    if (willOpen) {
      closeAllCustomDropdowns();
      detailDropdown.classList.add("is-open");
      detailDropdownButton.setAttribute("aria-expanded", "true");
      detailDropdownPanel.hidden = false;
      if (detailDropdownBackdrop) detailDropdownBackdrop.hidden = false;
      syncDropdownBodyLock();
      return;
    }

    closeDetailDropdown();
  }

  function updateDetailDropdownSelection() {
    if (!detailDropdownButton || !detailDropdownList) return;

    const selectedOption = detailSelect.options[detailSelect.selectedIndex];
    const hasValue = Boolean(detailSelect.value);
    detailDropdownButton.textContent = hasValue && selectedOption ? selectedOption.textContent : detailDropdownPlaceholder();
    detailDropdownButton.classList.toggle("is-placeholder", !hasValue);

    detailDropdownList.querySelectorAll(".detail-dropdown-option").forEach((button) => {
      const isSelected = button.dataset.value === detailSelect.value;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }

  function syncDetailDropdown() {
    if (!detailDropdownButton || !detailDropdownList) return;

    closeDetailDropdown();
    detailDropdownButton.disabled = detailSelect.disabled;
    detailDropdownList.innerHTML = "";

    Array.from(detailSelect.options)
      .filter((item) => item.value)
      .forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "detail-dropdown-option";
        button.dataset.value = item.value;
        button.textContent = item.textContent;
        button.title = item.textContent;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", "false");

        button.addEventListener("click", () => {
          detailSelect.value = item.value;
          updateDetailDropdownSelection();
          closeDetailDropdown();
          detailSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });

        detailDropdownList.append(button);
      });

    updateDetailDropdownSelection();
  }

  function clearResult() {
    resultPanel.hidden = true;
    resultBody.innerHTML = "";
    setPreResultContactVisible(true);
  }

  function selectedItem() {
    if (detailSelect.value === "") return null;
    return vehicles[Number(detailSelect.value)] || null;
  }

  function setPreResultContactVisible(visible) {
    if (preResultContact) preResultContact.hidden = !visible;
  }

  function priceLinkTypes(defaultBattery) {
    const batteryText = String(defaultBattery || "").trim();
    const upperBattery = batteryText.toUpperCase();
    const compactBattery = upperBattery.replace(/\s+/g, "");

    if (upperBattery.includes("AGM")) return ["agm"];

    const isUnclear = !batteryText || UNCLEAR_BATTERY_KEYWORDS.some((keyword) => (
      upperBattery.includes(keyword) || compactBattery.includes(keyword.replace(/\s+/g, ""))
    ));

    return isUnclear ? ["standard", "agm"] : ["standard"];
  }

  function priceLinkCard(type) {
    const link = PRICE_LINKS[type];
    if (!link) return "";

    return `
          <a class="price-link-card" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-media">
              <img class="price-link-image" src="${escapeHtml(link.image)}" alt="${escapeHtml(link.alt)}" loading="lazy" decoding="async" onload="this.parentElement.classList.add('has-image')" onerror="this.hidden=true">
              <span class="price-link-fallback">상품 바로가기</span>
            </span>
            <span class="price-link-text">
              <strong>${escapeHtml(link.title)}</strong>
              <em>${escapeHtml(link.action)}</em>
            </span>
          </a>
    `;
  }

  function priceLinksSection(item) {
    return `
        <section class="price-links" aria-label="배터리 최저가 바로가기">
          <div class="price-links-heading">
            <strong>배터리 최저가 바로가기</strong>
            <p>추천 배터리 유형에 맞는 상품을 바로 확인해보세요.</p>
          </div>
          <div class="price-link-grid">
            ${priceLinkTypes(item.defaultBattery).map(priceLinkCard).join("")}
          </div>
        </section>
    `;
  }

  function phoneCtaMarkup(extraClass = "") {
    return `
        <a class="phone-cta ${escapeHtml(extraClass)}" href="tel:16449141" aria-label="출장배터리 전화상담">
          <span class="phone-cta-copy">
            <strong>출장배터리 전화상담</strong>
            <em>차량 위치에서 빠르게 배터리 교체를 도와드립니다.</em>
          </span>
          <span class="phone-cta-button">1644-9141 전화하기</span>
        </a>
    `;
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

        ${priceLinksSection(item)}

        <section class="notice" aria-label="안내문">
          <p>※ 위 추천 배터리는 일등밧데리 검수 DB 기준입니다.</p>
          <p>※ 차량 상태에 따라 배터리 규격이 달라질 수 있으므로 전문기사 상담을 권장합니다.</p>
        </section>

        ${phoneCtaMarkup("result-phone-cta")}
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
    setPreResultContactVisible(false);
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
    syncCustomDropdown(manufacturerSelect);
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

    syncCustomDropdown(vehicleSelect);
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

    syncDetailDropdown();
    setMessage(items.length ? "세부모델을 선택해 주세요." : "차량명을 선택해 주세요.");
  }

  if (manufacturerLogo) {
    manufacturerLogo.addEventListener("error", () => {
      manufacturerLogo.hidden = true;
      manufacturerSelect.classList.remove("has-logo");
    });
  }

  customDropdowns.forEach((config) => {
    config.button.addEventListener("click", () => toggleCustomDropdown(config));
    config.button.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCustomDropdown(config);
    });

    config.closeButton?.addEventListener("click", () => closeCustomDropdown(config));
    config.backdrop?.addEventListener("click", () => closeCustomDropdown(config));
  });

  if (detailDropdownButton) {
    detailDropdownButton.addEventListener("click", toggleDetailDropdown);
    detailDropdownButton.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDetailDropdown();
    });
  }

  if (detailDropdownClose) {
    detailDropdownClose.addEventListener("click", closeDetailDropdown);
  }

  if (detailDropdownBackdrop) {
    detailDropdownBackdrop.addEventListener("click", closeDetailDropdown);
  }

  document.addEventListener("click", (event) => {
    customDropdowns.forEach((config) => {
      if (config.root.contains(event.target)) return;
      closeCustomDropdown(config);
    });

    if (!detailDropdown || detailDropdown.contains(event.target)) return;
    closeDetailDropdown();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllCustomDropdowns();
      closeDetailDropdown();
    }
  });

  manufacturerSelect.addEventListener("change", () => {
    updateCustomDropdownSelection(manufacturerSelect);
    updateManufacturerLogo();
    populateVehicles();
  });
  vehicleSelect.addEventListener("change", () => {
    updateCustomDropdownSelection(vehicleSelect);
    populateDetails();
  });
  detailSelect.addEventListener("change", () => {
    updateDetailDropdownSelection();
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
