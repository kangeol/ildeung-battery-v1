import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBlogCases } from "./lib/blog-case-data.js";
import { getBlogCasesForPage } from "./lib/blog-case-matcher.js";
import { renderBlogCaseSection } from "./lib/blog-case-renderer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const MANUFACTURERS_FILE = path.join(DATA_DIR, "manufacturers.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "battery");
const CSS_FILE = "css/battery-seo.css";
const SITE_ORIGIN = "https://battery1.co.kr";
const STANDARD_BATTERY_URL = "https://smartstore.naver.com/battery1/products/414050800";
const AGM_BATTERY_URL = "https://smartstore.naver.com/battery1/products/575288571";
const IMPORT_MANUFACTURER_IDS = new Set(["audi", "benz", "bmw", "ford", "jeep", "landrover", "mini", "volkswagen", "volvo"]);

const TOPIC_LINKS = {
  hub: { label: "자동차배터리 정보 가이드", href: "/battery/" },
  carBattery: { label: "자동차배터리 알아보기", href: "/battery/car-battery.html" },
  replacement: { label: "자동차배터리 교체", href: "/battery/replacement.html" },
  price: { label: "자동차배터리 가격", href: "/battery/price.html" },
  replacementCost: { label: "자동차배터리 교체비용", href: "/battery/replacement-cost.html" },
  batteryLife: { label: "자동차배터리 수명", href: "/battery/battery-life.html" },
  mobile: { label: "출장배터리", href: "/battery/mobile-replacement.html" },
  discharge: { label: "배터리 방전", href: "/battery/battery-discharge.html" },
  importCar: { label: "수입차 배터리", href: "/battery/import-car-battery.html" },
  delkor: { label: "델코 배터리", href: "/battery/delkor-battery.html" },
  agm: { label: "AGM 배터리", href: "/battery/agm/" },
  agmPrice: { label: "AGM 배터리 가격", href: "/battery/agm/price.html" },
  delkorAgm: { label: "델코 AGM 배터리", href: "/battery/agm/delkor.html" },
  vartaAgm: { label: "바르타 AGM 배터리", href: "/battery/agm/varta.html" }
};

