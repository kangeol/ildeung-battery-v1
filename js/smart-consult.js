import { AGM_STORE_URL, DIN_STORE_URL, PHONE_HREF, batteryStoreType } from "./smart-consult-core.js?v=certainty-v1";
import { copy, variant } from "./conversation-copy.js?v=ai-mobile-v1";
import { conversationTurn, createConversationState, vehicleLabel, vehicleCandidateOptions } from "./smart-consult-conversation.js?v=spec-schedule-v1";
import { findEntry, entryState } from "./smart-consult-entry.js?v=spec-schedule-v1";
import { LAUNCHER_KEY, decodeLauncherContext, hasEntryConflict } from "./smart-consult-launcher-context.js";
import { SESSION_KEY, encodeSession, decodeSession, clearSession, safeUserMessage, summaryFields } from "./smart-consult-session.js?v=spec-schedule-v1";
import { presentationIndex, messagePresentation, lookupStatus, lookupDelay, phoneProminence, literalParts, resultTokens } from "./smart-consult-presentation.js?v=consult-ui-v1";

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
let displayIndex;
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

function addActions(parent, actions, result = state.result, prominent = false) {
  const wrap = createElement("div", "result-actions");
  if (actions.includes("phone")) addLink(wrap, copy.labels.phone, PHONE_HREF, `result-action ${prominent ? "primary" : "neutral"}`);
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
    if(choice.selection)button.dataset.candidateId=choice.selection.id;
    button.addEventListener("click", () => {
      if (busy) return;
      button.classList.add("is-selected"); button.setAttribute("aria-pressed", "true");
      handleMessage(choice.selection?choice.label:choice.value,choice.selection);
    });
    wrap.appendChild(button);
  }
  row.appendChild(wrap);
}

function appendLiteral(parent, text, tokens, className = '') {
  for (const part of literalParts(text, tokens)) {
    parent.appendChild(part.emphasis ? createElement('strong', className, part.text) : document.createTextNode(part.text));
  }
}

function addAnswer(messages, { restored = false, context = state } = {}) {
  const row = createElement('div', 'message-row bot answer-row');
  const card = createElement('article', `answer-card${restored ? '' : ' answer-enter'}`);
  card.setAttribute('aria-label', '상담 답변');
  const hasPrice = messages.some(text => messagePresentation(text, displayIndex).lines.some(line => line.price));
  if (hasPrice && context.selectedVehicleKey && context.confirmedBattery && context.quotedSpec === context.confirmedBattery) {
    const label = summaryFields(context).filter(([key]) => ['차량', copy.labels.model, copy.labels.year].includes(key)).map(([, value]) => value).join(' · ');
    if (label) card.appendChild(createElement('div', 'answer-context', label));
  }
  for (const text of messages) {
    const model = messagePresentation(text, displayIndex);
    const paragraph = createElement('p', `answer-text${model.secondary ? ' answer-secondary' : ''}`);
    model.lines.forEach((line, i) => {
      if (i) paragraph.appendChild(document.createTextNode('\n'));
      const span = createElement('span', line.price ? 'answer-price-line' : 'answer-line');
      if (line.price) {
        appendLiteral(span, line.text, [line.price.code, line.price.brand, line.price.amount], 'price-emphasis');
        for (const strong of span.querySelectorAll('strong')) if (strong.textContent === line.price.amount) strong.className = 'price-amount';
      } else appendLiteral(span, line.text, [...(displayIndex?.brands || []), ...resultTokens(context)]);
      paragraph.appendChild(span);
    });
    card.appendChild(paragraph);
  }
  row.appendChild(card); chatLog.appendChild(row);
  return row;
}

function revealAnswer(row) {
  // Start at the new answer, not below a long comparison. Do not trap later scrolling.
  const reveal = () => { chatLog.scrollTop += row.getBoundingClientRect().top - chatLog.getBoundingClientRect().top - 12; };
  reveal(); requestAnimationFrame(reveal);
}

