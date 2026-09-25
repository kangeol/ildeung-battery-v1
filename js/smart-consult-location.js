import { normalizeText } from "./smart-consult-core.js";

// These suffixless locality stems are ordinary temporal/landmark nouns in
// frozen customer language. Require the actual administrative locality token.
const ambiguousLocalityStems = new Set(["공항", "오전", "장기", "금이"]);

export function locationAliases(item) {
  const base = item.name.replace(/[시구동읍면]$/, "");
  // A bare common noun is not evidence of the locality sharing its stem.
  const suffixless = base.length >= 2 && !(item.level === "locality" && ambiguousLocalityStems.has(base)) ? [base] : [];
  // City-name station references can establish a broad service city, not a
  // precise dispatch address. Never infer a district or a station's access.
  const station = item.level === "city" && base.length >= 2 ? [`${base}역`] : [];
  return [...new Set([item.name, item.fullName, item.fullLabel, ...suffixless, ...station, ...(item.level === "province" ? [item.province, ...(/특별시|광역시/.test(item.province) ? [`${item.name}시`] : [])] : [])].map(normalizeText))];
}

const stem = item => normalizeText(item.name.replace(/[시구동읍면]$/, ""));
function contains(parent, child) {
  return parent.area===child.area && (!parent.city || parent.city===child.city) && (!parent.district || parent.district===child.district);
}
function broadParent(alias, candidates) {
  // All canonical rows are supported service areas. Never broaden across a boundary.
  return candidates.find(parent => ["city","district"].includes(parent.level) && stem(parent)===alias && candidates.every(child=>child.canonicalId===parent.canonicalId || (child.level==="locality" && contains(parent,child))));
}
export function classifyLocationAliases(localities) {
  const map=new Map();
  for (const item of localities) {
    const aliases=locationAliases(item);
    const short=stem(item);
    if (short && short.length<2) aliases.push(short);
    for (const alias of aliases) {
      if (!map.has(alias)) map.set(alias,new Map());
      map.get(alias).set(item.canonicalId,item);
    }
  }
  return [...map].map(([alias,items])=>{
    const candidates=[...items.values()];
    const exact=candidates.some(item=>[item.name,item.fullName,item.fullLabel,item.province].some(value=>normalizeText(value)===alias));
    const broad=candidates.length>1 ? broadParent(alias,candidates) : null;
    const classification=alias.length<2 ? "UNSAFE_REJECT" : candidates.length===1 ? exact ? "EXACT_UNIQUE" : "UNIQUE_SUFFIXLESS" : broad ? "SAME_JURISDICTION_PARENT_CHILD_COLLISION" : new Set(candidates.map(item=>item.area)).size===1 ? "CONTEXT_RESOLVABLE_COLLISION" : "CROSS_JURISDICTION_AMBIGUOUS";
    return {alias,classification,candidates,broadParent:broad || null};
  });
}

const cache = new WeakMap();
function indexFor(localities) {
  if (!cache.has(localities)) cache.set(localities, localities.flatMap(item => locationAliases(item).map(alias => ({item,alias}))));
  return cache.get(localities);
}