const FIXED_TOPICS = [
  {
    id: "hub",
    output: "index.html",
    canonicalPath: "/battery/",
    image: "index.png",
    eyebrow: "Battery Guide",
    title: "자동차배터리 정보 가이드 | 일등밧데리",
    description: "자동차배터리 규격, 가격, 교체비용, 수명, AGM배터리와 출장배터리 상담 정보를 한곳에서 확인하세요.",
    h1: "자동차배터리 정보 가이드",
    summaryTitle: "배터리 확인 전 알아두면 좋은 핵심",
    summaryItems: ["차량별 배터리 규격 확인", "일반 DIN과 AGM 구분", "가격과 교체비용 확인", "방전과 수명 상담", "출장배터리 가능지역 연결"],
    directQuestion: "자동차배터리는 어떤 순서로 확인하면 좋나요?",
    directAnswer: "먼저 차량의 제조사, 차량명, 연식, 연료, 세부모델을 확인하고 적용 배터리 규격을 보는 것이 좋습니다. 그다음 일반 DIN 또는 AGM 여부와 현재 판매가격, 출장교체 가능 여부를 함께 확인하면 상담이 더 정확해집니다.",
    sections: [
      ["차량별 규격 확인", "자동차배터리는 같은 차량명이라도 연식과 세부모델에 따라 규격이 달라질 수 있습니다. 일등밧데리 차량 DB는 세부모델별 기본 배터리와 업그레이드 배터리를 구분해 안내합니다."],
      ["가격 확인 흐름", "배터리 가격은 용량과 타입, 제품에 따라 달라집니다. 차량에 맞는 규격을 먼저 확인한 뒤 일반 DIN 또는 AGM 상품의 현재 판매가격을 확인하는 흐름이 안전합니다."],
      ["교체 시점 판단", "시동이 약하거나 방전이 반복되면 단순 충전으로 끝내기보다 배터리 상태와 차량 사용환경을 함께 점검해야 합니다."],
      ["출장배터리 상담", "서울, 경기, 인천 지역은 차량 위치와 차종을 확인한 뒤 출장배터리 교체 상담을 안내합니다. 현장 조건에 따라 방문 일정은 달라질 수 있습니다."],
      ["수입차와 AGM", "수입차와 ISG 적용 차량은 AGM 배터리나 코딩 확인이 필요한 경우가 있습니다. 모든 차량에 동일하게 적용되는 것은 아니므로 차종 확인이 중요합니다."]
    ],
    related: ["carBattery", "price", "replacement", "mobile", "agm", "importCar", "discharge", "batteryLife", "replacementCost", "delkor"],
    faqs: [
      ["자동차배터리 규격은 어디서 확인하나요?", "차량 배터리 찾기에서 제조사, 차량명, 세부모델을 선택하면 DB에 등록된 기본 배터리와 업그레이드 배터리를 확인할 수 있습니다."],
      ["배터리 가격은 왜 차량마다 다른가요?", "적용 규격, 용량, AGM 여부, 제품에 따라 가격이 달라질 수 있습니다. 규격 확인 후 현재 판매가격을 확인하는 것이 좋습니다."],
      ["출장배터리 교체도 가능한가요?", "서울, 경기, 인천 지역은 차량 위치와 차종 확인 후 출장배터리 교체 상담을 받을 수 있습니다."],
      ["수입차 배터리는 별도로 확인해야 하나요?", "수입차는 차종에 따라 AGM 배터리, 등록 또는 코딩 확인이 필요할 수 있어 차량 정보를 함께 확인해야 합니다."]
    ]
  },
  {
    id: "carBattery",
    output: "car-battery.html",
    canonicalPath: "/battery/car-battery.html",
    image: "car-battery.png",
    eyebrow: "Car Battery",
    title: "자동차배터리 규격 안내 | 자동차밧데리 | 일등밧데리",
    description: "자동차배터리와 자동차밧데리 검색 고객을 위한 차량용배터리 규격, DIN, AGM, 용량 확인 방법 안내입니다.",
    h1: "자동차배터리 규격 안내",
    summaryTitle: "차량용배터리 확인 포인트",
    summaryItems: ["차량마다 다른 배터리 규격", "일반 DIN과 AGM 타입", "용량과 단자 방향 확인", "연식·연료·세부모델 구분", "차량별 DB 바로 연결"],
    directQuestion: "자동차배터리는 어떤 규격을 사용해야 하나요?",
    directAnswer: "자동차배터리 규격은 차량의 제조사, 연식, 연료, 세부모델과 ISG/AGM 적용 여부 등에 따라 달라집니다. 일등밧데리 차량 DB에서 차량별 기본 배터리와 업그레이드 배터리를 확인할 수 있습니다.",
    sections: [
      ["자동차배터리란?", "자동차배터리는 시동과 차량 전장장비에 필요한 전원을 공급하는 소모품입니다. 차량용배터리는 차종과 사양에 맞는 규격을 선택해야 합니다."],
      ["차량마다 규격이 다른 이유", "엔진, 연료, 전장 옵션, 충전제어 방식이 달라지면 필요한 배터리 용량과 타입도 달라질 수 있습니다."],
      ["일반 DIN과 AGM", "일반 DIN 배터리와 AGM 배터리는 적용 차량과 충전 환경이 다릅니다. 기존 차량에 적용된 타입을 우선 확인해야 합니다."],
      ["자동차밧데리 검색 표현", "자동차밧데리는 자동차배터리를 찾을 때 많이 쓰는 표현입니다. 실제 선택 기준은 검색어가 아니라 차량별 규격입니다."],
      ["가격과 교체 연결", "규격을 확인한 뒤 가격 페이지와 출장교체 상담을 함께 확인하면 제품 선택과 교체 일정을 더 쉽게 정리할 수 있습니다."]
    ],
    related: ["price", "replacement", "batteryLife", "agm", "mobile", "importCar"],
    faqs: [
      ["자동차배터리와 자동차밧데리는 다른가요?", "표현만 다를 뿐 일반적으로 같은 의미로 사용됩니다. 중요한 것은 차량에 맞는 규격과 타입을 확인하는 것입니다."],
      ["같은 차종이면 배터리도 같나요?", "같은 차량명이라도 연식, 연료, 세부모델에 따라 배터리 규격이 달라질 수 있습니다."],
      ["AGM 차량에 일반 배터리를 써도 되나요?", "AGM 적용 차량은 충전제어 환경에 맞는 배터리 선택이 중요하므로 교체 전 상담을 권장합니다."],
      ["차량 세부모델을 모르면 어떻게 하나요?", "차량 배터리 찾기에서 순서대로 선택하거나 1644-9141로 문의하면 확인 안내를 받을 수 있습니다."]
    ]
  },
  {
    id: "replacement",
    output: "replacement.html",
    canonicalPath: "/battery/replacement.html",
    image: "replacement.png",
    eyebrow: "Replacement",
    title: "자동차배터리 교체 안내 | 자동차밧데리교체 | 일등밧데리",
    description: "자동차배터리교체 시기, 배터리교체 전 확인할 증상, 차량 규격 확인과 출장교체 상담 흐름을 안내합니다.",
    h1: "자동차배터리 교체 안내",
    summaryTitle: "교체 전 확인할 내용",
    summaryItems: ["시동 성능 저하", "반복 방전 여부", "차량별 규격 확인", "AGM 적용 여부", "출장교체 가능 지역"],
    directQuestion: "자동차배터리는 언제 교체해야 하나요?",
    directAnswer: "시동 성능 저하, 반복적인 방전, 배터리 경고, 사용기간 증가 등이 나타나면 배터리 상태 확인이 필요합니다. 정확한 교체 여부는 차량과 배터리 상태를 함께 확인해야 합니다.",
    sections: [
      ["교체가 필요한 신호", "시동이 늦게 걸리거나 전장장비가 불안정하고 방전이 반복되면 배터리 상태 확인이 필요합니다."],
      ["교체 전 규격 확인", "자동차배터리 교체는 차량에 맞는 규격 선택이 먼저입니다. 제조사, 차량명, 연식, 세부모델을 기준으로 확인합니다."],
      ["AGM 차량 주의", "AGM 배터리가 적용된 차량은 일반 배터리와 다른 교체 판단이 필요할 수 있습니다. 기존 적용 타입을 먼저 확인합니다."],
      ["출장 교체 흐름", "차량 위치와 배터리 규격을 상담한 뒤 서비스 가능지역과 방문 일정을 안내합니다."],
      ["교체 후 확인", "교체 후에는 시동 상태, 단자 체결, 기본 전압 상태 등을 확인해 차량 운행에 무리가 없는지 점검합니다."]
    ],
    related: ["replacementCost", "mobile", "discharge", "carBattery", "price", "batteryLife"],
    faqs: [
      ["자동차배터리교체는 얼마나 자주 해야 하나요?", "사용환경에 따라 다르기 때문에 기간만으로 확정하기보다 시동 상태와 점검 결과를 함께 확인해야 합니다."],
      ["방전되면 바로 교체해야 하나요?", "한 번의 방전만으로 교체가 필요한 것은 아닐 수 있습니다. 반복 방전이나 배터리 성능 저하 여부를 확인하는 것이 좋습니다."],
      ["출장배터리 교체가 가능한가요?", "서울, 경기, 인천 지역은 차량 위치와 차종을 확인한 뒤 출장교체 상담이 가능합니다."],
      ["자동차밧데리교체 비용은 어떻게 확인하나요?", "제품 가격과 차량 조건, 출장 조건에 따라 달라질 수 있어 교체비용 안내 페이지와 전화상담을 함께 확인해 주세요."]
    ]
  },
  {
    id: "price",
    output: "price.html",
    canonicalPath: "/battery/price.html",
    image: "price.png",
    eyebrow: "Price",
    title: "자동차배터리 가격 안내 | 배터리가격 | 일등밧데리",
    description: "자동차배터리가격은 규격, 용량, 일반 DIN 또는 AGM 여부에 따라 달라집니다. 현재 판매가격 확인 방법을 안내합니다.",
    h1: "자동차배터리 가격 안내",
    summaryTitle: "가격 확인 전 체크",
    summaryItems: ["차량 적용 규격", "일반 DIN 또는 AGM", "배터리 용량", "제품별 차이", "출장교체 상담 비용"],
    directQuestion: "자동차배터리 가격은 무엇에 따라 달라지나요?",
    directAnswer: "자동차배터리 가격은 배터리 규격, 용량, 일반 DIN 또는 AGM 여부와 제품에 따라 달라집니다. 차량별 적용 규격을 먼저 확인한 뒤 현재 판매가격을 확인하는 것이 정확합니다.",
    sections: [
      ["가격을 먼저 보면 안 되는 이유", "같은 차량명이라도 적용 배터리가 다를 수 있어 가격보다 규격 확인이 먼저입니다."],
      ["일반 DIN과 AGM 가격 차이", "AGM 배터리는 적용 차량과 구조가 다르기 때문에 일반 DIN 배터리와 가격이 다를 수 있습니다."],
      ["용량과 제품 차이", "DIN60, AGM70처럼 용량이 달라지면 제품 선택 폭과 가격도 달라질 수 있습니다."],
      ["현재 판매가격 확인", "고정 금액을 임의로 안내하지 않고 스마트스토어 상품 페이지에서 현재 판매가격을 확인하도록 연결합니다."],
      ["출장교체 비용 확인", "제품 가격 외에 출장 조건, 차량 구조, 수입차 코딩 여부에 따라 상담 내용이 달라질 수 있습니다."]
    ],
    related: ["carBattery", "replacementCost", "agmPrice", "mobile", "delkor", "replacement"],
    faqs: [
      ["자동차배터리 가격을 바로 알 수 있나요?", "차량 규격을 먼저 확인한 뒤 일반 DIN 또는 AGM 상품 바로가기에서 현재 판매가격을 확인할 수 있습니다."],
      ["배터리가격이 매번 같은가요?", "제품과 판매 조건에 따라 달라질 수 있으므로 현재 가격은 상품 페이지에서 확인하는 것이 안전합니다."],
      ["AGM 배터리 가격은 따로 봐야 하나요?", "AGM 적용 차량은 AGM 배터리 가격 페이지와 AGM 상품 바로가기를 함께 확인해 주세요."],
      ["출장교체 비용도 상품 가격과 같나요?", "출장교체 비용은 차량 조건과 현장 조건에 따라 달라질 수 있어 전화상담으로 확인하는 것이 좋습니다."]
    ]
  },
  {
    id: "replacementCost",
    output: "replacement-cost.html",
    canonicalPath: "/battery/replacement-cost.html",
    image: "replacement-cost.png",
    eyebrow: "Cost",
    title: "자동차배터리 교체비용 안내 | 일등밧데리",
    description: "자동차배터리교체비용은 제품가격, 차량 구조, 출장 조건, 수입차 코딩 여부에 따라 달라질 수 있습니다.",
    h1: "자동차배터리 교체비용 안내",
    summaryTitle: "교체비용 구성 요소",
    summaryItems: ["배터리 제품 가격", "차량별 작업 조건", "출장 가능 지역", "수입차 코딩 가능성", "현장 결제 상담"],
    directQuestion: "자동차배터리 교체비용은 어떻게 결정되나요?",
    directAnswer: "배터리 규격과 제품, 차량 구조, 수입차 코딩 여부, 출장교체 조건 등에 따라 달라질 수 있습니다. 정확한 비용은 차량 정보를 확인한 후 안내합니다.",
    sections: [
      ["제품 가격", "교체비용의 기본은 차량에 맞는 배터리 제품 가격입니다. 일반 DIN과 AGM 여부에 따라 선택지가 달라집니다."],
      ["차량 조건", "배터리 위치, 단자 구조, 차량 전력관리 방식에 따라 작업 확인 내용이 달라질 수 있습니다."],
      ["출장 조건", "차량 위치와 서비스 가능지역, 현장 진입 조건에 따라 출장 상담 내용이 달라질 수 있습니다."],
      ["수입차 코딩", "일부 수입차는 배터리 교체 후 등록 또는 코딩 확인이 필요할 수 있습니다. 차종별로 상담이 필요합니다."],
      ["비용 확인 방법", "임의 금액을 안내하기보다 차량 정보 확인 후 1644-9141 상담으로 정확한 교체 조건을 안내합니다."]
    ],
    related: ["price", "replacement", "mobile", "importCar", "agm", "discharge"],
    faqs: [
      ["자동차배터리 교체비용에 출장비가 포함되나요?", "서비스 조건에 따라 안내가 달라질 수 있으므로 차량 위치와 차종을 알려주시면 상담에서 확인할 수 있습니다."],
      ["수입차는 비용이 달라질 수 있나요?", "차종에 따라 AGM 배터리나 코딩 확인이 필요할 수 있어 일반 차량과 상담 내용이 달라질 수 있습니다."],
      ["현장 결제도 가능한가요?", "현장 카드, 현금, 이체 결제 가능 여부는 상담 시 안내받을 수 있습니다."],
      ["정확한 비용은 어디로 문의하나요?", "1644-9141로 차량명, 연식, 현재 위치를 알려주시면 더 빠르게 안내받을 수 있습니다."]
    ]
  },
  {
    id: "batteryLife",
    output: "battery-life.html",
    canonicalPath: "/battery/battery-life.html",
    image: "battery-life.png",
    eyebrow: "Life",
    title: "자동차배터리 수명과 교체주기 안내 | 일등밧데리",
    description: "자동차배터리수명은 주행환경, 블랙박스 사용, 장기주차, 충전상태에 따라 달라집니다. 점검 기준을 안내합니다.",
    h1: "자동차배터리 수명 안내",
    summaryTitle: "수명에 영향을 주는 요소",
    summaryItems: ["주행거리와 충전 환경", "블랙박스 상시전원", "장기주차", "계절과 온도", "반복 방전 이력"],
    directQuestion: "자동차배터리 수명은 어떻게 확인하나요?",
    directAnswer: "자동차배터리 수명은 사용기간만으로 확정할 수 없으며 주행환경, 블랙박스 사용, 장기주차, 충전상태, 차량 전력관리 등에 따라 달라집니다. 시동 상태와 배터리 점검 결과를 함께 확인해야 합니다.",
    sections: [
      ["기간만으로 판단하기 어려움", "같은 기간 사용했더라도 주행 패턴과 전력 사용량이 다르면 배터리 상태가 달라질 수 있습니다."],
      ["블랙박스와 대기전력", "상시전원 장비가 많으면 주차 중 전력 소모가 늘어 방전 가능성이 높아질 수 있습니다."],
      ["장기주차 영향", "오랫동안 운행하지 않는 차량은 충전량이 줄어 시동 불량으로 이어질 수 있습니다."],
      ["반복 방전", "방전이 반복되면 배터리 성능 저하가 진행됐을 가능성이 있어 상태 확인을 권장합니다."],
      ["교체주기 확인", "교체주기는 고정값으로 단정하기보다 차량 상태, 시동 반응, 점검 결과를 함께 보고 판단해야 합니다."]
    ],
    related: ["replacement", "discharge", "carBattery", "replacementCost", "mobile", "agm"],
    faqs: [
      ["자동차배터리 수명은 몇 년인가요?", "사용환경에 따라 달라지므로 기간만으로 확정하기 어렵습니다. 시동 상태와 점검 결과를 함께 확인해야 합니다."],
      ["방전 후 배터리 수명이 줄어드나요?", "반복 방전은 배터리 성능 저하와 관련될 수 있어 점검을 권장합니다."],
      ["블랙박스가 배터리에 영향을 주나요?", "상시전원 사용은 주차 중 전력 소모를 늘릴 수 있어 차량 사용 패턴에 따라 영향이 있을 수 있습니다."],
      ["수명이 의심되면 어떻게 하나요?", "차량 정보와 증상을 1644-9141로 문의하면 교체 상담을 받을 수 있습니다."]
    ]
  },
  {
    id: "mobile",
    output: "mobile-replacement.html",
    canonicalPath: "/battery/mobile-replacement.html",
    image: "mobile-replacement.png",
    eyebrow: "Mobile Service",
    title: "출장배터리 교체 안내 | 출장배터리교체 | 일등밧데리",
    description: "출장배터리 서비스는 차량 위치와 차종, 배터리 규격을 확인한 뒤 서울·경기·인천 방문 교체 상담을 안내합니다.",
    h1: "출장배터리 교체 안내",
    summaryTitle: "출장배터리 상담 흐름",
    summaryItems: ["차량 위치 확인", "차종과 배터리 규격 확인", "서비스 가능지역 확인", "방문 일정 상담", "현장 교체와 기본 확인"],
    directQuestion: "출장배터리 교체는 어떻게 진행되나요?",
    directAnswer: "차량 위치와 차종, 배터리 규격을 확인한 뒤 서비스 가능지역과 방문 일정을 상담하고 차량이 있는 위치에서 배터리 교체를 진행합니다.",
    sections: [
      ["차량 위치 상담", "출장배터리는 차량이 있는 위치를 기준으로 상담합니다. 서울, 경기, 인천 지역 내에서도 일부 현장 조건은 확인이 필요합니다."],
      ["차종 확인", "제조사와 차량명, 연식, 세부모델을 확인하면 필요한 배터리 규격을 더 정확히 안내할 수 있습니다."],
      ["방문 일정", "상담 후 서비스 가능 여부와 방문 일정을 안내합니다. 도착 시간을 보장하는 표현은 사용하지 않고 실제 상담 기준으로 안내합니다."],
      ["현장 교체", "전문 설치기사가 현장에서 배터리 교체와 기본 확인을 진행합니다."],
      ["지역 SEO 연결", "서울, 인천, 경기 지역별 출장배터리 페이지에서 구/시와 동별 안내를 확인할 수 있습니다."]
    ],
    related: ["replacement", "replacementCost", "price", "discharge", "carBattery", "importCar"],
    faqs: [
      ["출장배터리 가능 지역은 어디인가요?", "서울, 경기, 인천 중심으로 상담 가능하며 상세 지역은 지역별 출장배터리 페이지에서 확인할 수 있습니다."],
      ["차량 위치만 알려주면 되나요?", "차량 위치와 함께 제조사, 차량명, 연식, 연료 정보를 알려주시면 더 정확한 안내가 가능합니다."],
      ["현장에서 결제할 수 있나요?", "현장 카드, 현금, 이체 결제 가능 여부는 상담 시 최종 안내됩니다."],
      ["출장배터리교체 비용은 어떻게 확인하나요?", "차량 규격과 위치, 작업 조건에 따라 달라질 수 있어 1644-9141 상담으로 확인해 주세요."]
    ]
  },
  {
    id: "discharge",
    output: "battery-discharge.html",
    canonicalPath: "/battery/battery-discharge.html",
    image: "battery-discharge.png",
    eyebrow: "Discharge",
    title: "자동차 배터리 방전 대응 안내 | 일등밧데리",
    description: "배터리방전, 자동차 시동불량, 반복 방전 시 확인할 내용과 차량별 배터리 교체 상담 흐름을 안내합니다.",
    h1: "배터리 방전 대응 안내",
    summaryTitle: "방전 시 확인할 내용",
    summaryItems: ["반복 방전 여부", "블랙박스 상시전원", "충전계통 확인 가능성", "배터리 규격 확인", "출장교체 상담"],
    directQuestion: "자동차 배터리가 방전되면 어떻게 해야 하나요?",
    directAnswer: "반복 방전이나 시동 불량이 발생하면 단순 충전뿐 아니라 배터리 상태와 차량 충전계통을 함께 확인하는 것이 좋습니다. 배터리 교체가 필요한 경우 차량 규격에 맞는 제품을 선택해야 합니다.",
    sections: [
      ["일시 방전과 반복 방전", "한 번의 방전은 사용환경 영향일 수 있지만 반복되면 배터리 성능 저하나 전력 소모 원인을 확인해야 합니다."],
      ["시동불량 증상", "시동이 약하게 걸리거나 계기판 전원이 불안정하다면 배터리 상태 점검이 필요할 수 있습니다."],
      ["블랙박스 영향", "상시녹화 설정은 주차 중 배터리 소모를 키울 수 있어 차량 사용 패턴과 함께 확인해야 합니다."],
      ["교체 판단", "배터리 상태가 좋지 않거나 방전이 반복되면 차량 규격에 맞는 배터리로 교체 상담을 받을 수 있습니다."],
      ["출장 상담", "차량 이동이 어려운 방전 상황에서는 차량 위치를 기준으로 출장배터리 가능 여부를 확인합니다."]
    ],
    related: ["batteryLife", "replacement", "mobile", "replacementCost", "carBattery", "agm"],
    faqs: [
      ["배터리방전은 충전만 하면 되나요?", "상황에 따라 충전으로 해결될 수 있지만 반복 방전이면 배터리 상태 확인이 필요합니다."],
      ["시동이 안 걸리면 바로 교체해야 하나요?", "배터리 성능과 차량 상태를 확인한 뒤 교체 필요 여부를 판단하는 것이 좋습니다."],
      ["방전 차량도 출장 상담이 가능한가요?", "서울, 경기, 인천 지역은 차량 위치와 차종 확인 후 출장배터리 상담을 안내합니다."],
      ["AGM 배터리 차량도 방전될 수 있나요?", "AGM 적용 차량도 사용환경과 전력 소모에 따라 방전될 수 있어 규격에 맞는 점검과 교체가 중요합니다."]
    ]
  },
  {
    id: "importCar",
    output: "import-car-battery.html",
    canonicalPath: "/battery/import-car-battery.html",
    image: "import-car-battery.png",
    eyebrow: "Import Car",
    title: "수입차 배터리 교체 안내 | AGM 배터리 코딩 상담 | 일등밧데리",
    description: "수입차배터리는 차종에 따라 AGM 배터리와 배터리 등록 또는 코딩 확인이 필요할 수 있습니다. 실제 DB 제조사 기준으로 안내합니다.",
    h1: "수입차 배터리 교체 안내",
    summaryTitle: "수입차 배터리 확인 포인트",
    summaryItems: ["수입차 제조사별 규격", "AGM 적용 가능성", "차종별 코딩 필요 여부", "세부모델 확인", "출장교체 상담"],
    directQuestion: "수입차 배터리는 일반 차량과 무엇이 다른가요?",
    directAnswer: "수입차는 AGM 배터리가 적용되는 차량이 많고, 차종에 따라 배터리 등록 또는 코딩이 필요한 경우가 있습니다. 정확한 규격은 제조사·차량명·연식·세부모델을 확인해야 합니다.",
    sections: [
      ["제조사별 차이", "BMW, 벤츠, 아우디 등 수입차는 제조사와 세부모델에 따라 적용 배터리와 확인 절차가 달라질 수 있습니다."],
      ["AGM 적용 차량", "수입차는 AGM 배터리가 적용되는 경우가 많지만 모든 수입차가 AGM은 아닙니다. 실제 차량 조건을 확인해야 합니다."],
      ["코딩 가능성", "일부 차종은 배터리 교체 후 등록 또는 코딩 확인이 필요할 수 있습니다. 차종에 따라 상담 내용이 달라집니다."],
      ["차량 DB 연결", "일등밧데리 차량 DB에 등록된 수입차 제조사 허브에서 차량별 배터리 가격 및 규격 페이지를 확인할 수 있습니다."],
      ["출장 상담", "수입차 배터리 교체는 차량 정보와 현장 조건을 확인한 뒤 1644-9141 전화상담으로 안내합니다."]
    ],
    related: ["agm", "agmPrice", "replacementCost", "mobile", "price", "carBattery"],
    faqs: [
      ["수입차 배터리는 모두 AGM인가요?", "아닙니다. AGM 적용 차량이 많지만 차종과 연식에 따라 다르므로 차량별 규격 확인이 필요합니다."],
      ["수입차는 코딩이 꼭 필요한가요?", "모든 수입차가 반드시 코딩이 필요한 것은 아니며 차종에 따라 필요할 수 있습니다."],
      ["수입차 출장배터리 상담도 가능한가요?", "차량 위치와 차종, 배터리 규격을 확인한 뒤 상담을 안내합니다."],
      ["수입차 배터리 가격은 어디서 확인하나요?", "차량별 규격을 먼저 확인하고 AGM 또는 일반 DIN 상품의 현재 판매가격을 확인해 주세요."]
    ],
    extra: "importManufacturers"
  },
  {
    id: "delkor",
    output: "delkor-battery.html",
    canonicalPath: "/battery/delkor-battery.html",
    image: "delkor-battery.png",
    eyebrow: "Delkor",
    title: "델코배터리 선택 안내 | 자동차배터리 규격 | 일등밧데리",
    description: "델코배터리 선택 전 차량 규격, 일반 DIN과 AGM 구분, 용량, 현재 판매가격 확인 방법을 안내합니다.",
    h1: "델코배터리 선택 안내",
    summaryTitle: "브랜드보다 먼저 볼 기준",
    summaryItems: ["차량 호환 규격", "일반 DIN과 AGM 구분", "용량 확인", "현재 판매가격", "출장교체 상담"],
    directQuestion: "델코배터리는 어떻게 선택해야 하나요?",
    directAnswer: "델코배터리를 선택할 때도 브랜드명보다 차량에 맞는 배터리 규격, 용량, 일반 DIN 또는 AGM 여부를 먼저 확인해야 합니다. 차량 DB에서 적용 규격을 확인한 뒤 제품을 선택하는 것이 안전합니다.",
    sections: [
      ["규격 우선 선택", "배터리 브랜드를 먼저 고르기보다 차량에 맞는 규격과 타입을 먼저 확인하는 것이 중요합니다."],
      ["일반 DIN과 AGM", "델코 제품군도 일반 DIN과 AGM 여부에 따라 적용 차량이 달라질 수 있습니다."],
      ["용량 확인", "배터리 용량은 차량의 전력 요구와 장착 조건에 맞춰 확인해야 합니다."],
      ["가격 확인", "현재 판매가격은 상품 링크에서 확인하고, 출장교체 조건은 전화상담으로 확인할 수 있습니다."],
      ["과장 표현 배제", "제조사 공식 수치나 보증조건을 임의로 쓰지 않고 차량 호환과 상담 흐름 중심으로 안내합니다."]
    ],
    related: ["carBattery", "price", "agm", "delkorAgm", "replacement", "mobile"],
    faqs: [
      ["델코배터리는 어떤 차량에 맞나요?", "차량별 규격과 제품 타입이 맞아야 하므로 제조사, 차량명, 세부모델 기준으로 확인해야 합니다."],
      ["델코 AGM 배터리도 있나요?", "AGM 배터리 관련 안내는 델코 AGM 배터리 페이지에서 별도로 확인할 수 있습니다."],
      ["브랜드만 같으면 장착 가능한가요?", "브랜드가 같아도 용량, 타입, 단자 방향 등 규격이 맞아야 합니다."],
      ["델코배터리 가격은 어디서 보나요?", "차량 규격을 확인한 뒤 일반 DIN 또는 AGM 상품 바로가기에서 현재 판매가격을 확인해 주세요."]
    ]
  },
  {
    id: "agm",
    output: "agm/index.html",
    canonicalPath: "/battery/agm/",
    image: "agm.png",
    eyebrow: "AGM",
    title: "AGM배터리 규격 안내 | 자동차 AGM 배터리 | 일등밧데리",
    description: "AGM배터리란 무엇인지, 일반 배터리와 차이, 적용 차량, 가격 확인과 차량별 규격 확인 방법을 안내합니다.",
    h1: "AGM배터리 규격 안내",
    summaryTitle: "AGM 확인 핵심",
    summaryItems: ["ISG와 전장장비", "일반 배터리와 차이", "수입차 적용 가능성", "차량별 규격 확인", "용량별 적용 차량"],
    directQuestion: "AGM 배터리는 무엇인가요?",
    directAnswer: "AGM 배터리는 차량 전력 사용량과 충전제어 환경에 대응하도록 사용되는 자동차용 배터리 유형입니다. ISG 및 다양한 전장장비가 적용된 차량에서 사용되는 경우가 있으며, 기존 적용 규격에 맞는 배터리를 선택하는 것이 중요합니다.",
    sections: [
      ["AGM의 역할", "AGM 배터리는 충전제어와 전장 부하가 많은 차량에서 적용되는 경우가 있습니다. 차량 사양에 맞는 타입 확인이 필요합니다."],
      ["일반 배터리와 구분", "일반 DIN 배터리와 AGM 배터리는 적용 환경이 다르므로 임의로 대체하지 않는 것이 좋습니다."],
      ["적용 차량 확인", "차량명만으로 단정하기보다 연식, 연료, 세부모델 기준으로 AGM 적용 여부를 확인해야 합니다."],
      ["가격 확인", "AGM 가격은 용량과 제품에 따라 달라질 수 있어 AGM 가격 페이지와 상품 바로가기를 함께 확인합니다."],
      ["용량별 페이지", "DB에서 실제 확인된 AGM60, AGM70 같은 용량별 적용 차량 페이지를 자동 생성합니다."]
    ],
    related: ["agmPrice", "delkorAgm", "vartaAgm", "importCar", "carBattery", "price"],
    faqs: [
      ["AGM배터리는 모든 차량에 필요한가요?", "아닙니다. 차량 사양과 기존 적용 타입에 따라 필요 여부가 달라집니다."],
      ["AGM 차량에 일반 배터리를 장착해도 되나요?", "충전제어 환경에 맞지 않을 수 있어 차량별 규격 확인과 상담을 권장합니다."],
      ["AGM 배터리 가격은 어디서 보나요?", "AGM 가격 페이지와 스마트스토어 상품 바로가기에서 현재 판매가격을 확인할 수 있습니다."],
      ["AGM 용량별 적용 차량도 볼 수 있나요?", "일등밧데리 DB에서 실제 확인된 AGM 용량별 적용 차량 페이지를 제공합니다."]
    ],
    extra: "agmCapacities"
  },
  {
    id: "agmPrice",
    output: "agm/price.html",
    canonicalPath: "/battery/agm/price.html",
    image: "agm-price.png",
    eyebrow: "AGM Price",
    title: "AGM배터리 가격 안내 | 자동차 AGM 배터리 가격 | 일등밧데리",
    description: "AGM배터리 가격은 용량, 차량 적용 규격, 제품에 따라 달라집니다. 현재 판매가격과 차량별 규격 확인 방법을 안내합니다.",
    h1: "AGM배터리 가격 안내",
    summaryTitle: "AGM 가격 확인 순서",
    summaryItems: ["차량 AGM 적용 여부", "AGM 용량 확인", "제품별 현재 판매가격", "출장교체 조건", "수입차 코딩 가능성"],
    directQuestion: "AGM배터리 가격은 어떻게 확인하나요?",
    directAnswer: "AGM배터리 가격은 용량, 차량 적용 규격, 제품에 따라 달라질 수 있습니다. 차량별 AGM 적용 여부를 먼저 확인한 뒤 AGM 배터리 상품 바로가기에서 현재 판매가격을 확인하는 것이 좋습니다.",
    sections: [
      ["AGM 여부 확인", "차량에 AGM이 적용되는지 먼저 확인해야 가격 비교가 의미 있습니다."],
      ["용량별 차이", "AGM60, AGM70, AGM80처럼 용량이 달라지면 가격과 적용 차량이 달라질 수 있습니다."],
      ["현재 판매가격", "고정 금액을 임의로 쓰지 않고 스마트스토어 AGM 상품에서 현재 판매가격을 확인하도록 안내합니다."],
      ["교체비용과 분리", "상품 가격과 출장교체 비용은 구분해서 확인해야 합니다. 현장 조건에 따라 상담 내용이 달라질 수 있습니다."],
      ["수입차 확인", "수입차는 차종에 따라 코딩 확인이 필요할 수 있으므로 가격과 함께 작업 조건을 확인합니다."]
    ],
    related: ["agm", "price", "replacementCost", "importCar", "delkorAgm", "vartaAgm"],
    faqs: [
      ["AGM배터리 가격은 일반 배터리와 다른가요?", "제품 타입과 용량이 다르기 때문에 일반 DIN 배터리와 가격이 다를 수 있습니다."],
      ["AGM 가격만 보고 구매해도 되나요?", "먼저 차량에 맞는 AGM 규격과 용량을 확인해야 합니다."],
      ["AGM 출장교체 비용도 알 수 있나요?", "차량 정보와 위치를 확인한 뒤 1644-9141 상담으로 안내받을 수 있습니다."],
      ["AGM70 또는 AGM80처럼 후보가 두 개면 어떻게 하나요?", "차량 세부 사양 확인이 필요할 수 있어 실제 차량 정보로 상담을 권장합니다."]
    ]
  },
  {
    id: "delkorAgm",
    output: "agm/delkor.html",
    canonicalPath: "/battery/agm/delkor.html",
    image: "agm-delkor.png",
    eyebrow: "Delkor AGM",
    title: "델코AGM배터리 선택 안내 | 일등밧데리",
    description: "델코AGM배터리 선택 전 차량 호환 규격, AGM 용량, 현재 판매가격과 출장교체 상담 기준을 안내합니다.",
    h1: "델코AGM배터리 선택 안내",
    summaryTitle: "델코 AGM 확인 기준",
    summaryItems: ["차량별 AGM 적용", "용량 확인", "호환 규격 우선", "현재 판매가격", "출장교체 상담"],
    directQuestion: "델코AGM배터리는 무엇을 보고 선택해야 하나요?",
    directAnswer: "델코AGM배터리도 차량 호환 규격과 AGM 용량을 먼저 확인해야 합니다. 브랜드명만으로 장착 가능 여부를 판단하지 말고 차량별 DB와 상담을 함께 확인하는 것이 좋습니다.",
    sections: [
      ["차량 호환 우선", "브랜드보다 차량 규격, 용량, AGM 적용 여부가 먼저입니다."],
      ["용량 확인", "AGM70, AGM80 등 용량 후보가 있는 경우 차량 세부 사양 확인이 필요할 수 있습니다."],
      ["가격 확인", "현재 판매가격은 AGM 상품 바로가기를 통해 확인하고, 교체 조건은 상담으로 확인합니다."],
      ["수입차 상담", "일부 수입차는 배터리 등록 또는 코딩 확인이 필요할 수 있어 차종 확인이 중요합니다."],
      ["안전한 표현", "확인할 수 없는 제조사 성능 수치나 보증 조건은 임의로 안내하지 않습니다."]
    ],
    related: ["delkor", "agm", "agmPrice", "importCar", "replacementCost", "mobile"],
    faqs: [
      ["델코AGM배터리는 어떤 차량에 쓰나요?", "AGM 적용 차량 중 규격과 용량이 맞는 경우 사용할 수 있습니다. 차량별 확인이 필요합니다."],
      ["델코 AGM 가격은 어디서 확인하나요?", "AGM 배터리 상품 바로가기에서 현재 판매가격을 확인할 수 있습니다."],
      ["일반 델코배터리와 다른가요?", "AGM 타입은 적용 차량과 충전 환경이 다를 수 있어 일반 배터리와 구분해야 합니다."],
      ["수입차에도 상담 가능한가요?", "차량명, 연식, 세부모델을 확인한 뒤 상담을 안내합니다."]
    ]
  },
  {
    id: "vartaAgm",
    output: "agm/varta.html",
    canonicalPath: "/battery/agm/varta.html",
    image: "agm-varta.png",
    eyebrow: "Varta AGM",
    title: "바르타AGM배터리 선택 안내 | VARTA AGM | 일등밧데리",
    description: "바르타AGM배터리 선택 시 차량 호환 규격, AGM 용량, 수입차 코딩 가능성과 현재 판매가격 확인 방법을 안내합니다.",
    h1: "바르타AGM배터리 선택 안내",
    summaryTitle: "바르타 AGM 확인 기준",
    summaryItems: ["차량 호환 규격", "AGM 용량", "수입차 적용 가능성", "현재 판매가격", "출장교체 상담"],
    directQuestion: "바르타AGM배터리는 어떻게 확인해야 하나요?",
    directAnswer: "바르타AGM배터리를 선택할 때도 차량에 맞는 AGM 규격과 용량 확인이 먼저입니다. 수입차는 차종에 따라 배터리 등록 또는 코딩 확인이 필요할 수 있어 차량 정보를 함께 확인해야 합니다.",
    sections: [
      ["규격이 먼저", "브랜드 선호가 있더라도 차량에 맞는 규격과 용량이 우선입니다."],
      ["AGM 적용 여부", "ISG나 전장장비가 적용된 차량이라도 실제 AGM 여부는 세부모델 기준으로 확인해야 합니다."],
      ["수입차 확인", "수입차는 작업 후 확인 절차가 필요한 경우가 있어 차종별 상담이 필요할 수 있습니다."],
      ["가격 확인", "고정 금액을 임의로 쓰지 않고 AGM 상품 바로가기에서 현재 판매가격을 확인하도록 안내합니다."],
      ["출장 상담", "차량 위치와 차종을 알려주면 출장교체 가능 여부와 상담을 안내받을 수 있습니다."]
    ],
    related: ["agm", "agmPrice", "importCar", "replacementCost", "mobile", "carBattery"],
    faqs: [
      ["바르타AGM배터리는 어떤 차량에 맞나요?", "차량별 AGM 규격과 용량이 맞는 경우에 선택할 수 있습니다. 세부모델 확인이 필요합니다."],
      ["VARTA AGM 가격은 어디서 확인하나요?", "AGM 배터리 상품 바로가기에서 현재 판매가격을 확인할 수 있습니다."],
      ["수입차는 코딩이 필요한가요?", "모든 수입차가 반드시 필요한 것은 아니며 차종에 따라 필요할 수 있습니다."],
      ["기존 배터리와 다른 용량을 써도 되나요?", "차량 사양과 장착 조건을 확인해야 하므로 임의 변경보다 상담을 권장합니다."]
    ]
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeMatch(value) {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function pageDepthPrefix(outputPath) {
  return "../".repeat(outputPath.split("/").length);
}

function ensureSafeOutputDir() {
  const resolved = path.resolve(OUTPUT_DIR);
  const rootPrefix = `${ROOT_DIR}${path.sep}`;

  if (!resolved.startsWith(rootPrefix)) {
    throw new Error(`Unsafe output directory: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function getImagePath(image) {
  return `/assets/seo/battery/${image}`;
}

function renderHeader(prefix) {
  return `
  <header class="battery-topbar">
    <a class="battery-home" href="${prefix}index.html" aria-label="홈으로 이동">‹ 홈</a>
    <a class="battery-logo" href="${prefix}index.html" aria-label="일등밧데리 홈">
      <img src="${prefix}assets/logos/ildeung-logo.png" alt="일등밧데리">
    </a>
    <a class="battery-call" href="tel:16449141" aria-label="일등밧데리 전화 상담">1644-9141</a>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer" aria-label="사이트 정보">
    <div class="site-footer-inner">
      <strong class="footer-brand">일등밧데리</strong>
      <p class="footer-line">대표번호 <a href="tel:16449141">1644-9141</a></p>
      <p class="footer-line">서울 · 경기 · 인천 출장배터리 교체</p>
      <p class="footer-line">자동차배터리 · AGM배터리 · 출장배터리교체 상담</p>
      <p class="footer-copy">Copyright © 2026 일등밧데리. All rights reserved.</p>
    </div>
  </footer>`;
}

function renderBreadcrumb(items) {
  return `
      <nav class="breadcrumbs" aria-label="현재 위치">
        ${items.map((item, index) => {
          const content = item.href
            ? `<a href="${item.href}">${escapeHtml(item.label)}</a>`
            : `<span>${escapeHtml(item.label)}</span>`;
          const separator = index < items.length - 1 ? `<span aria-hidden="true">&gt;</span>` : "";
          return `${content}${separator}`;
        }).join("\n        ")}
      </nav>`;
}

function breadcrumbJsonLd(items, canonicalPath) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_ORIGIN}${item.href || canonicalPath}`
    }))
  });
}

