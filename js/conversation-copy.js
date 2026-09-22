// Customer-facing language lives here; vehicle facts are supplied by the resolver.
export const copy = {
  dispatch: "지금·오늘 방문 가능 여부와 도착 시간은 실시간 확인이 필요해요. 1644-9141로 전화주시면 가능한 시간을 확인해드릴게요.",
  symptomAck: label => `${label} 말씀해 주셨군요. 원인은 여기서 진단하지 않고, 차량에 맞는 배터리 정보를 확인해드릴게요.`,
  recoveryYear: "괜찮습니다. 차량등록증에서 연식을 확인하실 수 있어요. 모르시면 세부 모델명이나 현재 아시는 정보만 말씀해 주세요.",
  recoveryFuel: "괜찮습니다. 차량등록증이나 주유구의 연료 표기를 확인해 주세요. 모르시면 세부 모델명 등 아시는 다른 정보부터 말씀해 주세요.",
  recoveryModel: "괜찮습니다. 차량등록증에서 차량명을 확인하실 수 있어요. 아시는 차량명이나 연식만으로 먼저 좁혀볼게요.",
  recoveryNext: "아는 정보를 입력해 이어가거나, 처음부터 다시 시작하실 수 있어요. 전화로도 확인을 도와드릴게요.",
  entry: name => `${name} 배터리를 확인해드릴게요. 세부 모델이나 연식을 알려주세요.`,
  summaryTitle: "상담 내용",
  restart: "처음부터 다시",
  privateMessage: "문의 내용 (개인정보 보호를 위해 원문은 저장하지 않아요)",
  greeting: "안녕하세요, 일등밧데리입니다.\n차량명만 알려주시면 맞는 배터리를 찾아드릴게요.\n예) BMW 520d, 벤츠 E300, 카니발",
  placeholder: "차량명이나 궁금한 내용을 입력해 주세요",
  year: "몇 년식 차량인가요?",
  yearAmbiguous: "연식을 정확히 확인하고 싶어요. 네 자리로 알려주시겠어요? 예) 2019년식",
  fuel: "어떤 연료를 사용하는 차량인가요?",
  fuelConfirm: fuel => `${fuel} 모델 맞으실까요?`,
  fuelUnknown: "연료를 모르시면 전화로 차량 확인을 도와드릴게요.",
  model: labels => `차량 이름을 조금 더 알려주시겠어요?\n${labels.join(" / ")}`,
  detail: labels => `같은 연식에도 배터리가 달라 차량을 조금 더 확인할게요.\n${labels.join(" / ")} 중 어떤 차량인가요?`,
  recognized: name => `${name} 확인했어요.`,
  correction: year => year ? `네, ${year}년식으로 바꿔서 확인할게요.` : "네, 말씀하신 내용으로 바꿔서 확인할게요.",
  result: battery => `네, 확인됐어요.\n고객님 차량의 기본 배터리는 ${battery}입니다.`,
  upgrade: battery => `같은 차량에 ${battery} 업그레이드도 가능합니다.`,
  needsCheck: "이 차량은 배터리 규격을 전화로 확인해야 해요. 1644-9141로 문의해 주세요.",
  noMatch: "차량을 정확하게 찾지 못했어요. 차량명과 연식을 같이 입력해 주세요.\n예) 벤츠 E300 2020년식",
  noMatchAgain: "등록된 정보만으로는 정확한 확인이 어렵습니다. 전화주시면 차량 확인 후 바로 안내해드릴게요.",
  noCombination: "말씀하신 차량 정보로는 배터리를 정확히 확인하기 어려워요. 차량명이나 연식을 고쳐 알려주시거나 1644-9141로 문의해 주세요.",
  needVehicle: "차량마다 배터리가 달라요. 차량명부터 알려주세요.",
  needDetails: "아직 배터리를 확정하기 어려워요. 앞서 여쭤본 차량 정보를 알려주시면 이어서 확인할게요.",
  price: "정확한 교체 가격은 전화로 확인해드리고 있어요. 1644-9141로 문의주시면 바로 안내해드릴게요.",
  coding: "코딩 필요 여부는 차량 상태를 함께 확인해야 해요. 1644-9141로 문의해 주세요.",
  unsupported: "이 내용은 여기서 정확하게 안내하기 어려워요. 1644-9141로 전화주시면 차량 확인 후 안내해드릴게요.",
  call: "네, 1644-9141로 전화주시면 이어서 안내해드릴게요.",
  buy: "아래 상품에서 가격을 확인하실 수 있어요. 구매 전 장착 규격을 한 번 더 확인해 주세요.",
  battery: battery => `고객님 차량의 기본 배터리는 ${battery}입니다.`,
  batteryType: type => type === "agm" ? "AGM 타입입니다." : "일반 · DIN 상품 안내에서 확인하실 수 있어요.",
  agm: "AGM은 차량에 사용되는 배터리 타입 중 하나입니다.",
  substitution: battery => `고객님 차량의 기본 배터리는 ${battery}입니다. 다른 타입 사용 가능 여부는 전화로 확인해 주세요.`,
  service: name => `네, ${name}에서 출장 교체 가능합니다.\n정확한 방문 시간은 1644-9141로 확인해드릴게요.`,
  serviceUnknown: "현재 출장 가능 지역으로 확인되지 않아요. 정확한 가능 여부는 1644-9141로 문의해 주세요.",
  serviceAsk: "어느 지역에 계신가요? 시·구·동 이름을 알려주세요.",
  serviceShort: name => `${name} 말씀하시는 거죠?\n출장 교체 가능 지역입니다. 정확한 방문 시간은 1644-9141로 확인해드릴게요.`,
  locationChoices: labels => `같은 이름의 지역이 여러 곳이에요.\n${labels.join(" / ")} 중 어디인가요?`,
  vehicleConfirm: name => `${name} 말씀하시는 걸까요?`,
  error: "지금 정보를 불러오지 못했어요. 잠시 후 다시 입력하시거나 1644-9141로 문의해 주세요.",
  labels: { title: "내 차량 배터리", model: "세부모델", year: "연식", fuel: "연료", battery: "기본 배터리", upgrade: "업그레이드", phone: "출장교체 상담 1644-9141", din: "일반 · DIN 배터리 가격 보기", agm: "AGM 배터리 가격 보기", detail: "차량 상세 안내", area: "지역 안내 보기", send: "보내기", typing: "답변 준비 중", typeNote: "정확한 규격 확인 후 선택해 주세요." },
  resultNote: "현재 장착된 배터리나 차량 옵션에 따라 달라질 수 있어요. 구매 전 정확한 확인이 필요하면 전화로 바로 확인해드릴게요."
};