export function resolveLocation(text, localities, previous = null, pending = null) {
  const normalized = normalizeText(text);
  const boundaries = new Set([0]);
  let offset = 0;
  for (const word of text.normalize("NFKC").split(/\s+/)) { offset += normalizeText(word).length; boundaries.add(offset); }
  const hits = [];
  for (const entry of indexFor(localities)) {
    let start = normalized.indexOf(entry.alias);
    while (start >= 0) {
      hits.push({...entry,start,end:start+entry.alias.length});
      start = normalized.indexOf(entry.alias,start+1);
    }
  }
  // Match the place's own name, never all descendants whose full path contains it.
  // Copular endings follow any canonical alias, including suffixless parents.
  // Require an end or a new clause after a polite ending (not arbitrary substrings).
  const politeEnd = /^(?:입니다만|이에요만|예요만|입니다|이에요|예요|에요|인데요|이구요|이고요|이고|이구|인데)/;
  const safeEnd = end => {
    const rest=normalized.slice(end), ending=rest.match(politeEnd)?.[0];
    return !rest || boundaries.has(end) || (ending && (rest===ending || boundaries.has(end+ending.length) || /^(?:이고|인데)$/.test(ending) || /^(?:이구|이고)(?:결제|교체|방문|가격|출장)/.test(rest))) || /^(?:배터리|밧데리|지역|교체|에서|에서도|은|는|에|도|인데|이야|쪽|근처|출장|방문|가능|와|이요|요|으로|로|맞|야|지금|오늘|내일|몇시|언제|급해|긴급|\d+분)/.test(rest);
  };
  let tokens = hits.filter(hit => {
    // Suffixless district aliases can also be ordinary grammar. "동안" is a
    // temporal noun unless an explicit geographic cue establishes 동안구.
    if (hit.item.level === "district" && hit.alias === normalizeText("동안") && !/(?:안양(?:시)?동안|동안구|^동안(?:가능|출장|방문|지역|도와)[가-힣]{0,6}\??$|^(?:지역)?동안\??$|^동안(?:입니다|이에요|예요|에요|인데요|이구요|이고요|이고)$)/.test(text.replace(/\s/g,''))) return false;
    // A bare administrative name may also be the ordinary verb "to move".
    // Its grammatical particles are not evidence of a service address.
    if (hit.item.name === "이동" && /^(?:도|을|은|이|에대해|하는|할|해서|해|시켜|시키|을도와)/.test(normalized.slice(hit.end)) && !/(?:안산|의왕|상록구|이동\s*(?:주소|지역|주차|으로|에서|동네))/.test(text)) return false;
    const before = normalized.slice(0,hit.start);
    const after = normalized.slice(hit.end);
    const left = !before || /(?:아니|지역은|지역|서울|경기|인천|이고|인데|년식|년식인데|년식이고)$/.test(before) || hits.some(other=>other.end===hit.start) || /\d$/.test(before);
    const right = safeEnd(hit.end) || hits.some(other=>other.start===hit.end && safeEnd(other.end));
    // Spaces around names may have disappeared during normalization.
    const words = text.normalize("NFKC").toLowerCase().split(/\s+/).map(normalizeText);
    return (left || words.some(word=>word.startsWith(hit.alias))) && right;
  });
  // A following particle can itself begin with another locality name
  // (동안구로 contains 구로). Prefer the longer overlapping place token.
  tokens = tokens.filter(hit => !tokens.some(other => other.alias.length > hit.alias.length && other.start < hit.end && hit.start < other.end));
  if (!tokens.length) return {region:null,locationState:"MISSING_AREA"};
  const provinceHit = tokens.find(hit=>hit.item.level==="province");
  const lastStart = Math.max(...tokens.map(hit=>hit.start));
  let candidates = [...new Map(tokens.filter(hit=>hit.start===lastStart).map(hit=>[hit.item.canonicalId,hit.item])).values()];
  const explicit = tokens.filter(hit=>hit.start<lastStart);
  for (const hit of explicit) {
    if (hit.item.level === "province") candidates=candidates.filter(item=>item.area===hit.item.area);
    if (hit.item.level === "city") candidates=candidates.filter(item=>item.area===hit.item.area && item.city===hit.item.city);
    if (hit.item.level === "district") candidates=candidates.filter(item=>item.area===hit.item.area && item.district===hit.item.district);
  }
  if (pending?.length && candidates.every(item=>item.level==="province")) {
    const areas = new Set(candidates.map(item=>item.area));
    const narrowed = pending.filter(item=>areas.has(item.area));
    if (narrowed.length) candidates=narrowed;
  }
  if (!provinceHit && previous) {
    for (const field of ["area","city","district"]) {
      if (!previous[field]) continue;
      const scoped=candidates.filter(item=>item[field]===previous[field]);
      if (scoped.length) candidates=scoped;
    }
  }
  const matchedAlias=tokens.find(hit=>hit.start===lastStart)?.alias;
  // This resolver handles service areas, not precise dispatch addresses. The broad
  // preference applies only to a true parent containing EVERY same-stem candidate.
  const allAliasCandidates=[...new Map(indexFor(localities).filter(hit=>hit.alias===matchedAlias).map(hit=>[hit.item.canonicalId,hit.item])).values()];
  const broad=broadParent(matchedAlias,allAliasCandidates);
  if (candidates.length>1 && broad && candidates.some(item=>item.canonicalId===broad.canonicalId)) candidates=[broad];
  if (candidates.length===1) {
    const item=candidates[0];
    const shortLocation=["city","district"].includes(item.level) && matchedAlias===stem(item) && matchedAlias!==normalizeText(item.name);
    return {region:{...item,confidence:"canonical"},shortLocation,locationCandidates:[],locationState:"SUPPORTED_AREA"};
  }
  if (candidates.length>1) return {region:null,ambiguousRegion:true,locationCandidates:candidates,locationScope:provinceHit?.item || null,locationState:"AMBIGUOUS_AREA"};
  return {region:null,unsupportedLocation:true,locationState:"EXPLICIT_UNSUPPORTED_AREA"};
}

export function auditLocations(localities) {
  const map=new Map();
  for (const item of localities) for (const alias of locationAliases(item)) {
    if(!map.has(alias)) map.set(alias,new Map());
    map.get(alias).set(item.canonicalId,item.fullName);
  }
  const classified=classifyLocationAliases(localities);
  return {counts:Object.fromEntries(["province","city","district","locality"].map(level=>[level,localities.filter(item=>item.level===level).length])),aliasCounts:Object.fromEntries([...new Set(classified.map(item=>item.classification))].map(kind=>[kind,classified.filter(item=>item.classification===kind).length])),normalizedNames:new Set(localities.map(item=>normalizeText(item.name))).size,aliasTotal:classified.length,collisions:[...map].filter(([,items])=>items.size>1).map(([alias,items])=>({alias,targets:[...items.values()]}))};
}