function faqJsonLd(faqs) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  });
}

function renderShell({ output, title, description, canonicalPath, breadcrumbs, imagePath, faqs, content }) {
  const prefix = pageDepthPrefix(output);
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="일등밧데리">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE_ORIGIN}${imagePath}">
  <meta property="og:image:width" content="800">
  <meta property="og:image:height" content="800">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}${imagePath}">
  <link rel="stylesheet" href="${prefix}${CSS_FILE}">
  <link rel="stylesheet" href="${prefix}css/blog-cases.css">
  <script src="${prefix}js/blog-cases.js" defer></script>
  <script type="application/ld+json">${breadcrumbJsonLd(breadcrumbs, canonicalPath)}</script>
  <script type="application/ld+json">${faqJsonLd(faqs)}</script>
</head>
<body class="battery-seo-page">
${renderHeader(prefix)}
  <main class="battery-page-shell">
${content}
  </main>
${renderFooter()}
</body>
</html>
`;
}

function renderHero(topic) {
  const items = topic.summaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const imagePath = getImagePath(topic.image);

  return `
      <section class="battery-hero-card">
        <p class="eyebrow">${escapeHtml(topic.eyebrow)}</p>
        <h1>${escapeHtml(topic.h1)}</h1>
        <div class="battery-hero-layout">
          <figure class="battery-hero-image">
            <img src="${imagePath}" alt="${escapeHtml(topic.h1)} - 일등밧데리" loading="eager" decoding="async" onerror="this.closest('.battery-hero-image').classList.add('is-missing')">
          </figure>
          <div class="battery-hero-summary">
            <h2>${escapeHtml(topic.summaryTitle)}</h2>
            <ul class="battery-check-list">${items}</ul>
            <div class="button-row">
              <a class="btn primary" href="/search.html">내 차 배터리 직접 찾기</a>
              <a class="btn secondary" href="tel:16449141">1644-9141 전화상담</a>
            </div>
          </div>
        </div>
      </section>`;
}

function renderDirectAnswer(topic) {
  return `
      <section class="direct-answer" aria-labelledby="directAnswerTitle">
        <p class="eyebrow">Direct Answer</p>
        <h2 id="directAnswerTitle">Q. ${escapeHtml(topic.directQuestion)}</h2>
        <p>A. ${escapeHtml(topic.directAnswer)}</p>
      </section>`;
}

function renderSections(topic) {
  const cards = topic.sections.map(([heading, body]) => `
          <article class="info-card">
            <h3>${escapeHtml(heading)}</h3>
            <p>${escapeHtml(body)}</p>
          </article>`).join("");

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Guide</p>
          <h2>${escapeHtml(topic.h1)} 핵심 정리</h2>
          <p class="section-desc">차량에 맞는 자동차배터리를 확인할 때 실제로 도움이 되는 기준만 정리했습니다.</p>
        </div>
        <div class="info-grid">${cards}
        </div>
      </section>`;
}

