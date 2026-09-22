import fs from 'node:fs';import assert from 'node:assert/strict';
const baselineModule=process.env.VEHICLE_SELECTION_BASELINE_MODULE;
const {conversationTurn,createConversationState,filteredRows}=await import(baselineModule||'../js/smart-consult-conversation.js');
import {normalizeText,parseYearRange,batteryCertainty,FAMILY_ALIASES} from '../js/smart-consult-core.js';
import {buildAliasIndex} from '../js/vehicle-aliases.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('data/manufacturers.json').flatMap(m=>read('data/'+m.file).map((r,i)=>({...r,manufacturerId:m.id,manufacturerName:m.name,source:m.file,index:i})));
const areas=read('seo-data/smart-consult-location-index.json').localities,catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
assert.equal(rows.length,917);
const id=r=>`${r.source}:${r.index}`,ids=rs=>rs.map(id).sort();
const turn=(state,text,selection)=>conversationTurn(state,text,rows,areas,catalog,policy,selection);
const apply=(state,field,value)=>{const s=structuredClone(state);s.previousQuestion=null;s.ambiguity=null;s.result=null;s.confirmedBattery=null;s.quotedSpec='';if(field==='vehicle'){const c=state.previousQuestion.choices.find(c=>c.value===value);s.selectedVehicleKey=c.key;}else if(field==='detailModel'){s.detailModels=[...new Set(filteredRows(rows,state).filter(r=>normalizeText(r.detailModel)===normalizeText(value)).map(r=>r.detailModel))];s.detailModel=s.detailModels.length===1?s.detailModels[0]:'';s.generation='';}else if(field==='year')s.yearRange=value;else if(field==='engine')s.engine=String(parseInt(value,10));else s[field]=value;return s;};
const queries=new Set(['G90','G80']);
for(const r of rows){const y=parseYearRange(r.year).start;for(const q of [r.vehicle,`${r.manufacturerName} ${r.vehicle}`,r.detailModel,`${r.manufacturerName} ${r.detailModel}`,`${r.manufacturerName} ${r.vehicle} ${y}년식`,`${r.manufacturerName} ${r.vehicle} ${y}년식 ${r.fuel}`,`${r.manufacturerName} ${r.detailModel} ${y}년식 ${r.fuel}`])queries.add(q);}
const aliases=buildAliasIndex(rows);
for(const q of [...aliases.map.keys(),...aliases.specificEntries.map(e=>e.alias),...FAMILY_ALIASES.flatMap(e=>e.aliases)])queries.add(q);
for(const r of rows){
 for(const q of [`${r.manufacturerName} ${r.vehicle} ${r.fuel}`,`${r.manufacturerName} ${r.detailModel} ${r.fuel}`])queries.add(q);
 const range=parseYearRange(r.year);
 for(let y=range.start;y&&y<=(range.end||new Date().getFullYear());y++)for(const q of [`${r.manufacturerName} ${r.vehicle} ${y}년식`,`${r.manufacturerName} ${r.vehicle} ${y}년식 ${r.fuel}`,`${r.manufacturerName} ${r.detailModel} ${y}년식 ${r.fuel}`])queries.add(q);
}
const groups=new Map();const queue=[];const unhandledFields=new Set();
function add(out,query){const q=out.state.previousQuestion;if(q&&out.chips.length>=2&&!['vehicle','detailModel','year','fuel','exactFuel','engine','drivetrain'].includes(q.field))unhandledFields.add(q.field);if(!q||out.chips.length<2||!['vehicle','detailModel','year','fuel','exactFuel','engine','drivetrain'].includes(q.field))return;const rs=q.field==='vehicle'?out.chips.flatMap(c=>filteredRows(rows,apply(out.state,q.field,c.value))):filteredRows(rows,out.state);const key=JSON.stringify([ids(rs),q.field,out.chips.map(c=>c.value)]);if(groups.has(key)){groups.get(key).queries.push(query);return;}const g={query,queries:[query],normalizedQuery:normalizeText(query),manufacturer:out.state.manufacturerName,state:out.state,field:q.field,candidates:out.chips.map(c=>{const target=filteredRows(rows,apply(out.state,q.field,c.value));return{...c,rows:target,sourceIds:ids(target),category:batteryCertainty(target).safe?'exact battery':target.every(r=>/문의|확인/.test(r.defaultBattery))?'confirmation-required':new Set(target.map(r=>r.defaultBattery)).size===1&&/또는|\//.test(target[0]?.defaultBattery)?'composite':'other governed result'};})};groups.set(key,g);queue.push(g);}
for(const query of queries){const o=turn(createConversationState(),query);add(o,query);if(o.state.pendingVehicleConfirmation)add(turn(o.state,'네'),query+' -> 네');}
for(let i=0;i<queue.length;i++)for(const c of queue[i].candidates){const s=apply(queue[i].state,queue[i].field,c.value);if(filteredRows(rows,s).length<filteredRows(rows,queue[i].state).length)add(turn(s,'가격'),queue[i].query+' -> '+c.label);}
const totals={RESOLVES_EXACT_ROW:0,RESOLVES_GOVERNED_NO_MATCH:0,REPEATS_SAME_AMBIGUITY:0,RESOLVES_WRONG_ROW:0,LOSES_YEAR_OR_GENERATION:0,RETURNS_UNSUPPORTED:0,OTHER_FAILURE:0};let buttons=0;
for(const g of groups.values())for(const c of g.candidates){const o=turn(g.state,c.selection?c.label:c.value,c.selection);const actual=filteredRows(rows,o.state);let status='RESOLVES_EXACT_ROW';if(o.state.previousQuestion?.field===g.field&&JSON.stringify(o.chips.map(x=>x.value))===JSON.stringify(g.candidates.map(x=>x.value)))status='REPEATS_SAME_AMBIGUITY';else if(!actual.length)status=c.sourceIds.length===0&&g.field==='vehicle'&&o.state.selectedVehicleKey===apply(g.state,g.field,c.value).selectedVehicleKey&&!o.state.confirmedBattery&&!o.state.result?'RESOLVES_GOVERNED_NO_MATCH':'RETURNS_UNSUPPORTED';else if(actual.some(r=>!c.sourceIds.includes(id(r))))status='RESOLVES_WRONG_ROW';else if(JSON.stringify(ids(actual))!==JSON.stringify(c.sourceIds))status='LOSES_YEAR_OR_GENERATION';else if(o.state.confirmedBattery&&(!batteryCertainty(c.rows).safe||c.rows.some(r=>r.defaultBattery!==o.state.confirmedBattery)))status='OTHER_FAILURE';c.test={status,messages:o.messages,actualIds:ids(actual),state:o.state};totals[status]++;buttons++;}
const result={phase:baselineModule?'before':'after',rows:rows.length,queries:queries.size,groups:groups.size,buttons,totals,inventory:[...groups.values()]};
fs.mkdirSync('docs/evidence/vehicle-selection',{recursive:true});
fs.writeFileSync(`docs/evidence/vehicle-selection/mass-${result.phase}.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,inventory:undefined}));
assert.equal(unhandledFields.size,0,'all discovered multi-candidate fields covered');
if(!baselineModule)for(const [key,n] of Object.entries(totals))if(!['RESOLVES_EXACT_ROW','RESOLVES_GOVERNED_NO_MATCH'].includes(key))assert.equal(n,0,key);
