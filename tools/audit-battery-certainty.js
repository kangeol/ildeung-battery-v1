import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='667b555971603325a4504b6f6e74bd282317c939';
const before=process.argv.includes('--before');
const {buildVehicleGroups,parseYearRange,yearMatches,resolveConsultation}=before
 ? await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',`${baseline}:js/smart-consult-core.js`])).toString('base64'))
 : await import('../js/smart-consult-core.js');
const read=p=>JSON.parse(before?execFileSync('git',['show',`${baseline}:${p}`],{encoding:'utf8'}):fs.readFileSync(p,'utf8'));
const manufacturers=read('data/manufacturers.json');
const rows=manufacturers.flatMap(m=>read(`data/${m.file}`).map((r,index)=>({...r,manufacturerId:m.id,manufacturerName:m.name,source:`data/${m.file}`,index})));
const groups=buildVehicleGroups(rows),uniq=a=>[...new Set(a)];
const identity=r=>[r.manufacturerId,r.vehicle,r.year,r.fuel,r.detailModel].join('|');
const groupBy=key=>{const map=new Map();for(const r of rows){const k=key(r);if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return [...map.values()];};
const duplicates=groupBy(r=>identity(r)+'|'+r.defaultBattery+'|'+r.upgradeBattery).filter(g=>g.length>1);
const conflicts=groupBy(identity).filter(g=>uniq(g.map(r=>r.defaultBattery)).length>1);
const review=[];
for(const r of rows){
 const reasons=[];
 if(!/^(AGM\d+(?:R)?|DIN\d+(?:HL|L|R)?|DF\d+(?:AL|L|R)|65-900)$/.test(r.defaultBattery)&&r.defaultBattery!=='고객센터문의')reasons.push('NON_SINGLE_OR_UNRECOGNIZED_BATTERY');
 if(/^(가솔|디젤 2)$/.test(r.fuel))reasons.push('SUSPICIOUS_FUEL_SPELLING');
 if(r.defaultBattery==='고객센터문의')reasons.push('MANUAL_CONFIRMATION');
 if(r.detailModel.includes('GN7'))reasons.push('GN7_EXACT_POWERTRAIN_BATTERY_AUTHORITY_REQUIRED');
 const range=parseYearRange(r.year);
 if(range.start===null&&range.end===null)reasons.push('UNPARSED_YEAR');
 if(range.start&&range.end===null&&rows.some(q=>q.manufacturerId===r.manufacturerId&&q.vehicle===r.vehicle&&q.detailModel!==r.detailModel&&parseYearRange(q.year).start>range.start))reasons.push('OPEN_RANGE_OVERLAPS_NEWER_DETAIL');
 if(reasons.length)review.push({row:r,reasons,status:'REVIEW_REQUIRED'});
}
for(const g of duplicates)review.push({rows:g,reasons:['EXACT_DUPLICATE'],status:'REVIEW_REQUIRED'});
for(const g of conflicts)review.push({rows:g,reasons:['EXACT_CONDITION_CONFLICT'],status:'REVIEW_REQUIRED'});
const overlaps=[];
for(const g of groups){const starts=g.records.map(r=>parseYearRange(r.year).start).filter(Boolean);for(let year=Math.min(...starts);year<=2027;year++){
 const candidates=g.records.filter(r=>yearMatches(r.year,year)),batteries=uniq(candidates.map(r=>r.defaultBattery));
 if(batteries.length<2)continue;
 const classifications=[];
 if(uniq(candidates.map(r=>r.fuel)).length>1)classifications.push('C1_FUEL_ENGINE');
 if(uniq(candidates.map(r=>r.detailModel.match(/\b[A-Z]+\d+\b/)?.[0]||r.detailModel)).length>1)classifications.push('C2_GENERATION_BOUNDARY');
 if(uniq(candidates.map(r=>r.detailModel)).length>1)classifications.push('C3_DETAIL_MODEL');
 if(batteries.includes('고객센터문의'))classifications.push('C4_UNKNOWN_MIXED');
 if(!classifications.length)classifications.push('C5_UNEXPLAINED');
 overlaps.push({vehicleKey:g.key,year,batteries,classifications,rows:candidates.map(r=>({source:r.source,index:r.index}))});
}}
const matrix=[];
for(const r of rows){const range=parseYearRange(r.year),year=range.start||range.end||2026;const family=groups.find(g=>g.key===`${r.manufacturerId}|${r.vehicle}`).records;
 const stages=[{}, {year}, {year,fuel:r.fuel}, {year,yearRange:r.year,fuel:r.fuel,detailModel:r.detailModel}];
 for(let stage=0;stage<stages.length;stage++){const result=resolveConsultation(family,stages[stage]);matrix.push({source:r.source,index:r.index,vehicleKey:`${r.manufacturerId}|${r.vehicle}`,stage:stage+1,facts:stages[stage],candidateCount:result.records.length,distinctBatteryCount:uniq(result.records.map(q=>q.defaultBattery)).length,type:result.type,mayAnswer:result.type==='result'&&!/문의|확인/.test(result.result?.defaultBattery||''),battery:result.result?.defaultBattery||null,nextDiscriminator:result.field||null});}
}
const stageSummary=[1,2,3,4].map(stage=>{const m=matrix.filter(r=>r.stage===stage);return {stage,simulations:m.length,safe:m.filter(r=>r.mayAnswer).length,question:m.filter(r=>r.type==='question').length,manualOrNoMatch:m.filter(r=>!r.mayAnswer&&r.type!=='question').length,discriminators:Object.fromEntries(uniq(m.map(r=>r.nextDiscriminator)).filter(Boolean).map(k=>[k,m.filter(r=>r.nextDiscriminator===k).length]))};});
const report={baseline,before,yearHorizon:{through:2027,openEnded:'Enumerated to 2027; not treated as historical end date'},counts:{manufacturers:manufacturers.length,files:manufacturers.length,rows:rows.length,vehicles:groups.length,duplicateGroups:duplicates.length,exactConflicts:conflicts.length,yearAmbiguityFamilies:uniq(overlaps.map(r=>r.vehicleKey)).length,yearAmbiguityInstances:overlaps.length,reviewRequired:review.length,reviewRows:uniq(review.flatMap(x=>(x.rows||[x.row]).map(r=>r.source+':'+r.index))).length,vehicleOnlySafe:uniq(matrix.filter(r=>r.stage===1&&r.mayAnswer).map(r=>r.vehicleKey)).length},stageSummary,rows,grandeur:rows.filter(r=>r.manufacturerId==='hyundai'&&r.vehicle==='그랜저'),duplicates,conflicts,review,overlaps,matrix};
fs.mkdirSync('docs/evidence/battery-certainty',{recursive:true});
fs.writeFileSync(`docs/evidence/battery-certainty/${before?'before':'after'}.json`,JSON.stringify(report,null,2)+'\n');
if(!before){
 const lines=['# REVIEW_REQUIRED — battery certainty','', 'Indices are zero-based JSON array indices. No speculative corrections were made. Unknown battery and open-ended overlap flags are not automatically factual defects.','', '| File/index | Vehicle/detail | Year / fuel | Battery | Reasons |','|---|---|---|---|---|'];
 for(const item of review)for(const r of item.rows||[item.row])lines.push(`| ${r.source}[${r.index}] | ${r.vehicle} / ${r.detailModel} | ${r.year} / ${r.fuel} | ${r.defaultBattery} | ${item.reasons.join(', ')} |`);
 lines.push('','## Missing coverage / authority','', '- GN7 hybrid 1.6 is officially confirmed as a powertrain, but has no canonical GN7 battery row. No guessed row was added; consultation fails closed.', '- All non-GN7 engine-generation combinations are structurally audited, not independently OEM-certified. This audit does not claim physical fitment authority for all 917 rows.', '- Status 완료 is a workflow flag, not proof that 고객센터문의 or alternative battery strings are fitment-confirmed.');
 fs.writeFileSync('docs/evidence/battery-certainty/REVIEW_REQUIRED.md',lines.join('\n')+'\n');
}
console.log(JSON.stringify({counts:report.counts,stageSummary},null,2));