function renderTopicLinks(topic) {
  const links = topic.related
    .map((id) => TOPIC_LINKS[id])
    .filter(Boolean)
    .map((link) => `
          <a class="topic-card" href="${link.href}">
            <strong>${escapeHtml(link.label)}</strong>
            <span>관련 정보 보기 →</span>
          </a>`).join("");

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Related</p>
          <h2>관련 자동차배터리 정보</h2>
        </div>
        <div class="topic-grid">${links}
        </div>
      </section>`;
}

function renderBridgeLinks({ includeArea = true } = {}) {
  const areaLinks = includeArea
    ? `
          <a class="topic-card" href="/area/index.html">
            <strong>지역별 출장배터리</strong>
            <span>서울·경기·인천 가능 지역 보기 →</span>
          </a>`
    : "";

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Find</p>
          <h2>차량과 지역으로 이어서 확인하기</h2>
        </div>
        <div class="topic-grid">
          <a class="topic-card" href="/car-battery/index.html">
            <strong>차량별 배터리 가격 및 규격</strong>
            <span>제조사와 차량명별 DB 보기 →</span>
          </a>
          <a class="topic-card" href="/search.html">
            <strong>내 차 배터리 직접 찾기</strong>
            <span>제조사, 차량명, 세부모델 선택 →</span>
          </a>${areaLinks}
        </div>
      </section>`;
}

