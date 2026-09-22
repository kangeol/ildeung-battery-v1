import { MANUFACTURER_ALIASES, buildVehicleGroups, normalizeText, searchVehicles } from "./smart-consult-core.js";

export const SAFE_ALIAS_MAP = Object.freeze({소나타:"쏘나타",아반테:"아반떼",그랜져:"그랜저",산타페:"싼타페",소렌토:"쏘렌토",투산:"투싼"});
export const REJECTED_ALIASES = Object.freeze(["5","4","e"]);
const cache=new WeakMap();
export function buildAliasIndex(records) {
  if(cache.has(records)) return cache.get(records);
  const groups=buildVehicleGroups(records), entries=[];
  const add=(alias,group,kind)=>{const key=normalizeText(alias);if(key.length<2||REJECTED_ALIASES.includes(key))return;entries.push({alias:key,key:group.key,kind});};
  for(const group of groups) {
    add(group.vehicle,group,"canonical");
    for(const brand of MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName]) {
      add(brand+group.vehicle,group,"generated");
      for(const detail of new Set(group.records.map(row=>row.detailModel))) add(brand+detail,group,"generated");
      if(group.manufacturerId==="bmw" && /^\d시리즈$/.test(group.vehicle)) add(brand+group.vehicle[0],group,"shorthand");
    }
    for(const [alias,target] of Object.entries(SAFE_ALIAS_MAP)) if(group.vehicle===target) add(alias,group,"approved");
  }
  const map=new Map();for(const entry of entries){if(!map.has(entry.alias))map.set(entry.alias,new Set());map.get(entry.alias).add(entry.key);}
  const result={groups,entries,map,audit:{aliasTotal:entries.length,uniqueAliasCount:map.size,approved:entries.filter(e=>e.kind==="approved").length,generated:entries.filter(e=>e.kind==="generated"||e.kind==="shorthand").length,collisions:[...map].filter(([,keys])=>keys.size>1).map(([alias,keys])=>({alias,targets:[...keys]})),rejected:[...REJECTED_ALIASES]}};
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
  if (/^[1-7]시리즈/.test(normalized) && state.manufacturer!=="bmw") return {text:source,matches:[],shorthand:false};
  const branded=text.normalize("NFKC").match(/(?:bmw|비엠더블유)\s*([1-7])(?:\s*시리즈)?(?![0-9a-z])/i);
  const contextual=state.manufacturer==="bmw" ? normalized.match(/^(?:아니)?([1-7])(?:시리즈)?(?:야|이야|맞아)?$/) : null;
  const shorthand=branded || contextual;
  if(shorthand) {
    const group=index.groups.find(g=>g.manufacturerId==="bmw" && g.vehicle===`${shorthand[1]}시리즈`);
    if(group) return {text:source,matches:[group],shorthand:true};
  }
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
