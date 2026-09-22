import { AGM_STORE_URL, DIN_STORE_URL, PHONE_HREF, batteryStoreType } from "./smart-consult-core.js";
import { copy } from "./conversation-copy.js";
import { conversationTurn, createConversationState, vehicleLabel } from "./smart-consult-conversation.js";

const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const sendButton = document.querySelector("#sendButton");
const resetButton = document.querySelector("#resetButton");
let state = createConversationState();
let dataPromise;
let busy = false;
let session = 0;

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function scrollToLatest() {
  chatLog.scrollTop = chatLog.scrollHeight;
  requestAnimationFrame(() => { chatLog.scrollTop = chatLog.scrollHeight; });
}

function addMessage(text, role = "bot") {
  const row = createElement("div", `message-row ${role}`);
  row.appendChild(createElement("div", "message-bubble", text));
  chatLog.appendChild(row);
  scrollToLatest();
  return row;
}

function addLink(parent, label, href, className = "quick-reply", external = false) {
  const link = createElement("a", className, label);
  link.href = href;
  if (external) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
  parent.appendChild(link);
}

function addActions(parent, actions, result = state.result) {
  const wrap = createElement("div", "result-actions");
  if (actions.includes("phone")) addLink(wrap, copy.labels.phone, PHONE_HREF, "result-action primary");
  if (actions.includes("stores")) {
    const type = batteryStoreType(result?.defaultBattery);
    addLink(wrap, copy.labels.agm, AGM_STORE_URL, `result-action ${type === "agm" ? "primary" : "secondary"}`, true);
    addLink(wrap, copy.labels.din, DIN_STORE_URL, `result-action ${type === "din" ? "primary" : "secondary"}`, true);
  }
  parent.appendChild(wrap);
}

function addChips(row, choices) {
  if (!choices.length) return;
  const wrap = createElement("div", "quick-replies");
  for (const choice of choices.slice(0, 4)) {
    const button = createElement("button", "quick-reply", choice.label);
    button.type = "button";
    button.addEventListener("click", () => { if (!busy) handleMessage(choice.value); });
    wrap.appendChild(button);
  }
  row.appendChild(wrap);
}

async function loadData() {
  if (!dataPromise) {
    const read = async url => { const response = await fetch(url); if (!response.ok) throw new Error("load-failed"); return response.json(); };
    dataPromise = Promise.all([read("/data/manufacturers.json"), read("/seo-data/vehicle-detail-groups.json"), read("/seo-data/smart-consult-location-index.json")])
      .then(async ([manufacturers, details, areas]) => ({
        records: (await Promise.all(manufacturers.map(async manufacturer => (await read(`/data/${manufacturer.file}`)).map(row => ({ ...row, manufacturerId: manufacturer.id, manufacturerName: manufacturer.name }))))).flat(),
        pages: details.vehiclePages || [], localities: areas.localities || []
      })).catch(error => { dataPromise = null; throw error; });
  }
  return dataPromise;
}

function renderResult(result, pages) {
  const row = createElement("div", "message-row");
  const card = createElement("article", "result-card");
  const head = createElement("div", "result-card-head");
  head.appendChild(createElement("small", "", copy.labels.title));
  head.appendChild(createElement("strong", "", vehicleLabel(state)));
  card.appendChild(head);
  const facts = createElement("dl", "result-facts");
  for (const [label, value] of [[copy.labels.model,result.detailModel], [copy.labels.year,state.year ? `${state.year}년식` : result.year], [copy.labels.fuel,state.exactFuel || state.fuel || result.fuel], [copy.labels.battery,result.defaultBattery], [copy.labels.upgrade,result.upgradeBattery]]) {
    if (!value) continue;
    const fact = createElement("div", "result-fact");
    fact.appendChild(createElement("dt", "", label));
    fact.appendChild(createElement("dd", "", value));
    facts.appendChild(fact);
  }
  card.appendChild(facts);
  card.appendChild(createElement("p", "result-note", copy.resultNote));
  if (batteryStoreType(result.defaultBattery) === "unknown") card.appendChild(createElement("p", "result-type-note", copy.labels.typeNote));
  addActions(card, ["phone", "stores"], result);
  const page = pages.find(item => item.manufacturerId === result.manufacturerId && item.sourceVehicleName === result.vehicle);
  if (page?.urlPath?.startsWith("/car-battery/")) addLink(card, copy.labels.detail, page.urlPath, "result-detail-link");
  row.appendChild(card);
  chatLog.appendChild(row);
}

async function handleMessage(text) {
  if (busy) return;
  busy = true;
  const activeSession = session;
  chatLog.querySelectorAll("button.quick-reply").forEach(button => { button.disabled = true; });
  addMessage(text, "user");
  chatInput.placeholder = copy.placeholder;
  sendButton.disabled = true;
  // Keep the composer editable while loading. Reset cancels stale responses.
  const typing = addMessage(copy.labels.typing);
  typing.classList.add("typing-message");
  typing.setAttribute("role", "status");
  try {
    const started = performance.now();
    const data = await loadData();
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(0, 300 - (performance.now() - started));
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (activeSession !== session) return;
    const response = conversationTurn(state, text, data.records, data.localities);
    state = response.state;
    typing.remove();
    let last;
    for (const message of response.messages) last = addMessage(message);
    if (response.result) renderResult(response.result, data.pages);
    if (response.region && last) addLink(last, copy.labels.area, `/area/${response.region.slug}/`);
    if (response.actions.length && last) addActions(last, response.actions);
    if (last) addChips(last, response.chips);
    scrollToLatest();
  } catch {
    if (activeSession === session) { typing.remove(); addActions(addMessage(copy.error), ["phone"]); }
  } finally {
    if (activeSession === session) { busy = false; sendButton.disabled = false; }
  }
}

function resetChat() {
  session += 1;
  busy = false;
  sendButton.disabled = false;
  state = createConversationState();
  chatInput.value = "";
  chatInput.placeholder = "예: BMW 520d 2019년식";
  chatLog.replaceChildren();
  addChips(addMessage(copy.greeting), ["BMW 520d", "벤츠 E300", "카니발"].map(value => ({ label:value, value })));
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  if (event.isComposing || busy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  handleMessage(text);
});
resetButton.addEventListener("click", resetChat);
resetChat();