function renderPriceLinks() {
  return `
      <section class="section" aria-labelledby="batteryPriceLinks">
        <div class="section-heading">
          <p class="eyebrow">Price</p>
          <h2 id="batteryPriceLinks">배터리 최저가 바로가기</h2>
          <p class="section-desc">차량에 맞는 배터리 타입을 확인한 뒤 현재 판매가격을 확인해 보세요.</p>
        </div>
        <div class="price-link-grid">
          <a class="price-link-card" href="${STANDARD_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/standard-din.png" alt="일반타입 DIN 자동차배터리 가격 확인" loading="lazy" decoding="async" onerror="this.hidden=true">
            </span>
            <span class="price-link-text">
              <strong>일반타입 · DIN 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
          <a class="price-link-card" href="${AGM_BATTERY_URL}" target="_blank" rel="noopener noreferrer">
            <span class="price-link-image">
              <img src="/assets/quick-links/agm.png" alt="AGM 자동차배터리 가격 확인" loading="lazy" decoding="async" onerror="this.hidden=true">
            </span>
            <span class="price-link-text">
              <strong>AGM 배터리</strong>
              <span>현재 판매가격 확인</span>
            </span>
          </a>
        </div>
      </section>`;
}

function renderAreaLinks() {
  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Service Area</p>
          <h2>출장배터리 지역 바로가기</h2>
          <p class="section-desc">서울, 인천, 경기 지역별 출장배터리 안내 페이지로 연결됩니다.</p>
        </div>
        <div class="topic-grid">
          <a class="topic-card" href="/area/seoul/index.html"><strong>서울 출장배터리</strong><span>서울 서비스 지역 보기 →</span></a>
          <a class="topic-card" href="/area/incheon/index.html"><strong>인천 출장배터리</strong><span>인천 서비스 지역 보기 →</span></a>
          <a class="topic-card" href="/area/gyeonggi/index.html"><strong>경기 출장배터리</strong><span>경기 서비스 지역 보기 →</span></a>
          <a class="topic-card" href="/area/index.html"><strong>지역별 전체 보기</strong><span>출장 가능 지역 허브 →</span></a>
        </div>
      </section>`;
}

function renderCta() {
  return `
      <section class="section">
        <div class="cta-card">
          <div>
            <p class="eyebrow">Contact</p>
            <h2>내 차에 맞는 배터리를 확인하세요</h2>
            <p>세부모델을 모르거나 교체 조건이 애매하다면 차량 정보를 기준으로 상담을 받아보세요.</p>
          </div>
          <div class="button-row">
            <a class="btn primary" href="/search.html">차량 배터리 찾기</a>
            <a class="btn dark" href="tel:16449141">1644-9141 전화상담</a>
          </div>
        </div>
      </section>`;
}

function renderFaq(topic) {
  const cards = topic.faqs.map(([question, answer]) => `
          <article class="faq-card">
            <h3>${escapeHtml(question)}</h3>
            <p>${escapeHtml(answer)}</p>
          </article>`).join("");

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">FAQ</p>
          <h2>자주 묻는 질문</h2>
        </div>
        <div class="faq-grid">${cards}
        </div>
      </section>`;
}

