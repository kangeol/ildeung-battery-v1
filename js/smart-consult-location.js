import { normalizeText } from "./smart-consult-core.js";

export function locationAliases(item) {
  const base = item.name.replace(/[시구동읍면]$/, "");
  return [...new Set([item.name, item.fullName, item.fullLabel, ...(base.length >= 2 ? [base] : []), ...(item.level === "province" ? [item.province, ...(/특별시|광역시/.test(item.province) ? [`${item.name}시`] : [])] : [])].map(normalizeText))];
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
  const hits = [];
  for (const entry of indexFor(localities)) {
    let start = normalized.indexOf(entry.alias);
    while (start >= 0) {
      hits.push({...entry,start,end:start+entry.alias.length});
      start = normalized.indexOf(entry.alias,start+1);
    }
  }
  // Match the place's own name, never all descendants whose full path contains it.
  let tokens = hits.filter(hit => {
    const before = normalized.slice(0,hit.start);
    const after = normalized.slice(hit.end);
    const left = !before || /(?:아니|지역은|지역|서울|경기|인천|이고|인데|년식|년식인데|년식이고)$/.test(before) || hits.some(other=>other.end===hit.start) || /\d$/.test(before);
    const right = !after || /^(?:지역|교체|에서|에서도|은|는|에|도|인데|이야|쪽|근처|출장|방문|가능|와|이요|요|으로|맞|야|지금|오늘|내일|몇시|언제|급해|긴급|\d+분)/.test(after) || hits.some(other=>other.start===hit.end);
    // Spaces around names may have disappeared during normalization.
    const words = text.normalize("NFKC").toLowerCase().split(/\s+/).map(normalizeText);
    return (left || words.some(word=>word.startsWith(hit.alias))) && right;
  });
  tokens = tokens.filter(hit => !tokens.some(other => other.start <= hit.start && other.end >= hit.end && other.alias.length > hit.alias.length));
  if (!tokens.length) return {region:null};
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
    return {region:{...item,confidence:"canonical"},shortLocation,locationCandidates:[]};
  }
  if (candidates.length>1) return {region:null,ambiguousRegion:true,locationCandidates:candidates,locationScope:provinceHit?.item || null};
  return {region:null,unsupportedLocation:true};
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
