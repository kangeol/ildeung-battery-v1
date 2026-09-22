import { FAMILY_ALIASES, MANUFACTURER_ALIASES, buildVehicleGroups, normalizeText, searchVehicles } from "./smart-consult-core.js";

export const SAFE_ALIAS_MAP = Object.freeze({소나타:"쏘나타",아반테:"아반떼",그랜져:"그랜저",산타페:"싼타페",소렌토:"쏘렌토",투산:"투싼"});
export const REJECTED_ALIASES = Object.freeze(["5","4","e"]);
const cache=new WeakMap();
// Class/series stems come from the canonical family, regardless of manufacturer.
const familyStem = family => normalizeText(family).replace(/(?:시리즈|클래스)$/, "");
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function completeToken(source, alias) {
  const position=source.indexOf(alias);
  if(position<0) return false;
  const after=source.slice(position+alias.length);
  return !after || /^(?:(?:19|20)\d{2}(?!\d)|이야|인데|이고|입니다|예요|이에요|은|는|에|배터리|밧데리|야)/.test(after);
}
export function buildAliasIndex(records) {
  if(cache.has(records)) return cache.get(records);
  const groups=buildVehicleGroups(records), entries=[],specificEntries=[];
  const add=(alias,group,kind)=>{const key=normalizeText(alias);if(key.length<2||REJECTED_ALIASES.includes(key))return;entries.push({alias:key,key:group.key,kind});};
  for(const group of groups) {
    add(group.vehicle,group,"canonical");
    for(const detail of new Set(group.records.map(row=>row.detailModel))) {
      if(normalizeText(detail)===normalizeText(group.vehicle)) continue;
      for(const brand of ["",...(MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName])]) specificEntries.push({alias:normalizeText(brand+detail),group,detail});
    }
    for(const brand of MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName]) {
      add(brand+group.vehicle,group,"generated");
      for(const detail of new Set(group.records.map(row=>row.detailModel))) add(brand+detail,group,"generated");
      if(familyStem(group.vehicle)!==normalizeText(group.vehicle)) add(brand+familyStem(group.vehicle),group,"shorthand");
    }
    for(const [alias,target] of Object.entries(SAFE_ALIAS_MAP)) if(group.vehicle===target) add(alias,group,"approved");
  }
  const map=new Map();for(const entry of entries){if(!map.has(entry.alias))map.set(entry.alias,new Set());map.get(entry.alias).add(entry.key);}
  const result={groups,entries,map,specificEntries,audit:{aliasTotal:entries.length,uniqueAliasCount:map.size,approved:entries.filter(e=>e.kind==="approved").length,generated:entries.filter(e=>e.kind==="generated"||e.kind==="shorthand").length,collisions:[...map].filter(([,keys])=>keys.size>1).map(([alias,keys])=>({alias,targets:[...keys]})),rejected:[...REJECTED_ALIASES]}};
  cache.set(records,result);return result;
}