function loadManufacturers() {
  return readJson(MANUFACTURERS_FILE);
}

function loadVehicleRows() {
  const manufacturers = loadManufacturers();
  const rows = [];

  manufacturers.forEach((manufacturer) => {
    const filePath = path.join(DATA_DIR, manufacturer.file);
    if (!fs.existsSync(filePath)) {
      return;
    }

    readJson(filePath).forEach((row) => {
      rows.push({ ...row, manufacturerId: manufacturer.id, manufacturerName: manufacturer.name });
    });
  });

  return rows;
}

function extractAgmCapacitiesFromText(value) {
  const capacities = new Set();
  const text = normalizeText(value);

  for (const match of text.matchAll(/\bAGM\s*([0-9]{2,3})\b/gi)) {
    capacities.add(`AGM${match[1]}`);
  }

  return capacities;
}

function buildAgmCapacityGroups(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    ["defaultBattery", "upgradeBattery"].forEach((field) => {
      extractAgmCapacitiesFromText(row[field]).forEach((capacity) => {
        if (!groups.has(capacity)) {
          groups.set(capacity, []);
        }
        groups.get(capacity).push({ ...row, matchedBattery: normalizeText(row[field]) });
      });
    });
  });

  return [...groups.entries()]
    .sort((a, b) => Number(a[0].replace("AGM", "")) - Number(b[0].replace("AGM", "")))
    .map(([capacity, capacityRows]) => ({ capacity, rows: uniqueCapacityRows(capacityRows) }));
}

