import { FAMILY_ALIASES, MANUFACTURER_ALIASES, buildVehicleGroups, normalizeText, searchVehicles, vehicleAliasOccurs } from "./smart-consult-core.js";

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

// Codes are governed by source detail names, never guessed from edit distance.
const generationCache=new WeakMap();
const resolutionCache=new WeakMap();
export function generationCodesForRow(row,knownPureCodes=new Set()){
  const familyTokens=new Set((row.vehicle.toUpperCase().match(/[A-Z0-9]+/g)||[]));
  const detail=String(row.generation||'')+' '+row.detailModel.replace(/([A-Z]+)\d+(?=세대)/g,'$1');
  return [...new Set((detail.match(/[A-Z]+[0-9]*|[0-9]+[A-Z]+/g)||[]).filter(code=>{
    if(code.length<2||code.length>5||familyTokens.has(code)||/^(NEW|THE|ALL|EV|AMG|GT|SD|WD|LPG)$/.test(code))return false;
    // Pure-letter codes need generation-like placement, not a trim within a name.
    return /\d/.test(code)||knownPureCodes.has(code)||new RegExp(`(?:\\(${code}\\)|${code}(?:\\s+하이브리드)?\\s*$|${code}세대|^\\s*${code}\\s+${escapePattern(row.vehicle)})`).test(detail);
  }))];
}
export function buildGenerationIndex(records){
  if(generationCache.has(records))return generationCache.get(records);
  const groups=buildAliasIndex(records).groups,codes=new Map();
  // A pure-letter component of a canonical multiword model is a model/trim
  // token, not sufficient generation evidence. Whole-family collisions remain.
  const pureCodes=new Set(records.flatMap(row=>generationCodesForRow(row)).filter(code=>! /\d/.test(code)
    &&!groups.some(g=>normalizeText(g.vehicle)!==normalizeText(code)&&(g.vehicle.match(/[A-Z]+[0-9]*|[0-9]+[A-Z]+/g)||[]).includes(code))));
  for(const row of records)for(const code of generationCodesForRow(row,pureCodes)){
    if(!/\d/.test(code)&&!pureCodes.has(code))continue;
    if(!codes.has(code))codes.set(code,{code,rows:[],familyKeys:new Set(),manufacturers:new Set(),yearRanges:new Set()});
    const entry=codes.get(code);entry.rows.push(row);entry.familyKeys.add(`${row.manufacturerId}|${row.vehicle}`);entry.manufacturers.add(row.manufacturerId);entry.yearRanges.add(row.year);
  }
  for(const entry of codes.values()){
    entry.groups=groups.filter(g=>entry.familyKeys.has(g.key));
    entry.canonicalFamilies=groups.filter(g=>normalizeText(g.vehicle)===normalizeText(entry.code));
    entry.collisionWithCanonicalFamily=entry.canonicalFamilies.length>0;
    entry.uniqueFamily=entry.familyKeys.size===1;
  }
  generationCache.set(records,codes);return codes;
}
export function resolveVehicleText(text, records, state = {}) {
  if(!resolutionCache.has(records))resolutionCache.set(records,new Map());
  const cache=resolutionCache.get(records),key=JSON.stringify([state.manufacturer||'',text]);
  if(!cache.has(key)){
    if(cache.size>=512)cache.clear();
    cache.set(key,resolveVehicleTextUncached(text,records,state));
  }
  // Entity extraction may clear matches for a follow-up. Do not mutate the cache.
  const result=cache.get(key);
  return {...result,matches:[...result.matches],...(result.detailModels?{detailModels:[...result.detailModels]}:{})};
}
function resolveVehicleTextUncached(text, records, state) {
  const base=resolveVehicleTextBase(text,records,state),index=buildGenerationIndex(records);
  const groups=buildAliasIndex(records).groups;
  // The same boundary rules used by established family matching also protect codes.
  const brands=Object.entries(MANUFACTURER_ALIASES).filter(([id,aliases])=>aliases.some(alias=>vehicleAliasOccurs(text,alias)
    &&!groups.some(g=>g.manufacturerId!==id&&normalizeText(g.vehicle)===normalizeText(alias)
      &&(base.matches.some(match=>match.key===g.key)||[...index.values()].some(entry=>entry.familyKeys.has(g.key)&&vehicleAliasOccurs(text,entry.code,g.manufacturerId))))));
  const detected=[...index.values()].filter(entry=>[...entry.manufacturers].some(id=>vehicleAliasOccurs(text,entry.code,id))
    ||entry.groups.some(g=>vehicleAliasOccurs(text,g.vehicle+entry.code,g.manufacturerId)));
  const failure=reason=>({...base,matches:[],shorthand:false,detailModels:undefined,generation:'',recognitionFailure:reason,generationCodeDetected:detected.map(e=>e.code).join('/')});
  // Only known code shapes with clear vehicle evidence can be an unknown code.
  // Model aliases, battery specs, numeric years and arbitrary words stay on their
  // established paths; no nearest-code correction is attempted.
  const prefixes=new Set([...index.keys()].map(code=>code.match(/^[A-Z]+(?=\d)/)?.[0]).filter(Boolean));
  const unknown=(text.normalize('NFKC').toUpperCase().match(/\b[A-Z]{1,3}\d{1,3}\b/g)||[]).filter(token=>!index.has(token)
    &&prefixes.has(token.match(/^[A-Z]+/)[0])
    &&!groups.some(g=>normalizeText(g.vehicle)===normalizeText(token))
    &&!FAMILY_ALIASES.some(entry=>entry.aliases.some(alias=>normalizeText(alias)===normalizeText(token))));
  if(unknown.length&&(brands.length||base.matches.length))return {...failure('GENERATION_UNKNOWN'),generationCodeDetected:unknown.join('/')};
  if(!detected.length)return base;
  if(brands.length>1)return failure('UNSAFE_AMBIGUITY');
  const manufacturer=brands[0]?.[0]||'';
  let families=groups.filter(g=>(!manufacturer||g.manufacturerId===manufacturer)&&vehicleAliasOccurs(text,g.vehicle,g.manufacturerId));
  // An exact full detail name is stronger than a shorter family embedded in it
  // (the canonical GT detail names, for example, contain another series name).
  const namedDetails=base.matches.filter(g=>(!manufacturer||g.manufacturerId===manufacturer)&&g.records.some(row=>normalizeText(row.detailModel)!==normalizeText(g.vehicle)&&vehicleAliasOccurs(text,row.detailModel,g.manufacturerId)));
  if(namedDetails.length)families=namedDetails;
  // A separate named family is context for a colliding code. Otherwise the full
  // canonical family wins, including bare codes that happen to be another model.
  const nonCodeFamilies=families.filter(g=>!detected.some(e=>normalizeText(e.code)===normalizeText(g.vehicle)));
  if(nonCodeFamilies.length)families=nonCodeFamilies;
  const codes=detected.filter(e=>!families.some(g=>normalizeText(g.vehicle)===normalizeText(e.code)));
  if(!codes.length)return base;
  let rows=codes[0].rows.filter(row=>codes.every(entry=>entry.rows.includes(row)));
  if(!rows.length)return failure('GENERATION_FAMILY_CONFLICT');
  if(manufacturer){rows=rows.filter(row=>row.manufacturerId===manufacturer);if(!rows.length)return failure('MANUFACTURER_FAMILY_CONFLICT');}
  if(families.length){const keys=new Set(families.map(g=>g.key));rows=rows.filter(row=>keys.has(`${row.manufacturerId}|${row.vehicle}`));if(!rows.length)return failure('GENERATION_FAMILY_CONFLICT');}
  // Preserve specific model aliases and named detail constraints from the base resolver.
  if(base.matches.length&&!families.length){const keys=new Set(base.matches.map(g=>g.key));const narrowed=rows.filter(row=>keys.has(`${row.manufacturerId}|${row.vehicle}`));if(narrowed.length)rows=narrowed;}
  const keys=new Set(rows.map(row=>`${row.manufacturerId}|${row.vehicle}`));
  const matches=groups.filter(g=>keys.has(g.key));
  return {...base,matches,shorthand:!manufacturer&&!families.length&&matches.length===1&&codes.every(e=>/^[A-Z]{2,3}$/.test(e.code)),generation:codes.length===1?codes[0].code:'',detailModels:matches.length===1?[...new Set(rows.map(row=>row.detailModel))]:undefined,generationCodeDetected:codes.map(e=>e.code).join('/'),generationAmbiguous:matches.length>1,recognitionFailure:matches.length>4?'GENERATION_CODE_AMBIGUOUS':''};
}
function resolveVehicleTextBase(text, records, state = {}) {
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
  // Keep original token separators for Latin model boundaries; approved Korean
  // spelling corrections remain the same, without compacting the whole sentence.
  const searchText=approved.length ? text.replace(new RegExp(approved[0].alias,"i"),SAFE_ALIAS_MAP[approved[0].alias]) : text;
  let search=searchVehicles(searchText,records);
  const hasSpecificModel=FAMILY_ALIASES.some(entry=>search.matches.some(group=>group.manufacturerId===entry.manufacturerId && group.vehicle===entry.vehicle) && entry.aliases.filter(alias=>/^(?:\d{3}[a-z]|[a-z]\d{3}[a-z]?)$/.test(alias)).some(alias=>new RegExp(`(?:^|[^a-z0-9]|bmw|벤츠)${escapePattern(alias)}(?![a-z0-9])`,"i").test(text.normalize("NFKC"))));
  const specific=index.specificEntries.filter(entry=>completeToken(source,entry.alias) && vehicleAliasOccurs(searchText,entry.alias,entry.group.manufacturerId) && /^(?:아니|차는|차량은|차가|타는)?$/.test(source.slice(0,source.indexOf(entry.alias)))).sort((a,b)=>b.alias.length-a.alias.length);
  if(specific.length) {
    const best=specific.filter(entry=>entry.alias.length===specific[0].alias.length);
    const matches=[...new Map(best.map(entry=>[entry.group.key,entry.group])).values()];
    return {text:source,matches,shorthand:false,detailModels:matches.length===1 ? [...new Set(best.map(entry=>entry.detail))] : undefined};
  }
  const familyConfirm=index.groups.filter(group=>{
    const family=normalizeText(group.vehicle),stem=familyStem(group.vehicle);
    if(stem===family) return false;
    const brands=MANUFACTURER_ALIASES[group.manufacturerId] || [group.manufacturerName];
    const branded=brands.some(brand=>[family,stem].some(part=>completeToken(source,normalizeText(brand)+part) && vehicleAliasOccurs(searchText,normalizeText(brand)+part,group.manufacturerId)));
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
    return aliases.some(alias=>completeToken(source,alias) && vehicleAliasOccurs(searchText,alias,group.manufacturerId) && /^(?:아니|차는|차량은|차가|타는)?$/.test(source.slice(0,source.indexOf(alias))));
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
