import {
  AGM_STORE_URL,
  DIN_STORE_URL,
  PHONE_HREF,
  PHONE_LABEL,
  applyDetectedFilters,
  batteryStoreType,
  buildSafeAnswer,
  classifyQuestion,
  createInitialState,
  normalizeText,
  resolveConsultation,
  searchVehicles
} from "./smart-consult-core.js";

const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const sendButton = document.querySelector("#sendButton");
const resetButton = document.querySelector("#resetButton");

let state = createInitialState();
let allRecords = [];
let vehiclePages = [];
let currentMatch = null;
let pendingQuestion = null;
let vehicleDataPromise = null;
let areaDataPromise = null;

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function scrollToLatest() {
  chatLog.scrollTop = chatLog.scrollHeight;
  window.requestAnimationFrame(() => {
    chatLog.scrollTop = chatLog.scrollHeight;
  });
}

function addMessage(text, role = "bot") {
  const row = createElement("div", `message-row ${role}`);
  const bubble = createElement("div", "message-bubble", text);
  row.appendChild(bubble);
  chatLog.appendChild(row);
  scrollToLatest();
  return row;
}

function addUserMessage(text) {
  addMessage(text, "user");
}

function addQuickReplies(row, choices, onSelect) {
  const wrap = createElement("div", "quick-replies");
  choices.forEach((choice) => {
    const button = createElement("button", "quick-reply", choice.label);
    button.type = "button";
    button.addEventListener("click", () => {
      [...wrap.querySelectorAll("button")].forEach((item) => {
        item.disabled = true;
      });
      addUserMessage(choice.label);
      onSelect(choice);
    }, { once: true });
    wrap.appendChild(button);
  });
  row.appendChild(wrap);
  scrollToLatest();
  return wrap;
}

function addLink(parent, label, href, className, external = false) {
  const link = createElement("a", className, label);
  link.href = href;
  if (external) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  parent.appendChild(link);
  return link;
}

function addNoMatchActions(row) {
  const actions = createElement("div", "quick-replies");
  addLink(actions, `${PHONE_LABEL} 전화상담`, PHONE_HREF, "quick-reply");
  addLink(actions, "차량 배터리 찾기", "/search.html", "quick-reply");
  row.appendChild(actions);
  scrollToLatest();
}

async function loadVehicleData() {
  if (allRecords.length) return;
  if (!vehicleDataPromise) {
    vehicleDataPromise = Promise.all([
      fetch("/data/manufacturers.json").then((response) => {
        if (!response.ok) throw new Error("제조사 DB를 불러오지 못했습니다.");
        return response.json();
      }),
      fetch("/seo-data/vehicle-detail-groups.json").then((response) => {
        if (!response.ok) throw new Error("차량 상세 링크를 불러오지 못했습니다.");
        return response.json();
      })
    ]).then(async ([manufacturers, detailData]) => {
      const recordSets = await Promise.all(manufacturers.map(async (manufacturer) => {
        const response = await fetch(`/data/${manufacturer.file}`);
        if (!response.ok) throw new Error(`${manufacturer.name} 차량 DB를 불러오지 못했습니다.`);
        const rows = await response.json();
        return rows.map((record) => ({
          ...record,
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name
        }));
      }));
      allRecords = recordSets.flat();
      vehiclePages = Array.isArray(detailData.vehiclePages) ? detailData.vehiclePages : [];
    }).catch((error) => {
      vehicleDataPromise = null;
      throw error;
    });
  }
  await vehicleDataPromise;
}

function loadAreaData() {
  if (!areaDataPromise) {
    areaDataPromise = fetch("/data/smart-consult-areas.json")
      .then((response) => {
        if (!response.ok) throw new Error("지역 DB를 불러오지 못했습니다.");
        return response.json();
      })
      .then((data) => data.areas || {})
      .catch((error) => {
        areaDataPromise = null;
        throw error;
      });
  }
  return areaDataPromise;
}

function setBusy(isBusy) {
  chatInput.disabled = isBusy;
  sendButton.disabled = isBusy;
  sendButton.textContent = isBusy ? "조회 중" : "보내기";
}

function detailPageFor(result) {
  return vehiclePages.find((page) => (
    page.manufacturerId === result.manufacturerId && page.sourceVehicleName === result.vehicle
  ));
}

function addFact(list, label, value) {
  if (!value) return;
  const row = createElement("div", "result-fact");
  row.appendChild(createElement("dt", "", label));
  row.appendChild(createElement("dd", "", value));
  list.appendChild(row);
}