function uniqueCapacityRows(rows) {
  const seen = new Set();
  const result = [];

  rows.forEach((row) => {
    const key = [
      row.manufacturerId,
      row.vehicle,
      row.year,
      row.fuel,
      row.detailModel,
      row.matchedBattery
    ].map(normalizeText).join("\u0001");

    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });

  return result;
}

function buildVehiclePageMap(manufacturers) {
  const map = new Map();

  manufacturers.forEach((manufacturer) => {
    const dir = path.join(ROOT_DIR, "car-battery", manufacturer.id);
    if (!fs.existsSync(dir)) {
      return;
    }

    fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .forEach((entry) => {
        const relativeHref = `/car-battery/${manufacturer.id}/${entry.name}`;
        const html = fs.readFileSync(path.join(dir, entry.name), "utf8");
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
          ?.replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (!h1) {
          return;
        }

        const label = h1.replace(/\s*배터리\s*가격\s*및\s*규격\s*안내\s*$/, "").trim();
        const keys = new Set([label]);
        if (label.startsWith(manufacturer.name)) {
          keys.add(label.slice(manufacturer.name.length).trim());
        }

        keys.forEach((key) => {
          if (key) {
            map.set(`${manufacturer.id}:${normalizeMatch(key)}`, relativeHref);
          }
        });
      });
  });

  return map;
}

function findVehicleHref(vehiclePageMap, row) {
  return vehiclePageMap.get(`${row.manufacturerId}:${normalizeMatch(row.vehicle)}`) || null;
}

