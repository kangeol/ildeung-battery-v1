(function () {
  const STORAGE_KEY = "ildeung_battery_platform_db_v1";

  const FILES = {
    brands: "data/brands.json",
    vehicleModels: "data/vehicle_models.json",
    vehicleVariants: "data/vehicle_variants.json",
    parts: "data/parts.json",
    vehiclePartMatches: "data/vehicle_part_matches.json"
  };

  const EXPORT_NAMES = {
    brands: "brands.json",
    vehicleModels: "vehicle_models.json",
    vehicleVariants: "vehicle_variants.json",
    parts: "parts.json",
    vehiclePartMatches: "vehicle_part_matches.json"
  };

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/-/g, "");
  }

  function isActive(item) {
    return item && item.isActive !== false;
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "가격 문의";
    return number.toLocaleString("ko-KR") + "원";
  }

  function getLocalDb() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const hasAllKeys = Object.keys(FILES).every((key) => Array.isArray(parsed[key]));
      return hasAllKeys ? parsed : null;
    } catch (error) {
      console.warn("localStorage DB를 읽지 못했습니다.", error);
      return null;
    }
  }

  async function fetchJson(file) {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(file + " 파일을 불러오지 못했습니다.");
    }
    return response.json();
  }

  async function loadDb() {
    const localDb = getLocalDb();
    if (localDb) {
      return { source: "localStorage", data: localDb };
    }

    const entries = await Promise.all(
      Object.entries(FILES).map(async ([key, file]) => [key, await fetchJson(file)])
    );

    return {
      source: "json",
      data: Object.fromEntries(entries)
    };
  }

  function saveDb(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearLocalDb() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getSummary(db) {
    return {
      brands: db.brands.length,
      vehicleModels: db.vehicleModels.length,
      vehicleVariants: db.vehicleVariants.length,
      parts: db.parts.length,
      vehiclePartMatches: db.vehiclePartMatches.length
    };
  }

  function findById(items, id) {
    return items.find((item) => item.id === id);
  }

  function getVehicleLabel(db, variantId) {
    const variant = findById(db.vehicleVariants, variantId);
    if (!variant) return variantId;
    const model = findById(db.vehicleModels, variant.modelId);
    const brand = model ? findById(db.brands, model.brandId) : null;
    return variant.displayName || [brand?.nameKr, model?.nameKr, model?.generation, variant.year, variant.fuelType].filter(Boolean).join(" ");
  }

  function getPartLabel(db, partId) {
    const part = findById(db.parts, partId);
    return part ? [part.brand, part.name, part.spec].filter(Boolean).join(" ") : partId;
  }

  function upsertById(items, item) {
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      items[index] = item;
      return "updated";
    }
    items.push(item);
    return "created";
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function renderHomeStats(db) {
    const container = document.querySelector("#homeStats");
    if (!container) return;

    const summary = getSummary(db);
    container.innerHTML = [
      ["브랜드", summary.brands],
      ["차량 상세", summary.vehicleVariants],
      ["부품", summary.parts],
      ["매칭", summary.vehiclePartMatches]
    ].map(([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `).join("");
  }

  window.IldeungDB = {
    STORAGE_KEY,
    FILES,
    EXPORT_NAMES,
    normalize,
    isActive,
    formatPrice,
    loadDb,
    saveDb,
    clearLocalDb,
    downloadJson,
    getSummary,
    findById,
    getVehicleLabel,
    getPartLabel,
    upsertById,
    setText
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (!document.querySelector("#homeStats")) return;

    try {
      const { data, source } = await loadDb();
      renderHomeStats(data);
      setText(".cta-band .eyebrow", source === "localStorage" ? "localStorage DB 적용 중" : "JSON DB 적용 중");
    } catch (error) {
      console.error(error);
      renderHomeStats({
        brands: [],
        vehicleModels: [],
        vehicleVariants: [],
        parts: [],
        vehiclePartMatches: []
      });
    }
  });
})();