function renderResultCard(result) {
  const row = createElement("div", "message-row");
  const card = createElement("article", "result-card");
  const head = createElement("div", "result-card-head");
  head.appendChild(createElement("small", "", "차량 DB 조회 결과"));
  head.appendChild(createElement("strong", "", `${result.manufacturerName} ${result.vehicle}`));
  card.appendChild(head);

  const facts = createElement("dl", "result-facts");
  addFact(facts, "세부모델", result.detailModel);
  addFact(facts, "연식", result.year);
  addFact(facts, "연료", result.fuel);
  addFact(facts, "기본 배터리", result.defaultBattery);
  addFact(facts, "업그레이드", result.upgradeBattery);
  card.appendChild(facts);

  card.appendChild(createElement(
    "p",
    "result-note",
    "표시된 값은 현재 차량 DB의 선택 조건 기준입니다. 실제 장착 배터리와 차량 상태는 구매 또는 교체 전에 확인해 주세요."
  ));

  const actions = createElement("div", "result-actions");
  addLink(actions, `전화상담 ${PHONE_LABEL}`, PHONE_HREF, "result-action primary");

  const storeType = batteryStoreType(result.defaultBattery);
  if (storeType === "agm") {
    addLink(actions, "일반 · DIN 배터리 가격 보기", DIN_STORE_URL, "result-action secondary", true);
    addLink(actions, "AGM 배터리 가격 보기", AGM_STORE_URL, "result-action primary", true);
  } else if (storeType === "din") {
    addLink(actions, "일반 · DIN 배터리 가격 보기", DIN_STORE_URL, "result-action primary", true);
    addLink(actions, "AGM 배터리 가격 보기", AGM_STORE_URL, "result-action secondary", true);
  } else {
    card.appendChild(createElement("p", "result-type-note", "정확한 규격 확인 후 선택해 주세요."));
    addLink(actions, "일반 · DIN 배터리 가격 보기", DIN_STORE_URL, "result-action secondary", true);
    addLink(actions, "AGM 배터리 가격 보기", AGM_STORE_URL, "result-action secondary", true);
  }

  const detailPage = detailPageFor(result);
  if (detailPage?.urlPath) {
    addLink(actions, "차량 상세 안내", detailPage.urlPath, "result-action neutral");
  }
  card.appendChild(actions);

  const tools = createElement("div", "result-tools");
  const reselect = createElement("button", "tool-button", "다른 차량 찾기");
  reselect.type = "button";
  reselect.addEventListener("click", () => resetChat(true));
  tools.appendChild(reselect);
  card.appendChild(tools);

  row.appendChild(card);
  chatLog.appendChild(row);
  scrollToLatest();
}

function renderAreaQuestion() {
  const row = addMessage("출장 교체 지역도 확인해드릴까요?");
  addQuickReplies(row, [
    { value: "seoul", label: "서울" },
    { value: "gyeonggi", label: "경기" },
    { value: "incheon", label: "인천" },
    { value: "later", label: "나중에" }
  ], async (choice) => {
    if (choice.value === "later") {
      addMessage("알겠습니다. 다른 차량이나 배터리 관련 질문도 입력할 수 있어요.");
      return;
    }

    try {
      const areas = await loadAreaData();
      const area = areas[choice.value];
      if (!area?.name || !area?.slug) throw new Error("선택한 지역 정보가 없습니다.");
      state.area = choice.value;
      const resultRow = createElement("div", "message-row");
      const areaCard = createElement("div", "area-card");
      areaCard.appendChild(createElement("strong", "", `${area.fullName || area.name} 지역 안내`));
      areaCard.appendChild(createElement("p", "", "서비스 범위는 공식 지역 페이지에서 확인하고, 정확한 방문시간은 전화상담으로 확인해 주세요."));
      addLink(areaCard, `${area.name} 지역 안내 보기 →`, `/area/${area.slug}/`, "");
      resultRow.appendChild(areaCard);
      chatLog.appendChild(resultRow);
      scrollToLatest();
    } catch (error) {
      addMessage(`${error.message} ${PHONE_LABEL}로 문의해 주세요.`);
    }
  });
}

function presentResolution() {
  const resolution = resolveConsultation(currentMatch.records, state);
  pendingQuestion = null;

  if (resolution.type === "no-match") {
    const row = addMessage("입력한 조건과 정확히 일치하는 차량 DB 항목이 없습니다. 결과를 추측하지 않고 전화 확인을 안내드릴게요.");
    addQuickReplies(row, [
      { value: "reset", label: "차량 다시 선택" },
      { value: "phone", label: `${PHONE_LABEL} 전화하기` }
    ], (choice) => {
      if (choice.value === "reset") resetChat(true);
      if (choice.value === "phone") window.location.href = PHONE_HREF;
    });
    return;
  }

  if (resolution.type === "result") {
    state.result = resolution.result;
    addMessage("현재 차량 DB에서 아래 배터리 정보를 확인했습니다.");
    renderResultCard(resolution.result);
    renderAreaQuestion();
    return;
  }

  pendingQuestion = resolution;
  const row = addMessage(resolution.prompt);
  pendingQuestion.choiceWrap = addQuickReplies(row, resolution.choices, (choice) => {
    if (resolution.field === "detailModel") state.detailModel = choice.value;
    if (resolution.field === "year") state.yearRange = choice.value;
    if (resolution.field === "fuel") state.fuel = choice.value;
    if (resolution.field === "record") {
      state.detailModel = choice.record.detailModel || "";
      state.yearRange = choice.record.year || "";
      state.fuel = choice.record.fuel || "";
    }
    presentResolution();
  });
}