function renderImportManufacturerLinks(manufacturers) {
  const links = manufacturers
    .filter((manufacturer) => IMPORT_MANUFACTURER_IDS.has(manufacturer.id))
    .filter((manufacturer) => fs.existsSync(path.join(ROOT_DIR, "car-battery", `${manufacturer.id}.html`)))
    .map((manufacturer) => `
          <a class="topic-card" href="/car-battery/${manufacturer.id}.html">
            <strong>${escapeHtml(manufacturer.name)} 배터리</strong>
            <span>차량별 가격 및 규격 보기 →</span>
          </a>`).join("");

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Import Brands</p>
          <h2>DB에 등록된 수입차 제조사</h2>
          <p class="section-desc">현재 data/manufacturers.json과 차량 SEO 허브가 실제로 존재하는 제조사만 표시합니다.</p>
        </div>
        <div class="topic-grid">${links}
        </div>
      </section>`;
}

function renderAgmCapacityLinks(capacityGroups) {
  const links = capacityGroups.map(({ capacity, rows }) => `
          <a class="topic-card" href="/battery/agm/capacity/${capacity.toLowerCase()}.html">
            <strong>${escapeHtml(capacity)} 배터리</strong>
            <span>${rows.length.toLocaleString("ko-KR")}개 DB 행 기준 적용 차량 보기 →</span>
          </a>`).join("");

  return `
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">AGM Capacity</p>
          <h2>용량별 AGM 배터리</h2>
          <p class="section-desc">일등밧데리 차량 DB에서 실제 확인된 AGM 용량만 자동으로 표시합니다.</p>
        </div>
        <div class="topic-grid">${links}
        </div>
      </section>`;
}

function renderTopicPage(topic, { manufacturers, capacityGroups, blogCases }) {
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "자동차배터리 정보", href: "/battery/" }
  ];

  if (topic.id !== "hub") {
    if (topic.canonicalPath.startsWith("/battery/agm/") || topic.canonicalPath === "/battery/agm/") {
      breadcrumbs.push({ label: "AGM 배터리", href: "/battery/agm/" });
    }
    breadcrumbs.push({ label: topic.h1 });
  } else {
    breadcrumbs[1] = { label: "자동차배터리 정보" };
  }

  let extra = "";
  if (topic.extra === "importManufacturers") {
    extra = renderImportManufacturerLinks(manufacturers);
  }
  if (topic.extra === "agmCapacities") {
    extra = renderAgmCapacityLinks(capacityGroups);
  }

  if (topic.id === "mobile") {
    extra += renderAreaLinks();
  }

  const blogCaseSection = renderBlogCaseSection(getBlogCasesForPage(blogCases, {
    type: "battery-topic",
    canonicalPath: topic.canonicalPath,
    topicId: topic.id
  }), { id: `blogCases-battery-${topic.id}` });

  const content = `${renderBreadcrumb(breadcrumbs)}
${renderHero(topic)}
${renderDirectAnswer(topic)}
${renderSections(topic)}
${extra}
${renderTopicLinks(topic)}
${renderBridgeLinks({ includeArea: topic.id !== "mobile" })}
${renderPriceLinks()}
${blogCaseSection}
${renderCta()}
${renderFaq(topic)}`;

  return renderShell({
    output: topic.output,
    title: topic.title,
    description: topic.description,
    canonicalPath: topic.canonicalPath,
    breadcrumbs,
    imagePath: getImagePath(topic.image),
    faqs: topic.faqs,
    content
  });
}

function renderCapacityTable(rows, vehiclePageMap) {
  const body = rows.map((row) => {
    const vehicleHref = findVehicleHref(vehiclePageMap, row);
    const vehicleLabel = `${normalizeText(row.manufacturerName)} ${normalizeText(row.vehicle)}`.trim();
    const vehicleCell = vehicleHref
      ? `<a href="${vehicleHref}">${escapeHtml(vehicleLabel)}</a>`
      : escapeHtml(vehicleLabel);

    return `
              <tr>
                <td>${escapeHtml(row.manufacturerName)}</td>
                <td>${vehicleCell}</td>
                <td>${escapeHtml(row.year || "확인 필요")}</td>
                <td>${escapeHtml(row.fuel || "확인 필요")}</td>
                <td>${escapeHtml(row.detailModel || "확인 필요")}</td>
              </tr>`;
  }).join("");

  return `
      <section class="section" aria-labelledby="capacityTableTitle">
        <div class="section-heading">
          <p class="eyebrow">Vehicle DB</p>
          <h2 id="capacityTableTitle">DB 기준 적용 차량</h2>
          <p class="section-desc">아래 표는 해당 AGM 용량 문자열이 실제 DB 배터리 값에 포함된 행만 사용했습니다.</p>
        </div>
        <div class="table-card">
          <div class="table-scroll">
            <table class="battery-table">
              <thead>
                <tr>
                  <th>제조사</th>
                  <th>차량명</th>
                  <th>연식</th>
                  <th>연료</th>
                  <th>세부모델</th>
                </tr>
              </thead>
              <tbody>${body}
              </tbody>
            </table>
          </div>
        </div>
        <p class="table-note">* 기존 차량 SEO URL을 정확히 확인할 수 있는 경우에만 차량명에 링크를 연결했습니다.</p>
      </section>`;
}

function renderCapacityPage({ capacity, rows }, vehiclePageMap, blogCases) {
  const output = `agm/capacity/${capacity.toLowerCase()}.html`;
  const canonicalPath = `/battery/agm/capacity/${capacity.toLowerCase()}.html`;
  const title = `${capacity} 배터리 가격 및 적용 차량 안내 | 일등밧데리`;
  const description = `${capacity} 배터리 가격과 DB 기준 적용 차량을 확인하세요. 제조사, 차량명, 연식, 연료, 세부모델별 AGM 적용 정보를 안내합니다.`;
  const h1 = `${capacity} 배터리 가격 및 적용 차량 안내`;
  const imagePath = getImagePath(`${capacity.toLowerCase()}.png`);
  const breadcrumbs = [
    { label: "홈", href: "/" },
    { label: "자동차배터리 정보", href: "/battery/" },
    { label: "AGM 배터리", href: "/battery/agm/" },
    { label: h1 }
  ];
  const topic = {
    output,
    title,
    description,
    canonicalPath,
    image: `${capacity.toLowerCase()}.png`,
    eyebrow: "AGM Capacity",
    h1,
    summaryTitle: `${capacity} 적용 차량 확인`,
    summaryItems: ["DB 기준 실제 AGM 용량", "제조사·차량명별 확인", "연식·연료·세부모델 구분", "현재 판매가격 링크", "출장교체 상담"],
    directQuestion: `${capacity} 배터리는 어떤 차량에 사용하나요?`,
    directAnswer: `${capacity} 적용 여부는 차량 제조사와 연식, 연료 및 세부모델에 따라 다릅니다. 일등밧데리 차량 DB에서 ${capacity} 배터리가 등록된 차량 정보를 기준으로 적용 차량을 확인할 수 있습니다.`,
    faqs: [
      [`${capacity} 배터리 가격은 얼마인가요?`, "가격은 제품과 판매 조건에 따라 달라질 수 있습니다. AGM 배터리 최저가 바로가기에서 현재 판매가격을 확인해 주세요."],
      [`${capacity} 배터리가 표시된 차량은 모두 같은 배터리인가요?`, "DB에 같은 용량이 표시되어도 차량별 세부 사양과 장착 조건은 다를 수 있습니다."],
      ["AGM 용량을 다른 용량으로 바꿔도 되나요?", "차량 충전제어와 장착 조건을 확인해야 하므로 임의 변경보다 상담을 권장합니다."],
      ["출장교체 상담도 가능한가요?", "서울, 경기, 인천 지역은 차량 위치와 차종 확인 후 1644-9141로 상담 가능합니다."]
    ]
  };
  const blogCaseSection = renderBlogCaseSection(getBlogCasesForPage(blogCases, {
    type: "battery-capacity",
    canonicalPath,
    capacity
  }), { id: `blogCases-${capacity.toLowerCase()}` });

  const content = `${renderBreadcrumb(breadcrumbs)}
${renderHero(topic)}
${renderDirectAnswer(topic)}
${renderCapacityTable(rows, vehiclePageMap)}
${renderTopicLinks({ related: ["agm", "agmPrice", "importCar", "replacementCost", "price", "mobile"] })}
${renderBridgeLinks()}
${renderPriceLinks()}
${blogCaseSection}
${renderCta()}
${renderFaq(topic)}`;

  return renderShell({
    output,
    title,
    description,
    canonicalPath,
    breadcrumbs,
    imagePath,
    faqs: topic.faqs,
    content
  });
}

function outputPath(relativePath) {
  return path.join(OUTPUT_DIR, relativePath);
}

function generate() {
  console.log("Battery SEO Generate Start");
  console.log("");

  const manufacturers = loadManufacturers();
  const vehicleRows = loadVehicleRows();
  const capacityGroups = buildAgmCapacityGroups(vehicleRows);
  const vehiclePageMap = buildVehiclePageMap(manufacturers);
  const blogCases = loadBlogCases();

  ensureSafeOutputDir();

  FIXED_TOPICS.forEach((topic) => {
    writeFile(outputPath(topic.output), renderTopicPage(topic, { manufacturers, capacityGroups, blogCases }));
  });

  capacityGroups.forEach((capacityGroup) => {
    writeFile(
      outputPath(`agm/capacity/${capacityGroup.capacity.toLowerCase()}.html`),
      renderCapacityPage(capacityGroup, vehiclePageMap, blogCases)
    );
  });

  console.log(`Fixed topic pages: ${FIXED_TOPICS.length}`);
  console.log(`AGM capacities found: ${capacityGroups.map((item) => item.capacity).join(", ")}`);
  console.log(`AGM capacity pages: ${capacityGroups.length}`);
  console.log(`Total battery html: ${FIXED_TOPICS.length + capacityGroups.length}`);
  console.log("");
  console.log("Battery SEO Generate Complete");
}

generate();
