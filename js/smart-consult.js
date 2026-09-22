import { AGM_STORE_URL, DIN_STORE_URL, PHONE_HREF, batteryStoreType } from "./smart-consult-core.js";
import { copy, variant } from "./conversation-copy.js?v=ai-mobile-v1";
import { conversationTurn, createConversationState, vehicleLabel } from "./smart-consult-conversation.js";
import { findEntry, entryState } from "./smart-consult-entry.js";
import { LAUNCHER_KEY, decodeLauncherContext, hasEntryConflict } from "./smart-consult-launcher-context.js";
import { SESSION_KEY, encodeSession, decodeSession, clearSession, safeUserMessage, summaryFields } from "./smart-consult-session.js";

const chatLog = document.querySelector("#chatLog");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const sendButton = document.querySelector("#sendButton");
const resetButton = document.querySelector("#resetButton");
let state = createConversationState();
let dataPromise;
let busy = false;
let session = 0;
let transcript = [];
let entryId = null;
let entryIndexPromise;
const entryIndex = () => entryIndexPromise ||= fetch("/seo-data/smart-consult-vehicles.json").then(response => {
  if (!response.ok) throw new Error("entry-load-failed");
  return response.json();
});
function saveSession() {
  try { sessionStorage.setItem(SESSION_KEY, encodeSession(state, transcript, entryId)); } catch { /* Continue in memory if storage is unavailable. */ }
}
function forgetSession() { try { clearSession(sessionStorage); } catch { /* Disabled storage. */ } }

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
    if (type === "agm") addLink(wrap, copy.labels.agm, AGM_STORE_URL, "result-action secondary", true);
    if (type === "din") addLink(wrap, copy.labels.din, DIN_STORE_URL, "result-action secondary", true);
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
    dataPromise = Promise.all([read("/data/manufacturers.json"), read("/seo-data/smart-consult-location-index.json")])
      .then(async ([manufacturers, areas]) => ({
        records: (await Promise.all(manufacturers.map(async manufacturer => (await read(`/data/${manufacturer.file}`)).map(row => ({ ...row, manufacturerId: manufacturer.id, manufacturerName: manufacturer.name }))))).flat(),
        localities: areas.localities || []
      })).catch(error => { dataPromise = null; throw error; });
  }
  return dataPromise;
}

function renderSummary() {
  chatLog.querySelector(".consult-summary-row")?.remove();
  const fields = summaryFields(state);
  if (!fields.length) return;
  const row = createElement("div", "message-row");
  row.classList.add("consult-summary-row");
  const card = createElement("article", "result-card consult-summary");
  card.setAttribute("aria-label",copy.summaryTitle);
  const head = createElement("div", "result-card-head");
  head.appendChild(createElement("strong", "", copy.summaryTitle));
  card.appendChild(head);
  const facts = createElement("dl", "result-facts");
  for (const [label, value] of fields) {
    if (!value) continue;
    const fact = createElement("div", "result-fact");
    fact.appendChild(createElement("dt", "", label));
    fact.appendChild(createElement("dd", "", value));
    facts.appendChild(fact);
  }
  card.appendChild(facts);
  if (state.confirmedBattery) card.appendChild(createElement("p", "result-note", copy.resultNote));
  addActions(card, ["phone", "stores"]);
  const reset = createElement("button","text-button",copy.restart);
  reset.type="button"; reset.addEventListener("click",resetChat); card.appendChild(reset);
  row.appendChild(card);
  chatLog.appendChild(row);
}

async function handleMessage(text) {
  if (busy) return;
  if (/^(처음부터(?:다시)?|다시시작|초기화|리셋|새상담)$/.test(text.replace(/\s/g,""))) { resetChat(); return; }
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
    transcript.push({role:"user",text:safeUserMessage(text,state,data.records,data.localities),actions:[],chips:[]});
    const response = conversationTurn(state, text, data.records, data.localities);
    state = response.state;
    typing.remove();
    let last;
    for (const message of response.messages) {
      last = addMessage(message);
      transcript.push({role:"bot",text:message,actions:[],chips:[]});
    }
    if (response.region && last) addLink(last, copy.labels.area, `/area/${response.region.slug}/`);
    if (response.actions.length && last) addActions(last, response.actions);
    if (last) addChips(last, response.chips);
    if (last) {
      Object.assign(transcript.at(-1),{actions:response.actions,chips:response.chips,battery:state.result?.defaultBattery || null,areaSlug:response.region?.slug || null});
    }
    renderSummary();
    saveSession();
    scrollToLatest();
  } catch {
    if (activeSession === session) { typing.remove(); addActions(addMessage(copy.error), ["phone"]); }
  } finally {
    if (activeSession === session) { busy = false; sendButton.disabled = false; }
  }
}