export function resolveVehicleText(text, records, state = {}) {
  const index=buildAliasIndex(records);
  let normalized=normalizeText(text);
  const approved=index.entries.filter(e=>{
    if(e.kind!=="approved") return false;
    const position=normalized.indexOf(e.alias);
    if(position<0) return false;
    const before=normalized.slice(0,position),after=normalized.slice(position+e.alias.length);
    const brands=Object.values(MANUFACTURER_ALIASES).flat().map(normalizeText);
    const left=!before || brands.some(brand=>before.endsWith(brand)) || /(?:아니|차는|차량은|차가|타는)$/.test(before) || text.split(/\s+/).some(word=>normalizeText(word).startsWith(e.alias));
    const group=index.groups.find(item=>item.key===e.key);
    const codes=group.records.flatMap(row=>row.detailModel.match(/[a-z]+\d*\b/gi)||[]).filter(code=>code.length>=2);
    const right=!after || /^(?:\d{2,4}|이야|인데|이고|입니다|예요|이에요|은|는|에|배터리|밧데리|야)/.test(after) || codes.some(code=>after.startsWith(normalizeText(code)) && (!/^[a-z0-9]/.test(after.slice(normalizeText(code).length)) || text.toLowerCase().includes(code.toLowerCase()+" ")));
    return left && right;
  }).sort((a,b)=>b.alias.length-a.alias.length);
  if(!approved.length && Object.keys(SAFE_ALIAS_MAP).some(alias=>normalized.includes(normalizeText(alias)))) return {text,matches:[],shorthand:false,rejected:true};
  let source=normalized;
  if(approved.length) {
    const alias=approved[0].alias,keys=index.map.get(alias);
    if(keys.size>1) return {text, matches:index.groups.filter(g=>keys.has(g.key)),shorthand:false};
    source=source.replace(alias,normalizeText(SAFE_ALIAS_MAP[alias]));
  }
  // Existing specific aliases such as 520d are resolved before any family shorthand.
  let search=searchVehicles(source,records);
  const hasSpecificModel=FAMILY_ALIASES.some(entry=>search.matches.some(group=>group.manufacturerId===entry.manufacturerId && group.vehicle===entry.vehicle) && entry.aliases.filter(alias=>/^(?:\d{3}[a-z]|[a-z]\d{3}[a-z]?)$/.test(alias)).some(alias=>new RegExp(`(?:^|[^a-z0-9]|bmw|벤츠)${escapePattern(alias)}(?![a-z0-9])`,"i").test(text.normalize("NFKC"))));
  const specific=index.specificEntries.filter(entry=>completeToken(source,entry.alias) && /^(?:아니|차는|차량은|차가|타는)?$/.test(source.slice(0,source.indexOf(entry.alias)))).sort((a,b)=>b.alias.length-a.alias.length);
  if(specific.length) {
    const best=specific.filter(entry=>entry.alias.length===specific[0].alias.length);
    const matches=[...new Map(best.map(entry=>[entry.group.key,entry.group])).values()];
    return {text:source,matches,shorthand:false,detailModels:matches.length===1 ? [...new Set(best.map(entry=>entry.detail))] : undefined};
  }
  const familyConfirm=index.groups.filter(group=>{
    const family=normalizeText(group.vehicle),stem=familyStem(group.vehicle);
    if(stem===family) return false;
    const brands=MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName];
    const branded=brands.some(brand=>[family,stem].some(part=>completeToken(source,normalizeText(brand)+part)));
    const contextual=state.manufacturer===group.manufacturerId && new RegExp(`^(?:아니)?(?:${escapePattern(stem)}|${escapePattern(family)})(?:야|이야|맞아)?$`).test(source);
    return branded || contextual;
  });
  // A full token boundary prevents BMW520d becoming BMW5 or C220 becoming C.
  if(!hasSpecificModel && familyConfirm.length) return {text:source,matches:familyConfirm,shorthand:familyConfirm.length===1};
  // Full canonical family names are safe even when a substring looks like a brand
  // (Hyundai's "제네시스"). A single class letter/digit is never a global alias.
  const exactFamilies=index.groups.filter(group=>{
    const family=normalizeText(group.vehicle);
    const aliases=[family,...(MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName]).map(brand=>normalizeText(brand)+family)];
    return aliases.some(alias=>completeToken(source,alias) && /^(?:아니|차는|차량은|차가|타는)?$/.test(source.slice(0,source.indexOf(alias))));
  });
  if(!hasSpecificModel && exactFamilies.length) search={matches:exactFamilies};
  // Explicit generation tokens are accepted only when actually present in this family.
  if(search.matches.length===1) {
    const match=search.matches[0];
    const tokens=[...new Set(match.records.flatMap(row=>row.detailModel.match(/[a-z]+\d*\b/gi)||[]))].filter(token=>token.length>=2 && !/^(new|the)$/i.test(token));
    const token=tokens.sort((a,b)=>b.length-a.length).find(token=>source.includes(normalizeText(token)));
    if(token) {
      const details=[...new Set(match.records.filter(row=>(row.detailModel.match(/[a-z]+\d*\b/gi)||[]).some(value=>normalizeText(value)===normalizeText(token))).map(row=>row.detailModel))];
      // Don't choose arbitrarily between facelift/hybrid versions with the same code.
      return {text:source,matches:search.matches,shorthand:false,generation:token.toUpperCase(),detailModels:details};
    }
  }
  return {text:source,matches:search.matches,shorthand:false};
}