async function loadData() {
  if (!dataPromise) {
    const read = async url => { const response = await fetch(url,{cache:"no-store"}); if (!response.ok) throw new Error("load-failed"); return response.json(); };
    dataPromise = Promise.all([read("/data/manufacturers.json"), read("/seo-data/smart-consult-location-index.json"), read("/data/battery-prices.json"), read("/data/consult-service-policy.json")])
      .then(async ([manufacturers, areas, priceCatalog, servicePolicy]) => ({
        records: (await Promise.all(manufacturers.map(async manufacturer => (await read(`/data/${manufacturer.file}`)).map(row => ({ ...row, manufacturerId: manufacturer.id, manufacturerName: manufacturer.name }))))).flat(),
        localities: areas.localities || [], priceCatalog, servicePolicy
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
  const card = createElement("details", "result-card consult-summary");
  card.setAttribute("aria-label",copy.summaryTitle);
  const head = createElement("summary", "result-card-head");
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

async function handleMessage(text, selection = null) {
  if (busy) return;
  if (/^(처음부터(?:다시)?|다시시작|초기화|리셋|새상담)$/.test(text.replace(/\s/g,""))) { resetChat(); return; }
  busy = true;
  const activeSession = session;
  chatLog.querySelectorAll("button.quick-reply").forEach(button => { button.disabled = true; });
  addMessage(text, "user");
  chatInput.placeholder = copy.placeholder;
  sendButton.disabled = true;
  // Keep the composer editable while loading. Reset cancels stale responses.
  let typing;
  try {
    const started = performance.now();
    const data = await loadData();
    displayIndex ||= presentationIndex(data.priceCatalog, data.servicePolicy);
    if (activeSession !== session) return;
    const response = conversationTurn(state, text, data.records, data.localities, data.priceCatalog, data.servicePolicy, selection);
    const status = lookupStatus(response, state, selection, displayIndex);
    if (status) {
      typing = addMessage(status); typing.classList.add('typing-message');
      typing.setAttribute('role', 'status');
    }
    const delay = lookupDelay(status, performance.now() - started, matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    if (activeSession !== session) return;
    transcript.push({role:"user",text:safeUserMessage(text,state,data.records,data.localities),actions:[],chips:[]});
    state = response.state;
    typing?.remove();
    const last = response.messages.length ? addAnswer(response.messages) : null;
    for (const message of response.messages) {
      transcript.push({role:"bot",text:message,actions:[],chips:[]});
    }
    if (response.region && last) addLink(last, copy.labels.area, `/area/${response.region.slug}/`);
    if (response.actions.length && last) addActions(last, response.actions, state.result, phoneProminence(response, displayIndex));
    if (last) addChips(last, response.chips);
    if (last) {
      Object.assign(transcript.at(-1),{actions:response.actions,chips:response.chips,battery:state.result?.defaultBattery || null,areaSlug:response.region?.slug || null});
    }
    renderSummary();
    saveSession();
    if (last) revealAnswer(last);
  } catch {
    if (activeSession === session) { typing?.remove(); addActions(addMessage(copy.error), ["phone"], null, true); }
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
      // Presentation metadata is optional on restore; never discard a valid saved
      // conversation just because the decorative price lookup is unavailable.
      const displayData = await loadData().catch(() => null);
      if (activeSession!==session) return;
      if (displayData) displayIndex ||= presentationIndex(displayData.priceCatalog, displayData.servicePolicy);
      // Rehydrate pre-upgrade pending buttons from canonical data, not saved IDs.
      if (state.previousQuestion && transcript.at(-1)?.chips?.length) {
        const data=await loadData();
        if (activeSession!==session) return;
        const current=vehicleCandidateOptions(data.records,state);
        if (current?.field===state.previousQuestion.field) {
          transcript.at(-1).chips=transcript.at(-1).chips.map(chip=>
            current.choices.slice(0,4).find(choice=>choice.value===chip.value&&choice.label===chip.label) || chip);
        }
      }
      let restoredRow;
      for (let index = 0; index < transcript.length; index++) {
        let message = transcript[index];
        let row;
        const group = [message.text];
        if (message.role === 'bot') {
          while (transcript[index + 1]?.role === 'bot') { message = transcript[++index]; group.push(message.text); }
          // Old turns do not inherit the current vehicle header/spec emphasis.
          row = addAnswer(group, { restored: true, context: createConversationState() });
        } else row = addMessage(message.text, message.role);
        restoredRow = row;
        if (message.areaSlug) addLink(row,copy.labels.area,`/area/${message.areaSlug}/`);
        if (message.actions.length) addActions(row,message.actions,{defaultBattery:message.battery},phoneProminence({actions:message.actions,messages:group}, displayIndex));
        if (index===transcript.length-1) addChips(row,message.chips);
      }
      renderSummary(); if (restoredRow) revealAnswer(restoredRow);
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