function selectVehicle(match, searchResult) {
  currentMatch = match;
  state = applyDetectedFilters(match, searchResult);
  addMessage(`${match.manufacturerName} ${match.vehicle} 차량으로 확인했습니다. 배터리가 달라지는 조건만 추가로 확인할게요.`);
  presentResolution();
}

function selectPendingFromText(text) {
  if (!pendingQuestion) return false;
  const normalized = normalizeText(text);
  const matches = pendingQuestion.choices.filter((choice) => {
    const label = normalizeText(choice.label);
    return normalized === label || (normalized.length >= 2 && label.includes(normalized));
  });
  if (matches.length !== 1) return false;

  const choice = matches[0];
  if (pendingQuestion.choiceWrap) {
    [...pendingQuestion.choiceWrap.querySelectorAll("button")].forEach((button) => {
      button.disabled = true;
    });
  }
  if (pendingQuestion.field === "detailModel") state.detailModel = choice.value;
  if (pendingQuestion.field === "year") state.yearRange = choice.value;
  if (pendingQuestion.field === "fuel") state.fuel = choice.value;
  if (pendingQuestion.field === "record") {
    state.detailModel = choice.record.detailModel || "";
    state.yearRange = choice.record.year || "";
    state.fuel = choice.record.fuel || "";
  }
  presentResolution();
  return true;
}

async function handleMessage(text, showUserMessage = true) {
  if (showUserMessage) addUserMessage(text);

  if (selectPendingFromText(text)) return;

  setBusy(true);
  try {
    await loadVehicleData();
    const searchResult = searchVehicles(text, allRecords);

    if (searchResult.matches.length === 1) {
      selectVehicle(searchResult.matches[0], searchResult);
      return;
    }

    if (searchResult.matches.length > 1) {
      const row = addMessage("비슷한 차량이 여러 개 있습니다. 찾는 차량을 선택해 주세요.");
      addQuickReplies(row, searchResult.matches.map((match) => ({
        label: `${match.manufacturerName} ${match.vehicle}`,
        match
      })), (choice) => selectVehicle(choice.match, searchResult));
      return;
    }

    const intent = classifyQuestion(text);
    if (state.result) {
      const answer = buildSafeAnswer(intent, state.result);
      addMessage(answer);
      return;
    }

    if (intent !== "fallback") {
      addMessage("차량에 따라 달라집니다. 먼저 차량명을 알려주세요.");
      return;
    }

    if (/[?？]|나요|해요|돼요|됩니까|인가요/.test(text)) {
      addMessage(`이 내용은 차량 상태 확인이 필요합니다.\n${PHONE_LABEL}로 문의하시면 빠르게 확인해드릴게요.`);
      return;
    }

    const row = addMessage("현재 홈페이지 DB에서 정확한 차량 정보를 찾지 못했습니다.\n차량명과 연식을 다시 입력하시거나 전화로 확인해 주세요.");
    addNoMatchActions(row);
  } catch (error) {
    addMessage(`차량 DB를 불러오는 중 문제가 생겼습니다. 잠시 후 다시 시도하거나 ${PHONE_LABEL}로 문의해 주세요.`);
  } finally {
    setBusy(false);
  }
}

function resetChat(focusInput = false) {
  state = createInitialState();
  currentMatch = null;
  pendingQuestion = null;
  chatLog.replaceChildren();
  const greeting = addMessage("안녕하세요. 일등밧데리 스마트 배터리 상담입니다.\n차량명을 입력해 주세요.\n예) BMW 520d, 벤츠 E300, 카니발");
  addQuickReplies(greeting, [
    { label: "BMW 520d", value: "BMW 520d" },
    { label: "벤츠 E300", value: "벤츠 E300" },
    { label: "카니발", value: "카니발" },
    { label: "그랜저 IG", value: "그랜저 IG" }
  ], (choice) => handleMessage(choice.value, false));
  if (focusInput) chatInput.focus();
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || sendButton.disabled) return;
  chatInput.value = "";
  handleMessage(text);
});

resetButton.addEventListener("click", () => resetChat(true));

resetChat();
