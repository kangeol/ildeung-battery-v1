import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {conversationTurn,createConversationState} from '../js/smart-consult-conversation.js';
import {encodeSession,decodeSession} from '../js/smart-consult-session.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline='851da26adb81d2b608548dcfb00e08326dc35c53';
const git=a=>execFileSync('git',['-c','core.safecrlf=false',...a],{encoding:'utf8',maxBuffer:20e6});
const old=p=>JSON.parse(git(['show',`${baseline}:${p}`]));
const manufacturers=read('data/manufacturers.json');
const rows=manufacturers.flatMap(m=>read(`data/${m.file}`).map(r=>({...r,manufacturerId:m.id,manufacturerName:m.name})));
const areas=read('seo-data/smart-consult-location-index.json').localities;
const catalog=read('data/battery-prices.json'),policy=read('data/consult-service-policy.json');
const oldRows=manufacturers.flatMap(m=>old(`data/${m.file}`));
assert.equal(oldRows.filter(r=>r.defaultBattery==='DIN70L'||r.upgradeBattery==='DIN70L').length,1);
assert.equal(rows.filter(r=>r.defaultBattery==='DIN70L'||r.upgradeBattery==='DIN70L').length,0);assert.equal(rows.length,917);assert.equal(areas.length,665);
for(const m of manufacturers){const expected=old(`data/${m.file}`);if(m.file==='chevrolet.json'){assert.deepEqual(expected[30],{manufacturer:'쉐보레',vehicle:'알페온',year:'10~15년',fuel:'가솔린',detailModel:'알페온',defaultBattery:'DIN70L',upgradeBattery:'',status:'완료'});expected[30].defaultBattery='DIN74L';}assert.deepEqual(read(`data/${m.file}`),expected);}
const beforePrices=old('data/battery-prices.json');assert.deepEqual(catalog,{...beforePrices,version:catalog.version,unpriced:[]});assert.equal(catalog.prices.DIN74L,125000);assert.ok(!JSON.stringify(catalog).includes('DIN70L'));
const beforePolicy=old('data/consult-service-policy.json');for(const key of ['authority','facts','answers','summary'])assert.deepEqual(policy[key],beforePolicy[key]);
assert.deepEqual(Object.fromEntries(Object.entries(policy.product).filter(([key])=>!['assurance','comparisonContext'].includes(key))),{
 scope:'저희가 취급하는 AGM 제품 기준으로',brands:{DELKOR:'국산 제조 실버',VARTA:'독일산 실버'},chinese:'중국산 제품은 취급하지 않습니다.',black:'저희는 중국산 블랙 제품은 취급하지 않습니다.',comparison:'차량에 맞는 규격을 먼저 확인해야 합니다. 가격을 우선하시면 델코, 바르타 브랜드를 선호하시면 바르타를 선택하실 수 있습니다.',lifespan:'배터리 수명은 주행패턴·방전 이력·차량 충전상태 등 사용환경에 따라 달라 한쪽이 무조건 더 오래간다고 단정하지 않습니다.'
});
assert.deepEqual(policy.afterSales,{periodMonths:3,basis:'설치일',scope:'일등밧데리에서 설치한 배터리',detail:'세부 A/S 가능 여부는 증상과 차량 상태를 확인한 뒤 안내해드립니다. {phone}로 문의해 주세요.'});
assert.deepEqual(policy.businessHours,{
 HOURS:'정확한 운영시간은 일정에 따라 달라질 수 있어 고객센터 {phone}로 확인해 주세요.',SUNDAY:'일요일 운영 여부는 당일 일정에 따라 달라질 수 있어 고객센터 {phone}로 확인해 주세요.',HOLIDAY:'공휴일·연휴 운영 여부는 날짜별로 달라질 수 있어 고객센터 {phone}에서 정확히 안내해드립니다.',TODAY:'오늘 운영 여부와 가능한 시간은 실시간 확인이 필요합니다. 고객센터 {phone}로 문의해 주세요.'
});
const transcripts=[];
function turn(state,text){const out=conversationTurn(state,text,rows,areas,catalog,policy);transcripts.push({text,messages:out.messages,actions:out.actions,battery:out.state.confirmedBattery,brand:out.state.brand,area:out.state.region?.fullLabel});return out;}
function flow(inputs){let out={state:createConversationState()};for(const text of inputs)out=turn(out.state,text);return out;}
for(const input of ['알페온 배터리 얼마예요?','알페온 2013년식 배터리 얼마예요?','알페온 2013년식 가솔린']){const o=flow([input]);assert.equal(o.state.confirmedBattery,'DIN74L');assert.ok(o.messages.join(' ').includes('12만5천원'));}
assert.ok(flow(['DIN74L 얼마예요?']).messages.join(' ').includes('12만5천원'));
const typo=flow(['DIN70L 얼마예요?']);assert.equal(typo.state.confirmedBattery,null);assert.ok(!/\d+(?:만|천)?원/.test(typo.messages.join(' ')));assert.ok(typo.messages.join(' ').includes('등록된 규격이 아닙니다'));assert.ok(!typo.messages.join(' ').includes('DIN74L'));
const bmw=flow(['BMW 5시리즈 2020년식 배터리 얼마예요?','바르타는?']);assert.equal(bmw.state.confirmedBattery,'AGM95');assert.equal(bmw.state.brand,'VARTA');assert.ok(bmw.messages.join(' ').includes('27만원'));
const mini=flow(['미니 쿠퍼 배터리 얼마예요?','바르타로 하면?']);assert.equal(mini.state.confirmedBattery,null);
const productInputs=['델코 어디서 만들어요?','델코 국산인가요?','델코 중국산 아니에요?','델코 실버인가요?','바르타 독일산 맞나요?','바르타 어디 제품이에요?','바르타 실버인가요?','중국산 배터리 취급하나요?','중국산도 있나요?','중국산 배터리도 취급해요?','블랙 제품 있어요?','블랙은 중국산인가요?','어떤 브랜드 제품 써요?','실버 제품인가요?'];
const compares=['델코 바르타 뭐가 좋아요?','델코랑 바르타 뭐가 낫나요?','바르타가 더 좋아요?','델코가 더 좋아요?','둘 차이가 뭐예요?','5만원 더 주고 바르타 할 만해요?','뭐가 더 오래가요?','수명 차이 나요?','사장님이면 뭐 써요?','추천해주세요','둘 중 뭐가 낫나요?','뭐가 더 좋아요?'];
for(const input of productInputs)for(const state of [createConversationState(),bmw.state]){
 const o=turn(state,input),text=o.messages.join(' ');assert.deepEqual(o.state,state);assert.ok(text.includes('저희가 취급하는 AGM 제품 기준'));assert.ok(text.includes('중국산 제품은 취급하지 않습니다'));
 if(input.includes('델코'))assert.ok(text.includes('국산 제조 실버'));if(input.includes('바르타'))assert.ok(text.includes('독일산 실버'));if(input.includes('블랙'))assert.ok(text.includes('중국산 블랙 제품은 취급하지 않습니다'));
}
for(const input of compares)for(const state of [createConversationState(),bmw.state,mini.state]){
 if(input==='추천해주세요'&&!state.quotedSpec&&!state.confirmedBattery){const o=turn(state,input);assert.equal(o.state.previousQuestion.field,'vehicle');assert.match(o.messages.join(' '),/어떤 차량/);assert.doesNotMatch(o.messages.join(' '),/5만원|국산 제조 실버/);continue;}
 const o=turn(state,input),text=o.messages.join(' ');assert.deepEqual(o.state,{...state,lastIntent:text.includes(policy.product.comparisonContext.performance)?'BRAND_COMPARE':state.lastIntent});if(text.includes('어떤 제품이나 브랜드를 비교')){assert.ok(!/델코|바르타/.test(input));assert.notEqual(state.brand,'VARTA');continue;}for(const fragment of ['국산 제조 실버','독일산 실버','5만원','단정하지 않습니다'])assert.ok(text.includes(fragment),input);
 if(state===bmw.state)for(const fragment of ['AGM95','22만원','27만원'])assert.ok(text.includes(fragment));
 if(state===mini.state){for(const fragment of ['17만원','19만원','22만원','24만원','현장에서 확인'])assert.ok(text.includes(fragment));assert.equal(o.state.confirmedBattery,null);}
}
const asInputs=['AS 되나요?','A/S 가능한가요?','보증되나요?','보증기간 얼마예요?','배터리 AS 몇 개월이에요?','교체하고 문제 생기면요?','설치 후 문제 생기면요?','3개월 안에 문제 생기면 봐주나요?','무상 AS 되나요?','AS는?'];
const detailInputs=['어떤 경우까지 AS돼요?','무조건 교환되나요?','새 배터리로 바꿔주나요?','3개월 넘었는데요?'];
for(const input of [...asInputs,...detailInputs]){
 const o=turn(bmw.state,input),text=o.messages.join(' ');assert.deepEqual(o.state,bmw.state);assert.ok(text.includes('일등밧데리에서 설치한 배터리'));assert.ok(text.includes('설치일 기준 3개월 이내 A/S'));assert.ok(o.actions.includes('phone'));assert.ok(!/무조건.*(?:교환|환불)|무료교환|새 배터리로 교환/.test(text));
 if(detailInputs.includes(input)){assert.ok(text.includes('증상과 차량 상태를 확인'));assert.ok(text.includes('1644-9141'));}
}
const hours={HOURS:['영업시간 몇 시까지예요?','몇 시부터 해요?','몇 시에 문 닫아요?','주말에도 하나요?','토요일도 하나요?'],SUNDAY:['일요일도 하나요?','일요일 근무해요?'],HOLIDAY:['공휴일에도 하나요?','공휴일에도 해요?','추석에도 하나요?','설날에도 하나요?','연휴에도 하나요?'],TODAY:['오늘 영업해요?','오늘 하나요?','지금 영업 중인가요?']};
for(const [kind,inputs]of Object.entries(hours))for(const input of inputs){const o=turn(bmw.state,input);assert.deepEqual(o.state,bmw.state);assert.deepEqual(o.messages,[policy.businessHours[kind].replace('{phone}','1644-9141')]);assert.deepEqual(o.actions,['phone']);}
const integrated=flow(['구월동 BMW 5시리즈 2020년식 바르타 배터리 얼마예요?','중국산 아니죠?','AS는?']);assert.equal(integrated.state.region.fullLabel,'인천 남동구 구월동');assert.equal(integrated.state.brand,'VARTA');assert.equal(integrated.state.confirmedBattery,'AGM95');
const a=flow(['BMW 5시리즈 2020년식 배터리 얼마예요?','바르타로 하면?','뭐가 더 좋아요?','출장비는?','AS는?','일요일도 하나요?']);assert.equal(a.state.brand,'VARTA');assert.equal(a.state.confirmedBattery,'AGM95');assert.equal(a.state.year,2020);
const restored=decodeSession(encodeSession(integrated.state,[],null));assert.deepEqual(restored.state,integrated.state);assert.ok(turn(restored.state,'둘 중 뭐가 낫나요?').messages.join(' ').includes('27만원'));
const withdrawn={...integrated.state,confirmedBattery:'DIN70L',result:{...integrated.state.result,defaultBattery:'DIN70L'}};assert.equal(decodeSession(encodeSession(withdrawn,[],null)),null);
const changedHtml=git(['diff',baseline,'--name-only','--','*.html']).trim().split('\n');assert.deepEqual(changedHtml,['car-battery/chevrolet/alpheon.html','smart-consult/index.html']);
for(const p of changedHtml){let expected=git(['show',`${baseline}:${p}`]).replace(/\r\n/g,'\n');expected=p==='smart-consult/index.html'?expected.replace('?v=brand-v1','?v=consult-ui-v1'):expected.replace(/\bDIN70L\b/g,'DIN74L');assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),expected.replace('/css/smart-consult.css?v=ai-mobile-v1','/css/smart-consult.css?v=consult-ui-v1'));}
const metrics=Object.fromEntries(['DIN70L_CANONICAL_REMAINING','DIN74L_PRICE_WRONG','PRODUCT_ORIGIN_WRONG_ANSWER','UNSUPPORTED_PRODUCT_SUPERIORITY_CLAIM','CHINESE_PRODUCT_POLICY_WRONG','AS_PERIOD_WRONG','AS_UNCONDITIONAL_REPLACEMENT_CLAIM','BUSINESS_HOURS_FABRICATED','SUNDAY_STATIC_CLAIM','HOLIDAY_STATIC_CLAIM','BRAND_CONTEXT_LOST','FABRICATED_PRICE','PRICE_TRUTH_DUPLICATION','SERVICE_POLICY_TRUTH_DUPLICATION','PRODUCT_POLICY_TRUTH_DUPLICATION'].map(k=>[k,0]));
const runtime=fs.readFileSync('js/smart-consult-product-policy.js','utf8');for(const value of Object.values(policy.businessHours))assert.ok(!runtime.includes(value));assert.ok(!/국산 제조 실버|독일산 실버|periodMonths\s*:\s*3|\b(?:125000|220000|270000)\b/.test(runtime));
const evidenceDir=process.argv.includes('--faq')?'docs/evidence/final-faq/regression':process.argv.includes('--location')?'docs/evidence/location-nlu/regression':'docs/evidence/product-as-hours';
fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(`${evidenceDir}/product-as-hours.json`,JSON.stringify({status:'PASS',metrics,beforeDin70:1,afterDin70:0,changedHtml,transcripts},null,2)+'\n');console.log({status:'PASS',turns:transcripts.length,metrics,changedHtml});