function resetChat(removeEntry = true) {
  forgetSession();
  try { sessionStorage.removeItem(LAUNCHER_KEY); } catch { /* Disabled storage. */ }
  if (removeEntry) {
    const url = new URL(location.href);
    url.searchParams.delete("vehicleId");
    history.replaceState(null,"",url);
  }
  entryId=null; transcript=[];
  session += 1;
  busy = false;
  sendButton.disabled = false;
  state = createConversationState();
  chatInput.value = "";
  chatInput.placeholder = "예: BMW 520d 2019년식";
  chatInput.disabled = false;
  chatLog.replaceChildren();
  const greeting=variant("greeting",0);
  const chips=["BMW 520d", "벤츠 E300", "카니발"].map(value => ({ label:value, value }));
  addChips(addMessage(greeting),chips);
  transcript.push({role:"bot",text:greeting,actions:[],chips});
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  if (event.isComposing || busy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  handleMessage(text);
});
resetButton.addEventListener("click", () => resetChat());

async function initialize() {
  const activeSession=++session;
  busy=true; sendButton.disabled=true;
  let saved;
  try { saved=decodeSession(sessionStorage.getItem(SESSION_KEY)); } catch { /* No storage. */ }
  const requested=new URL(location.href).searchParams.get("vehicleId");
  let launchRaw;
  try { launchRaw=sessionStorage.getItem(LAUNCHER_KEY); sessionStorage.removeItem(LAUNCHER_KEY); } catch { /* No storage. */ }
  try {
    // Generic fresh visits remain DB-lazy. Only deep links fetch this compact index.
    const index=(launchRaw || requested) ? await entryIndex() : null;
    const entry=launchRaw ? decodeLauncherContext(launchRaw,index) : requested ? findEntry(requested,index) : null;
    if (activeSession!==session) return;
    const invalidEntry=(launchRaw || requested) && !entry;
    const conflict=hasEntryConflict(saved,entry);
    const compatible=saved && !invalidEntry;
    if (compatible) {
      state=saved.state; transcript=saved.messages; entryId=saved.entryId;
      for (const [index,message] of transcript.entries()) {
        const row=addMessage(message.text,message.role);
        if (message.areaSlug) addLink(row,copy.labels.area,`/area/${message.areaSlug}/`);
        if (message.actions.length) addActions(row,message.actions,{defaultBattery:message.battery});
        if (index===transcript.length-1) addChips(row,message.chips);
      }
      renderSummary(); scrollToLatest();
      if (conflict) {
        const row=addMessage(`${entry.manufacturerName} ${entry.vehicle} 페이지에서 오셨네요. 기존 상담을 이어갈까요, 이 차량으로 새 상담을 시작할까요?`);
        const actions=createElement("div","quick-replies");
        const keep=createElement("button","quick-reply","기존 상담 이어가기");
        const change=createElement("button","quick-reply","이 차량으로 새 상담");
        for (const button of [keep,change]) button.type="button";
        const finish=()=>{row.remove(); chatInput.disabled=false; busy=false; sendButton.disabled=false; chatInput.focus();};
        keep.addEventListener("click",finish);
        change.addEventListener("click",()=>{startEntry(entry); finish();});
        actions.append(keep,change); row.appendChild(actions);
        chatInput.disabled=true;
        busy=true; sendButton.disabled=true;
        return;
      }
    } else {
      resetChat(false);
      if (entry) {
        startEntry(entry);
      }
    }
  } catch {
    if (activeSession===session) { resetChat(false); addActions(addMessage(copy.error),["phone"]); }
  } finally {
    if (activeSession===session && !chatInput.disabled) { busy=false; sendButton.disabled=false; }
  }
}
function startEntry(entry) {
  forgetSession();
  entryId=entry.id; state=entryState(entry);
  chatLog.replaceChildren();
  const text=copy.entry(vehicleLabel(state));
  addMessage(text); transcript=[{role:"bot",text,actions:[],chips:[]}];
  renderSummary(); saveSession();
}
initialize();