// Reviewed static choices only. Facts and safety wording are never rotated.
export const variants = {
  greeting: [copy.greeting, "안녕하세요, 일등밧데리입니다. 차량명이나 배터리 관련 문의를 말씀해 주세요."],
  vehicle: [copy.recognized, name => `네, ${name}군요.`],
  clarification: [copy.year, "차량 연식도 알려주시겠어요?"],
  area: [copy.service, name => `${name} 지역은 출장 교체 가능 지역입니다.\n정확한 방문 시간은 1644-9141로 확인해드릴게요.`],
  fallback: [copy.noMatch, "차량명과 연식을 조금 더 알려주시겠어요? 예) 벤츠 E300 2020년식"],
  price: [copy.price, "교체 가격은 1644-9141로 전화주시면 정확히 안내해드릴게요."]
};
export function variant(category, turn = 0, fact) {
  const choices = variants[category];
  const value = choices[Math.abs(turn) % choices.length];
  return typeof value === "function" ? value(fact) : value;
}
export const symptomLabels = {
  NO_START: "시동이 안 걸림", WEAK_START: "시동이 약함", DISCHARGE: "방전",
  REPEATED_DISCHARGE: "반복 방전", JUMP: "점프 경험", JUMP_REDISCHARGE: "점프 후 재방전",
  REPLACE: "배터리 교체 문의", PREVENTIVE_REPLACE: "예방 교체 문의"
};
